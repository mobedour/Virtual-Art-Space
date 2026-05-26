import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useScene } from "@/lib/scene-context";
import { LogOut, LayoutDashboard, Image as ImageIcon, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { setScene } = useScene();

  useEffect(() => {
    setScene(3);
  }, [setScene]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Galleries", href: "/dashboard/galleries", icon: ImageIcon },
    { name: "Profile", href: "/dashboard/profile", icon: User },
  ];

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        const isActive =
          location === item.href ||
          (item.href !== "/dashboard" && location.startsWith(item.href));
        return (
          <Link key={item.name} href={item.href}>
            <span
              className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary/15 text-primary border border-primary/25"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.625rem",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {item.name}
              </span>
            </span>
          </Link>
        );
      })}
    </>
  );

  const sidebarStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(20px)",
    borderRight: "1px solid rgba(255,255,255,0.08)",
  };

  return (
    <div className="relative z-10 min-h-screen text-foreground flex flex-col md:flex-row">
      {/* Mobile header */}
      <header
        className="md:hidden flex items-center justify-between p-4 sticky top-0 z-50"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <Link href="/">
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
              fontSize: "1rem",
              color: "hsl(38 92% 50%)",
              cursor: "pointer",
            }}
          >
            VAS
          </span>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/5">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="p-6 w-72 flex flex-col border-r-0"
            style={sidebarStyle}
          >
            <div className="mb-8">
              <Link href="/">
                <span
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontStyle: "italic",
                    fontSize: "1.1rem",
                    color: "hsl(38 92% 50%)",
                    cursor: "pointer",
                  }}
                >
                  Virtual Art Space
                </span>
              </Link>
            </div>
            <nav className="flex flex-col gap-1 flex-1">
              <NavLinks />
            </nav>
            <div className="mt-auto">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 text-white/40 hover:text-red-400 hover:bg-red-900/10 transition-colors rounded-sm"
              >
                <LogOut className="w-4 h-4" />
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.625rem",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  Sign Out
                </span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 sticky top-0 h-screen p-6" style={sidebarStyle}>
        <div className="mb-10">
          <Link href="/">
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                fontSize: "1.1rem",
                color: "hsl(38 92% 50%)",
                cursor: "pointer",
                lineHeight: 1.3,
                display: "block",
              }}
            >
              Virtual<br />Art Space
            </span>
          </Link>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <NavLinks />
        </nav>
        <div className="mt-auto pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-white/35 hover:text-red-400 hover:bg-red-900/10 transition-colors rounded-sm"
          >
            <LogOut className="w-4 h-4" />
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.625rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-x-hidden relative">
        <div className="max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
