import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export interface Scene {
  img: string;
  overlay: string;
  accent: string;
}

const base = import.meta.env.BASE_URL;

export const SCENES: Scene[] = [
  { img: `${base}images/amman-sunset.png`,      overlay: "rgba(14,7,2,0.54)",  accent: "#f59e0b" },
  { img: `${base}images/amman-citadel.png`,     overlay: "rgba(8,5,2,0.60)",   accent: "#d97706" },
  { img: `${base}images/amman-calligraphy.png`, overlay: "rgba(12,6,1,0.56)",  accent: "#b45309" },
  { img: `${base}images/amman-gallery.png`,     overlay: "rgba(4,4,8,0.62)",   accent: "#8b5cf6" },
  { img: `${base}images/amman-golden.png`,      overlay: "rgba(14,8,2,0.50)",  accent: "#f59e0b" },
];

interface SceneCtx {
  activeScene: number;
  setScene: (n: number) => void;
}

const Ctx = createContext<SceneCtx>({ activeScene: 0, setScene: () => {} });

export function SceneProvider({ children }: { children: ReactNode }) {
  const [activeScene, setActiveScene] = useState(0);
  const setScene = useCallback((n: number) => setActiveScene(n), []);
  return <Ctx.Provider value={{ activeScene, setScene }}>{children}</Ctx.Provider>;
}

export function useScene() {
  return useContext(Ctx);
}
