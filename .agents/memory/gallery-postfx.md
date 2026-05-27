---
name: Gallery post-processing pipeline
description: How real-time visual polish (Bloom, N8AO, Vignette, ToneMapping, SMAA, Env IBL, planar reflector) is wired into the 3D gallery scene, and the rules for changing it.
---

# Post-processing pipeline (gallery rooms)

The Phase 1 / 2E visual upgrade. Lives in `artifacts/overflow-outcast/src/components/gallery-room/PostFX.tsx` and is mounted as the **last child** of `<GalleryScene>` (must be inside `<Canvas>`, sibling to lights/meshes).

## Effect order is load-bearing

`<EffectComposer>` runs effects in JSX order. The current order — N8AO → Bloom → Vignette → ToneMapping → SMAA — is intentional:

- **N8AO before Bloom**: AO needs the un-bloomed scene to compute correct contact darkening.
- **ToneMapping must come after Bloom + Vignette and before SMAA**: bloom and vignette work in linear HDR space; tone-mapping collapses HDR → sRGB; SMAA is the final spatial smoothing pass on the display-space buffer.
- **SMAA must be last**: anti-aliasing on the tone-mapped output, not on HDR (would smear bright highlights).

**Do not move ToneMapping to first.** That would tone-map the input then re-tone-map per effect → washed-out colours.

## Tone-mapping rule

The renderer is configured with `ACESFilmicToneMapping` in `GalleryRoom.tsx` for the case where post-processing is *off*. When `<EffectComposer>` is present, postprocessing's `<ToneMapping>` effect takes over and the renderer's setting is bypassed. **Don't remove the renderer setting** — fallback for any future "low-quality / no-post-fx" mode.

## Per-theme tuning

`getPostFXIntensity(theme)` keys off `theme.floorPattern` (not theme name) so themes that share a pattern share a look:

- `marble` → low bloom (0.18), vignette OFF (would crush a bright white-cube space)
- `neon` → high bloom (0.85), strong vignette — the cyan emissives drive the look
- `concrete` → low bloom, high AO — the look is depth and grit, not glow
- `parquet` / `slate` / default → moderate bloom and vignette

**Why:** lighting moods differ enormously between themes; one-size-fits-all post-fx makes dark themes look muddy or white themes look depressing.

**How to apply:** when adding a new theme, also add a branch in `getPostFXIntensity` keyed on its `floorPattern`, or it falls through to the default warm-amber settings (which assume a dark room).

## Environment IBL (drei)

`<Environment preset={...} background={false}>` in `GalleryScene` seeds `scene.environment` from a drei-hosted HDRI. Cost is one async CDN fetch on first load — the canvas may render without reflections for ~200 ms before the HDRI lands. Acceptable.

`background={false}` is critical — without it the HDRI replaces the per-theme `<color attach="background">` fog colour and breaks the room mood.

## MeshReflectorMaterial (white_cube floor only)

Planar reflection is expensive (full extra render pass per frame at half resolution). Gated to `white_cube` (marble) for now because:
1. Polished marble is where planar reflection visually matters most.
2. Other themes (parquet, slate, concrete) read fine with just IBL + envMapIntensity.
3. Two reflective floors in one canvas would tank perf on integrated GPUs.

**Why:** wood and concrete don't physically reflect like mirrors; planar reflection on them looks fake and costs the same as marble's. IBL is enough.

**How to apply:** if a future "polished obsidian" theme wants planar reflection, add it to the `isLight` branch alongside marble.

## Why the pipeline uses imperative Three.js, not @react-three/postprocessing

`@react-three/postprocessing` v3.x crashes in the Replit environment with `R3F: Cannot set "data-component-name"`. Root cause: Replit's `@replit/vite-plugin-cartographer` injects a `data-component-name` annotation on all JSX elements (for component tracing in the Replit UI). When `@react-three/postprocessing`'s `EffectComposer` mounts its internal `Effect` nodes through R3F's reconciler, those nodes receive the annotation via `applyProps`. The `Effect` objects from the `postprocessing` library do not have standard Three.js prop interfaces, so `applyProps` throws → WebGL context lost → "Invalid hook call" cascade.

The fix: use `three/examples/jsm/postprocessing/*` imperatively via `useEffect`/`useFrame`. These are plain Three.js classes, never touched by R3F's reconciler, so the Vite plugin annotation is never a problem.

Import paths must include `.js` extension (`three/examples/jsm/postprocessing/EffectComposer.js`) for TypeScript to resolve them with `moduleResolution: bundler`.

`MeshReflectorMaterial` from drei was also removed for the same reason — it creates internal render targets imperatively without R3F metadata (`__r3f`), which crashes on cleanup.

**How to apply:** any future effects that need to be added should be additional `Pass` instances added to the imperative `EffectComposer` in `PostFX.tsx`, NOT declarative `@react-three/postprocessing` JSX elements.

## Don't add without a plan

Tempting future effects that should NOT be added casually:
- **DepthOfField** — kills VR (Phase 3) because focal plane fights stereo; and looks wrong in a walk-through where focus should follow the user's eye.
- **SSR (screen-space reflections)** — heavy, doubles GPU cost; and our planar reflector already handles the only surface where SSR would shine.
- **ChromaticAberration** — fine as a "high quality" toggle later; currently would clash with the editorial / curated aesthetic.
- **Outline** for hovered artwork — wait until Phase 1B proximity work; do it via the `<Bloom>` selectiveBloom feature, not a separate effect pass.
