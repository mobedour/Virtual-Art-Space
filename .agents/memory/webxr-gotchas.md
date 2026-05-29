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
