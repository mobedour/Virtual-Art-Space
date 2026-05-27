import { EffectComposer, Bloom, N8AO, SMAA, Vignette, ToneMapping } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import type { ThemeConfig } from "./theme-config";

type PostFXIntensity = {
  bloomIntensity: number;
  bloomThreshold: number;
  aoIntensity: number;
  aoRadius: number;
  vignetteDarkness: number;
  vignetteEnabled: boolean;
};

function getPostFXIntensity(theme: ThemeConfig): PostFXIntensity {
  const pattern = theme.floorPattern;

  if (pattern === "neon") {
    return {
      bloomIntensity: 0.85,
      bloomThreshold: 0.55,
      aoIntensity: 1.6,
      aoRadius: 2.0,
      vignetteDarkness: 0.55,
      vignetteEnabled: true,
    };
  }
  if (pattern === "marble") {
    return {
      bloomIntensity: 0.18,
      bloomThreshold: 0.92,
      aoIntensity: 1.1,
      aoRadius: 1.6,
      vignetteDarkness: 0.15,
      vignetteEnabled: false,
    };
  }
  if (pattern === "concrete") {
    return {
      bloomIntensity: 0.35,
      bloomThreshold: 0.78,
      aoIntensity: 1.8,
      aoRadius: 2.2,
      vignetteDarkness: 0.4,
      vignetteEnabled: true,
    };
  }
  if (pattern === "slate") {
    return {
      bloomIntensity: 0.6,
      bloomThreshold: 0.65,
      aoIntensity: 1.5,
      aoRadius: 2.0,
      vignetteDarkness: 0.5,
      vignetteEnabled: true,
    };
  }
  return {
    bloomIntensity: 0.5,
    bloomThreshold: 0.7,
    aoIntensity: 1.4,
    aoRadius: 1.8,
    vignetteDarkness: 0.45,
    vignetteEnabled: true,
  };
}

interface PostFXProps {
  theme: ThemeConfig;
}

export function PostFX({ theme }: PostFXProps) {
  const cfg = getPostFXIntensity(theme);

  return (
    <EffectComposer multisampling={0} enableNormalPass>
      <N8AO
        intensity={cfg.aoIntensity}
        aoRadius={cfg.aoRadius}
        distanceFalloff={1.0}
        quality="medium"
      />
      <Bloom
        intensity={cfg.bloomIntensity}
        luminanceThreshold={cfg.bloomThreshold}
        luminanceSmoothing={0.35}
        mipmapBlur
        radius={0.85}
      />
      <Vignette
        offset={0.3}
        darkness={cfg.vignetteEnabled ? cfg.vignetteDarkness : 0}
        blendFunction={BlendFunction.NORMAL}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  );
}
