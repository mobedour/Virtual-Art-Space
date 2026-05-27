# Stage 3 — Room Polish, Live Edit Mode & VR/WebXR
## Master Reference & Brainstorm Document

> This is the single source of truth for all Stage 3 work.
> Old task files `stage-19-webxr.md` and `vr-webxr-support.md` are superseded by this document.

---

## Table of Contents
1. [Current State — Honest Assessment](#1-current-state--honest-assessment)
2. [Phase 1 — Room & Controls Polish](#2-phase-1--room--controls-polish)
3. [Phase 2 — Live Edit Mode](#3-phase-2--live-edit-mode)
4. [Phase 3 — VR / WebXR Integration](#4-phase-3--vr--webxr-integration)
5. [DB Changes](#5-db-changes)
6. [API Changes](#6-api-changes)
7. [Technical Risks & Mitigations](#7-technical-risks--mitigations)
8. [Out of Scope](#8-out-of-scope)
9. [Dependency Order](#9-dependency-order)
10. [Key Files Map](#10-key-files-map)

---

## 1. Current State — Honest Assessment

### What's working well
- Procedural floor textures (parquet, neon, marble, slate, concrete) — genuinely good quality
- Per-artwork museum spotlights that target each frame — correct gallery feel
- 5 room themes with distinct palettes, fog, and lighting
- Benches, plinths, plants, placard stands, floor lamps, ceiling pendant installations — surprising depth
- Artwork frames with bevel, mat board, hanging wire, label plate with artist name
- WASD + PointerLock on desktop; touch joystick + swipe-look on mobile — both paths functional
- Room size 1–10, decoration level 1–10, roomSeed, roomMode — all stored in DB, all wired up
- `xPosition`, `yPosition`, `zPosition`, `rotation`, `scale`, `isManuallyPlaced` already on artworks in DB — edit mode foundation is entirely there
- `@react-three/xr` v6.6.29 already installed — VR just needs wiring

### What needs work
| Issue | Root cause | Impact |
|---|---|---|
| Movement feels floaty/mechanical | Fixed speed 7, instant stop, no acceleration | Kills immersion |
| Frames are dead until clicked | No proximity feedback, no crosshair state | Discoverability problem |
| Silent rooms | No ambient audio | 50% of immersion missing |
| Jarring room load | Instant snap to position, no fade | Abrupt first impression |
| Escape key = broken state | Unlock drops to blank click prompt | Frustrating UX |
| No spatial feedback | No head bob, no footstep feel | Feels like flying, not walking |
| Touch look sensitivity | 0.004 fixed — too slow on some devices | Mobile feel inconsistent |
| Base64 artwork storage | Large data URLs under WebGL texture pressure | Will be a hard problem in VR (GPU memory) |

---

## 2. Phase 1 — Room & Controls Polish

### 2A. Movement Feel

**Smooth acceleration / deceleration**
- Current: `move.normalize().multiplyScalar(SPEED * delta)` — instant, no ramp
- Target: velocity vector with acceleration/deceleration curves
  ```
  velocityRef.current.lerp(targetVelocity, 1 - Math.exp(-12 * delta))  // exponential smoothing
  ```
- Ramp-up time: ~0.12 s to full speed
- Ramp-down time: ~0.08 s to stop (snappier stop than start — feels responsive)

**Head bob**
- Sinusoidal Y offset: `camera.position.y = EYE_Y + Math.sin(bobPhase) * BOB_AMP`
- `BOB_AMP = 0.035` units (subtle — like a real walking person, not a cartoon bounce)
- `BOB_FREQ` proportional to movement speed so faster walk = faster bob
- Disabled when standing still — phase decays smoothly back to zero
- User toggle in localStorage key `vas_headBob` (default: on)

**Sprint**
- Hold Shift → `SPRINT_SPEED = 11` (vs `WALK_SPEED = 5.5` — reduced from current 7 so sprint feels impactful)
- Walk speed reduction is intentional: current 7 is slightly fast for a gallery context
- Mobile: full joystick deflection (magnitude > 0.85) auto-sprints

**Files:** `GalleryScene.tsx` → `MovementController` component; `TouchControls.tsx`

---

### 2B. Artwork Proximity & Hover Feedback

**Proximity glow**
- Each `ArtworkFrame` receives its `cameraPosition` as a prop updated each frame
- When distance < 3.5 units → `emissiveIntensity` on mat board edge ramps from 0.0 to 0.12 (smooth lerp)
- When distance < 1.8 units → frame label text brightens slightly
- Implementation: `useFrame` in `ArtworkFrame` measures distance, drives a `useRef` intensity that lerps each tick

**Crosshair with aim state**
- A small `<Html>` overlay pinned to viewport center (CSS: `position: fixed; left: 50%; top: 50%`)
- Three states rendered as SVG:
  - `idle`: thin white ring, 8px diameter, 30% opacity
  - `hovering_artwork`: amber diamond (◈), animates in over 0.15s
  - `hovering_decoration`: subtle dot change — decorations aren't interactive in view mode
- `fireCenterRaycast` in `GalleryScene` already returns the hit artwork — extend it to return a `hoverState` that `GalleryRoom` feeds to the crosshair overlay

**Interact hint strip**
- When `hoverState === 'artwork'`: a pill label fades in at the bottom of the viewport
- Content: `"Click to inspect"` on left, artwork title truncated on right, all in amber/gold
- Auto-disappears after 2.5 s of hover, or immediately on click
- Uses CSS `@keyframes fadeInUp` — no JS animation library needed
- Mobile: same hint appears above the joystick

**Files:** `ArtworkFrame.tsx`, `GalleryScene.tsx`, `GalleryRoom.tsx`

---

### 2C. Atmosphere & Immersion

**Fade-in on room enter**
- Canvas wrapper div starts at `opacity: 0`, transitions to `opacity: 1` over 0.8s via CSS transition
- Triggered after the first `useFrame` tick (confirms scene is ready)
- This also masks texture-loading flicker that sometimes shows gray frames before images load

**Ambient audio (opt-in)**
- New `AmbientAudio.tsx` component using the Web Audio API (`AudioContext`, `GainNode`)
- Each theme maps to an audio loop:
  | Theme | Audio | Feel |
  |---|---|---|
  | `dark_void` | Low sine drone, 40Hz sub + 220Hz overtone | Gallery silence |
  | `neon_grid` | Soft synth pad, slight chorus | Future digital |
  | `purple_mist` | Ethereal reverb tail, slow filter sweep | Dreamy |
  | `white_cube` | Room tone, barely audible | Clinical |
  | `concrete_bunker` | Industrial distant hum, occasional distant drip | Raw |
  | `amman_limestone` | Soft oud harmonic, warm reverb | Cultural warmth |
- Mute toggle button in gallery header (speaker icon), state in localStorage `vas_audioMuted`
- Respects browser autoplay policy: starts muted, user must click the speaker icon first
- Volume: 0.18 default (unobtrusive background)
- Smooth fade between tracks when theme changes in edit mode

**New theme: Amman Limestone**
- The most on-brand theme for the platform
- `amman_limestone` key in `THEMES`
- Wall color: `#c8b88a` (warm Amman sandstone)
- Floor: new `terracotta` pattern — geometric octagonal Arabic tile work rendered on canvas
- Ceiling: `#ede4d0` (cream plaster)
- Fog: `#d4c8b0` (warm haze)
- Accent light: `#f5c060` (warm amber — Jordanian afternoon sun)
- Frame color: `#8b5e2a` (dark terracotta)
- Label color: `#5c3a1a`

**Smooth entrance positioning**
- Camera spawns at `z = halfD - 1.5, y = EYE_Y` — same as current, but wrapped in fade
- On room load: briefly show the gallery title centered on screen as a title card (1.5 s), then fade it out as exploration begins. Feels like a film title card — classy gallery entrance.

**Files:** `theme-config.ts`, `GalleryScene.tsx`, `GalleryRoom.tsx`, new `AmbientAudio.tsx`

---

### 2D. Controls Quality-of-Life

**Gallery entrance rework**
- Current: a blue `"Click to explore"` box appears immediately on load — abrupt and visually inconsistent
- New: a dark overlay with the gallery title (Playfair Display italic), artist name, and a single amber `"Enter Gallery →"` button
- Button click requests pointer lock and starts the walk
- Feels like entering a real gallery, not clicking on a game

**Pause overlay (Escape)**
- Currently: pointer lock unlocks → bare canvas with a click prompt — broken state
- New: semi-transparent dark overlay fades in with:
  - Gallery title + artist (top)
  - `"Resume Exploring"` (primary button — re-requests pointer lock)
  - `"Exit Gallery"` (secondary)
  - `"Edit Gallery"` (amber — only visible to authenticated owner)
  - `"Audio: On/Off"` toggle
  - Movement speed slider (walk speed, 3–8 range)
- Keyboard: `Escape` toggles pause; `Enter` or `Space` resumes

**Mobile controls**
- Look sensitivity slider in the mobile pause menu (tap joystick to open)
- Look smoothing: exponential smoothing applied to yaw/pitch delta on mobile
  ```
  yawRef.current += dx * LOOK_SENSITIVITY * smoothingFactor
  ```
- Current 0.004 is fine as default; user can tune it

**Files:** `GalleryRoom.tsx`, `TouchControls.tsx`, `public-gallery-detail.tsx`

---

## 3. Phase 2 — Live Edit Mode

### 3A. Architecture & State

**Access control**
- Edit mode only visible to authenticated gallery owner
- Check in `GalleryRoom.tsx`: compare `gallery.userId` with the current auth user's local DB id (available via `useGetAuthMe()` hook already in the codebase)
- The Edit button is completely absent in the DOM for non-owners — not just disabled

**Edit mode state structure**
```typescript
type EditState = {
  active: boolean;
  pendingArtworks: Map<number, Partial<ArtworkData>>; // artworkId → overrides
  pendingRoom: Partial<GalleryRoom>;                  // room property overrides
  pendingDecorations: {
    added: PlacedDecoration[];
    removed: Set<number>;
    updated: Map<number, Partial<PlacedDecoration>>;
  };
  history: EditSnapshot[];   // undo stack, max 20 entries
  historyIdx: number;
};
```

**Undo / Redo**
- `Ctrl+Z` / `Cmd+Z` → undo last action
- `Ctrl+Shift+Z` / `Ctrl+Y` → redo
- Each discrete action (drop artwork, place decoration, resize, wall drag) pushes to the history stack
- Max 20 undoable actions before oldest is discarded

**Visual mode signals**
- Thin pulsing amber border around the entire viewport (`box-shadow: inset 0 0 0 3px rgba(245,192,96,0.6)`)
- All artwork frames gain a subtle selection outline (dashed amber ring around frame bounds)
- Floor shows a faint 0.5-unit grid overlay to aid positioning
- The crosshair becomes a selection cursor `⊕`
- Header shows `[EDIT MODE]` badge + `"Save"` + `"Discard"` buttons
- These replace the normal `"Exit"` button group while edit is active

**Save / Discard flow**
- `"Save"`: fires all pending API calls in parallel, then exits edit mode on success
- `"Discard"`: resets `pendingArtworks` and `pendingRoom` to server values, no API calls, exits edit mode
- Autosave draft: every 30s, current `EditState` is serialized to `localStorage` key `vas_editDraft_${galleryId}` — recovered if the browser crashes mid-edit
- Navigation guard: if `pendingArtworks.size > 0 || pendingRoom has changes`, prompt before leaving

---

### 3B. Artwork Repositioning

**The grab-and-drag system**
In edit mode, hovering any artwork shows:
- A grab handle icon (⊞) at the top center of the frame
- The frame gets a solid amber outline on hover (not dashed — signals it's grabbable)

Clicking/holding a frame enters `dragging` state:
- Frame visually detaches: slight forward Z translation (0.15 units toward camera) + very subtle scale-up (1.04×) — like picking up a real object
- Frame follows the player's center raycast projected onto the nearest wall plane
- Wall plane detection: checks which of the 4 wall planes the raycast hits, snaps the frame to that wall's inset position and correct rotation
- Other frames on the same wall dim to 60% opacity while dragging — clean drop zone signal
- Dragging across a corner automatically re-snaps to the adjacent wall

Releasing:
- Frame snaps to nearest 0.25-unit grid position on the wall
- Small "placed" animation: slight scale bounce (1.04 → 0.98 → 1.0 over 0.2s)
- Updates `pendingArtworks.set(id, { xPosition, yPosition, zPosition, rotation, isManuallyPlaced: true })`
- Push to undo history

**Right-click context menu on any artwork frame in edit mode**
- `"Reset to auto-placement"` → sets `isManuallyPlaced: false`, removes from `pendingArtworks`
- `"Duplicate spacing"` → copies this frame's wall + height to the next artwork in display order
- `"Send to back wall"` → snaps to the far wall centered

**Height adjustment**
- While hovering in edit mode, a vertical slider handle (thin amber line with grab dots) appears on the left edge of the frame
- Drag up/down to adjust `yPosition`
- Range: `floorY + 0.5` to `ceilY - 0.3` (can't clip through floor or ceiling)
- 0.25-unit snaps

**Frame resize / scale**
- Resize handle at bottom-right corner (small amber square)
- Dragging out: scale up (max 2.5×)
- Dragging in: scale down (min 0.4×)
- Scale applies uniformly (aspect ratio locked)
- Mobile: pinch gesture on a selected frame (two fingers on the frame's bounds)

**Rotation**
- Arc handle at top of selected frame (semicircular amber arc indicator)
- Snaps in 15° increments
- Hold Shift → snaps in 5° increments for fine rotation

---

### 3C. Room Reshape

**Live wall drag**
- Each wall face has an outward arrow indicator visible only in edit mode
- North wall (−z face): drag outward (−z direction) to grow room depth
- East wall (+x face): drag outward (+x) to grow width
- South and West mirrors of above
- Room snaps to integer roomSize 1–10 (piecewise linear: size 5 = default halfW/D = 9 units)
- As walls move, `SIZE_LABELS` name (`"Spacious"`, `"Grand"`, etc.) appears as a floating label on the active wall
- Artwork positions redistribute: manually-placed artworks clamp to new wall bounds; auto-placed rerun the layout algorithm

**Ceiling height**
- A handle at the top center of any wall adjusts ceiling height independently
- New `roomHeight` DB column (integer 1–10, default 5)
- Maps: size 1 → halfH 2.5, size 5 → halfH 4.5 (current default), size 10 → halfH 7.0
- Height label shown while dragging: `"Intimate"` → `"Cathedral"`

**Floor footprint ghost**
- While dragging any wall, a dashed amber rectangle on the floor shows the new room footprint before committing
- Lets the owner visually plan the space

---

### 3D. Decoration Placement

**Placement flow**
- Edit toolbar has a `"Furnishings"` tab
- Shows 5 decoration cards: Bench, Plinth, Plant, Floor Lamp, Placard Stand
- Clicking a card enters `placingDecoration` mode — a ghost (translucent, wireframe) preview of the object follows the floor plane raycast as the player moves
- Left-click to place; Escape to cancel
- On placement: object snaps to 0.5-unit grid, collision check against existing decorations (minimum 1.2-unit clearance)

**Manual decorations vs seeded RNG decorations**
- Any decoration placed in edit mode is saved to the new `gallery_decorations` table
- When the room loads with any manual decorations present: seeded-RNG auto-decorations are **suppressed** — manual positions are authoritative
- This avoids conflict between user intent and the random layout
- `"Reset all furnishings to auto"` button in the toolbar wipes `gallery_decorations` and restores seeded layout

**Context menu on existing decorations (right-click / long-press)**
- `"Remove"`
- `"Rotate 90°"`
- `"Move"` → re-enters placement mode with this decoration picked up

**Decoration density dial**
- The existing `decorationLevel` (1–10) slider is exposed live in the toolbar
- Moving it instantly updates the seeded-RNG decoration count in the scene
- Only affects auto-placed decorations, not manually placed ones

---

### 3E. Theme & Lighting Edit

**Live theme switcher**
- The toolbar `"Theme"` tab shows 6 small room preview thumbnails (pre-rendered 128×96 canvas 2D thumbnails using the same texture-generation functions from `GalleryScene.tsx` applied to a mini canvas)
- Hover preview: hovering a swatch temporarily applies that theme to the live 3D scene in a 300ms crossfade
- Clicking confirms — updates `pendingRoom.roomTheme`
- The theme name animates in as a floating label at the bottom of the screen for 2s

**Lighting mood**
- A single vertical slider: `"Dim"` → `"Bright"`
- Maps to a `lightingMood` multiplier (0.5 → 2.0) applied to `ambientIntensity` and `spotIntensity` at render time
- Stored as a new `lighting_mood` column (real, default 1.0) on galleries

**Color accent override (stretch goal)**
- A color picker for the accent light color (`theme.accentLight`) — lets the owner tint the gallery light to any warm hue
- Stored as `accent_color_override` (nullable text) on galleries

---

### 3F. API Integration for Edit Mode

**New / modified endpoints:**
```
PATCH /api/artworks/:id/placement
  auth: requireAuth (owner only)
  body: { xPosition, yPosition, zPosition, rotation, scale, isManuallyPlaced }
  — already stored in DB, just need the route

PATCH /api/galleries/:id/room
  auth: requireAuth (owner only)
  body: { roomSize?, roomTheme?, decorationLevel?, roomHeight?, lightingMood?, accentColorOverride? }
  — extend existing gallery PATCH

POST  /api/galleries/:id/decorations
  body: { type, x, z, rotY }
  returns: PlacedDecoration with id

DELETE /api/galleries/:id/decorations/:decorId

PATCH /api/galleries/:id/decorations/:decorId
  body: { x?, z?, rotY? }
```

**Batch save on "Save":**
- Fire all pending calls in `Promise.all()` — parallel, not sequential
- Optimistic UI: revert only the failed items on error, show per-item error toasts
- On full success: clear `pendingArtworks`, `pendingRoom`, `pendingDecorations`, exit edit mode, show success toast `"Gallery saved"`

**Preview mode within edit**
- A `"Preview as visitor"` toggle in the toolbar that temporarily hides all edit handles and crosshair changes
- Lets the owner see exactly what a visitor sees
- Toggle back to see edit handles again — no API call, purely local UI state

**Copy/paste artwork placement**
- `Ctrl+C` while a frame is selected → copies its `{yPosition, scale, rotation}` to an `EditClipboard`
- `Ctrl+V` while hovering another frame → pastes those properties to the hovered frame
- Useful for quickly aligning a row of artworks at the same height

---

## 4. Phase 3 — VR / WebXR Integration

> `@react-three/xr` v6.6.29 is already installed.
> The 2D browser experience is **completely unchanged** — VR is purely additive.

### 4A. Core XR Session Setup

**Library API (v6 specifics)**
```typescript
// Module-level store — lives in GalleryRoom.tsx
import { createXRStore } from '@react-three/xr';
const xrStore = createXRStore();

// Inside the Canvas
<XR store={xrStore}>
  {/* All existing scene content unchanged */}
  <XROrigin position={[0, -1.6, 0]} />  {/* map real eye height → EYE_Y = 0 */}
</XR>
```

**XROrigin positioning**
- Real-world VR tracking origin is the floor
- Player eye height ≈ 1.6 m → `XROrigin y = -1.6` maps floor-level tracking to `y = 0` (EYE_Y) in room space
- Spawn XR camera at same position as desktop: `z = halfD - 1.5`, facing room center

**Detecting XR presenting state**
```typescript
import { useStore } from '@react-three/xr';
const isPresenting = useStore(xrStore, s => s.session != null);
```
This replaces all the desktop/mobile control conditional rendering when in VR.

---

### 4B. Enter VR Button & Feature Detection

**Feature detection (async)**
```typescript
const [vrSupported, setVrSupported] = useState(false);
useEffect(() => {
  navigator.xr?.isSessionSupported('immersive-vr').then(setVrSupported);
}, []);
```

**Button placement**
- In `public-gallery-detail.tsx` header left cluster, alongside "Exit"
- Styled to match existing dark/amber aesthetic: `border-primary/50 bg-black/50 backdrop-blur`
- Label: `"Enter VR"` with a headset icon (lucide `Glasses` or custom SVG)
- Completely absent from DOM when `vrSupported === false` — no fallback text, no disabled state
- On click: `xrStore.enterVR()`

**While presenting**
- Replace "Enter VR" with "Exit VR" button (calls `xrStore.exitVR()`)
- "Exit VR" is rendered as `<XRDomOverlay>` so it appears natively inside the headset

**Target devices:** Meta Quest 2, Quest 3, Quest Pro, Apple Vision Pro (Safari WebXR), any WebXR-compatible browser (Chrome, Edge with headset)

---

### 4C. VR Locomotion

**Smooth thumbstick movement — primary mode**

New `XRLocomotion` component, renders only when `isPresenting`:
```typescript
function XRLocomotion({ halfW, halfD }: { halfW: number; halfD: number }) {
  const inputSource = useXRInputSourceState('left');  // @react-three/xr hook
  useFrame(({ camera }, delta) => {
    const axes = inputSource?.gamepad?.axes;
    if (!axes) return;
    const strafeAxis   = axes[2];  // left/right
    const forwardAxis  = axes[3];  // forward/back (positive = back on most controllers)

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

    const move = new THREE.Vector3()
      .addScaledVector(forward, -forwardAxis)
      .addScaledVector(right, strafeAxis);

    if (move.lengthSq() > 0.01) {
      move.normalize().multiplyScalar(WALK_SPEED * delta);
      camera.position.add(move);
      camera.position.x = Math.max(-(halfW-0.6), Math.min(halfW-0.6, camera.position.x));
      camera.position.z = Math.max(-(halfD-0.6), Math.min(halfD-0.6, camera.position.z));
      camera.position.y = EYE_Y;  // no flying
    }
  });
  return null;
}
```

**Teleport — secondary mode (right thumbstick)**
- Right thumbstick click (gamepad button 3) toggles teleport mode
- In teleport mode: a visible arc from left controller projects onto the floor, showing landing point
- Right trigger releases to move to that point (instant position change, no smooth interpolation — matches teleport convention)
- A small VR settings toggle persists mode preference to localStorage `vas_vrLocomotion` (`"smooth"` | `"teleport"`)

**VR comfort features**
- Optional vignette during movement (`vas_vrVignette` setting, default on): dark oval fade at viewport edges during locomotion — reduces motion sickness significantly
- `XRReferenceSpaceType = 'local-floor'` (standing, most common), fallback to `'local'` (seated)
- Movement speed in VR matches desktop walk speed so distances feel consistent

---

### 4D. Controller Interaction & Artwork Selection

**Right controller ray**
- Use `<XRRayInteractor />` from `@react-three/xr` mounted on the right controller, or a custom ray built on the right input source's world position/direction
- Visible ray: thin amber line (`<Line>` from drei, color `theme.accentLight`, lineWidth 1, 8-unit length)
- Ray intersects artwork frame meshes using the existing `artworkId` userData traversal logic from `fireCenterRaycast` — exact same code path, just fed different origin/direction

**Trigger to inspect**
```typescript
// selectstart fires when trigger is pressed
xrControllerEvents.on('selectstart', (event) => {
  if (event.inputSource.handedness === 'right') {
    const hitArtwork = raycastFromController(event.inputSource, scene);
    if (hitArtwork) onArtworkSelect(hitArtwork);
  }
});
```

**Haptic feedback**
- When ray hits an artwork frame: brief 0.04s pulse at 0.3 intensity (`inputSource.gamepad.hapticActuators[0]?.pulse(0.3, 40)`)
- When trigger fires and opens the panel: sharper 0.08s pulse at 0.5 intensity
- When dropping an artwork in edit mode: short double-pulse (grab feeling)

---

### 4E. VR Artwork Info Panel

Replaces the 2D `ArtworkDetailModal` inside XR sessions.

**Positioning**
- Panel spawns 1.8 units in front of the player at `EYE_Y` (eye level), facing the camera
- Slight angle toward player (billboard mode, always faces camera)
- Appears with a brief scale-in animation (0 → 1 over 0.2s)

**Content — `VRInfoPanel` component**
```tsx
// Uses @react-three/drei <Html transform> — renders DOM inside 3D space
<Html transform position={panelPos} rotation={panelRot} scale={0.35}>
  <div className="vr-info-panel"> {/* dark amber glass panel */}
    <img src={artwork.imageUrl} />
    <h2>{artwork.title}</h2>
    <p className="artist">{artwork.artistName} · {artwork.year}</p>
    <p className="medium">{artwork.medium}</p>
    <p className="description">{artwork.description}</p>
    <button onClick={onDismiss}>Close</button>
  </div>
</Html>
```
- Styled with dark glass (`bg-black/85 border border-amber/30`) matching existing aesthetic
- Panel width: ~400px CSS (renders as ~0.14 world units at scale 0.35 — readable in headset)

**Dismiss**
- Right trigger again
- B button (right controller) or Y button (left controller)
- `selectstart` on either controller while panel is open
- Auto-dismiss after 60s of inactivity

---

### 4F. VR Edit Mode

When the authenticated gallery owner enters VR while edit mode is active:

**Wrist menu**
- Left wrist shows a small panel when player glances at their left palm (detects palm facing camera using left controller orientation)
- Content: Theme swatches, Density slider, Save, Discard, Preview mode toggle
- Rendered as `<Html transform>` on the left controller group

**Grabbing artworks (right grip)**
- Right grip button (gamepad button 1) while controller is near a frame → picks it up
- Frame follows right controller position at an arm's-length offset
- Releasing grip → frame snaps to nearest wall using the same wall-detection logic as desktop edit mode
- Controller haptic: low rumble while holding, sharp double-pulse on release/snap

**Two-hand scale**
- While holding a frame with right grip, activate left grip as well
- Track distance between the two controllers: increases → scale up, decreases → scale down
- Min/max same as desktop: 0.4× to 2.5×

**Placing decorations in VR**
- Select decoration type from wrist menu
- A ghost preview of the decoration follows the right controller's ray projected onto the floor
- Right trigger places it
- Same collision clearance rules as desktop

**VR Room Resize**
- Experimental in this phase: right controller pointing at a wall + holding grip allows pushing/pulling the wall
- Minimal viable: at minimum expose a room size +/- button in the wrist menu rather than the spatial drag

---

### 4G. Overlay Management During XR

**While `isPresenting === true`, suppress all 2D overlays:**
- PointerLockControls (`controlsRef.current?.disconnect()` or just don't mount when presenting)
- Click-to-enter prompt overlay
- Mobile joystick (`VirtualJoystick`)
- Mobile controller button cluster
- Desktop crosshair `<Html>` overlay
- Interact hint strip
- Pause overlay
- Edit mode toolbar HTML (replaced by wrist menu)

**Show while presenting:**
- `<XRDomOverlay>`: "Exit VR" button, and if in edit mode: "Save" / "Discard" as a minimal top strip

**Session end cleanup:**
```typescript
useEffect(() => {
  if (!isPresenting) {
    setSelectedArtwork(null);
    setIsLocked(false);
    // restore correct control mode (desktop vs mobile already determined by isMobile)
  }
}, [isPresenting]);
```

---

## 5. DB Changes

| Table | Column | Type | Default | Phase |
|---|---|---|---|---|
| `galleries` | `room_height` | `integer` | `5` | 2C |
| `galleries` | `lighting_mood` | `real` | `1.0` | 2E |
| `galleries` | `accent_color_override` | `text` | `null` | 2E stretch |
| New table | `gallery_decorations` | — | — | 2D |

**`gallery_decorations` schema:**
```typescript
export const galleryDecorationsTable = pgTable("gallery_decorations", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull().references(() => galleriesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),  // "bench" | "plinth" | "plant" | "lamp" | "placard"
  x: real("x").notNull(),
  z: real("z").notNull(),
  rotY: real("rot_y").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

> After any schema change: `pnpm run typecheck:libs` then `pnpm --filter @workspace/db run push`

---

## 6. API Changes

All new endpoints follow the existing contract-first workflow:
1. Edit `lib/api-spec/openapi.yaml` first
2. Run `pnpm --filter @workspace/api-spec run codegen`
3. Implement route handler
4. Import generated Zod schema in route for validation

| Method | Path | Auth | Phase |
|---|---|---|---|
| `PATCH` | `/api/artworks/:id/placement` | owner | 2B |
| `PATCH` | `/api/galleries/:id/room` | owner | 2C / 2E |
| `POST` | `/api/galleries/:id/decorations` | owner | 2D |
| `DELETE` | `/api/galleries/:id/decorations/:decorId` | owner | 2D |
| `PATCH` | `/api/galleries/:id/decorations/:decorId` | owner | 2D |
| `GET` | `/api/public/galleries/:slug/decorations` | none | 2D (public viewer) |

---

## 7. Technical Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Base64 image URLs → GPU memory pressure in VR | **High** | VR phase coincides with object storage migration (Stage 3). Real URLs with proper CDN will fix this. If object storage isn't ready, add a `MAX_TEXTURE_SIZE = 1024` cap that downscales base64 images before upload as a temporary fix. |
| `PointerLockControls` conflict with XR session | **High** | Conditional mounting: `{!isPresenting && <PointerLockControls />}`. Already flagged in old task file. |
| `<Html>` components from drei have perf cost in VR | **Medium** | VRInfoPanel and wrist menu should use `<Html transform occlude>` and be unmounted when not in use. Consider a fully-3D alternative (geometry + `@react-three/drei Text`) for the wrist menu if framerate suffers. |
| iOS Safari WebXR support is inconsistent | **Medium** | Apple Vision Pro uses its own visionOS WebXR path. Test specifically on Vision Pro Safari. Fallback: display a `"VR not supported on this browser"` message only when `isSessionSupported` resolves false, which already handles this. |
| 90fps requirement for VR comfort | **High** | Current room renders all decorations unconditionally. Add frustum culling (`camera.frustum.containsPoint()` check per decoration) and LOD: decorations > 12 units from camera render as simpler geometry. Target: <2ms render time per frame for the room geometry itself. |
| Edit mode drag + physics feel | **Medium** | Three.js has no built-in physics for wall-snapping. The approach is analytical: raycast against the 4 wall planes (infinite planes defined by normal + point), find the nearest hit, constrain position to that plane. Clean and fast, no physics engine needed. |
| Autosave draft localStorage collision | **Low** | Key is `vas_editDraft_${galleryId}` — unique per gallery. Clear on successful save. Warn the user on page load if a draft is found: `"You have unsaved edits from a previous session — restore?"` |

---

## 8. Out of Scope (for Stage 3)

- Hand tracking without controllers
- Multiplayer / seeing other visitors in VR (Stage 4 social)
- Oculus/Meta store submission (web-based only)
- Custom 3D controller models (use default XR controller meshes provided by `@react-three/xr`)
- Seated/stationary scale calibration UI
- VR UI for the gallery list, dashboard, or artwork management (VR is gallery viewer only)
- Spectator view (seeing what the VR user sees on a connected 2D screen)
- Eye-tracking (not in WebXR standard yet)
- Passthrough / mixed reality (AR — future stage)
- Stage 4 CDN, sharding, image optimization pipeline

---

## 9. Dependency Order

```
Phase 1 — Room & Controls Polish
  ↓  ships independently, zero VR dependency
  ↓  improves every visitor's experience immediately

Phase 2 — Live Edit Mode
  ↓  reuses Phase 1 pause overlay and proximity feedback
  ↓  builds the drag/placement/save infrastructure that VR edit mode reuses

Phase 3 — VR/WebXR
       reuses Phase 2 drag/resize/place logic for VR edit mode
       reuses Phase 1 proximity glow and movement feel
       XR session management is fully additive — doesn't touch Phase 1/2 logic
```

Each phase is independently shippable and valuable. Phases 1 and 2 can be built and tested entirely in the browser — no headset needed.

---

## 10. Key Files Map

| File | Phase(s) | Change type |
|---|---|---|
| `GalleryScene.tsx` | 1, 2, 3 | Major changes — movement, proximity, XR setup |
| `ArtworkFrame.tsx` | 1B, 2B | Proximity glow, edit mode handles |
| `TouchControls.tsx` | 1A, 1D | Acceleration, smoothing, sensitivity |
| `GalleryRoom.tsx` | 1C, 1D, 3A, 3G | Entrance UX, pause overlay, XR store, overlay gating |
| `RoomDecorations.tsx` | 2D | Manual placement integration |
| `theme-config.ts` | 1C, 2E | New Limestone theme, lighting mood |
| `room-dimensions.ts` | 2C | Room height scale |
| `public-gallery-detail.tsx` | 1D, 3B | Entrance rework, Enter VR button |
| `lib/db/src/schema/galleries.ts` | 2C, 2E | room_height, lighting_mood columns |
| `lib/api-spec/openapi.yaml` | 2F | New endpoints |
| `artifacts/api-server/src/routes/artworks.ts` | 2B | Placement PATCH |
| `artifacts/api-server/src/routes/galleries.ts` | 2C, 2E | Room PATCH |
| **New:** `AmbientAudio.tsx` | 1C | Ambient sound component |
| **New:** `XRLocomotion.tsx` | 3C | VR thumbstick movement |
| **New:** `XRControllerRay.tsx` | 3D | Controller ray + haptics |
| **New:** `VRInfoPanel.tsx` | 3E, 3F | VR artwork panel + wrist menu |
| **New:** `VREditControls.tsx` | 3F | VR grab/scale/place for edit mode |
| **New:** `lib/db/src/schema/galleryDecorations.ts` | 2D | Manual decoration positions table |
| **New:** `artifacts/api-server/src/routes/galleryDecorations.ts` | 2D | Decoration CRUD routes |
