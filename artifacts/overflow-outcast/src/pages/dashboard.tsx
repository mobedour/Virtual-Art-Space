import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Box, Layers, Image as ImageIcon, Plus, Eye, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      setLocation("/login");
    }
  }, [user, isAuthLoading, setLocation]);

  const { data: stats, isLoading: isStatsLoading } = useGetDashboardStats({
    query: {
      enabled: !!user,
    }
  });

  if (isAuthLoading || (user && isStatsLoading)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-widest text-white uppercase">
              NODE_STATUS
            </h1>
            <p className="text-muted-foreground font-mono mt-2 tracking-wider">
              WELCOME BACK, {user.username}
            </p>
          </div>
          <Button asChild className="rounded-none bg-primary text-white font-mono tracking-widest hover:bg-primary/90">
            <Link href="/dashboard/galleries/new">
              <Plus className="w-4 h-4 mr-2" /> NEW_GALLERY
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card/40 border-border/50 backdrop-blur-sm rounded-none border-l-2 border-l-primary hover:bg-card/60 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-mono text-xs tracking-widest text-muted-foreground">TOTAL GALLERIES</CardTitle>
              <Box className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-display font-bold text-white">{stats?.totalGalleries || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/40 border-border/50 backdrop-blur-sm rounded-none border-l-2 border-l-primary hover:bg-card/60 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-mono text-xs tracking-widest text-muted-foreground">PUBLISHED</CardTitle>
              <Eye className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-display font-bold text-white">{stats?.publishedGalleries || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/50 backdrop-blur-sm rounded-none border-l-2 border-l-primary hover:bg-card/60 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-mono text-xs tracking-widest text-muted-foreground">TOTAL ARTWORKS</CardTitle>
              <ImageIcon className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-display font-bold text-white">{stats?.totalArtworks || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Galleries */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold tracking-widest text-white">RECENT_DEPLOYS</h2>
            <Link href="/dashboard/galleries">
              <span className="font-mono text-xs text-primary hover:text-white cursor-pointer tracking-widest">VIEW_ALL {">"}</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats?.recentGalleries && stats.recentGalleries.length > 0 ? (
              stats.recentGalleries.map((gallery, i) => (
                <Card key={gallery.id} className="bg-background/40 border-border/50 rounded-none overflow-hidden group hover:border-primary/50 transition-colors animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="aspect-video bg-card flex items-center justify-center border-b border-border/50 relative overflow-hidden">
                    <Layers className="w-12 h-12 text-muted-foreground/30 group-hover:text-primary/30 transition-colors" />
                    {gallery.published && (
                      <div className="absolute top-2 right-2 bg-primary/20 text-primary border border-primary/30 px-2 py-1 text-[10px] font-mono tracking-widest">
                        LIVE
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-display font-bold text-lg truncate text-white mb-1">{gallery.title}</h3>
                    <p className="font-mono text-xs text-muted-foreground">Theme: {gallery.roomTheme}</p>
                    <div className="mt-4 pt-4 border-t border-border/30 flex justify-between items-center">
                      <span className="font-mono text-[10px] text-muted-foreground">{gallery.artworkCount} ARTWORKS</span>
                      <Button asChild variant="ghost" size="sm" className="h-8 px-2 font-mono text-xs rounded-none hover:bg-primary/10 hover:text-primary">
                        <Link href={`/dashboard/galleries/${gallery.id}/edit`}>EDIT</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-12 border border-dashed border-border/50 flex flex-col items-center justify-center text-center">
                <Box className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="font-mono text-sm text-muted-foreground mb-4">NO GALLERIES DEPLOYED</p>
                <Button asChild variant="outline" className="rounded-none border-primary/30 text-primary hover:bg-primary hover:text-white font-mono">
                  <Link href="/dashboard/galleries/new">INITIALIZE FIRST GALLERY</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
