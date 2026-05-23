# Overflow Outcast

An immersive virtual reality art exhibition platform where artists create and share 3D galleries and visitors explore them in the browser.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/overflow-outcast run dev` — run the frontend (port 23679)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `JWT_SECRET` — JWT signing secret (set in shared env)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS + wouter + React Three Fiber (Stage 2+)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken) + bcryptjs
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (users, profiles, galleries, artworks)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/auth.ts` — JWT sign/verify + bcrypt helpers
- `artifacts/api-server/src/middlewares/requireAuth.ts` — JWT auth middleware
- `artifacts/overflow-outcast/src/` — React frontend
- `artifacts/overflow-outcast/src/lib/auth.tsx` — AuthContext (token storage, login/logout)

## Architecture decisions

- JWT stored in `localStorage` under key `overflow_token`; `custom-fetch.ts` auto-attaches it to all API calls
- All new users get a profile row created on registration
- Gallery slugs are auto-generated from title + random suffix at creation time
- File uploads (artwork images) handled via base64 URL strings in Stage 1; object storage in a later stage
- All DB schema lives in `lib/db` composite lib and is rebuilt before the api-server typecheck

## Product

**Stage 1 (complete):** Auth (register/login), artist dashboard with stats, gallery CRUD, profile editing, public gallery browsing.

**Stage 2 (next):** 3D gallery room viewer with React Three Fiber, keyboard/mouse movement controls, artwork display as framed images on walls, click-to-view details modal.

**Stage 3+:** Room themes, artwork upload to object storage, VR/WebXR support, social features.

## User preferences

- Platform name: Virtual Art Space (user alias "Overflow Outcast" is NOT the app name)
- Target scene: Amman art scene, Jordan — contemporary Arab art, warm cultural vibe
- Aesthetic: dark warm background (charcoal, not cold black) + amber/gold accent, editorial gallery feel
- Font: Playfair Display for headings (italic emphasis), Plus Jakarta Sans for body, DM Mono for mono
- Color primary: HSL 38 92% 50% (warm amber/gold — Amman limestone feel)
- Build stage by stage per the roadmap (Stage 1 → 2 → 3...)

## Gotchas

- Always run `pnpm run typecheck:libs` after modifying anything in `lib/db/src/schema/` before typechecking api-server — the composite lib must be rebuilt first
- Re-run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change
- Never use `format: binary` in the OpenAPI spec — it generates `File`/`Blob` types that don't exist in Node.js and break the typecheck

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
