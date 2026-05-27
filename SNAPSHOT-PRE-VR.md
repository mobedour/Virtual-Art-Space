# Snapshot — Pre-VR Baseline

**Date:** May 27, 2026
**Commit:** `695d4b0` — *Add comprehensive documentation for the project's filesystem and data flow*
**Status:** ✅ Stable, fully working, ready as a rollback point before Stage 3 VR/WebXR work begins.

---

## What this snapshot is

This document marks the **last known-good state** of the Virtual Art Space
project before any VR / WebXR code is introduced. If anything goes wrong
during the Stage 3 VR build, this is the safe point to return to.

To roll back to this exact state, use the Replit checkpoint system and
restore commit `695d4b0`.

---

## Verified working at this snapshot

### ✅ Build & Typecheck
- `pnpm run typecheck` — passes cleanly across all 4 packages
  - `lib/api-spec`, `lib/api-zod`, `lib/api-client-react`, `lib/db` (composite libs)
  - `artifacts/api-server`, `artifacts/overflow-outcast`, `artifacts/mockup-sandbox`, `scripts` (leaf packages)
- Working tree is clean — no uncommitted changes.

### ✅ Running Workflows
| Workflow | Port | Status |
|---|---|---|
| `artifacts/api-server: API Server` | 8080 | Running |
| `artifacts/overflow-outcast: web` | 23679 | Running |
| `artifacts/mockup-sandbox: Component Preview Server` | 8081 | Running |

### ✅ Frontend (homepage screenshot captured)
- Renders without errors
- Hero ("Your Art. Boundless Space.") loads with Amman background image
- Navigation: Galleries / Sign In / Exhibit buttons working
- Clerk auth initializing correctly (dev keys loaded)
- No console errors

### ✅ Backend routes mounted
```
/api/healthz
/api/auth/me
/api/profile
/api/galleries          (private CRUD)
/api/galleries/:id/artworks
/api/public/galleries   (public browse)
/api/dashboard/stats
/api/changelog/*        (SSE stream + download)
```

### ✅ Database schema (4 tables)
- `users` — Clerk-linked accounts with JIT provisioning
- `profiles` — artist bio / avatar / socials
- `galleries` — gallery rooms with auto-generated slugs + theme key
- `artworks` — framed images with dimensions + medium metadata

### ✅ 3D Engine (gallery-room/)
All 9 files present and working:
```
ArtworkDetailModal.tsx    GalleryRoom.tsx       RoomDecorations.tsx
ArtworkFrame.tsx          GalleryScene.tsx      TouchControls.tsx
VirtualJoystick.tsx       room-dimensions.ts    seeded-rng.ts
                          theme-config.ts
```

---

## Features complete at this snapshot

### Stage 1 — Foundation ✅
- Clerk authentication (Google OAuth + email magic link)
- Replit-managed Clerk integration (no manual key setup)
- JIT user provisioning via `requireAuth` middleware
- Artist dashboard with gallery + artwork stats
- Gallery CRUD (create, edit, publish, delete)
- Artwork CRUD with base64 image upload
- Profile editing (bio, avatar, location, socials)
- Public gallery browse page
- Public gallery detail page

### Stage 2 — Immersive 3D ✅
- React Three Fiber 3D room renderer
- 5 selectable room themes (Dark Void, Neon Grid, Concrete, White Cube, Limestone)
- First-person navigation (WASD + mouse-look on desktop)
- Touch controls + on-screen joystick (mobile / landscape)
- Artwork frames mounted on walls with deterministic positioning
- Click-to-view artwork detail modal (responsive)
- Spotlights, pedestals, ambient decorations per theme
- Seeded RNG ensures layouts are stable across reloads

### Documentation ✅
- `replit.md` — project memory with stack, architecture, roadmap, gotchas
- `FILESYSTEM.md` — full 827-line filesystem + data flow reference
- `/changelog.html` — live client-facing progress page with SSE stream
- `SNAPSHOT-PRE-VR.md` — this document

---

## What's NOT in this snapshot (Stage 3 work begins after this point)

- ❌ WebXR / VR headset support
- ❌ Object storage for artwork uploads (still using base64 data URLs)
- ❌ Room theme customization (only 5 hardcoded themes)
- ❌ Social features (follows, likes, comments)
- ❌ Live visitor presence / multiplayer
- ❌ Asset optimization pipeline (WebP, DRACO compression)

---

## Important context for the next session

### Key files for VR work
- `artifacts/overflow-outcast/src/components/gallery-room/GalleryScene.tsx` — main R3F Canvas, this is where `<XR>` and `<Controllers>` would mount
- `artifacts/overflow-outcast/src/components/gallery-room/theme-config.ts` — room themes (may need VR-specific lighting tweaks)
- `artifacts/overflow-outcast/src/pages/public-gallery-detail.tsx` — gallery viewer page (where a VR toggle button would live)

### Critical gotchas to remember
1. **Always `pnpm run typecheck:libs` after editing `lib/db/src/schema/`** — the composite lib must rebuild before api-server can typecheck.
2. **Re-run codegen** (`pnpm --filter @workspace/api-spec run codegen`) after any change to `lib/api-spec/openapi.yaml`.
3. **Never use `console.log` in server code** — use `req.log` in handlers, `logger` singleton elsewhere.
4. **Never use `format: binary` in OpenAPI** — it generates Node-incompatible `File`/`Blob` types.
5. **Dev and prod Clerk environments have separate user stores** — accounts don't carry over.

### Recommended VR library
- `@react-three/xr` — official R3F WebXR bindings, drop-in compatible with the existing R3F Canvas.

---

## Recent commit history leading to this snapshot

```
695d4b0  Add comprehensive documentation for the project's filesystem and data flow
0652734  Remove detailed filesystem explanation from the changelog
301be9e  Add filesystem explanation dropdown to changelog
30848ac  Published your App
83e67fe  Add beta indicators to the platform interface
71af4e5  Add Stage 4 scalability roadmap and update progress visualization
f0f5553  Update project changelog page to show client-friendly progress
8cebbcb  Make changelog page accessible to clients and improve its functionality
4cbb3e2  Published your App
d5500aa  Add a real-time changelog page for development
```

---

*If you ever need to verify "is the app still in the same shape as the pre-VR
baseline?", compare against this document. Visual proof:
`screenshots/snapshot-pre-vr-home.jpg`.*
