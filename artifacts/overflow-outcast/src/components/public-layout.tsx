import { ReactNode, useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { Compass, LogIn, UserPlus, LayoutDashboard } from "lucide-react";

export function PublicLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30">
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 w-full z-50 border-b transition-all duration-500 ${
          scrolled
            ? "border-border/70 bg-background/96 backdrop-blur-xl shadow-[0_2px_24px_rgba(0,0,0,0.3)]"
            : "border-transparent bg-background/60 backdrop-blur-md"
        }`}
      >
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/">
            <motion.span
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="font-display font-bold text-xl tracking-wide text-foreground cursor-pointer hover:text-primary transition-colors block"
            >
              Virtual Art Space
            </motion.span>
          </Link>
          {/* ── Mobile nav: icon-only ───────────────────────────────── */}
          <nav className="flex items-center gap-2 md:hidden">
            <Link href="/galleries">
              <span aria-label="Explore galleries" className="w-9 h-9 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all cursor-pointer">
                <Compass className="w-[18px] h-[18px]" />
              </span>
            </Link>
            {user ? (
              <Link href="/dashboard">
                <span aria-label="Dashboard" className="w-9 h-9 flex items-center justify-center rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer">
                  <LayoutDashboard className="w-[17px] h-[17px]" />
                </span>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <span aria-label="Sign in" className="w-9 h-9 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all cursor-pointer">
                    <LogIn className="w-[18px] h-[18px]" />
                  </span>
                </Link>
                <Link href="/register">
                  <span aria-label="Create account" className="w-9 h-9 flex items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(217,119,6,0.35)] hover:bg-primary/90 hover:shadow-[0_4px_18px_rgba(217,119,6,0.5)] transition-all cursor-pointer">
                    <UserPlus className="w-[17px] h-[17px]" />
                  </span>
                </Link>
              </>
            )}
          </nav>

          {/* ── Desktop nav: full text ──────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-6">
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
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 font-sans rounded-sm shadow-[0_2px_12px_rgba(217,119,6,0.35)] hover:shadow-[0_4px_20px_rgba(217,119,6,0.5)] transition-all">
                  <Link href="/register">Join</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      </motion.header>

      <main className="flex-1 pt-20 relative">
        {children}
      </main>

      <footer className="border-t border-border/50 py-10 mt-20 relative z-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="font-display font-semibold text-base text-muted-foreground"
          >
            Virtual Art Space &mdash; Amman, Jordan
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-6 font-sans text-xs text-muted-foreground"
          >
            <span className="hover:text-primary cursor-pointer transition-colors">عمّان</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Terms of Service</span>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
