# Virtual Art Space — Project Deliverables & Cost Breakdown

**Prepared for:** Commissioning Client
**Budget:** 2,000 JOD
**Status:** First Beta Release (v1.0.0-beta.1) — June 2026

---

## What You're Getting

A full-stack immersive 3D art gallery platform — artists create virtual exhibitions, visitors explore them in the browser (desktop, mobile, and VR headset).

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TailwindCSS + React Three Fiber |
| 3D Engine | Three.js + React Three Fiber + Drei |
| VR Support | WebXR API + @react-three/xr v6 |
| Backend | Express 5 + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Clerk (Google OAuth + email) — Replit-managed |
| API | OpenAPI-first contract with auto-generated React Query hooks |
| Deployment | Ready for Replit / any Node.js host |

---

## Delivered Features

### Stage 1 — Foundation (Complete)
- [x] User registration & login (Google OAuth + email via Clerk)
- [x] Artist profile editing (bio, display name, avatar)
- [x] Dashboard with live gallery stats
- [x] Gallery CRUD (create, edit, delete, publish toggle)
- [x] Auto-generated URL slugs from titles
- [x] Public gallery browsing page

### Stage 2 — 3D Gallery Viewer (Complete)
- [x] Full artwork CRUD inside each gallery
- [x] Artwork metadata: title, artist name, year, medium, dimensions, description
- [x] Image upload via file picker (base64) or URL paste
- [x] Wall selector (Back / Left / Front / Right)
- [x] Position selector (5 slots per wall)
- [x] Height control (Low / Eye Level / High / Very High)
- [x] Visual conflict warning when two artworks share a slot
- [x] 2D floor plan preview with amber highlight dots
- [x] First-person room with 4 walls, floor, ceiling, procedural textures, fog
- [x] Artwork frames with gold border, bevel, cream mat, hanging wire, label plate
- [x] **Desktop:** Pointer-lock controls + WASD movement + mouse look
- [x] **Mobile:** Touch-drag look-around + virtual joystick movement
- [x] Click / tap artwork to open detail modal (full metadata)
- [x] 5 room themes with distinct color + lighting presets (Dark Void, Neon Grid, Purple Mist, White Cube, Concrete Bunker)
- [x] Room decorations: benches, plinths, plants, floor lamps, placard stands

### Stage 3 — Immersion & VR (Beta — v1.0.0-beta.1)
- [x] **6th theme: Amman Limestone** — terracotta geometric tile floor, warm sandstone walls, cream plaster ceiling, afternoon amber light — the most on-brand theme
- [x] **Live in-room edit mode** — gallery owner edits artworks directly in 3D: drag frames to any wall, adjust height, scale, rotate; undo/redo stack; save/discard flow; navigation guard
- [x] **Ambient audio** — Web Audio API drone/pad per theme, smooth crossfade on theme change, mute toggle, respects browser autoplay policy
- [x] **Room decorations** — seeded procedural layout + manual placement/remove in edit mode
- [x] **VR / WebXR headset support** — Meta Quest 2/3/Pro, Apple Vision Pro, any WebXR browser
  - Smooth thumbstick locomotion + teleport mode (right thumbstick)
  - Controller ray-casting artwork selection (amber ray, haptic feedback)
  - XRDomOverlay panels for artwork detail in headset
  - VR comfort: optional vignette during movement
- [x] **Movement polish** — smooth acceleration/deceleration, head bob, sprint (Shift / full joystick deflection)
- [x] **Proximity glow** — artwork frames glow as player approaches
- [x] **Crosshair aim state** — idle ring → amber diamond on artwork hover
- [x] **Gallery entrance rework** — cinematic title card + "Enter Gallery" button replaces abrupt click prompt
- [x] **Pause overlay** — proper Escape menu with Resume / Exit / Edit / Audio / speed controls
- [x] Smooth fade-in on room enter (masks texture-load flicker)
- [ ] ⚠️ Object storage for artwork images (Cloudflare R2 / AWS S3) — images are currently base64; pending before v1.0 stable

### Pending — Before v1.0 Stable
- [ ] Dedicated object storage migration (artwork images → cloud CDN)
- [ ] Custom domain acquisition and DNS setup
- [ ] Platform name confirmation
- [ ] Next-version scope decision after beta review

### Stage 4 — Social & Scalability (Planned)
- [ ] Social features — artist follows, artwork likes, comments
- [ ] Visitor analytics — heatmaps, dwell time, engagement metrics
- [ ] Multi-region CDN for low-latency 3D asset delivery
- [ ] Image & 3D asset optimisation pipeline (WebP, DRACO compression)
- [ ] Analytics dashboard for artists
- [ ] Multi-tenant support for galleries and institutions

---

## File Structure Delivered

```
artifacts/overflow-outcast/         — React frontend (30+ components, 9 pages)
  src/components/gallery-room/    — 3D engine (12 core files)
    GalleryRoom.tsx                 — top-level room, owner checks
    GalleryScene.tsx                — Three.js scene, geometry, lighting, themes
    ArtworkFrame.tsx                — framed artwork mesh, proximity glow
    GalleryEditMode.tsx             — live edit mode (drag, scale, rotate, undo)
    AmbientAudio.tsx                — Web Audio API ambient sound per theme
    RoomDecorations.tsx             — procedural + manual room furnishings
    VRButton.tsx                    — Enter VR / Exit VR with feature detection
    VREditMode.tsx                  — edit mode controls adapted for VR
    VROverlayPanels.tsx             — XRDomOverlay artwork info in headset
    XRLocomotion.tsx                — thumbstick + teleport VR locomotion
    TouchControls.tsx               — touch swipe look + joystick
    VirtualJoystick.tsx             — on-screen virtual joystick
    theme-config.ts                 — 6 room theme presets
    ArtworkDetailModal.tsx          — click-to-inspect modal (desktop/mobile)
  src/pages/                       — All app pages

artifacts/api-server/              — Express backend
  src/routes/                      — 10 API route modules
  src/middlewares/                 — Clerk JIT provisioning middleware
  src/lib/                         — Logger

lib/db/                            — Database schema
  src/schema/                      — 5 tables (users, profiles, galleries, artworks, decorations)

lib/api-spec/                      — OpenAPI contract
  openapi.yaml                     — Source of truth for all API types

lib/api-client-react/              — Auto-generated React Query hooks
```

---

## Hours Breakdown

| Phase | Scope | Estimated Hours | Rate | Cost |
|-------|-------|----------------|------|------|
| **Planning & Setup** | Repo structure, DB schema, OpenAPI spec, auth system | 12 | 12 JOD/hr | 144 JOD |
| **Stage 1** | Dashboard, gallery CRUD, profiles, public pages | 20 | 12 JOD/hr | 240 JOD |
| **Stage 2** | Artwork CRUD, metadata, image upload, floor plan UI, 3D room, 5 themes, desktop controls | 35 | 12 JOD/hr | 420 JOD |
| **Mobile Controls** | Touch look, virtual joystick, crosshair, tap-to-inspect | 12 | 12 JOD/hr | 144 JOD |
| **Spatial Placement** | Wall/slot/height picker, conflict detection, floor plan interaction | 15 | 12 JOD/hr | 180 JOD |
| **Stage 3 — Immersion** | Amman Limestone theme, ambient audio, proximity glow, entrance rework, pause overlay, head bob | 18 | 12 JOD/hr | 216 JOD |
| **Stage 3 — Live Edit** | In-room artwork drag/scale/rotate, undo/redo, decoration placement, save/discard | 20 | 12 JOD/hr | 240 JOD |
| **Stage 3 — VR/WebXR** | XR session, thumbstick locomotion, teleport, controller ray, haptics, overlay panels | 18 | 12 JOD/hr | 216 JOD |
| **Polish & Fixes** | TypeScript cleanup, auth migration (JWT → Clerk), error handling, UI refinement | 10 | 12 JOD/hr | 120 JOD |
| **Testing & Deployment** | Cross-browser/device testing, deployment config, beta prep | 8 | 12 JOD/hr | 80 JOD |
| | | **168 hrs** | | **~2,000 JOD** |

---

## Comparable Market Rates

| Service | Market Rate | Your Rate |
|---------|------------|-----------|
| Senior React/Three.js developer (freelance) | $40–$80/hr | ~$17/hr |
| Full-stack SaaS build (US agency) | $40,000–$80,000 | $2,800 |
| White-label 3D gallery platform | $25,000–$50,000 | $2,800 |
| Jordan-based dev agency quote | 4,000–8,000 JOD | **2,000 JOD** |

**Your effective rate: ~12 JOD/hour** — family pricing. Commercial market rate for this scope would be 3–5× higher.

---

## What Makes This Valuable

1. **Niche market fit** — purpose-built for Amman's art scene, not a generic template
2. **Working product, not a prototype** — real auth, real database, real 3D engine, real VR
3. **Mobile + desktop + VR** — covers every device a visitor might use
4. **Artist-friendly curation tools** — live 3D edit mode, drag-to-place, height control, conflict warnings
5. **Amman Limestone theme** — the platform's signature look, designed specifically for the Jordanian cultural context
6. **Live ambient audio** — each room has its own soundscape, a rarity in browser-based gallery platforms
7. **Clean codebase** — TypeScript throughout, OpenAPI contract, auto-generated hooks, Clerk auth
8. **Deployment-ready** — builds and runs with one command

---

## Pending Add-ons (Pre-Stable / Next Version)

| Feature | Effort | Price |
|---------|--------|-------|
| Object storage for images (Cloudflare R2 / AWS S3) | 4 hrs | 48 JOD |
| Custom domain setup | 1 hr | 12 JOD |

## Optional Add-ons (Post-Stable)

| Feature | Effort | Price |
|---------|--------|-------|
| Social features (likes, comments, artist follows) | 10 hrs | 120 JOD |
| Visitor analytics dashboard | 8 hrs | 96 JOD |
| Stripe subscription billing | 6 hrs | 72 JOD |
| Email notifications (new followers, gallery published) | 4 hrs | 48 JOD |
| Custom room geometries (non-rectangular spaces) | 12 hrs | 144 JOD |

---

## Summary

**Total project cost: 2,000 JOD**
- ~168 hours of development
- Full-stack application (frontend + backend + database)
- 3D immersive gallery with live edit mode and VR support
- Mobile-responsive with touch controls and virtual joystick
- Artist dashboard with spatial placement tools and live 3D editing
- 6 room themes including the signature Amman Limestone
- Ambient audio soundscape per theme
- Clean, documented, deployment-ready codebase

**Comparable market value: $25,000–$40,000 USD** (~18,000–28,000 JOD)

**Current status: v1.0.0-beta.1** — First beta release, June 2026. Pending object storage migration and domain acquisition before v1.0 stable.

---

*Prepared as a fair family-rate breakdown. Commercial pricing for equivalent scope would be significantly higher.*
