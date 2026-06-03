# Virtual Art Space

An immersive virtual reality art exhibition platform for the Amman art scene — artists create and share 3D galleries, visitors explore them in the browser.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/overflow-outcast run dev` — run the frontend (port 23679)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages (used by deployment)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `CLERK_SECRET_KEY` / `VITE_CLERK_PUBLISHABLE_KEY` — Replit-managed Clerk (set automatically)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS + wouter + React Three Fiber
- API: Express 5 + @clerk/express
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk (Replit-managed) — JWT/bcrypt fully removed
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)
- VR: @react-three/xr v6.6.29

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (users, profiles, galleries, artworks)
- `lib/api-client-react/src/custom-fetch.ts` — Bearer token injection via `setAuthTokenGetter`
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/requireAuth.ts` — Clerk JIT provisioning middleware
- `artifacts/api-server/src/app.ts` — Express app with `clerkMiddleware()`
- `artifacts/overflow-outcast/src/` — React frontend
- `artifacts/overflow-outcast/src/lib/auth.tsx` — Clerk `AuthContext`, `ClerkAuthSync` component
- `artifacts/overflow-outcast/src/components/gallery-room/` — 3D gallery room (React Three Fiber)
  - `GalleryRoom.tsx` — top-level room component, auth/owner checks
  - `GalleryScene.tsx` — Three.js scene: geometry, lighting, themes, movement
  - `ArtworkFrame.tsx` — individual framed artwork mesh with proximity glow
  - `GalleryEditMode.tsx` — live in-room edit mode (drag, scale, rotate artworks)
  - `AmbientAudio.tsx` — Web Audio API ambient sound per theme
  - `RoomDecorations.tsx` — benches, plinths, plants, lamps (seeded + manual)
  - `VRButton.tsx` / `VREditMode.tsx` / `VROverlayPanels.tsx` — WebXR UI
  - `XRLocomotion.tsx` — VR thumbstick movement + teleport
  - `TouchControls.tsx` / `VirtualJoystick.tsx` — mobile controls
  - `theme-config.ts` — 6 room themes including Amman Limestone

## Architecture decisions

- Auth: Replit-managed Clerk. `ClerkAuthSync` in `App.tsx` registers `getToken()` so `custom-fetch.ts` auto-attaches Bearer tokens to all API calls.
- JIT provisioning: on first authenticated API call, `requireAuth.ts` creates a local DB user from the Clerk identity. Email collision handled by linking existing account by email.
- Gallery slugs auto-generated from title + random suffix at creation time.
- File uploads (artwork images) handled via base64 URL strings — object storage (Cloudflare R2 / AWS S3) is the next infrastructure step before v1.0 stable.
- All DB schema lives in `lib/db` composite lib — rebuild with `pnpm run typecheck:libs` before typechecking api-server. -- important
- Vite configs use env var fallbacks (`PORT ?? default`, `BASE_PATH ?? "/"`) so `pnpm run build` works in deployment without those vars being set.
- VR is purely additive: the 2D browser experience is completely unchanged when no headset is present. `@react-three/xr` wraps the existing Canvas with `<XR>`, `XROrigin` maps floor-level tracking to EYE_Y.
- Edit mode access-controlled by comparing `gallery.userId` with `useGetAuthMe()` — owner only, button absent from DOM for visitors.

## Product

**Stage 1 (complete):** Auth via Clerk (Google OAuth + email), artist dashboard with stats, gallery CRUD, profile editing, public gallery browsing.

**Stage 2 (complete):** 3D gallery room viewer with React Three Fiber, keyboard/mouse/touch movement controls, artwork display as framed images on walls, click-to-view artwork detail modal (responsive for mobile landscape), spatial placement (wall/slot/height picker, conflict detection, floor plan preview).

**Stage 3 (beta — v1.0.0-beta.1, June 2026):**
- Live in-room edit mode: drag/scale/rotate artwork frames, room reshape, decoration placement, undo/redo
- Ambient audio per theme via Web Audio API, mute toggle, smooth fade between tracks
- 6th room theme: Amman Limestone (terracotta tile floor, warm sandstone walls)
- Room decorations: benches, plinths, plants, floor lamps, placard stands (seeded RNG + manual placement)
- VR/WebXR support: thumbstick locomotion, teleport mode, controller raycast artwork selection, haptic feedback, XRDomOverlay panels
- Movement polish: smooth acceleration/deceleration, head bob, sprint (Shift / full joystick)
- Artwork proximity glow and crosshair aim state
- Fade-in on room enter, gallery title card entrance
- Pause/resume overlay replacing the broken Escape → blank state
- ⚠️ Pending: object storage for artwork images (still base64)

**Pending before v1.0 stable:**
- Dedicated object storage (Cloudflare R2 or AWS S3) for artwork images — base64 is a hard problem at WebGL/VR GPU memory scale
- Custom domain acquisition (platform name TBD)
- Next version scope decision after reviewing beta

**Stage 4 (planned):** Social features (follows, likes, comments), visitor analytics (heatmaps, dwell time), multi-region CDN for 3D asset delivery, image/asset optimisation pipeline (WebP, DRACO compression), visitor analytics dashboard, multi-tenant support for galleries and institutions.

## User preferences

- Platform name: **Virtual Art Space** — to be confirmed before domain purchase (repo alias "Overflow Outcast" is developer's name)
- Target scene: Amman art scene, Jordan — contemporary Arab art, warm cultural vibe
- Aesthetic: dark warm background (charcoal, not cold black) + amber/gold accent, editorial gallery feel
- Font: Playfair Display for headings (italic emphasis), Plus Jakarta Sans for body, DM Mono for mono
- Color primary: HSL 38 92% 50% (warm amber/gold — Amman limestone feel)
- Build stage by stage per the roadmap

## Gotchas

- Always run `pnpm run typecheck:libs` after modifying anything in `lib/db/src/schema/` before typechecking api-server — the composite lib must be rebuilt first
- Re-run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change
- Never use `format: binary` in the OpenAPI spec — it generates `File`/`Blob` types that don't exist in Node.js and break the typecheck
- Dev and production Clerk environments have separate user stores — accounts don't carry over between dev and the published app
- `createXRStore()` must be called at module level (outside component) — calling it inside a component causes passthrough mode errors
- Never write to `camera.position` directly in VR frames — use `XROrigin` offset instead
- `<Html>` from drei is invisible inside a VR headset — use `<XRDomOverlay>` for any HUD/UI that needs to show in headset

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `.agents/memory/webxr-gotchas.md` for WebXR/react-three-xr specific pitfalls
