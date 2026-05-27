---
name: Stage 3 master plan
description: Key decisions, technical specifics, and out-of-scope boundaries for Phase 1 room polish, Phase 2 live edit, Phase 3 VR/WebXR work.
---

## Location
Full plan: `.local/tasks/stage3-vr-and-live-edit.md`
Supersedes: `.local/tasks/stage-19-webxr.md` and `.local/tasks/vr-webxr-support.md`

## Critical technical decisions

**@react-three/xr v6 API**
- `createXRStore()` at module level, `<XR store={xrStore}>` wraps Canvas children
- `<XROrigin position={[0, -1.6, 0]} />` maps real eye height to EYE_Y=0
- Presenting state: `useStore(xrStore, s => s.session != null)`
- Left controller axes: `gamepad.axes[2]` = strafe, `axes[3]` = forward/back
- `useXRInputSourceState('left'/'right')` for reading controller input
- `selectstart` event for trigger press

**Edit mode — DB is already ready**
- artworks table already has: xPosition, yPosition, zPosition, rotation, scale, isManuallyPlaced
- galleries table already has: roomSize (1–10), decorationLevel (1–10), roomMode, roomSeed
- New columns needed: room_height (galleries), lighting_mood (galleries)
- New table needed: gallery_decorations (for manually placed props)

**Execution order**
Phase 1 (controls + atmosphere) → Phase 2 (live edit) → Phase 3 (VR)
Each phase ships independently. Phases 1+2 need zero headset to build and test.

**Performance constraint for VR**
Must hit 90fps. Risk: base64 image URLs cause GPU memory pressure in VR.
Mitigation: object storage migration (also Stage 3) resolves this.
Interim: cap texture upload size to 1024px.

**Why**
PointerLockControls must be conditionally mounted `{!isPresenting && <PointerLockControls />}` — it conflicts with XR sessions if left mounted.
