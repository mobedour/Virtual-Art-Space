# Virtual Art Space — Filesystem & Architecture Reference

> A complete map of every file and folder in the project, what each one does,
> why it exists, and how data moves through the system end-to-end.

---

## Table of Contents

1. [Repository Shape](#1-repository-shape)
2. [Root Level](#2-root-level)
3. [Shared Libraries — `lib/`](#3-shared-libraries--lib)
   - [lib/api-spec](#31-libapi-spec--the-contract)
   - [lib/api-zod](#32-libapi-zod--server-side-validation)
   - [lib/api-client-react](#33-libapi-client-react--frontend-data-hooks)
   - [lib/db](#34-libdb--database-layer)
4. [Artifacts — `artifacts/`](#4-artifacts--artifacts)
   - [artifacts/api-server](#41-artifactsapi-server--the-backend)
   - [artifacts/overflow-outcast](#42-artifactsoverflow-outcast--the-frontend)
   - [artifacts/mockup-sandbox](#43-artifactsmockup-sandbox--design-prototyping)
5. [Scripts](#5-scripts)
6. [Data Flow — End to End](#6-data-flow--end-to-end)
   - [Auth flow](#61-auth-flow)
   - [API request flow](#62-api-request-flow--authenticated)
   - [3D gallery load flow](#63-3d-gallery-load-flow)
   - [Code generation pipeline](#64-code-generation-pipeline)
7. [Database Schema](#7-database-schema)
8. [Key Conventions & Rules](#8-key-conventions--rules)

---

## 1. Repository Shape

```
virtual-art-space/                     ← monorepo root
│
├── artifacts/                         ← deployable applications
│   ├── api-server/                    ← Express backend (port 8080)
│   ├── overflow-outcast/              ← React frontend (port 23679)
│   └── mockup-sandbox/               ← UI prototyping environment (port 8081)
│
├── lib/                               ← shared libraries (used by apps above)
│   ├── api-spec/                      ← OpenAPI contract + codegen config
│   ├── api-zod/                       ← auto-generated Zod validators (server)
│   ├── api-client-react/              ← auto-generated React Query hooks (client)
│   └── db/                            ← Drizzle ORM schema + DB connection
│
├── scripts/                           ← utility scripts (seed, etc.)
│
├── package.json                       ← root workspace scripts
├── pnpm-workspace.yaml                ← workspace definition + dependency catalog
├── tsconfig.json                      ← TypeScript solution file (libs only)
├── tsconfig.base.json                 ← shared TS compiler options
├── replit.md                          ← project memory / preferences
└── FILESYSTEM.md                      ← this file
```

**Why a monorepo?**
The frontend, backend, and shared libraries all live in one repository so they
stay in sync. When the API contract changes, one codegen command updates both
the server validators and the client hooks simultaneously — no drift possible.

---

## 2. Root Level

| File | Purpose |
|---|---|
| `pnpm-workspace.yaml` | Declares the three workspace glob patterns (`artifacts/*`, `lib/*`, `scripts`). Also hosts a `catalog:` section that pins shared dependency versions (React, Vite, TypeScript, etc.) so every sub-package uses the same version. |
| `package.json` | Root-level scripts only — no production code. Key scripts: `typecheck` (builds libs then checks apps), `typecheck:libs` (tsc --build for composite libs), `build` (used by deployment). |
| `tsconfig.base.json` | Shared TypeScript compiler defaults: `strict: true`, `target: ESNext`, `moduleResolution: bundler`, `verbatimModuleSyntax`. Every sub-package's `tsconfig.json` extends this. |
| `tsconfig.json` | The TypeScript **solution file**. Lists only the composite `lib/*` packages so `tsc --build` knows the build order. Artifact packages are **not** listed here — they're leaves. |
| `replit.md` | Living project documentation. Contains stack, architecture decisions, roadmap stages, user preferences, and known gotchas. Also the source that feeds the live `/changelog.html` page via SSE. |

---

## 3. Shared Libraries — `lib/`

These packages are never run directly. They are compiled and imported by the
artifacts. All `lib/*` packages are **TypeScript composite** packages — they
emit declaration files (`.d.ts`) and can be referenced by other packages.

---

### 3.1 `lib/api-spec` — The Contract

```
lib/api-spec/
├── openapi.yaml          ← THE single source of truth for the entire API
├── orval.config.ts       ← code-generator configuration
└── package.json
```

**`openapi.yaml`** is the most important file in the entire repo after the
database schema. It describes every HTTP endpoint:

```yaml
# example entry
/api/galleries:
  get:
    summary: List the authenticated user's galleries
    security:
      - BearerAuth: []
    responses:
      '200':
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/Gallery'
```

Every field, every response shape, every auth requirement is declared here.
Neither the frontend nor the backend should ever deviate from this contract.

**`orval.config.ts`** tells the Orval code generator:
- Where to read the spec (`openapi.yaml`)
- Where to write the React Query hooks → `lib/api-client-react/src/generated/`
- Where to write the Zod schemas → `lib/api-zod/src/generated/`
- Which HTTP client to use (`custom-fetch.ts`)

**Run codegen:** `pnpm --filter @workspace/api-spec run codegen`

> ⚠️ Never use `format: binary` in the spec — it generates `File`/`Blob` types
> that don't exist in Node.js and break the typecheck.

---

### 3.2 `lib/api-zod` — Server-side Validation

```
lib/api-zod/
├── src/
│   └── generated/
│       └── types/
│           ├── artwork.ts        ← Zod schema + TypeScript type for Artwork
│           ├── gallery.ts        ← Zod schema + TypeScript type for Gallery
│           ├── user.ts
│           └── profile.ts
└── package.json
```

**Auto-generated from `openapi.yaml` — never edit these files by hand.**

The API server imports these schemas to validate incoming request bodies before
any business logic runs:

```typescript
import { CreateGallerySchema } from '@workspace/api-zod';

router.post('/api/galleries', requireAuth, async (req, res) => {
  const body = CreateGallerySchema.parse(req.body); // throws 400 if invalid
  // ...
});
```

If the OpenAPI spec says a field is required and the client doesn't send it,
Zod throws a validation error before the request ever touches the database.

---

### 3.3 `lib/api-client-react` — Frontend Data Hooks

```
lib/api-client-react/
├── src/
│   ├── generated/
│   │   └── api.ts              ← auto-generated React Query hooks
│   └── custom-fetch.ts         ← shared HTTP client (auth token injection)
└── package.json
```

**`src/generated/api.ts`** is auto-generated — never edit by hand.
Contains hooks like:

```typescript
useGetGalleries()           // GET /api/galleries
usePostGallery()            // POST /api/galleries
useGetPublicGalleries()     // GET /api/public/galleries
useGetArtworks(galleryId)   // GET /api/galleries/:id/artworks
useGetDashboardStats()      // GET /api/dashboard/stats
```

Each hook handles loading state, error state, caching, background re-fetching,
and cache invalidation automatically via TanStack Query.

**`src/custom-fetch.ts`** — the underlying HTTP function used by every hook.
This is where auth tokens are injected:

```typescript
let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(fn: typeof authTokenGetter) {
  authTokenGetter = fn;
}

export async function customFetch(url, options) {
  const token = await authTokenGetter?.();
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
```

The frontend calls `setAuthTokenGetter(() => clerk.session.getToken())` on
mount (in `ClerkAuthSync`), so from that point every API call automatically
carries a valid JWT — no manual header management anywhere.

---

### 3.4 `lib/db` — Database Layer

```
lib/db/
├── src/
│   ├── schema/
│   │   ├── users.ts        ← users table
│   │   ├── profiles.ts     ← artist profiles table
│   │   ├── galleries.ts    ← gallery rooms table
│   │   └── artworks.ts     ← artworks table
│   └── index.ts            ← DB connection + exports
├── drizzle.config.ts       ← Drizzle Kit config (migrations)
└── package.json
```

**`src/index.ts`** creates the database connection using the `DATABASE_URL`
environment variable and exports the `db` Drizzle instance:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
export const db = drizzle(process.env.DATABASE_URL);
```

Every route in `api-server` imports `db` and queries directly through it.

**`drizzle.config.ts`** is used by the `pnpm --filter @workspace/db run push`
command (dev only) to sync schema changes to the database without writing
migration files.

> ⚠️ Always run `pnpm run typecheck:libs` after editing anything in
> `lib/db/src/schema/` — the composite lib must be rebuilt before
> `api-server` can typecheck against the new schema.

---

## 4. Artifacts — `artifacts/`

These are the actual running applications. Each one has its own `package.json`,
`tsconfig.json`, and `.replit-artifact/artifact.toml` (which registers it with
the Replit proxy and assigns it a port and URL path).

---

### 4.1 `artifacts/api-server` — The Backend

```
artifacts/api-server/
├── src/
│   ├── index.ts                        ← HTTP server entry point
│   ├── app.ts                          ← Express app setup
│   ├── lib/
│   │   └── logger.ts                   ← Pino logger singleton
│   ├── middlewares/
│   │   ├── requireAuth.ts              ← Clerk JWT verification + JIT provisioning
│   │   └── clerkProxyMiddleware.ts     ← Clerk ↔ Replit proxy compat
│   └── routes/
│       ├── index.ts                    ← mounts all route files
│       ├── auth.ts                     ← /api/auth/me
│       ├── profile.ts                  ← /api/profile
│       ├── galleries.ts                ← /api/galleries (private CRUD)
│       ├── artworks.ts                 ← /api/galleries/:id/artworks
│       ├── publicGalleries.ts          ← /api/public/galleries (no auth)
│       ├── dashboard.ts                ← /api/dashboard/stats
│       ├── changelog.ts               ← /api/changelog/* (SSE + download)
│       └── health.ts                  ← /api/healthz
├── build.mjs                           ← esbuild bundle script
├── package.json
└── tsconfig.json
```

#### Entry chain

```
index.ts
  └─ creates HTTP server, binds PORT (8080)
     └─ imports app.ts
        ├─ clerkMiddleware()         ← attaches Clerk identity to req
        ├─ pinoHttp()                ← structured request logging
        ├─ cors()
        ├─ express.json()
        └─ router (routes/index.ts)
           ├─ /api/healthz
           ├─ /api/auth/me           ← requireAuth
           ├─ /api/profile           ← requireAuth
           ├─ /api/galleries         ← requireAuth
           ├─ /api/public/galleries  ← no auth
           ├─ /api/dashboard/stats   ← requireAuth
           └─ /api/changelog/*       ← no auth
```

#### `requireAuth.ts` — JIT Provisioning

This middleware does two jobs:

1. **Verify** the Clerk JWT in the `Authorization: Bearer <token>` header.
   Rejects with `401` if missing or invalid.

2. **JIT-provision** a local database user on first login:

```
Request arrives with Clerk JWT
  ↓
clerk.verifyToken(jwt) → { sub: clerkUserId, email }
  ↓
SELECT * FROM users WHERE clerk_user_id = clerkUserId
  ↓
Found? → attach to req.user, continue
  ↓
Not found? → SELECT * FROM users WHERE email = email
  ↓
  ├─ Found by email? → UPDATE clerk_user_id, attach, continue
  └─ Truly new?      → INSERT new user + profile row, attach, continue
```

This means a user only exists in the local DB after their first authenticated
API call — no pre-registration step needed.

#### `changelog.ts` — SSE Stream

This route serves the live content of `replit.md` to the `/changelog.html`
page without a page reload:

```
GET /api/changelog/stream
  └─ sets headers: Content-Type: text/event-stream
  └─ reads replit.md from disk
  └─ sends: data: "<json-encoded markdown>"
  └─ sets fs.watch on replit.md
  └─ re-sends whenever the file changes
  └─ cleans up watch on client disconnect
```

The `replit.md` path is resolved with `fileURLToPath(import.meta.url)` so it
works correctly both in development (source tree) and in the esbuild-bundled
production `dist/` output.

#### Build system

```
build.mjs   ← esbuild script
  └─ entry: src/index.ts
  └─ format: ESM
  └─ bundle: true (all deps inlined except native add-ons)
  └─ output: dist/index.mjs
  └─ sourcemaps: dist/index.mjs.map
  └─ also bundles pino worker threads separately (required by pino)
```

Production start: `node --enable-source-maps ./dist/index.mjs`

---

### 4.2 `artifacts/overflow-outcast` — The Frontend

```
artifacts/overflow-outcast/
├── public/
│   ├── changelog.html        ← standalone client progress page (no React)
│   ├── invoice.html          ← project invoice document
│   ├── favicon.svg
│   ├── logo.svg
│   ├── opengraph.jpg         ← social media preview image
│   ├── robots.txt
│   └── images/               ← 6 Amman reference photos (seed data artwork)
│       ├── amman-citadel.png
│       ├── amman-calligraphy.png
│       ├── amman-gallery.png
│       ├── amman-golden.png
│       ├── amman-reference.png
│       └── amman-sunset.png
├── src/
│   ├── main.tsx              ← React bootstrap
│   ├── App.tsx               ← root component, routing, auth wiring
│   ├── lib/
│   │   └── auth.tsx          ← Clerk context + ClerkAuthSync
│   ├── pages/
│   │   ├── home.tsx          ← public landing page
│   │   ├── dashboard.tsx     ← artist stats overview
│   │   ├── galleries.tsx     ← gallery management list
│   │   ├── gallery-form.tsx  ← create/edit gallery
│   │   ├── artworks.tsx      ← artwork management list
│   │   ├── artwork-form.tsx  ← create/edit artwork
│   │   ├── profile.tsx       ← edit artist profile
│   │   ├── public-galleries.tsx      ← public browse page
│   │   └── public-gallery-detail.tsx ← 3D room viewer page
│   ├── components/
│   │   ├── layout.tsx            ← authenticated app shell (navbar + outlet)
│   │   ├── public-layout.tsx     ← public shell (minimal navbar)
│   │   ├── GalleryThumbnail.tsx  ← gallery card for list views
│   │   ├── gallery-room/         ← 3D engine (see below)
│   │   └── ui/                   ← ~40 shadcn/ui primitives
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

#### `src/main.tsx` — Bootstrap chain

```tsx
<ClerkProvider publishableKey={...}>
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
</ClerkProvider>
```

Clerk wraps everything so auth state is globally available.
TanStack Query wraps everything so server state is globally cached.

#### `src/App.tsx` — Routing

```tsx
// Mounts ClerkAuthSync once on load → registers token getter
<ClerkAuthSync />

// Route tree (wouter)
/                         → home.tsx          (public)
/galleries                → layout + galleries.tsx   (auth required)
/galleries/new            → layout + gallery-form.tsx
/galleries/:id/edit       → layout + gallery-form.tsx
/galleries/:id/artworks   → layout + artworks.tsx
/artwork/:id/edit         → layout + artwork-form.tsx
/dashboard                → layout + dashboard.tsx
/profile                  → layout + profile.tsx
/explore                  → public-layout + public-galleries.tsx
/gallery/:slug            → public-layout + public-gallery-detail.tsx
```

#### `src/lib/auth.tsx` — Auth Wiring

```tsx
function ClerkAuthSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    // Tells custom-fetch.ts "here's how to get a fresh JWT"
    setAuthTokenGetter(() => getToken());
  }, [getToken]);
  return null;
}
```

This is the bridge between Clerk and the API client library.
After this runs, every call to any generated React Query hook will
automatically include a valid `Authorization: Bearer <token>` header.

---

#### `src/components/gallery-room/` — The 3D Engine

This is the most complex part of the frontend. It renders immersive,
first-person 3D gallery rooms using **React Three Fiber** (a React wrapper
around Three.js / WebGL).

```
gallery-room/
├── GalleryRoom.tsx           ← outer wrapper: loading, data fetching, error states
├── GalleryScene.tsx          ← the actual 3D scene (R3F Canvas)
├── ArtworkFrame.tsx          ← a single framed artwork mesh on the wall
├── ArtworkDetailModal.tsx    ← modal overlay when clicking an artwork
├── RoomDecorations.tsx       ← spotlights, pedestals, ambient objects
├── TouchControls.tsx         ← mobile input handler
├── VirtualJoystick.tsx       ← on-screen joystick UI (mobile)
├── theme-config.ts           ← 5 room theme definitions
├── room-dimensions.ts        ← room geometry constants
└── seeded-rng.ts             ← deterministic random number generator
```

**`GalleryRoom.tsx`** — entry point for the 3D view:
- Fetches gallery metadata + artworks via React Query hooks
- Shows loading skeleton while data is in flight
- Passes data down to `GalleryScene`

**`GalleryScene.tsx`** — the R3F Canvas:
- Creates the 3D room: floor mesh, ceiling mesh, 4 wall meshes
- Positions `<ArtworkFrame>` components on the walls using slot positions
  from `room-dimensions.ts` and random offsets from `seeded-rng.ts`
- Sets up `PointerLockControls` for desktop mouse-look
- Handles WASD keyboard movement via `useFrame` game loop
- Applies theme (colors, materials, fog, lighting) from `theme-config.ts`
- Renders `<RoomDecorations>` for the current theme

**`ArtworkFrame.tsx`** — one artwork on the wall:
- Three.js `BoxGeometry` for the frame body
- `useTexture()` to load the artwork image as a WebGL texture
- `MeshStandardMaterial` with the image applied
- Emissive label plate below the frame with title text
- `onClick` → sets selected artwork state → `ArtworkDetailModal` opens

**`theme-config.ts`** — 5 room themes:

| Theme | Floor | Ceiling | Walls | Lighting |
|---|---|---|---|---|
| Dark Void | Near-black | Near-black | Charcoal | Warm point lights |
| Neon Grid | Dark + grid lines | Black | Dark | Colored neon strips |
| Concrete | Concrete grey | Off-white | Beige | Fluorescent cool |
| White Cube | Pure white | White | White | Bright even lighting |
| Limestone | Sand tone | Ivory | Warm cream | Warm amber |

**`seeded-rng.ts`** — why it exists:
Artwork positions on the walls include small random offsets (height variation,
slight rotation) to look natural rather than perfectly grid-aligned.
A seeded RNG ensures these offsets are **identical on every page load** for the
same gallery — the layout is deterministic and predictable.

**`room-dimensions.ts`** — defines:
- Room width, height, depth in Three.js world units
- Wall positions (front, back, left, right)
- Maximum artwork slots per wall
- Artwork frame size constraints

---

#### `src/components/ui/` — UI Primitives

~40 pre-built, accessible UI components from **shadcn/ui**, customized with
the project's dark amber theme via Tailwind CSS:

```
Button, Input, Textarea, Select, Checkbox, Switch, Slider
Dialog, Sheet, Drawer, AlertDialog
Card, Badge, Avatar, Skeleton
Tabs, Accordion, Collapsible
Toast (Sonner), Tooltip, Popover, HoverCard, DropdownMenu
Table, Form, Label, Field
Spinner, Empty, Separator, ScrollArea
...and more
```

These are source files, not node_modules — they live in the repo so they can
be customized freely.

---

### 4.3 `artifacts/mockup-sandbox` — Design Prototyping

```
artifacts/mockup-sandbox/
├── mockupPreviewPlugin.ts        ← custom Vite plugin
├── src/
│   ├── App.tsx                   ← sandbox router/shell
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   │   ├── mockups/              ← prototype components go here
│   │   │   └── amman-homepage/
│   │   │       └── ScrollingHome.tsx   ← Amman scrolling homepage mockup
│   │   └── ui/                   ← shadcn UI kit (mirrored from main app)
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/
│   │   └── utils.ts
│   └── .generated/
│       └── mockup-components.ts  ← auto-generated registry (do not edit)
├── public/
│   └── images/                   ← Amman reference images for mockups
├── vite.config.ts
└── package.json
```

**`mockupPreviewPlugin.ts`** scans `src/components/mockups/**` at Vite startup,
finds every `.tsx` component, and auto-writes a registry to
`src/.generated/mockup-components.ts`. The sandbox app reads this registry and
exposes each component at its own preview URL:

```
/__mockup/preview/amman-homepage/ScrollingHome
```

These preview URLs are embedded as `<iframe>` elements on the Replit Canvas
board so designs can be viewed and compared side-by-side without touching the
main application.

---

## 5. Scripts

```
scripts/
└── src/
    └── seed.ts       ← database seeding script
```

**`seed.ts`** populates the database with realistic demo content:
- 5 artist users with Amman-themed names and bios
- 10 galleries with Arabic/contemporary art themes and varied room themes
- 30+ artworks using the reference images from `public/images/`
- All galleries marked as published so they appear in public browsing

Run with: `pnpm --filter @workspace/scripts run seed`

---

## 6. Data Flow — End to End

### 6.1 Auth Flow

```
User clicks "Sign In"
  ↓
Clerk UI (Google OAuth or email magic link)
  ↓
Clerk issues JWT (signed, short-lived, contains: sub = clerkUserId, email)
  ↓
ClerkProvider stores session in memory
  ↓
ClerkAuthSync runs → setAuthTokenGetter(() => clerk.session.getToken())
  ↓
Every API call now automatically sends:
  Authorization: Bearer <jwt>
  ↓
api-server: clerkMiddleware() decodes JWT → attaches Clerk identity to req
  ↓
requireAuth middleware:
  ├─ checks req.auth.userId exists → 401 if not
  ├─ looks up local DB user by clerk_user_id
  ├─ if not found → create new user + profile row (JIT provisioning)
  └─ attaches req.user = { id, clerkUserId, email } → handler runs
```

### 6.2 API Request Flow (authenticated)

```
React component calls useGetGalleries()
  ↓
TanStack Query checks cache
  ├─ Cache hit (fresh) → returns cached data immediately
  └─ Cache miss / stale → calls customFetch("/api/galleries")
        ↓
        customFetch() calls authTokenGetter() → Clerk returns JWT
        ↓
        fetch("https://[domain]/api/galleries", {
          headers: { Authorization: "Bearer <jwt>" }
        })
        ↓
        Replit shared proxy (port 80) routes /api/* → api-server:8080
        ↓
        Express router → galleries route handler
        ↓
        requireAuth middleware (verifies JWT, loads req.user)
        ↓
        db.select().from(galleries).where(eq(galleries.userId, req.user.id))
        ↓
        PostgreSQL query → rows returned
        ↓
        res.json(rows)
        ↓
        TanStack Query caches response → component re-renders with data
```

### 6.3 3D Gallery Load Flow

```
User navigates to /gallery/:slug
  ↓
public-gallery-detail.tsx renders
  ↓
useGetPublicGalleryBySlug(slug) → GET /api/public/galleries/:slug
  ├─ Returns: { id, title, theme, description, artistName }
  └─ No auth required
  ↓
useGetPublicArtworks(galleryId) → GET /api/public/galleries/:slug/artworks
  └─ Returns: [ { id, title, imageUrl, width, height, description }, ... ]
  ↓
<GalleryRoom gallery={gallery} artworks={artworks} />
  ↓
GalleryRoom.tsx passes to <GalleryScene />
  ↓
GalleryScene mounts React Three Fiber <Canvas>
  ├─ themeConfig = THEMES[gallery.theme]
  ├─ rng = new SeededRng(gallery.id)           ← deterministic seed
  ├─ wallSlots = computeSlots(artworks.length) ← from room-dimensions.ts
  ↓
  For each artwork:
    ├─ <ArtworkFrame
    │     position={wallSlots[i] + rng.offset()}
    │     imageUrl={artwork.imageUrl}
    │     title={artwork.title}
    │   />
    └─ useTexture(imageUrl) → loads image → applies as WebGL texture
  ↓
  R3F render loop:
    ├─ useFrame(({ camera }) => {
    │     read WASD keys → move camera
    │     read mouse delta (pointer lock) → rotate camera
    │   })
    └─ WebGL renders ~60fps
  ↓
User clicks artwork frame
  ↓
  setSelectedArtwork(artwork) → <ArtworkDetailModal open={true} />
```

### 6.4 Code Generation Pipeline

```
Developer edits lib/api-spec/openapi.yaml
  ↓
pnpm --filter @workspace/api-spec run codegen
  ↓
Orval reads openapi.yaml
  ├─ Generates lib/api-zod/src/generated/types/*.ts
  │     └─ Zod schemas + TypeScript interfaces for every schema in the spec
  └─ Generates lib/api-client-react/src/generated/api.ts
        └─ React Query hooks for every operation in the spec
  ↓
pnpm run typecheck:libs
  └─ tsc --build → rebuilds lib/api-zod and lib/api-client-react
  ↓
pnpm run typecheck
  ├─ api-server: imports api-zod → validates it matches expected types
  └─ overflow-outcast: imports api-client-react → validates hook usage
  ↓
If typecheck passes → both sides correctly implement the contract
```

---

## 7. Database Schema

All tables live in `lib/db/src/schema/`. Managed with **Drizzle ORM** + PostgreSQL.

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | local auto-increment ID |
| `clerk_user_id` | text unique | Clerk's `sub` claim from JWT |
| `email` | text unique | used for email-collision handling on sign-up |
| `display_name` | text | shown in public gallery credits |
| `created_at` | timestamp | auto |
| `updated_at` | timestamp | auto |

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `user_id` | FK → users.id | one-to-one |
| `bio` | text | artist statement |
| `avatar_url` | text | profile picture URL |
| `website` | text | optional |
| `instagram` | text | optional |
| `location` | text | optional |

### `galleries`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `user_id` | FK → users.id | owner |
| `title` | text | display name |
| `slug` | text unique | URL identifier, auto-generated from title + random suffix |
| `description` | text | optional |
| `theme` | text | one of 5 theme keys from `theme-config.ts` |
| `is_published` | boolean | controls public visibility |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Slug generation:** `title.toLowerCase().replace(/\s+/g, '-') + '-' + randomHex(4)`
This ensures slugs are human-readable and collision-free.

### `artworks`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `gallery_id` | FK → galleries.id | parent gallery |
| `title` | text | |
| `image_url` | text | currently base64 data URL; will move to object storage in Stage 3 |
| `width_cm` | numeric | physical dimensions (for label plate) |
| `height_cm` | numeric | |
| `medium` | text | e.g. "Oil on canvas" |
| `year` | integer | year created |
| `description` | text | optional artist notes |
| `display_order` | integer | sort order within gallery |
| `created_at` | timestamp | |

---

## 8. Key Conventions & Rules

### TypeScript
- `lib/*` packages are **composite** (emit declarations). Must run `pnpm run typecheck:libs` after changing them before checking apps.
- `artifacts/*` packages are **leaf** packages (no emission). Check with `tsc --noEmit` only.
- Never add artifact packages to the root `tsconfig.json` references — that file is for libs only.

### API & Codegen
- **Always edit `openapi.yaml` first**, then run codegen, then implement.
- Never manually edit files inside `lib/api-zod/src/generated/` or `lib/api-client-react/src/generated/`.
- The `info.title` field in `openapi.yaml` controls generated filenames — do not change it.

### Logging
- **Never use `console.log` in server code.** Use `req.log` inside route handlers, and the `logger` singleton from `src/lib/logger.ts` for code outside request context.

### Routing
- All traffic goes through the shared Replit reverse proxy on port 80.
- `/api/*` → `api-server:8080`
- `/*` → `overflow-outcast:23679`
- `/__mockup/*` → `mockup-sandbox:8081`
- **Never use service ports directly in code** (e.g. `localhost:8080`). Use relative URLs in the frontend; the proxy handles routing.

### Authentication
- Every private route must use the `requireAuth` middleware.
- Public routes (browsing galleries, viewing artwork) must **not** require auth.
- Never read `req.body.userId` from the client — always derive the user from `req.user` (set by `requireAuth`) to prevent impersonation.

### Database
- After adding a new column or table in `lib/db/src/schema/`, run `pnpm --filter @workspace/db run push` in development to apply the change.
- For production schema changes, use the database skill to apply migrations directly against the production DB.

---

*This document is a point-in-time reference for the current codebase. When
architecture changes are made, update this file alongside `replit.md`.*
