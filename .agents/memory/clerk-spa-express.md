---
name: Clerk auth for React SPA + Express API
description: Correct approach for attaching Clerk session tokens to API calls from a React SPA to an Express API server.
---

## Rule
For a React SPA (Vite/Wouter) + Express API server, the frontend must **explicitly** call `getToken()` from `useAuth()` and pass it to `setAuthTokenGetter`. Do NOT rely on `__session` cookies being sent automatically — they are unreliable across proxied environments and Replit's deployment proxy.

## Pattern
In `App.tsx`, inside `ClerkProvider`, render a sync component:
```tsx
function ClerkAuthSync() {
  const { getToken, isSignedIn } = useAuth();
  useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(() => getToken());
    } else {
      setAuthTokenGetter(null);
    }
    return () => setAuthTokenGetter(null);
  }, [getToken, isSignedIn]);
  return null;
}
```
`setAuthTokenGetter` is exported from `@workspace/api-client-react`.

## Backend
`clerkMiddleware()` with no arguments is correct — it reads `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` from env vars automatically. Passing a function as the first argument treats it as a post-auth handler, NOT an options factory, so the publishableKey computation is silently ignored.

**Why:** The Clerk Express SDK verifies the Bearer token from the `Authorization` header. Cookie-based session verification requires SSR frameworks (Next.js). In a pure SPA + REST API setup, explicit token passing is required.
