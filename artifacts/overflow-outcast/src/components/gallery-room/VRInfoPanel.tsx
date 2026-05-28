import { useEffect, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ArtworkData } from "./ArtworkFrame";

const PANEL_OFFSET = 1.8; // units ahead of camera at eye level
const AUTO_DISMISS_MS = 60_000;

interface VRInfoPanelProps {
  artwork: ArtworkData | null;
  onClose: () => void;
}

export function VRInfoPanel({ artwork, onClose }: VRInfoPanelProps) {
  const { camera } = useThree();
  const [pos, setPos] = useState<[number, number, number]>([0, 0, -PANEL_OFFSET]);
  const [rotY, setRotY] = useState(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!artwork) return;
    // Place panel ahead of camera at eye level
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    const p = camera.position.clone().addScaledVector(forward, PANEL_OFFSET);
    p.y = camera.position.y;
    setPos([p.x, p.y, p.z]);
    // Rotate the panel so it faces the camera (yaw only — keeps it upright).
    // Without this, <Html transform> would render edge-on whenever the user
    // wasn't looking along a world axis.
    setRotY(Math.atan2(forward.x, forward.z) + Math.PI);

    // Auto-dismiss
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); };
  }, [artwork, camera, onClose]);

  if (!artwork) return null;

  return (
    <Html transform position={pos} rotation={[0, rotY, 0]} occlude={false} style={{ width: 360 }}>
      <div style={{
        background: "rgba(0,0,0,0.9)",
        border: "1px solid rgba(245,192,96,0.4)",
        borderRadius: 4,
        padding: 20,
        color: "#fff",
        fontFamily: "sans-serif",
        backdropFilter: "blur(12px)",
        maxWidth: 360,
      }}>
        {artwork.imageUrl && (
          <img
            src={artwork.imageUrl}
            alt={artwork.title}
            style={{ width: "100%", maxHeight: 200, objectFit: "contain", marginBottom: 12, borderRadius: 2 }}
          />
        )}
        <h3 style={{ margin: "0 0 6px", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 20, color: "#f5c060" }}>
          {artwork.title}
        </h3>
        {artwork.artistName && (
          <p style={{ margin: "0 0 4px", fontSize: 13, opacity: 0.7 }}>{artwork.artistName}</p>
        )}
        {artwork.year && (
          <p style={{ margin: "0 0 4px", fontSize: 11, opacity: 0.5, fontFamily: "monospace" }}>{artwork.year}</p>
        )}
        {artwork.medium && (
          <p style={{ margin: "0 0 4px", fontSize: 11, opacity: 0.5 }}>{artwork.medium}</p>
        )}
        {artwork.description && (
          <p style={{ margin: "12px 0 0", fontSize: 12, lineHeight: 1.6, opacity: 0.75 }}>{artwork.description}</p>
        )}
        <button
          onClick={onClose}
          style={{
            marginTop: 16, width: "100%", padding: "8px 0",
            background: "rgba(245,192,96,0.15)", border: "1px solid rgba(245,192,96,0.4)",
            borderRadius: 2, color: "#f5c060", cursor: "pointer", fontSize: 12,
            fontFamily: "monospace", letterSpacing: "0.1em",
          }}
        >
          CLOSE
        </button>
      </div>
    </Html>
  );
}
