import { useEffect, useRef } from "react";

const THEME_AUDIO: Record<string, { freq: number; freq2: number; detune: number }> = {
  dark_void:       { freq: 40,  freq2: 220, detune: 0   },
  neon_grid:       { freq: 60,  freq2: 300, detune: 5   },
  purple_mist:     { freq: 55,  freq2: 180, detune: 3   },
  white_cube:      { freq: 80,  freq2: 400, detune: 1   },
  concrete_bunker: { freq: 30,  freq2: 160, detune: 2   },
  amman_limestone: { freq: 110, freq2: 220, detune: 7   },
  default:         { freq: 40,  freq2: 220, detune: 0   },
};

const DEFAULT_VOLUME = 0.06;

interface AmbientAudioProps {
  theme: string;
  muted: boolean;
}

export function AmbientAudio({ theme, muted }: AmbientAudioProps) {
  const ctxRef   = useRef<AudioContext | null>(null);
  const gainRef  = useRef<GainNode | null>(null);
  const osc1Ref  = useRef<OscillatorNode | null>(null);
  const osc2Ref  = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    const conf = THEME_AUDIO[theme] ?? THEME_AUDIO.default;

    if (!ctxRef.current) {
      try {
        ctxRef.current = new AudioContext();
      } catch {
        return;
      }
    }
    const ctx = ctxRef.current;

    osc1Ref.current?.stop();
    osc2Ref.current?.stop();

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(muted ? 0 : DEFAULT_VOLUME, ctx.currentTime);
    gain.connect(ctx.destination);
    gainRef.current = gain;

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = conf.freq;
    osc1.connect(gain);
    osc1.start();
    osc1Ref.current = osc1;

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = conf.freq2;
    osc2.detune.value = conf.detune;
    const gain2 = ctx.createGain();
    gain2.gain.value = 0.35;
    osc2.connect(gain2);
    gain2.connect(gain);
    osc2Ref.current = osc2;
    osc2.start();

    return () => {
      osc1.stop();
      osc2.stop();
      gain.disconnect();
    };
  }, [theme]);

  useEffect(() => {
    if (!gainRef.current || !ctxRef.current) return;
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    gainRef.current.gain.setTargetAtTime(
      muted ? 0 : DEFAULT_VOLUME,
      ctx.currentTime,
      0.5,
    );
  }, [muted]);

  useEffect(() => {
    return () => {
      osc1Ref.current?.stop();
      osc2Ref.current?.stop();
      ctxRef.current?.close();
    };
  }, []);

  return null;
}
