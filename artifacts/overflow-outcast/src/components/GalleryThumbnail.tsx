import { useMemo } from "react";

interface Props {
  theme: string;
  title: string;
  className?: string;
}

type ThemeDef = {
  bg: string;
  bg2: string;
  accent: string;
  accentDim: string;
  pattern: "particles" | "grid" | "mist" | "lines" | "concrete";
  textColor: string;
};

const THEME_DEFS: Record<string, ThemeDef> = {
  dark_void: {
    bg: "#100e0b",
    bg2: "#2a2520",
    accent: "#c8a45a",
    accentDim: "#c8a45a22",
    pattern: "particles",
    textColor: "#c8a45a",
  },
  neon_grid: {
    bg: "#030c12",
    bg2: "#0d1f2d",
    accent: "#00d4ff",
    accentDim: "#00d4ff18",
    pattern: "grid",
    textColor: "#00d4ff",
  },
  purple_mist: {
    bg: "#0a0412",
    bg2: "#221030",
    accent: "#9b5de5",
    accentDim: "#9b5de520",
    pattern: "mist",
    textColor: "#b06aff",
  },
  white_cube: {
    bg: "#e5e3de",
    bg2: "#f5f4f0",
    accent: "#1a1a1a",
    accentDim: "#1a1a1a14",
    pattern: "lines",
    textColor: "#1a1a1a",
  },
  concrete_bunker: {
    bg: "#1a1a1a",
    bg2: "#3a3a3a",
    accent: "#a0a0a0",
    accentDim: "#a0a0a018",
    pattern: "concrete",
    textColor: "#c8c8c8",
  },
  amman_limestone: {
    bg: "#2a1a0e",
    bg2: "#4a3020",
    accent: "#d4845a",
    accentDim: "#d4845a22",
    pattern: "particles",
    textColor: "#e8a070",
  },
  default: {
    bg: "#180e08",
    bg2: "#352c24",
    accent: "#c8a45a",
    accentDim: "#c8a45a20",
    pattern: "particles",
    textColor: "#c8a45a",
  },
};

function seededRng(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return ((h >>> 0) / 0x100000000);
  };
}

export function GalleryThumbnail({ theme, title, className }: Props) {
  const def = THEME_DEFS[theme] ?? THEME_DEFS.default;
  const id = useMemo(() => `gt-${Math.random().toString(36).slice(2)}`, []);

  const particles = useMemo(() => {
    const rng = seededRng(title + theme);
    return Array.from({ length: 28 }, (_, i) => ({
      cx: rng() * 400,
      cy: rng() * 240,
      r: rng() * 1.4 + 0.3,
      opacity: rng() * 0.55 + 0.12,
      delay: rng() * 3,
      dur: rng() * 3 + 3,
    }));
  }, [title, theme]);

  const gridLines = useMemo(() => {
    const h: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const v: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let x = 0; x <= 400; x += 40) {
      v.push({ x1: x, y1: 0, x2: x, y2: 240 });
    }
    for (let y = 0; y <= 240; y += 30) {
      h.push({ x1: 0, y1: y, x2: 400, y2: y });
    }
    return { h, v };
  }, []);

  const mistBlobs = useMemo(() => {
    const rng = seededRng(title + theme + "mist");
    return Array.from({ length: 4 }, () => ({
      cx: rng() * 400,
      cy: rng() * 240,
      rx: rng() * 120 + 60,
      ry: rng() * 80 + 40,
      opacity: rng() * 0.18 + 0.06,
    }));
  }, [title, theme]);

  const lineMarks = useMemo(() => {
    return [
      { x1: 0, y1: 40, x2: 400, y2: 40 },
      { x1: 0, y1: 200, x2: 400, y2: 200 },
      { x1: 60, y1: 0, x2: 60, y2: 240 },
      { x1: 340, y1: 0, x2: 340, y2: 240 },
      { x1: 200, y1: 40, x2: 200, y2: 200 },
    ];
  }, []);

  const concreteLines = useMemo(() => {
    const rng = seededRng(title + "concrete");
    return Array.from({ length: 12 }, () => {
      const x = rng() * 380 + 10;
      return { x1: x, y1: 0, x2: x + (rng() - 0.5) * 20, y2: 240 };
    });
  }, [title]);

  const initials = title
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const shortTitle = title.length > 18 ? title.slice(0, 18).trim() + "…" : title;

  return (
    <svg
      viewBox="0 0 400 240"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <defs>
        <radialGradient id={`${id}-rg`} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor={def.bg2} />
          <stop offset="100%" stopColor={def.bg} />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={def.accent} stopOpacity="0.18" />
          <stop offset="100%" stopColor={def.accent} stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-blur`}>
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id={`${id}-softblur`}>
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <clipPath id={`${id}-clip`}>
          <rect width="400" height="240" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${id}-clip)`}>
        {/* Base background */}
        <rect width="400" height="240" fill={`url(#${id}-rg)`} />

        {/* Ambient glow */}
        <rect width="400" height="240" fill={`url(#${id}-glow)`} />

        {/* Pattern layer */}
        {def.pattern === "particles" && (
          <g opacity="0.7">
            {particles.map((p, i) => (
              <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={def.accent} opacity={p.opacity}>
                <animate
                  attributeName="opacity"
                  values={`${p.opacity};${p.opacity * 0.3};${p.opacity}`}
                  dur={`${p.dur}s`}
                  begin={`${p.delay}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
            {/* Light rays */}
            <line x1="200" y1="0" x2="80" y2="240" stroke={def.accent} strokeWidth="0.4" opacity="0.07" />
            <line x1="200" y1="0" x2="200" y2="240" stroke={def.accent} strokeWidth="0.5" opacity="0.1" />
            <line x1="200" y1="0" x2="320" y2="240" stroke={def.accent} strokeWidth="0.4" opacity="0.07" />
          </g>
        )}

        {def.pattern === "grid" && (
          <g>
            {gridLines.v.map((l, i) => (
              <line key={`v${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke={def.accent} strokeWidth="0.4" opacity="0.18" />
            ))}
            {gridLines.h.map((l, i) => (
              <line key={`h${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke={def.accent} strokeWidth="0.4" opacity="0.18" />
            ))}
            {/* Bright horizon */}
            <line x1="0" y1="120" x2="400" y2="120" stroke={def.accent} strokeWidth="1" opacity="0.35">
              <animate attributeName="opacity" values="0.35;0.6;0.35" dur="2.5s" repeatCount="indefinite" />
            </line>
            {/* Vertical center bright */}
            <line x1="200" y1="0" x2="200" y2="240" stroke={def.accent} strokeWidth="0.8" opacity="0.25">
              <animate attributeName="opacity" values="0.25;0.5;0.25" dur="3s" begin="0.5s" repeatCount="indefinite" />
            </line>
            {/* Corner sparks */}
            {[[20,20],[380,20],[20,220],[380,220]].map(([cx,cy],i) => (
              <circle key={i} cx={cx} cy={cy} r="2" fill={def.accent} opacity="0.5">
                <animate attributeName="r" values="2;3.5;2" dur="2s" begin={`${i*0.5}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        )}

        {def.pattern === "mist" && (
          <g filter={`url(#${id}-blur)`}>
            {mistBlobs.map((b, i) => (
              <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry}
                fill={def.accent} opacity={b.opacity}>
                <animateTransform attributeName="transform" type="translate"
                  values={`0 0;${(i%2===0?8:-8)} ${(i%3===0?6:-4)};0 0`}
                  dur={`${5 + i}s`} repeatCount="indefinite" />
              </ellipse>
            ))}
          </g>
        )}

        {def.pattern === "lines" && (
          <g>
            {lineMarks.map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke={def.accent} strokeWidth="0.6" opacity="0.12" />
            ))}
            {/* Corner brackets */}
            {[
              [[20,20],[20,50],[50,20]],
              [[380,20],[380,50],[350,20]],
              [[20,220],[20,190],[50,220]],
              [[380,220],[380,190],[350,220]],
            ].map((pts, i) => (
              <polyline key={i}
                points={(pts as number[][]).map(p => p.join(",")).join(" ")}
                fill="none" stroke={def.accent} strokeWidth="1.2" opacity="0.3" />
            ))}
          </g>
        )}

        {def.pattern === "concrete" && (
          <g>
            {concreteLines.map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke={def.accent} strokeWidth="0.3" opacity="0.08" />
            ))}
            <rect x="0" y="0" width="400" height="240"
              fill="none" stroke={def.accent} strokeWidth="1.5" opacity="0.15" />
          </g>
        )}

        {/* Large ghost initials */}
        <text
          x="200" y="155"
          textAnchor="middle"
          fontFamily="serif"
          fontSize="180"
          fontWeight="700"
          fontStyle="italic"
          fill={def.accent}
          opacity="0.04"
          letterSpacing="-8"
          style={{ userSelect: "none" }}
        >
          {initials}
        </text>

        {/* Title watermark */}
        <text
          x="200" y="228"
          textAnchor="middle"
          fontFamily="sans-serif"
          fontSize="10"
          fontWeight="400"
          fill={def.textColor}
          opacity="0.22"
          letterSpacing="3"
          style={{ userSelect: "none" }}
        >
          {shortTitle.toUpperCase()}
        </text>

        {/* Top accent bar */}
        <rect x="0" y="0" width="400" height="1.5" fill={def.accent} opacity="0.45" />

        {/* Bottom fade overlay */}
        <defs>
          <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="50%" stopColor={def.bg} stopOpacity="0" />
            <stop offset="100%" stopColor={def.bg} stopOpacity="0.75" />
          </linearGradient>
        </defs>
        <rect width="400" height="240" fill={`url(#${id}-fade)`} />
      </g>
    </svg>
  );
}
