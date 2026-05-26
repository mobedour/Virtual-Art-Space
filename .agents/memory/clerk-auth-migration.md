---
name: Clerk Auth Migration
description: How Clerk was integrated, replacing custom JWT auth — covers DB schema, JIT provisioning, Tailwind v4 CSS layer order, and frontend patterns.
---

## Tailwind v4 + Clerk CSS layer order
Add `@layer theme, base, clerk, components, utilities;` on the line BEFORE `@import "tailwindcss"` in `index.css`.
Also set `tailwindcss({ optimize: false })` in `vite.config.ts`.
Set `cssLayerName: "clerk"` in the Clerk appearance object.

**Why:** Without the `@layer` declaration first, Tailwind v4 treats all CSS as part of a single unnamed layer and Clerk's component styles get overridden or conflict.

## DB schema: clerkUserId column
`usersTable` has `clerkUserId: text("clerk_user_id").unique()` — nullable (no `notNull()`) to preserve seed/legacy rows.
JIT provisioning uses `clerkUserId` to look up and create local users on first authenticated API request.
The `passwordHash` column was dropped when migrating to Clerk.

**Why:** Making it nullable avoids breaking seed data. New Clerk users always get a clerkUserId at JIT provision time.

## JIT provisioning pattern
`requireAuth` middleware (`artifacts/api-server/src/middlewares/requireAuth.ts`):
1. `getAuth(req).userId` → clerkUserId from session
2. SELECT from usersTable WHERE clerkUserId
3. If not found: `clerkClient.users.getUser(clerkUserId)` → INSERT user + profile row
4. Sets `req.user = { userId: localUser.id, email, username }` for downstream routes
Username is `${base.slice(0,20)}_${clerkUserId.slice(-6)}` — deterministic and unique.

**Why:** All existing route handlers use `req.user!.userId` (integer FK). JIT provisioning keeps that interface intact while switching auth provider.

## Frontend: useAuth → useUser
- `import { useUser } from "@clerk/react"` replaces custom `useAuth()`
- `const { user, isLoaded } = useUser()` (not `isLoading`)
- Redirect guard: `if (isLoaded && !user) setLocation("/sign-in")`
- Loading guard: `if (!isLoaded || ...)` instead of `if (isAuthLoading || ...)`
- `user.username` is nullable in Clerk — use `user.username ?? user.primaryEmailAddress?.emailAddress?.split("@")[0]`
- `user.email` → `user.primaryEmailAddress?.emailAddress`

## Routes changed
- `/login` → `/sign-in`, `/register` → `/sign-up`
- Old login/register pages deleted; Clerk's `<SignIn>` and `<SignUp>` components used
- Sign-in/up routes: `<Route path="/sign-in/*?"` with `routing="path"` and `path={basePath+"/sign-in"}`

## publishableKeyFromHost
Import from `@clerk/react/internal` (not `@clerk/shared/keys`) on the frontend.
On the backend (app.ts), import from `@clerk/shared/keys`.

## Clerk appearance theming
Used inline CSS objects (not Tailwind strings) for color-heavy elements to avoid Tailwind processing issues with arbitrary values in `elements`. Layout-only elements can use Tailwind class strings.
