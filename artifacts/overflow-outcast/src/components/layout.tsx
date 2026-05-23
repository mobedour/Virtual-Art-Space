import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { LogOut, LayoutDashboard, Image as ImageIcon, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Galleries", href: "/dashboard/galleries", icon: ImageIcon },
    { name: "Profile", href: "/dashboard/profile", icon: User },
  ];

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
        return (
          <Link key={item.name} href={item.href}>
            <span
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium font-mono text-sm tracking-wider">{item.name}</span>
            </span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <Link href="/">
          <span className="font-display font-bold text-xl tracking-widest text-primary cursor-pointer drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]">
            OVERFLOW
          </span>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-card border-r-border p-6 w-72 flex flex-col">
            <div className="mb-8">
              <Link href="/">
                <span className="font-display font-bold text-xl tracking-widest text-primary cursor-pointer">
                  OVERFLOW
                </span>
              </Link>
            </div>
            <nav className="flex flex-col gap-2 flex-1">
              <NavLinks />
            </nav>
            <div className="mt-auto">
              <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={logout}>
                <LogOut className="w-5 h-5 mr-3" />
                <span className="font-mono text-sm">DISCONNECT</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-md p-6 sticky top-0 h-screen">
        <div className="mb-10">
          <Link href="/">
            <span className="font-display font-bold text-2xl tracking-widest text-primary cursor-pointer drop-shadow-[0_0_12px_rgba(124,58,237,0.5)] block">
              OVERFLOW<br/>OUTCAST
            </span>
          </Link>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          <NavLinks />
        </nav>
        <div className="mt-auto pt-6 border-t border-border">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={logout}>
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-mono text-sm tracking-widest">DISCONNECT</span>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-x-hidden relative">
        {/* Decorative background elements */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        </div>
        
        <div className="max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
