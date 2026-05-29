---
name: WebXR / react-three-xr gotchas
description: Non-obvious constraints when building immersive WebXR (VR) scenes with @react-three/xr in the gallery-room.
---

# WebXR / @react-three/xr gotchas

- **drei `<Html>` is invisible in immersive WebXR.** A DOM overlay is not composited into the
  headset framebuffer, so any panel/toolbar built with `<Html>` simply does not render in VR
  (it works fine on desktop). Anything that must be visible/interactable inside the headset has
  to be real in-scene 3D (meshes + drei `<Text>` + textures). DOM toolbars/modals are desktop-only.
  **How to apply:** for VR UI, build 3D panels and make buttons ray-pressable via a
  `userData.onVRSelect` callback that the controller-ray raycast picks up.

- **`createXRStore()` defaults request AR/scene-understanding features.** By default it requests
  meshDetection, planeDetection, anchors, hitTest, handTracking, layers, depthSensing, domOverlay
  as *optional* features. On the Meta Quest browser, requesting mesh/plane detection triggers a
  passthrough / space-setup permission demand and throws before the session starts.
  **Why:** this was the "passthrough needs to be disabled, got error" report.
  **How to apply:** for a pure seated/standing VR experience pass all of those as `false` to
  `createXRStore({ meshDetection:false, planeDetection:false, anchors:false, hitTest:false,
  handTracking:false, hand:false, layers:false, depthSensing:false, domOverlay:false })`.

- **Right-trigger input has multiple consumers — needs explicit arbitration.** Locomotion
  (teleport-on-trigger when teleport mode is toggled by squeeze), the artwork-select ray, and the
  VR edit grab-controller all poll the right trigger rising-edge. Without a shared owner flag, one
  press fires several actions. **How to apply:** share a `teleportActiveRef` boolean ref; the ray /
  edit controllers skip their trigger handling while it is true.

- **Camera pose is owned by the headset.** Never write `camera.position` in VR (overwritten each
  frame). Translate the XROrigin rig instead. Desktop/mobile look controllers must be disabled when
  `isPresenting` or view feels inverted/fighting. Reference space is hardcoded to `local-floor` with
  XROrigin at `[0,-1.6,0]`; do not change reference space or the height offset breaks.

- **Custom `THREE.Line` ray objects added via `scene.add` must dispose geometry + material on
  cleanup**, not just `scene.remove`, or long VR sessions leak GPU resources.

- **`useThree().camera` is NOT the live headset pose in @react-three/xr v6.** It is the desktop
  fallback camera; in an immersive session it stays near the rig origin. Anything positioned from
  it (e.g. an "in front of me" panel) lands in the wrong place — the symptom was the artwork detail
  panel floating far away in the gallery centre. **How to apply:** read the real XR camera each frame
  via `gl.xr.isPresenting ? gl.xr.getCamera() : camera` and use its `getWorldPosition` /
  `getWorldQuaternion`. To make a panel "fill the view" in any (stationary or room-scale) mode,
  head-lock it: every frame set `group.position = camPos + camForward*dist` and
  `group.quaternion = camQuat`. **This applies to EVERY head-relative element** — comfort
  vignette, detail panel, AND the edit-mode panel all broke the same way (placed near the rig
  origin). For "anchor once in front of me" panels (not head-locked), set the anchor on the first
  frame the pose is ready, guarded by an `anchored` ref, and read the world transform via
  `gl.xr.getCamera()`. Add a fallback forward (e.g. `(0,0,-1)`) for when the user looks straight
  up/down at entry (horizontal forward collapses to ~0), or the panel never anchors.

- **VR selection that works without precise aiming = controller-ray with a gaze fallback.** Cast the
  controller ray first; if it misses, cast a second ray from the XR camera centre (gaze) against the
  same interactive roots. Highlight the targeted artwork (e.g. an amber `EdgesGeometry` box sized via
  `Box3.setFromObject`) so the user can see what the trigger will select. Gaze should target only
  artworks, never `onVRSelect` UI buttons, or the user selects buttons just by looking near them.

- **Pause artwork selection while a modal/detail panel is open**, otherwise the ray keeps selecting
  other artworks behind the panel instead of giving a clean "press EXIT to go back" flow. Keep the
  panel's own `onVRSelect` buttons interactive.

- **Controller face-button ids vary by vendor.** The left upper button is `y-button` on Quest,
  `b-button`/`secondary-button` elsewhere — check several ids. A rarely-used button (left upper) makes
  a good "exit VR / exit gallery" shortcut; end the session with `xrStore.getState().session?.end()`.

- **VR 3D panel sizing and layout.** At ~1.35 m distance, a comfortable panel is 0.65–0.85 m wide and 0.75–1.0 m tall (≈30–40° vertical FOV). Panels taller than 1.0 m at that distance fill >45° and feel overwhelming. For text panels use drei `<Text>` with `anchorY="top"` so multi-line text flows *downward* — this lets you calculate safe gaps: place each element's Y at the *previous element's top minus its worst-case height minus a gap*. Failing to account for variable-height text (long titles wrap to 2+ lines) causes elements to overlap. A "close" button should sit at a fixed offset from panel bottom, not from the last text element.
  **How to apply:** keep PANEL_H ≤ 1.0 for detail panels; lay out top-down with `anchorY="top"` and conservative height estimates; for artwork info in VR, omit the image thumbnail (the artwork is visible on the wall right in front of you).

- **VR menu access.** The DOM toolbar is invisible in the headset, so all in-VR actions (edit mode, exit, settings) need a 3D panel toggled by a controller button. Left-controller lower button (`x-button` on Quest / `primary-button` on other runtimes) is the natural menu toggle — the upper button (`y-button`) is reserved for quick-exit. To enter edit mode from inside VR, the menu fires `setIsEditMode(true)`; the VR branch then swaps the right-hand ray for the edit grab controller and shows VREditPanel automatically (they're already mutually exclusive in the render tree).

- **A "hold the trigger" VR mode must force-release on every exit path, or it latches on.**
  When a controller-ray reports a held-trigger boolean up to React state (e.g. "hold to reveal
  info on all artwork frames"), the per-frame poll only fires on edges — so if the controller
  loses tracking, the component unmounts, or the XR session ends *while held*, the falling edge
  never fires and the state stays true into the next session.
  **How to apply:** in the ray's `useFrame`, when the controller object is missing, emit
  `onHoldChange(false)` if the hold ref is true; add an unmount `useEffect` cleanup that does the
  same; and defensively clear the lifted state in the parent on the `!isPresenting` transition.
  Belt-and-suspenders across all three is intentional — any one alone has a gap.
