import { ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function PublicLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30">
      <header className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/">
            <span className="font-display font-bold text-xl tracking-wide text-foreground cursor-pointer hover:text-primary transition-colors">
              Virtual Art Space
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/galleries">
              <span className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer tracking-wide">
                Explore
              </span>
            </Link>
            {user ? (
              <Button asChild variant="outline" className="border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground font-sans rounded-sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login">
                  <span className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Sign In
                  </span>
                </Link>
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 font-sans rounded-sm shadow-[0_2px_12px_rgba(217,119,6,0.35)]">
                  <Link href="/register">Join</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-20 relative">
        {children}
      </main>

      <footer className="border-t border-border/50 py-10 mt-20 relative z-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-display font-semibold text-base text-muted-foreground">
            Virtual Art Space &mdash; Amman, Jordan
          </div>
          <div className="flex items-center gap-6 font-sans text-xs text-muted-foreground">
            <span className="hover:text-primary cursor-pointer transition-colors">عمّان</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
