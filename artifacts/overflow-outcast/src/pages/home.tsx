import { Link } from "wouter";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Box, Zap, Globe, Cpu } from "lucide-react";

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background z-[-1]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] z-[-1]"></div>
        
        <div className="container mx-auto px-6 text-center z-10">
          <div className="inline-block mb-6 px-4 py-1.5 border border-primary/30 bg-primary/5 text-primary font-mono text-xs tracking-[0.3em] uppercase animate-pulse">
            VIRTUAL EXHIBITION PROTOCOL v1.0
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black tracking-tight text-white mb-8 drop-shadow-2xl">
            CLAIM YOUR <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-primary animate-in fade-in duration-1000">INFINITE SPACE</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-12 font-sans font-light leading-relaxed">
            Break out of traditional gallery constraints. Build raw, immersive 3D exhibitions in the cyber-void. The underground art world is digital.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button asChild size="lg" className="h-14 px-8 text-base bg-primary hover:bg-primary/90 text-primary-foreground font-mono rounded-none w-full sm:w-auto drop-shadow-[0_0_15px_rgba(124,58,237,0.6)] border border-primary transition-all hover:scale-105">
              <Link href="/register">
                INITIALIZE_ARTIST_NODE <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base border-border bg-card/30 hover:bg-card hover:text-white font-mono rounded-none w-full sm:w-auto backdrop-blur-sm transition-all hover:border-primary/50">
              <Link href="/galleries">
                ACCESS_NETWORK
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-card/20 border-y border-border/50 relative">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: Box,
                title: "3D ENVIRONMENTS",
                desc: "Deploy your art into themed virtual architectures. From neon grids to brutalist concrete bunkers."
              },
              {
                icon: Zap,
                title: "RAW AESTHETICS",
                desc: "No corporate sterile walls. Build exhibitions that feel electric, underground, and undeniably yours."
              },
              {
                icon: Globe,
                title: "GLOBAL BROADCAST",
                desc: "Publish your node to the public network. Anyone with a browser can drop into your space instantly."
              }
            ].map((feature, i) => (
              <div key={i} className="group p-8 border border-border/50 bg-background/50 hover:bg-card/80 transition-all hover:border-primary/50 rounded-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Cpu className="w-24 h-24 text-primary" />
                </div>
                <feature.icon className="w-10 h-10 text-primary mb-6 drop-shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                <h3 className="font-display font-bold text-xl tracking-widest text-white mb-4">{feature.title}</h3>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">{feature.desc}</p>
                <div className="mt-8 h-1 w-12 bg-primary/30 group-hover:w-full transition-all duration-500 ease-out" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 skew-y-3 origin-top-left z-[-1]" />
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-8">
            THE GALLERY SYSTEM <span className="text-primary drop-shadow-[0_0_10px_rgba(124,58,237,0.8)]">IS BROKEN</span>
          </h2>
          <p className="text-xl text-muted-foreground font-mono mb-12 max-w-2xl mx-auto">
            Stop asking for permission to show your work. Establish your own endpoint on the Overflow Outcast network today.
          </p>
          <Button asChild size="lg" className="h-16 px-10 text-lg bg-white text-black hover:bg-gray-200 font-display font-bold tracking-widest rounded-none shadow-[4px_4px_0px_0px_rgba(124,58,237,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
            <Link href="/register">JOIN THE OUTCASTS</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
