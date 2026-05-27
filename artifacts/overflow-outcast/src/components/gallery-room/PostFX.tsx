/**
 * Imperative post-processing using Three.js built-in passes.
 * Renders through its own EffectComposer at useFrame priority 1 (after R3F's
 * default render), overwriting the screen with the bloom-composited output.
 * This approach avoids @react-three/postprocessing's R3F reconciler path which
 * conflicts with Replit's Vite cartographer plugin (data-component-name inject).
 */
import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { ThemeConfig } from "./theme-config";

type BloomCfg = { strength: number; threshold: number; radius: number };

function getBloomCfg(theme: ThemeConfig): BloomCfg {
  switch (theme.floorPattern) {
    case "neon":     return { strength: 1.2,  threshold: 0.55, radius: 0.85 };
    case "marble":   return { strength: 0.25, threshold: 0.92, radius: 0.50 };
    case "concrete": return { strength: 0.50, threshold: 0.78, radius: 0.60 };
    case "slate":    return { strength: 0.80, threshold: 0.65, radius: 0.75 };
    default:         return { strength: 0.65, threshold: 0.70, radius: 0.80 };
  }
}

interface PostFXProps {
  theme: ThemeConfig;
}

export function PostFX({ theme }: PostFXProps) {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomCfg = getBloomCfg(theme);

  // Build composer once per rendering context
  useEffect(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      bloomCfg.strength,
      bloomCfg.radius,
      bloomCfg.threshold,
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composer.setSize(size.width, size.height);

    composerRef.current = composer;
    return () => {
      composer.dispose();
      composerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  // Update bloom params live when theme changes (no rebuild needed)
  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    const bloom = composer.passes.find((p: object) => p instanceof UnrealBloomPass) as UnrealBloomPass | undefined;
    if (!bloom) return;
    bloom.strength  = bloomCfg.strength;
    bloom.threshold = bloomCfg.threshold;
    bloom.radius    = bloomCfg.radius;
  }, [bloomCfg.strength, bloomCfg.threshold, bloomCfg.radius]);

  // Resize
  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height);
  }, [size.width, size.height]);

  // Render via composer at priority 1 — runs after R3F's own render pass,
  // blits the bloom-composited result to screen (overwrites R3F's output)
  useFrame(() => {
    composerRef.current?.render();
  }, 1);

  return null;
}
