import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { useScene } from "@/lib/scene-context";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const ROUTE_SCENES: Record<string, number> = {
  "/galleries": 4,
  "/sign-in": 2,
  "/sign-up": 2,
};

interface Props {
  children: ReactNode;
  snapSections?: boolean;
}

export function PublicLayout({ children, snapSections }: Props) {
  const { user } = useUser();
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
    const el = mainRef.current;

    const onContainerScroll = () => {
      if (el) setScrolled(el.scrollTop > 60);
    };
    const onWindowScroll = () => setScrolled(window.scrollY > 48);

    if (el) {
      el.addEventListener("scroll", onContainerScroll, { passive: true });
    }
    window.addEventListener("scroll", onWindowScroll, { passive: true });

    return () => {
      if (el) el.removeEventListener("scroll", onContainerScroll);
      window.removeEventListener("scroll", onWindowScroll);
    };
  }, []);

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
      className={`text-foreground flex flex-col selection:bg-primary/30 relative z-10 ${snapSections ? "snap-wrapper" : "min-h-screen"}`}
    >
      {/* ── Navbar ── */}
      <header className="fixed top-0 w-full z-50" style={navStyle}>
        <div className="container mx-auto px-6 md:px-8 h-[4.5rem] flex items-center justify-between">
          <Link href="/">
            <span style={brandStyle}>Virtual Art Space</span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-4 md:gap-8">
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
                <Link href="/sign-in">
                  <span
                    className="hidden sm:inline"
                    style={linkStyle}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#fff")}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.6)")}
                  >
                    Sign In
                  </span>
                </Link>
                <Link href="/sign-up">
                  <button
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "0.625rem",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "#0e0a04",
                      background: "hsl(38 92% 50%)",
                      padding: "0.45rem 1rem",
                      border: "none",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
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
        className={`relative flex-1 ${snapSections ? "snap-container" : ""}`}
        style={snapSections ? {} : { paddingTop: "4.5rem" }}
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
