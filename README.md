# Virtual Art Space
An immersive virtual 3D gallery platform for the Amman art scene. Artists create and share gallery rooms; visitors explore them in the browser — no headset required. WebXR support is available for VR headsets.
![Virtual Art Space](https://img.shields.io/badge/version-v1.0.0--beta.2-orange) ![Node.js](https://img.shields.io/badge/node-24-green) ![License](https://img.shields.io/badge/license-MIT-blue)
## Features
- **Dedicated Object Storage** — artwork images stored in Replit Object Storage (GCS-backed); signed upload URLs, no base64
- **3D Gallery Rooms** — walk through your gallery with keyboard/mouse, touch, or a VR headset
- **6 Room Themes** — including Amman Limestone (warm sandstone + terracotta tile)
- **Live Edit Mode** — drag, scale, and rotate artwork frames in real time; undo/redo
- **Room Customisation** — resize walls, change lighting mood, add decorations (benches, plants, lamps)
- **Ambient Audio** — per-theme soundscapes with mute toggle and smooth fade
- **WebXR / VR Support** — thumbstick locomotion, teleport mode, controller raycast selection, haptic feedback
- **Auth** — Google OAuth + email via Clerk
- **Artist Dashboard** — gallery stats, artwork management, profile editing
- **Public Browse** — discover and explore other artists' galleries
## Tech Stack
| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + TailwindCSS + wouter |
| 3D / VR | React Three Fiber + @react-three/drei + @react-three/xr v6 |
| API | Express 5 + Clerk auth middleware |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Replit-managed Clerk (Google OAuth + email) |
| Validation | Zod v4 + drizzle-zod |
| API codegen | Orval (OpenAPI → React Query hooks + Zod schemas) |
| Build | esbuild (ESM bundle) + pnpm workspaces |
| Storage | Replit Object Storage (GCS-backed) — signed upload URLs, public + private endpoints |

### Performance
- `three`, `@react-three/fiber`, `@react-three/drei`, and `@react-three/xr` are deduplicated via Vite `resolve.dedupe` + `optimizeDeps.include` — eliminates duplicate Three.js instances that previously caused warnings and wasted memory
- Vite cold start: ~289ms
## Project Structure
artifacts/
overflow-outcast/ # React + Vite frontend
api-server/ # Express 5 API
lib/
api-spec/ # OpenAPI contract (source of truth)
api-client-react/ # Generated React Query hooks
db/ # Drizzle schema + migrations

## Getting Started
### Prerequisites
- Node.js 24+
- pnpm 9+
- PostgreSQL database
- [Clerk](https://clerk.com) account (for auth)

### Environment Variables

DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_...
VITE_CLERK_PUBLISHABLE_KEY=pk_...
Install & Run
# Install dependencies
pnpm install
# Push database schema
pnpm --filter @workspace/db run push
# Start API server (port 8080)
pnpm --filter @workspace/api-server run dev
# Start frontend (port 23679)
pnpm --filter @workspace/overflow-outcast run dev
Codegen (after OpenAPI spec changes)
pnpm --filter @workspace/api-spec run codegen
Typecheck
pnpm run typecheck
Roadmap
Stage   Status
Auth, artist dashboard, gallery CRUD, public browse     ✅ Complete
3D gallery viewer, keyboard/mouse/touch controls, artwork placement     ✅ Complete
Live edit mode, ambient audio, VR/WebXR, room themes & decorations      🟡 Beta
Social features, visitor analytics, CDN delivery, image pipeline        📋 Planned
Before v1.0 Stable
Custom domain (platform name to be confirmed)
Next-version scope decision after beta review
Controls
Action  Desktop Mobile
Move    W A S D or Arrow keys   Virtual joystick
Look    Mouse (pointer lock)    Touch drag
Sprint  Shift   Full joystick
Interact        Click   Tap
Pause / exit lock       Escape  —
Toolbar (edit mode)     Ctrl (releases lock)    Touch UI
Contributing
Issues and PRs are welcome. Please open an issue first for significant changes.

License
MIT
