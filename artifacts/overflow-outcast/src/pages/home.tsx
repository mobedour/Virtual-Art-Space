import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/public-layout";
import { useScene } from "@/lib/scene-context";
import { ArrowRight, Box, Globe, Palette } from "lucide-react";
import { motion } from "framer-motion";
import { FadeUp, Stagger, StaggerItem } from "@/lib/motion";

const EASE = [0.22, 1, 0.36, 1] as const;
const SECTION_SCENES = [0, 1, 2, 4];

export default function Home() {
  const { setScene } = useScene();
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    setScene(0);
  }, [setScene]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sectionRefs.current.forEach((section, idx) => {
      if (!section) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setScene(SECTION_SCENES[idx]);
          });
        },
        { threshold: 0.4 }
      );
      obs.observe(section);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [setScene]);

  const setSectionRef = (idx: number) => (el: HTMLElement | null) => {
    sectionRefs.current[idx] = el;
  };

  const monoLabel: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.625rem",
    letterSpacing: "0.28em",
    textTransform: "uppercase",
  };

  return (
    <PublicLayout snapSections>
      {/* ── Section 0: Hero ── */}
      <section
        ref={setSectionRef(0)}
        className="snap-section relative flex flex-col items-center justify-center text-center px-6 py-24 md:py-0"
        style={{ paddingTop: "calc(4.5rem + 2rem)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
          className="inline-block mb-5 px-4 py-1.5"
          style={{
            ...monoLabel,
            color: "hsl(38 92% 50%)",
            border: "1px solid rgba(245,158,11,0.3)",
            background: "rgba(245,158,11,0.06)",
          }}
        >
          Amman Art Scene — Digital Galleries
        </motion.div>

        <h1
          className="mb-6 overflow-hidden"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: "clamp(3rem, 9vw, 7rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: "#fff",
          }}
        >
          <span className="block">
            <motion.span
              initial={{ opacity: 0, y: 64 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
              style={{ display: "inline-block" }}
            >
              Your&nbsp;
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 64 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.22 }}
              style={{ display: "inline-block" }}
            >
              Art.
            </motion.span>
          </span>
          <span className="block" style={{ fontStyle: "italic", color: "hsl(38 92% 50%)" }}>
            <motion.span
              initial={{ opacity: 0, y: 64 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.38 }}
              style={{ display: "inline-block" }}
            >
              Boundless&nbsp;
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 64 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.52 }}
              style={{ display: "inline-block" }}
            >
              Space.
            </motion.span>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: EASE, delay: 0.7 }}
          className="max-w-2xl mx-auto mb-10 font-light leading-relaxed"
          style={{ fontSize: "clamp(0.95rem, 2.5vw, 1.1rem)", color: "rgba(255,255,255,0.6)" }}
        >
          A digital home for Amman's artists. Build immersive 3D galleries, share your work with the world, and connect with a growing creative community rooted in Jordan.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.88 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm sm:max-w-none"
        >
          <Link href="/register">
            <button
              className="h-14 px-8 w-full sm:w-auto transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.7rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#0e0a04",
                background: "hsl(38 92% 50%)",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 24px rgba(217,119,6,0.45)",
              }}
            >
              Start Exhibiting <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </Link>
          <Link href="/galleries">
            <button
              className="h-14 px-8 w-full sm:w-auto transition-colors"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.7rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.7)",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.25)",
                cursor: "pointer",
              }}
            >
              Browse Galleries
            </button>
          </Link>
        </motion.div>

        {/* Scroll hint — desktop only */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="hidden md:flex absolute bottom-10 left-1/2 -translate-x-1/2 flex-col items-center gap-2"
        >
          <span style={{ ...monoLabel, color: "rgba(255,255,255,0.3)", fontSize: "0.5rem" }}>Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="w-px h-8"
            style={{ background: "linear-gradient(to bottom, hsl(38 92% 50% / 0.6), transparent)" }}
          />
        </motion.div>
      </section>

      {/* ── Section 1: Features ── */}
      <section
        ref={setSectionRef(1)}
        className="snap-section relative flex items-center py-20 md:py-0"
      >
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.28)", backdropFilter: "blur(2px)" }}
        />
        <div className="container mx-auto px-6 relative z-10 py-16">
          <FadeUp className="text-center mb-10 md:mb-14">
            <p style={{ ...monoLabel, color: "hsl(38 92% 50%)", marginBottom: "1rem" }}>
              Built for Artists
            </p>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(1.75rem, 4vw, 3.25rem)",
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.15,
              }}
            >
              Everything you need to present your work
              <br className="hidden sm:block" />
              <span style={{ fontStyle: "italic", color: "hsl(38 92% 50%)" }}>
                {" "}in a space that does it justice.
              </span>
            </h2>
          </FadeUp>

          <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-px">
            {[
              {
                icon: Box,
                title: "3D Exhibition Rooms",
                desc: "Walk visitors through themed virtual rooms. From clean white-cube galleries to warm stone-walled spaces inspired by Amman's architecture.",
                num: "01",
              },
              {
                icon: Palette,
                title: "Your Aesthetic",
                desc: "Curate every detail — your artworks, your descriptions, your story. Each gallery is a reflection of who you are as an artist.",
                num: "02",
              },
              {
                icon: Globe,
                title: "Reach the World",
                desc: "Publish your gallery and anyone with a browser can step inside. From Rainbow Street to the rest of the globe.",
                num: "03",
              },
            ].map((feature) => (
              <StaggerItem key={feature.num}>
                <div
                  className="group p-6 md:p-8 h-full cursor-default relative overflow-hidden"
                  style={{
                    background: "rgba(0,0,0,0.40)",
                    borderTop: "1px solid rgba(245,158,11,0.2)",
                  }}
                >
                  <div style={{ ...monoLabel, color: "hsl(38 92% 50%)", marginBottom: "1.25rem" }}>
                    {feature.num}
                  </div>
                  <feature.icon className="w-7 h-7 mb-4 text-primary" />
                  <h3
                    className="mb-3"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "1.15rem",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p style={{ fontSize: "0.875rem", lineHeight: 1.75, color: "rgba(255,255,255,0.5)", fontWeight: 300 }}>
                    {feature.desc}
                  </p>
                  <div
                    className="mt-6 h-px w-10 group-hover:w-full transition-all duration-700 ease-out"
                    style={{ background: "hsl(38 92% 50%)" }}
                  />
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Section 2: Stats + Quote ── */}
      <section
        ref={setSectionRef(2)}
        className="snap-section relative flex items-center justify-center py-20 md:py-0"
      >
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.25)" }} />
        <div className="container mx-auto px-6 relative z-10">
          {/* Stats grid — stacks vertically on mobile, 3-col on desktop */}
          <div
            className="grid grid-cols-1 md:grid-cols-3 divide-y divide-white/10 md:divide-y-0 md:divide-x"
            style={{ borderTop: "1px solid rgba(255,255,255,0.1)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}
          >
            {[
              { num: "3D", label: "Immersive Gallery Rooms" },
              { num: "∞", label: "Artworks Per Gallery" },
              { num: "عمّان", label: "Rooted in Amman, Jordan" },
            ].map((stat, i) => (
              <div key={i} className="py-10 md:py-12 px-6 md:px-8 text-center">
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "clamp(2.5rem, 6vw, 3.25rem)",
                    fontWeight: 700,
                    color: "hsl(38 92% 50%)",
                    lineHeight: 1,
                    marginBottom: "0.75rem",
                  }}
                >
                  {stat.num}
                </div>
                <div style={{ ...monoLabel, color: "rgba(255,255,255,0.4)" }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 md:mt-20">
            <blockquote
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                fontSize: "clamp(1.1rem, 2.5vw, 1.875rem)",
                color: "rgba(255,255,255,0.8)",
                lineHeight: 1.6,
                maxWidth: "48rem",
                margin: "0 auto",
              }}
            >
              "Art in Amman has always lived on the street, on the walls, in the hills.
              We're giving it a new dimension."
            </blockquote>
            <div style={{ ...monoLabel, color: "hsl(38 92% 50%)", marginTop: "1.5rem" }}>
              Virtual Art Space
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: CTA ── */}
      <section
        ref={setSectionRef(3)}
        className="snap-section relative flex items-center justify-center text-center py-24 md:py-0"
      >
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.3)" }} />
        <div className="container mx-auto px-6 relative z-10">
          <FadeUp>
            <p style={{ ...monoLabel, color: "hsl(38 92% 50%)", marginBottom: "1.25rem" }}>
              For every artist in Amman
            </p>
          </FadeUp>
          <FadeUp delay={120}>
            <h2
              className="mb-6"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.1,
              }}
            >
              Your gallery
              <br />
              <span style={{ fontStyle: "italic", color: "hsl(38 92% 50%)" }}>is waiting.</span>
            </h2>
          </FadeUp>
          <FadeUp delay={240}>
            <p
              className="mb-10 max-w-xl mx-auto font-light leading-relaxed"
              style={{ fontSize: "clamp(0.95rem, 2.5vw, 1.1rem)", color: "rgba(255,255,255,0.55)" }}
            >
              Join artists from across Jordan sharing their work without walls, without gatekeepers — just art and space.
            </p>
          </FadeUp>
          <FadeUp delay={360}>
            <Link href="/register">
              <button
                className="h-14 px-10 transition-opacity hover:opacity-90"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.7rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  color: "#0e0a04",
                  background: "hsl(38 92% 50%)",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 8px 32px rgba(217,119,6,0.5)",
                }}
              >
                Create Your Gallery
              </button>
            </Link>
          </FadeUp>

          <div
            className="mt-14 md:mt-20 flex items-center justify-between max-w-2xl mx-auto"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "2rem" }}
          >
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                fontSize: "0.95rem",
                color: "hsl(38 92% 50%)",
              }}
            >
              Virtual Art Space
            </span>
            <span style={{ ...monoLabel, color: "rgba(255,255,255,0.25)", fontSize: "0.55rem" }}>
              Amman · Jordan · 2025
            </span>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
