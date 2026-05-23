import { ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function PublicLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30">
      <header className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/">
            <span className="font-display font-black text-2xl tracking-[0.2em] text-white cursor-pointer drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] hover:text-primary transition-colors">
              OVERFLOW<span className="text-primary">_</span>OUTCAST
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/galleries">
              <span className="font-mono text-sm text-muted-foreground hover:text-white transition-colors cursor-pointer tracking-wider">
                EXPLORE
              </span>
            </Link>
            {user ? (
              <Button asChild variant="outline" className="border-primary/50 text-primary hover:bg-primary hover:text-white font-mono rounded-none">
                <Link href="/dashboard">DASHBOARD</Link>
              </Button>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login">
                  <span className="font-mono text-sm text-muted-foreground hover:text-white transition-colors cursor-pointer tracking-wider">
                    LOGIN
                  </span>
                </Link>
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono rounded-none drop-shadow-[0_0_10px_rgba(124,58,237,0.5)]">
                  <Link href="/register">JOIN_NETWORK</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-20 relative">
        <div className="fixed inset-0 pointer-events-none z-[-1] opacity-50 mix-blend-screen bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />
        {children}
      </main>

      <footer className="border-t border-border/50 py-10 mt-20 relative z-10 bg-card/30">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-display font-bold text-lg tracking-widest text-muted-foreground">
            OVERFLOW<span className="text-primary">_</span>OUTCAST // 2025
          </div>
          <div className="flex items-center gap-6 font-mono text-xs text-muted-foreground">
            <span className="hover:text-primary cursor-pointer transition-colors">SYSTEM_STATUS: ONLINE</span>
            <span className="hover:text-primary cursor-pointer transition-colors">TERMS_OF_SERVICE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
