import { Link } from "wouter";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Box, Globe, Palette } from "lucide-react";

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/15 via-background to-background z-[-1]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/8 rounded-full blur-[160px] z-[-1]"></div>

        <div className="container mx-auto px-6 text-center z-10">
          <div className="inline-block mb-6 px-4 py-1.5 border border-primary/30 bg-primary/5 text-primary font-mono text-xs tracking-[0.25em] uppercase">
            Amman Art Scene — Digital Galleries
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight text-foreground mb-8">
            Your Art.<br className="hidden md:block" />
            <span className="italic text-primary">Boundless Space.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-12 font-sans font-light leading-relaxed">
            A digital home for Amman's artists. Build immersive 3D galleries, share your work with the world, and connect with a growing creative community rooted in Jordan.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="h-14 px-8 text-base bg-primary hover:bg-primary/90 text-primary-foreground font-sans font-medium rounded-sm w-full sm:w-auto shadow-[0_4px_20px_rgba(217,119,6,0.4)] transition-all hover:scale-[1.02]">
              <Link href="/register">
                Start Exhibiting <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base border-border bg-card/30 hover:bg-card hover:text-foreground font-sans rounded-sm w-full sm:w-auto backdrop-blur-sm transition-all hover:border-primary/40">
              <Link href="/galleries">
                Browse Galleries
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-card/20 border-y border-border/50 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Built for Artists
            </h2>
            <p className="text-muted-foreground font-sans max-w-xl mx-auto">
              Everything you need to present your work in a space that does it justice.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
              <div key={i} className="group p-8 border border-border/50 bg-background/50 hover:bg-card/80 transition-all hover:border-primary/40 rounded-sm relative overflow-hidden">
                <feature.icon className="w-9 h-9 text-primary mb-6" />
                <h3 className="font-display font-semibold text-lg text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground font-sans text-sm leading-relaxed">{feature.desc}</p>
                <div className="mt-8 h-px w-10 bg-primary/40 group-hover:w-full transition-all duration-500 ease-out" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/4 skew-y-2 origin-top-left z-[-1]" />
        <div className="container mx-auto px-6 text-center">
          <p className="text-primary font-sans text-sm tracking-widest uppercase mb-4">For every artist in Amman</p>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
            Your gallery is waiting.
          </h2>
          <p className="text-xl text-muted-foreground font-sans mb-12 max-w-xl mx-auto leading-relaxed">
            Join artists from across Jordan sharing their work without walls, without gatekeepers — just art and space.
          </p>
          <Button asChild size="lg" className="h-14 px-10 text-base bg-primary hover:bg-primary/90 text-primary-foreground font-sans font-semibold rounded-sm shadow-[0_4px_20px_rgba(217,119,6,0.4)] hover:scale-[1.02] transition-all">
            <Link href="/register">Create Your Gallery</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
