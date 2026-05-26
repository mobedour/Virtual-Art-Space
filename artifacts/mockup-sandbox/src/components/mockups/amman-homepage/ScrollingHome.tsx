import { useEffect, useRef, useState } from "react";

const SCENES = [
  {
    img: "/__mockup/images/amman-sunset.png",
    overlayColor: "rgba(15,8,3,0.52)",
    accent: "#f59e0b",
    label: "Amman at Sunset",
  },
  {
    img: "/__mockup/images/amman-citadel.png",
    overlayColor: "rgba(8,6,3,0.58)",
    accent: "#d97706",
    label: "Jabal al-Qal'a",
  },
  {
    img: "/__mockup/images/amman-calligraphy.png",
    overlayColor: "rgba(12,7,2,0.54)",
    accent: "#b45309",
    label: "عمّان",
  },
  {
    img: "/__mockup/images/amman-gallery.png",
    overlayColor: "rgba(5,5,8,0.60)",
    accent: "#8b5cf6",
    label: "The Gallery",
  },
  {
    img: "/__mockup/images/amman-golden.png",
    overlayColor: "rgba(14,9,2,0.50)",
    accent: "#f59e0b",
    label: "Jordan",
  },
];

const FEATURES = [
  {
    title: "3D Exhibition Rooms",
    desc: "Walk visitors through themed virtual rooms — from clean white-cube galleries to warm stone-walled spaces inspired by Amman's architecture.",
    num: "01",
  },
  {
    title: "Your Aesthetic",
    desc: "Curate every detail — your artworks, descriptions, your story. Each gallery is a reflection of who you are as an artist.",
    num: "02",
  },
  {
    title: "Reach the World",
    desc: "Publish your gallery and anyone with a browser can step inside. From Rainbow Street to the rest of the globe.",
    num: "03",
  },
];

export function ScrollingHome() {
  const [activeScene, setActiveScene] = useState(0);
  const [prevScene, setPrevScene] = useState(0);
  const [fading, setFading] = useState(false);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionRefs.current.forEach((section, idx) => {
      if (!section) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              if (idx !== activeScene) {
                setPrevScene((p) => p);
                setFading(true);
                setTimeout(() => {
                  setActiveScene(idx);
                  setFading(false);
                }, 380);
              }
            }
          });
        },
        { threshold: 0.35 }
      );
      obs.observe(section);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scene = SCENES[activeScene];
  const prev = SCENES[prevScene];

  return (
    <div
      className="relative min-h-screen"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#0e0a04" }}
    >
      {/* Google Fonts */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400;1,700&family=Plus+Jakarta+Sans:wght@300;400;500;600&family=DM+Mono&display=swap"
      />

      {/* ── Fixed background layer ── */}
      <div className="fixed inset-0 z-0" aria-hidden="true">
        {/* Previous scene — fades out */}
        <div
          className="absolute inset-0 transition-opacity"
          style={{
            backgroundImage: `url('${prev.img}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: fading ? 0 : 0,
            transitionDuration: "600ms",
          }}
        />
        {/* Active scene — fades in */}
        <div
          key={activeScene}
          className="absolute inset-0"
          style={{
            backgroundImage: `url('${scene.img}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            animation: "bgFadeIn 700ms ease forwards",
          }}
        />
        {/* Dark overlay */}
        <div
          className="absolute inset-0 transition-all"
          style={{
            background: scene.overlayColor,
            transitionDuration: "700ms",
          }}
        />
        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 100%)",
          }}
        />
        {/* Bottom fade to black so content sections blend */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(0,0,0,0.85))",
          }}
        />
      </div>

      {/* ── Scene indicator dots ── */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {SCENES.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiveScene(i)}
            className="w-1.5 rounded-full transition-all duration-500"
            style={{
              height: activeScene === i ? "2rem" : "0.375rem",
              background:
                activeScene === i ? scene.accent : "rgba(255,255,255,0.25)",
            }}
            aria-label={s.label}
          />
        ))}
      </div>

      {/* ── Nav ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-10 py-5"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)",
        }}
      >
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: "1.1rem",
            color: scene.accent,
            transition: "color 700ms",
          }}
        >
          Virtual Art Space
        </span>
        <div className="flex items-center gap-8">
          {["Galleries", "Artists", "About"].map((l) => (
            <a
              key={l}
              href="#"
              style={{
                fontSize: "0.75rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.65)",
                transition: "color 200ms",
              }}
            >
              {l}
            </a>
          ))}
          <button
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#0e0a04",
              background: scene.accent,
              padding: "0.5rem 1.25rem",
              transition: "background 700ms",
            }}
          >
            Exhibit
          </button>
        </div>
      </nav>

      {/* ── Scrollable content ── */}
      <div className="relative z-10">

        {/* Section 0 — Hero */}
        <section
          ref={(el) => { sectionRefs.current[0] = el; }}
          className="min-h-screen flex flex-col items-center justify-center text-center px-6"
          style={{ paddingTop: "5rem" }}
        >
          <div
            style={{
              display: "inline-block",
              fontSize: "0.625rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: scene.accent,
              border: `1px solid ${scene.accent}44`,
              padding: "0.375rem 1rem",
              marginBottom: "2rem",
              transition: "color 700ms, border-color 700ms",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Amman Art Scene — Digital Galleries
          </div>

          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "clamp(3.5rem, 9vw, 7rem)",
              lineHeight: 1.05,
              color: "#fff",
              marginBottom: "2rem",
              letterSpacing: "-0.01em",
            }}
          >
            Your Art.
            <br />
            <span
              style={{
                fontStyle: "italic",
                color: scene.accent,
                transition: "color 700ms",
              }}
            >
              Boundless Space.
            </span>
          </h1>

          <p
            style={{
              maxWidth: "38rem",
              fontSize: "1.1rem",
              lineHeight: 1.75,
              color: "rgba(255,255,255,0.6)",
              marginBottom: "3rem",
              fontWeight: 300,
            }}
          >
            A digital home for Amman's artists. Build immersive 3D galleries, share
            your work with the world, and connect with a growing creative community
            rooted in Jordan.
          </p>

          <div className="flex items-center gap-4">
            <button
              style={{
                padding: "0.875rem 2.5rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                letterSpacing: "0.05em",
                color: "#0e0a04",
                background: scene.accent,
                border: "none",
                transition: "background 700ms",
                cursor: "pointer",
              }}
            >
              Start Exhibiting →
            </button>
            <button
              style={{
                padding: "0.875rem 2.5rem",
                fontSize: "0.875rem",
                fontWeight: 400,
                letterSpacing: "0.05em",
                color: "rgba(255,255,255,0.75)",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.25)",
                cursor: "pointer",
              }}
            >
              Browse Galleries
            </button>
          </div>

          {/* Scroll hint */}
          <div
            style={{
              position: "absolute",
              bottom: "2.5rem",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.5rem",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              Scroll
            </span>
            <div
              style={{
                width: "1px",
                height: "2rem",
                background: `linear-gradient(to bottom, ${scene.accent}88, transparent)`,
                animation: "scrollPulse 1.6s ease-in-out infinite",
                transition: "background 700ms",
              }}
            />
          </div>
        </section>

        {/* Dark band between sections */}
        <div style={{ height: "4rem", background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))" }} />

        {/* Section 1 — Citadel / "Built for Artists" */}
        <section
          ref={(el) => { sectionRefs.current[1] = el; }}
          className="min-h-screen flex flex-col justify-center px-16 py-24"
          style={{ background: "rgba(0,0,0,0.35)" }}
        >
          <div style={{ maxWidth: "72rem", margin: "0 auto", width: "100%" }}>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.625rem",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: scene.accent,
                marginBottom: "1.25rem",
                transition: "color 700ms",
              }}
            >
              Built for Artists
            </p>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(2.5rem, 5vw, 4rem)",
                fontWeight: 700,
                color: "#fff",
                marginBottom: "4rem",
                lineHeight: 1.1,
              }}
            >
              Everything you need to present your work
              <br />
              <span style={{ fontStyle: "italic", color: scene.accent, transition: "color 700ms" }}>
                in a space that does it justice.
              </span>
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "2px",
              }}
            >
              {FEATURES.map((f) => (
                <div
                  key={f.num}
                  style={{
                    padding: "2.5rem",
                    background: "rgba(0,0,0,0.45)",
                    borderTop: `1px solid ${scene.accent}33`,
                    backdropFilter: "blur(8px)",
                    transition: "border-color 700ms",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "0.625rem",
                      letterSpacing: "0.2em",
                      color: scene.accent,
                      marginBottom: "1.5rem",
                      transition: "color 700ms",
                    }}
                  >
                    {f.num}
                  </div>
                  <h3
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "#fff",
                      marginBottom: "1rem",
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      lineHeight: 1.75,
                      color: "rgba(255,255,255,0.55)",
                      fontWeight: 300,
                    }}
                  >
                    {f.desc}
                  </p>
                  <div
                    style={{
                      marginTop: "2rem",
                      height: "1px",
                      width: "2.5rem",
                      background: scene.accent,
                      transition: "background 700ms",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <div style={{ height: "4rem", background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.6))" }} />

        {/* Section 2 — Calligraphy / Stats */}
        <section
          ref={(el) => { sectionRefs.current[2] = el; }}
          className="min-h-[70vh] flex items-center justify-center py-24 px-16"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <div style={{ maxWidth: "72rem", margin: "0 auto", width: "100%" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {[
                { num: "3D", label: "Immersive Gallery Rooms" },
                { num: "∞", label: "Artworks Per Gallery" },
                { num: "عمّان", label: "Rooted in Amman, Jordan" },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    padding: "3.5rem 2.5rem",
                    borderRight: i < 2 ? "1px solid rgba(255,255,255,0.1)" : "none",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "3.5rem",
                      fontWeight: 700,
                      color: scene.accent,
                      marginBottom: "0.75rem",
                      lineHeight: 1,
                      transition: "color 700ms",
                    }}
                  >
                    {stat.num}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.45)",
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Pull quote */}
            <div style={{ textAlign: "center", paddingTop: "5rem" }}>
              <blockquote
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: "italic",
                  fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                  color: "rgba(255,255,255,0.85)",
                  lineHeight: 1.5,
                  maxWidth: "52rem",
                  margin: "0 auto",
                }}
              >
                "Art in Amman has always lived on the street, on the walls, in the hills.
                We're giving it a new dimension."
              </blockquote>
              <div
                style={{
                  marginTop: "1.5rem",
                  fontSize: "0.7rem",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: scene.accent,
                  fontFamily: "'DM Mono', monospace",
                  transition: "color 700ms",
                }}
              >
                Virtual Art Space
              </div>
            </div>
          </div>
        </section>

        <div style={{ height: "4rem", background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))" }} />

        {/* Section 3 — Gallery dark / Room preview teaser */}
        <section
          ref={(el) => { sectionRefs.current[3] = el; }}
          className="min-h-screen flex items-center justify-center py-24 px-16"
          style={{ background: "rgba(0,0,0,0.4)" }}
        >
          <div style={{ maxWidth: "72rem", margin: "0 auto", width: "100%", textAlign: "center" }}>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.625rem",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: scene.accent,
                marginBottom: "1.25rem",
                transition: "color 700ms",
              }}
            >
              Step Inside
            </p>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(2.5rem, 6vw, 5rem)",
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.1,
                marginBottom: "1.5rem",
              }}
            >
              Your gallery lives{" "}
              <span style={{ fontStyle: "italic", color: scene.accent, transition: "color 700ms" }}>
                in three dimensions.
              </span>
            </h2>
            <p
              style={{
                fontSize: "1rem",
                lineHeight: 1.8,
                color: "rgba(255,255,255,0.5)",
                maxWidth: "36rem",
                margin: "0 auto 3rem",
                fontWeight: 300,
              }}
            >
              Choose a room theme, hang your artworks on the walls, and let visitors
              walk through your space — anywhere, on any device.
            </p>

            {/* Mock gallery room preview */}
            <div
              style={{
                position: "relative",
                maxWidth: "56rem",
                margin: "0 auto",
                border: `1px solid ${scene.accent}30`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  aspectRatio: "16/9",
                  background: "linear-gradient(135deg, #1a1008 0%, #0e0a04 40%, #12080a 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {/* Room floor */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "40%",
                    background:
                      "linear-gradient(to top, rgba(120,80,20,0.12), transparent)",
                  }}
                />
                {/* Fake artwork frames */}
                {[
                  { left: "8%", top: "18%", w: "14%", h: "42%" },
                  { left: "26%", top: "22%", w: "18%", h: "36%" },
                  { left: "58%", top: "20%", w: "16%", h: "40%" },
                  { left: "78%", top: "24%", w: "13%", h: "33%" },
                ].map((frame, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: frame.left,
                      top: frame.top,
                      width: frame.w,
                      height: frame.h,
                      border: `2px solid ${scene.accent}60`,
                      background: `rgba(${i % 2 === 0 ? "180,120,60" : "100,80,140"},0.15)`,
                      boxShadow: `0 0 20px ${scene.accent}20`,
                      transition: "border-color 700ms, box-shadow 700ms",
                    }}
                  />
                ))}
                {/* Centre light */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "2px",
                    height: "100%",
                    background: `linear-gradient(to bottom, ${scene.accent}40, transparent)`,
                    transition: "background 700ms",
                  }}
                />
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.625rem",
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.3)",
                    zIndex: 10,
                  }}
                >
                  3D Gallery Preview
                </div>
              </div>
              {/* Bottom bar */}
              <div
                style={{
                  padding: "1rem 1.5rem",
                  background: "rgba(0,0,0,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.65rem",
                    letterSpacing: "0.15em",
                    color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                  }}
                >
                  Dark Void Theme · 4 Artworks
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.65rem",
                    letterSpacing: "0.15em",
                    color: scene.accent,
                    textTransform: "uppercase",
                    transition: "color 700ms",
                  }}
                >
                  Enter Gallery →
                </span>
              </div>
            </div>
          </div>
        </section>

        <div style={{ height: "4rem", background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))" }} />

        {/* Section 4 — Golden / CTA */}
        <section
          ref={(el) => { sectionRefs.current[4] = el; }}
          className="min-h-screen flex items-center justify-center py-24 px-16 text-center"
          style={{ background: "rgba(0,0,0,0.35)" }}
        >
          <div style={{ maxWidth: "52rem", margin: "0 auto" }}>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.625rem",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: scene.accent,
                marginBottom: "1.5rem",
                transition: "color 700ms",
              }}
            >
              For every artist in Amman
            </p>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(2.75rem, 7vw, 5.5rem)",
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.1,
                marginBottom: "2rem",
              }}
            >
              Your gallery
              <br />
              <span style={{ fontStyle: "italic", color: scene.accent, transition: "color 700ms" }}>
                is waiting.
              </span>
            </h2>
            <p
              style={{
                fontSize: "1.1rem",
                lineHeight: 1.75,
                color: "rgba(255,255,255,0.55)",
                marginBottom: "3rem",
                fontWeight: 300,
              }}
            >
              Join artists from across Jordan sharing their work without walls,
              without gatekeepers — just art and space.
            </p>
            <button
              style={{
                padding: "1.125rem 3.5rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#0e0a04",
                background: scene.accent,
                border: "none",
                cursor: "pointer",
                transition: "background 700ms",
                boxShadow: `0 8px 32px ${scene.accent}55`,
              }}
            >
              Create Your Gallery
            </button>

            {/* Footer note */}
            <div
              style={{
                marginTop: "6rem",
                paddingTop: "2rem",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: "italic",
                  fontSize: "1rem",
                  color: scene.accent,
                  transition: "color 700ms",
                }}
              >
                Virtual Art Space
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.6rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.25)",
                }}
              >
                Amman · Jordan · 2025
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ── Keyframe styles ── */}
      <style>{`
        @keyframes bgFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scrollPulse {
          0%, 100% { transform: scaleY(1); opacity: 0.6; }
          50%       { transform: scaleY(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
