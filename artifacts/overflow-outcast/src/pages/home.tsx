import { Link } from "wouter";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Box, Globe, Palette } from "lucide-react";
import { motion } from "framer-motion";
import { FadeUp, FadeIn, FadeDown, Stagger, StaggerItem } from "@/lib/motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative min-h-[94vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/15 via-background to-background z-[-1]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/6 rounded-full blur-[180px] z-[-1]" />

        <div className="container mx-auto px-6 text-center z-10" style={{ perspective: 1200 }}>
          <FadeDown className="inline-block mb-6 px-4 py-1.5 border border-primary/30 bg-primary/5 text-primary font-mono text-xs tracking-[0.25em] uppercase">
            Amman Art Scene — Digital Galleries
          </FadeDown>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight text-foreground mb-8 overflow-hidden">
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
            <span className="block italic text-primary">
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
            className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-12 font-sans font-light leading-relaxed"
          >
            A digital home for Amman's artists. Build immersive 3D galleries, share your work with the world, and connect with a growing creative community rooted in Jordan.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.88 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button asChild size="lg" className="h-14 px-8 text-base bg-primary hover:bg-primary/90 text-primary-foreground font-sans font-medium rounded-sm w-full sm:w-auto shadow-[0_4px_24px_rgba(217,119,6,0.45)] transition-all hover:scale-[1.03] hover:shadow-[0_6px_32px_rgba(217,119,6,0.55)]">
              <Link href="/register">
                Start Exhibiting <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base border-border bg-card/30 hover:bg-card hover:text-foreground font-sans rounded-sm w-full sm:w-auto backdrop-blur-sm transition-all hover:border-primary/40">
              <Link href="/galleries">
                Browse Galleries
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground/50 uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="w-px h-8 bg-gradient-to-b from-primary/50 to-transparent"
          />
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-28 bg-card/20 border-y border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(217,119,6,0.04),transparent)]" />
        <div className="container mx-auto px-6 relative z-10">
          <FadeUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Built for Artists
            </h2>
            <p className="text-muted-foreground font-sans max-w-xl mx-auto">
              Everything you need to present your work in a space that does it justice.
            </p>
          </FadeUp>

          <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Box,
                title: "3D Exhibition Rooms",
                desc: "Walk visitors through themed virtual rooms. From clean white-cube galleries to warm stone-walled spaces inspired by Amman's architecture."
              },
              {
                icon: Palette,
                title: "Your Aesthetic",
                desc: "Curate every detail — your artworks, your descriptions, your story. Each gallery is a reflection of who you are as an artist."
              },
              {
                icon: Globe,
                title: "Reach the World",
                desc: "Publish your gallery and anyone with a browser can step inside. From Rainbow Street to the rest of the globe."
              }
            ].map((feature, i) => (
              <StaggerItem key={i}>
                <div className="group p-8 border border-border/50 bg-background/50 hover:bg-card/80 transition-all duration-500 hover:border-primary/40 rounded-sm relative overflow-hidden h-full cursor-default">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/3 group-hover:to-transparent transition-all duration-500" />
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <feature.icon className="w-9 h-9 text-primary mb-6" />
                  </motion.div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground font-sans text-sm leading-relaxed">{feature.desc}</p>
                  <div className="mt-8 h-px w-10 bg-primary/40 group-hover:w-full transition-all duration-700 ease-out" />
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-16 border-b border-border/50">
        <div className="container mx-auto px-6">
          <Stagger fast className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/40">
            {[
              { num: "3D", label: "Immersive Gallery Rooms" },
              { num: "∞", label: "Artworks Per Gallery" },
              { num: "JO", label: "Based in Amman, Jordan" },
            ].map((stat, i) => (
              <StaggerItem key={i}>
                <div className="py-8 md:px-12 text-center md:text-left">
                  <div className="font-display text-4xl font-bold text-primary mb-1">{stat.num}</div>
                  <div className="font-sans text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-36 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scaleX: 0.8 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: EASE }}
          className="absolute inset-0 bg-primary/4 skew-y-2 origin-top-left z-[-1]"
        />
        <div className="container mx-auto px-6 text-center">
          <FadeUp>
            <p className="text-primary font-sans text-sm tracking-widest uppercase mb-4">For every artist in Amman</p>
          </FadeUp>
          <FadeUp delay={120}>
            <h2 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-6 leading-tight">
              Your gallery<br className="hidden md:block" />
              <span className="italic text-primary"> is waiting.</span>
            </h2>
          </FadeUp>
          <FadeUp delay={240}>
            <p className="text-xl text-muted-foreground font-sans mb-12 max-w-xl mx-auto leading-relaxed">
              Join artists from across Jordan sharing their work without walls, without gatekeepers — just art and space.
            </p>
          </FadeUp>
          <FadeUp delay={360}>
            <Button asChild size="lg" className="h-14 px-10 text-base bg-primary hover:bg-primary/90 text-primary-foreground font-sans font-semibold rounded-sm shadow-[0_4px_24px_rgba(217,119,6,0.45)] hover:scale-[1.03] transition-all">
              <Link href="/register">Create Your Gallery</Link>
            </Button>
          </FadeUp>
        </div>
      </section>
    </PublicLayout>
  );
}
