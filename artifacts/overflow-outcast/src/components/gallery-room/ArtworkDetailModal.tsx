import { useEffect } from "react";
import { X } from "lucide-react";
import type { ArtworkData } from "./ArtworkFrame";

interface ArtworkDetailModalProps {
  artwork: ArtworkData;
  onClose: () => void;
}

export function ArtworkDetailModal({ artwork, onClose }: ArtworkDetailModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const meta = [artwork.year, artwork.medium, artwork.dimensions]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full mx-6 bg-[#1a1510] border border-[#c8a45a]/30 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Amber top bar */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#c8a45a] to-transparent" />

        <div className="p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Image */}
          {artwork.imageUrl && (
            <div className="mb-6 aspect-[4/3] overflow-hidden bg-[#0d0d0d]">
              <img
                src={artwork.imageUrl}
                alt={artwork.title}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Title */}
          <h2 className="font-display text-2xl font-bold text-white leading-tight mb-1">
            {artwork.title}
          </h2>

          {/* Artist */}
          {artwork.artistName && (
            <p className="font-mono text-sm text-[#c8a45a] mb-2 tracking-wide">
              {artwork.artistName}
            </p>
          )}

          {/* Meta line */}
          {meta && (
            <p className="font-mono text-xs text-white/40 mb-4 tracking-wider">
              {meta}
            </p>
          )}

          {/* Separator */}
          {artwork.description && (
            <div className="border-t border-white/10 pt-4">
              <p className="font-sans text-sm text-white/70 leading-relaxed">
                {artwork.description}
              </p>
            </div>
          )}
        </div>

        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#c8a45a]/30 to-transparent" />
        <div className="px-8 py-3 font-mono text-[10px] text-white/20 tracking-widest text-center">
          PRESS ESC OR CLICK OUTSIDE TO CLOSE
        </div>
      </div>
    </div>
  );
}
