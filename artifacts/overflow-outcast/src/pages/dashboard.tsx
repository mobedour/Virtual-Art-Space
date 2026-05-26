import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Box, Layers, Image as ImageIcon, Plus, Eye, Loader2 } from "lucide-react";
import { PageEnter, Stagger, StaggerItem, FadeUp } from "@/lib/motion";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && !user) setLocation("/login");
  }, [user, isAuthLoading, setLocation]);

  const { data: stats, isLoading: isStatsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey(), enabled: !!user }
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
      <PageEnter className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Your Studio</h1>
            <p className="text-muted-foreground font-sans mt-1">Welcome back, {user.username}</p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button asChild className="rounded-sm bg-primary text-primary-foreground font-sans hover:bg-primary/90 shadow-[0_2px_12px_rgba(217,119,6,0.3)]">
              <Link href="/dashboard/galleries/new">
                <Plus className="w-4 h-4 mr-2" /> New Gallery
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <Stagger fast className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { label: "Total Galleries", value: stats?.totalGalleries || 0, icon: Box },
            { label: "Published", value: stats?.publishedGalleries || 0, icon: Eye },
            { label: "Total Artworks", value: stats?.totalArtworks || 0, icon: ImageIcon },
          ].map((stat) => (
            <StaggerItem key={stat.label}>
              <Card className="bg-card/40 border-border/50 backdrop-blur-sm rounded-sm border-l-2 border-l-primary hover:bg-card/60 transition-colors group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="font-sans text-xs tracking-wide text-muted-foreground uppercase">{stat.label}</CardTitle>
                  <stat.icon className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                    className="text-4xl font-display font-bold text-foreground"
                  >
                    {stat.value}
                  </motion.div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Recent Galleries */}
        <div>
          <FadeUp className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-semibold text-foreground">Recent Galleries</h2>
            <Link href="/dashboard/galleries">
              <span className="font-sans text-sm text-primary hover:text-primary/80 cursor-pointer">View all →</span>
            </Link>
          </FadeUp>

          <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats?.recentGalleries && stats.recentGalleries.length > 0 ? (
              stats.recentGalleries.map((gallery) => (
                <StaggerItem key={gallery.id}>
                  <Card className="bg-background/40 border-border/50 rounded-sm overflow-hidden group hover:border-primary/40 transition-all duration-500 h-full">
                    <div className="aspect-video bg-card flex items-center justify-center border-b border-border/50 relative overflow-hidden">
                      <Layers className="w-12 h-12 text-muted-foreground/20 group-hover:text-primary/20 transition-colors duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 group-hover:from-primary/5 transition-all duration-500" />
                      {gallery.published && (
                        <div className="absolute top-2 right-2 bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 text-[10px] font-sans tracking-wide rounded-sm">
                          Live
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-display font-semibold text-base truncate text-foreground mb-1">{gallery.title}</h3>
                      <p className="font-sans text-xs text-muted-foreground">Theme: {gallery.roomTheme}</p>
                      <div className="mt-4 pt-4 border-t border-border/30 flex justify-between items-center">
                        <span className="font-sans text-[10px] text-muted-foreground">{gallery.artworkCount} artworks</span>
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2 font-sans text-xs rounded-sm hover:bg-primary/10 hover:text-primary">
                          <Link href={`/dashboard/galleries/${gallery.id}/edit`}>Edit</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))
            ) : (
              <StaggerItem>
                <div className="col-span-full py-16 border border-dashed border-border/50 flex flex-col items-center justify-center text-center rounded-sm">
                  <Box className="w-10 h-10 text-muted-foreground/30 mb-4" />
                  <p className="font-sans text-sm text-muted-foreground mb-4">No galleries yet</p>
                  <Button asChild variant="outline" className="rounded-sm border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground font-sans">
                    <Link href="/dashboard/galleries/new">Create your first gallery</Link>
                  </Button>
                </div>
              </StaggerItem>
            )}
          </Stagger>
        </div>
      </PageEnter>
    </DashboardLayout>
  );
}
