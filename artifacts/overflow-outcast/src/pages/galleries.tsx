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
import { Loader2, Plus, Settings, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Galleries() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      setLocation("/login");
    }
  }, [user, isAuthLoading, setLocation]);

  const { data: galleries, isLoading: isGalleriesLoading } = useListGalleries({
    query: { enabled: !!user }
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
          toast({ title: "STATUS UPDATED", description: `Gallery is now ${!currentStatus ? 'LIVE' : 'OFFLINE'}.` });
        },
        onError: () => {
          toast({ variant: "destructive", title: "ERROR", description: "Failed to update status." });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("WARNING: This will permanently delete this gallery and all its artworks. Proceed?")) return;
    
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          toast({ title: "GALLERY TERMINATED", description: "The node has been erased." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "ERROR", description: "Failed to delete gallery." });
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
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/50 pb-6">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-widest text-white uppercase">
              GALLERY_NODES
            </h1>
            <p className="text-muted-foreground font-mono mt-2 tracking-wider">
              MANAGE YOUR DEPLOYED EXHIBITIONS
            </p>
          </div>
          <Button asChild className="rounded-none bg-primary text-white font-mono tracking-widest hover:bg-primary/90 shadow-[0_0_10px_rgba(124,58,237,0.3)]">
            <Link href="/dashboard/galleries/new">
              <Plus className="w-4 h-4 mr-2" /> INITIALIZE_NEW
            </Link>
          </Button>
        </div>

        {galleries?.length === 0 ? (
          <div className="py-20 border border-dashed border-border flex flex-col items-center justify-center text-center bg-card/20">
            <p className="font-mono text-muted-foreground mb-6 tracking-widest">NETWORK EMPTY. NO GALLERIES FOUND.</p>
            <Button asChild variant="outline" className="rounded-none border-primary/50 text-primary hover:bg-primary hover:text-white font-mono">
              <Link href="/dashboard/galleries/new">CREATE YOUR FIRST GALLERY</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {galleries?.map((gallery, i) => (
              <Card key={gallery.id} className="bg-card/40 border-border/50 backdrop-blur-sm rounded-none hover:bg-card/60 transition-colors group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
                <CardContent className="p-0 flex flex-col md:flex-row">
                  {/* Visual Indicator */}
                  <div className={`w-full md:w-48 h-32 md:h-auto border-r border-border/50 flex items-center justify-center relative overflow-hidden ${gallery.published ? 'bg-primary/5' : 'bg-muted/10'}`}>
                    <div className="text-center">
                      <div className="font-mono text-xs text-muted-foreground mb-1">ARTWORKS</div>
                      <div className="font-display text-3xl font-bold text-white">{gallery.artworkCount}</div>
                    </div>
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-display font-bold text-xl text-white">{gallery.title}</h3>
                          {gallery.published ? (
                            <Badge variant="outline" className="rounded-none border-primary text-primary font-mono text-[10px] tracking-widest bg-primary/10">LIVE</Badge>
                          ) : (
                            <Badge variant="outline" className="rounded-none border-muted text-muted-foreground font-mono text-[10px] tracking-widest">OFFLINE</Badge>
                          )}
                        </div>
                        <p className="font-mono text-sm text-muted-foreground line-clamp-2 max-w-2xl">{gallery.description || "No description provided."}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground bg-background/50 px-3 py-1 border border-border/50">
                          <span>THEME:</span>
                          <span className="text-white">{gallery.roomTheme.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/30">
                      <div className="flex items-center gap-3">
                        <Switch 
                          checked={gallery.published} 
                          onCheckedChange={() => handleTogglePublish(gallery.id, gallery.published)}
                          className="data-[state=checked]:bg-primary"
                        />
                        <span className="font-mono text-xs text-muted-foreground">
                          {gallery.published ? 'PUBLIC_ACCESS_GRANTED' : 'PRIVATE_ACCESS_ONLY'}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        {gallery.published && (
                          <Button asChild variant="outline" size="sm" className="rounded-none border-border/50 font-mono text-xs hover:text-white">
                            <Link href={`/gallery/${gallery.slug}`}>
                              <ExternalLink className="w-3.5 h-3.5 mr-2" /> VIEW
                            </Link>
                          </Button>
                        )}
                        <Button asChild variant="outline" size="sm" className="rounded-none border-border/50 font-mono text-xs hover:text-white hover:border-primary/50">
                          <Link href={`/dashboard/galleries/${gallery.id}/edit`}>
                            <Settings className="w-3.5 h-3.5 mr-2" /> CONFIGURE
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-none border-border/50 font-mono text-xs text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50" onClick={() => handleDelete(gallery.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
