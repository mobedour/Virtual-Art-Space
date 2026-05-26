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

## Architecture decisions

- Auth: Replit-managed Clerk. `ClerkAuthSync` in `App.tsx` registers `getToken()` so `custom-fetch.ts` auto-attaches Bearer tokens to all API calls.
- JIT provisioning: on first authenticated API call, `requireAuth.ts` creates a local DB user from the Clerk identity. Email collision handled by linking existing account by email.
- Gallery slugs auto-generated from title + random suffix at creation time.
- File uploads (artwork images) handled via base64 URL strings; object storage planned for Stage 3.
- All DB schema lives in `lib/db` composite lib — rebuild with `pnpm run typecheck:libs` before typechecking api-server.
- Vite configs use env var fallbacks (`PORT ?? default`, `BASE_PATH ?? "/"`) so `pnpm run build` works in deployment without those vars being set.

## Product

**Stage 1 (complete):** Auth via Clerk (Google OAuth + email), artist dashboard with stats, gallery CRUD, profile editing, public gallery browsing.

**Stage 2 (complete):** 3D gallery room viewer with React Three Fiber, keyboard/mouse/touch movement controls, artwork display as framed images on walls, click-to-view artwork detail modal (responsive for mobile landscape).

**Stage 3 (next):** Artwork upload to object storage, room theme customization, VR/WebXR support, social features (follows, likes, comments).

## User preferences

- Platform name: **Virtual Art Space** (repo alias "Overflow Outcast" is NOT the app name)
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

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
