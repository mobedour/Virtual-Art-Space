import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useListGalleries, useToggleGalleryPublish, useDeleteGallery, getListGalleriesQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Settings, Trash2, ExternalLink, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageEnter, FadeUp, Stagger, StaggerItem } from "@/lib/motion";
import { motion } from "framer-motion";

export default function Galleries() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthLoading && !user) setLocation("/login");
  }, [user, isAuthLoading, setLocation]);

  const { data: galleries, isLoading: isGalleriesLoading } = useListGalleries({
    query: { queryKey: getListGalleriesQueryKey(), enabled: !!user }
  });

  const togglePublish = useToggleGalleryPublish();
  const deleteMutation = useDeleteGallery();

  const handleTogglePublish = (id: number, currentStatus: boolean) => {
    togglePublish.mutate(
      { id, data: { published: !currentStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          toast({ title: currentStatus ? "Gallery taken offline" : "Gallery is now live", description: `Visibility updated.` });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Failed to update gallery status." });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("This will permanently delete this gallery and all its artworks. Proceed?")) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          toast({ title: "Gallery deleted", description: "The gallery has been removed." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Failed to delete gallery." });
        }
      }
    );
  };

  if (isAuthLoading || (user && isGalleriesLoading)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageEnter className="space-y-8">
        <FadeUp className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/50 pb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">My Galleries</h1>
            <p className="text-muted-foreground font-sans mt-1">Manage your exhibitions and publications.</p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button asChild className="rounded-sm bg-primary text-primary-foreground font-sans hover:bg-primary/90 shadow-[0_2px_12px_rgba(217,119,6,0.3)]">
              <Link href="/dashboard/galleries/new">
                <Plus className="w-4 h-4 mr-2" /> New Gallery
              </Link>
            </Button>
          </motion.div>
        </FadeUp>

        {galleries?.length === 0 ? (
          <FadeUp>
            <div className="py-20 border border-dashed border-border/50 flex flex-col items-center justify-center text-center bg-card/20 rounded-sm">
              <p className="font-sans text-muted-foreground mb-6">No galleries yet.</p>
              <Button asChild variant="outline" className="rounded-sm border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground font-sans">
                <Link href="/dashboard/galleries/new">Create your first gallery</Link>
              </Button>
            </div>
          </FadeUp>
        ) : (
          <Stagger className="grid grid-cols-1 gap-4">
            {galleries?.map((gallery) => (
              <StaggerItem key={gallery.id}>
                <Card className="bg-card/40 border-border/50 backdrop-blur-sm rounded-sm hover:bg-card/60 transition-all duration-500 group hover:border-primary/30 overflow-hidden">
                  <CardContent className="p-0 flex flex-col md:flex-row">
                    <div className={`w-full md:w-48 h-32 md:h-auto border-r border-border/50 flex items-center justify-center relative overflow-hidden ${gallery.published ? "bg-primary/5" : "bg-muted/10"}`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 group-hover:from-primary/8 transition-all duration-700" />
                      <div className="text-center relative z-10">
                        <div className="font-sans text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Artworks</div>
                        <div className="font-display text-3xl font-bold text-foreground">{gallery.artworkCount}</div>
                      </div>
                    </div>

                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-display font-bold text-xl text-foreground">{gallery.title}</h3>
                            {gallery.published ? (
                              <Badge variant="outline" className="rounded-sm border-primary text-primary font-sans text-[10px] tracking-wide bg-primary/10">Live</Badge>
                            ) : (
                              <Badge variant="outline" className="rounded-sm border-muted text-muted-foreground font-sans text-[10px] tracking-wide">Draft</Badge>
                            )}
                          </div>
                          <p className="font-sans text-sm text-muted-foreground line-clamp-2 max-w-2xl">{gallery.description || "No description provided."}</p>
                        </div>

                        <div className="flex items-center gap-2 font-sans text-xs text-muted-foreground bg-background/50 px-3 py-1 border border-border/50 rounded-sm shrink-0">
                          <span className="text-muted-foreground/60">Theme</span>
                          <span className="text-foreground capitalize">{gallery.roomTheme.replace(/_/g, " ")}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-border/30">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={gallery.published}
                            onCheckedChange={() => handleTogglePublish(gallery.id, gallery.published)}
                            className="data-[state=checked]:bg-primary"
                          />
                          <span className="font-sans text-xs text-muted-foreground">
                            {gallery.published ? "Published" : "Private"}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {gallery.published && (
                            <Button asChild variant="outline" size="sm" className="rounded-sm border-border/50 font-sans text-xs hover:text-foreground hover:border-primary/40">
                              <Link href={`/gallery/${gallery.slug}`}>
                                <ExternalLink className="w-3.5 h-3.5 mr-2" /> View
                              </Link>
                            </Button>
                          )}
                          <Button asChild variant="outline" size="sm" className="rounded-sm border-primary/40 text-primary font-sans text-xs hover:bg-primary/10 hover:text-primary">
                            <Link href={`/dashboard/galleries/${gallery.id}/artworks`}>
                              <ImageIcon className="w-3.5 h-3.5 mr-2" /> Artworks
                            </Link>
                          </Button>
                          <Button asChild variant="outline" size="sm" className="rounded-sm border-border/50 font-sans text-xs hover:text-foreground hover:border-primary/50">
                            <Link href={`/dashboard/galleries/${gallery.id}/edit`}>
                              <Settings className="w-3.5 h-3.5 mr-2" /> Edit
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-sm border-border/50 font-sans text-xs text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50" onClick={() => handleDelete(gallery.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </PageEnter>
    </DashboardLayout>
  );
}
