---
name: Mutations don't auto-invalidate — callers must
description: Orval-generated react-query mutation hooks in this repo do not invalidate queries; any write must invalidate the source query or the UI serves stale data.
---

# Generated mutations don't auto-invalidate query cache

The Orval-generated `usePatch*` / `useCreate*` / `useUpdate*` hooks in
`@workspace/api-client-react` only fire the mutation — they do NOT invalidate or
refetch anything. After any successful write you must explicitly
`queryClient.invalidateQueries({ queryKey: getGet*QueryKey(...) })` for every
view that reads that data.

**Why:** the gallery edit-mode save bug — `useEditState.save()` patched artwork
placement on the server but never invalidated the page's gallery query. Normal
mode renders the *fetched* gallery (`gallery.artworks`) while edit mode renders
a separate local draft (`editState.artworks`), so saved edits appeared to "not
apply" in normal mode yet persisted in edit mode. The dashboard pages already
followed the manual-invalidate pattern (proof this is the codebase convention).

**How to apply:**
- A local editable draft that mirrors fetched data (edit mode, optimistic forms)
  will diverge from the cache after a write unless you invalidate the source.
- When a save is followed by a mode/route exit, make the invalidation awaitable
  and await it before exiting, or normal mode flashes the pre-save state for one
  refetch cycle. (`useEditState` `onSaved` is awaited inside `save()` for this.)
- The host page owns the exact query key (it may be slug- or id-based), so pass
  an `onSaved` callback down rather than guessing the key inside shared hooks.
