import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useScene } from "@/lib/scene-context";

const ROUTE_SCENES: Record<string, number> = {
  "/galleries": 4,
  "/login": 2,
  "/register": 2,
};

interface Props {
  children: ReactNode;
  snapSections?: boolean;
}

export function PublicLayout({ children, snapSections }: Props) {
  const { user } = useAuth();
  const { setScene } = useScene();
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (location === "/") return;
    const idx = location.startsWith("/gallery/")
      ? 1
      : (ROUTE_SCENES[location] ?? 0);
    setScene(idx);
  }, [location, setScene]);

  useEffect(() => {
    if (snapSections) {
      const el = mainRef.current;
      if (!el) return;
      const onScroll = () => setScrolled(el.scrollTop > 60);
      el.addEventListener("scroll", onScroll, { passive: true });
      return () => el.removeEventListener("scroll", onScroll);
    } else {
      const onScroll = () => setScrolled(window.scrollY > 48);
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
  }, [snapSections]);

  const navStyle: React.CSSProperties = {
    background: scrolled
      ? "rgba(0,0,0,0.62)"
      : "linear-gradient(to bottom, rgba(0,0,0,0.52), transparent)",
    backdropFilter: scrolled ? "blur(12px)" : "none",
    transition: "background 500ms, backdrop-filter 500ms",
  };

  const linkStyle: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.625rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.6)",
    cursor: "pointer",
    transition: "color 200ms",
  };

  const brandStyle: React.CSSProperties = {
    fontFamily: "'Playfair Display', serif",
    fontStyle: "italic",
    fontSize: "1.1rem",
    color: "hsl(38 92% 50%)",
    cursor: "pointer",
    transition: "opacity 200ms",
  };

  return (
    <div
      className="text-foreground flex flex-col selection:bg-primary/30 relative z-10"
      style={snapSections ? { height: "100dvh", overflow: "hidden" } : { minHeight: "100vh" }}
    >
      {/* ── Navbar ── */}
      <header className="fixed top-0 w-full z-50" style={navStyle}>
        <div className="container mx-auto px-8 h-[4.5rem] flex items-center justify-between">
          <Link href="/">
            <span style={brandStyle}>Virtual Art Space</span>
          </Link>

          {/* Mobile */}
          <nav className="flex items-center gap-4 md:hidden">
            <Link href="/galleries">
              <span style={linkStyle}>Galleries</span>
            </Link>
            {user ? (
              <Link href="/dashboard">
                <span style={{ ...linkStyle, color: "hsl(38 92% 50%)" }}>Dashboard</span>
              </Link>
            ) : (
              <Link href="/register">
                <button
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.625rem",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#0e0a04",
                    background: "hsl(38 92% 50%)",
                    padding: "0.45rem 1rem",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Exhibit
                </button>
              </Link>
            )}
          </nav>

          {/* Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/galleries">
              <span
                style={linkStyle}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#fff")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.6)")}
              >
                Galleries
              </span>
            </Link>
            {user ? (
              <Link href="/dashboard">
                <span
                  style={linkStyle}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#fff")}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.6)")}
                >
                  Dashboard
                </span>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <span
                    style={linkStyle}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#fff")}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.6)")}
                  >
                    Sign In
                  </span>
                </Link>
                <Link href="/register">
                  <button
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "0.625rem",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "#0e0a04",
                      background: "hsl(38 92% 50%)",
                      padding: "0.5rem 1.25rem",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Exhibit
                  </button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Main ── */}
      <main
        ref={mainRef}
        className="relative flex-1"
        style={
          snapSections
            ? { scrollSnapType: "y mandatory", height: "100dvh", overflowY: "scroll" }
            : { paddingTop: "4.5rem" }
        }
      >
        {children}
      </main>

      {/* ── Footer (hidden in snap mode) ── */}
      {!snapSections && (
        <footer
          className="relative z-10 border-t mt-20 py-10"
          style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
        >
          <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                fontSize: "0.95rem",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              Virtual Art Space &mdash; Amman, Jordan
            </span>
            <div
              className="flex items-center gap-6"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.6rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              <span className="hover:text-primary cursor-pointer transition-colors">عمّان</span>
              <span className="cursor-pointer hover:text-white/50 transition-colors">Terms</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
