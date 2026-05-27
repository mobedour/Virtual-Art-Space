import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ArtworkData } from "./ArtworkFrame";

interface ArtworkDetailModalProps {
  artwork: ArtworkData;
  onClose: () => void;
}

export function ArtworkDetailModal({ artwork, onClose }: ArtworkDetailModalProps) {
  const [imgError, setImgError] = useState(false);

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
      className="absolute inset-0 z-40 flex items-center justify-center p-4"
      style={{
        background: "rgba(0,0,0,0.72)",
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
      onClick={onClose}
    >
      {/* Floating "Back" pill — always visible, large tap target for mobile */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close artwork"
        className="absolute z-50 flex items-center gap-2 px-4 h-11 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white/90 hover:bg-black/90 active:scale-95 transition-all font-sans text-sm shadow-lg shadow-black/50 touch-manipulation"
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          left: "max(1rem, env(safe-area-inset-left))",
        }}
      >
        <span aria-hidden className="text-base leading-none">←</span>
        <span>Back</span>
      </button>

      <div
        className="relative w-full bg-[#1a1510] border border-[#c8a45a]/30 shadow-2xl flex flex-col"
        style={{ maxWidth: 560, maxHeight: "calc(100dvh - 2rem)", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Amber top bar */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#c8a45a] to-transparent shrink-0" />

        {/* Close button — bigger tap target on mobile */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10 touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Body — switches to row layout on landscape phones */}
        <div className="modal-body p-5 sm:p-8 flex-1">
          {/* Image */}
          {artwork.imageUrl && !imgError && (
            <div className="modal-image mb-5 aspect-[4/3] overflow-hidden bg-[#0d0d0d]">
              <img
                src={artwork.imageUrl}
                alt={artwork.title}
                className="w-full h-full object-contain"
                onError={() => setImgError(true)}
              />
            </div>
          )}

          {/* Text block */}
          <div className="modal-text">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white leading-tight mb-1">
              {artwork.title}
            </h2>

            {artwork.artistName && (
              <p className="font-mono text-sm text-[#c8a45a] mb-2 tracking-wide">
                {artwork.artistName}
              </p>
            )}

            {meta && (
              <p className="font-mono text-xs text-white/40 mb-4 tracking-wider">
                {meta}
              </p>
            )}

            {artwork.description && (
              <div className="border-t border-white/10 pt-4">
                <p className="font-sans text-sm text-white/70 leading-relaxed">
                  {artwork.description}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#c8a45a]/30 to-transparent shrink-0" />
        <div className="px-8 py-3 font-mono text-[10px] text-white/20 tracking-widest text-center shrink-0">
          PRESS ESC OR CLICK OUTSIDE TO CLOSE
        </div>
      </div>

      {/* Landscape layout: image left, text right */}
      <style>{`
        @media (orientation: landscape) and (max-height: 520px) {
          .modal-body {
            display: flex;
            flex-direction: row;
            gap: 1.25rem;
            align-items: flex-start;
            padding: 1rem 1.25rem;
          }
          .modal-image {
            width: 45%;
            flex-shrink: 0;
            margin-bottom: 0;
            aspect-ratio: 4/3;
          }
          .modal-text {
            flex: 1;
            min-width: 0;
          }
        }
      `}</style>
    </div>
  );
}
