import { Link } from "wouter";
import { useListPublicGalleries } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Box } from "lucide-react";

export default function PublicGalleries() {
  const { data: galleries, isLoading } = useListPublicGalleries();

  return (
    <PublicLayout>
      <div className="container mx-auto px-6 py-12">
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <div className="inline-block mb-4 px-3 py-1 border border-primary/30 bg-primary/5 text-primary font-mono text-[10px] tracking-[0.2em]">
            PUBLIC_NETWORK
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-widest text-white mb-6 uppercase">
            ACTIVE NODES
          </h1>
          <p className="text-muted-foreground font-mono text-sm leading-relaxed">
            Explore live virtual exhibitions created by the outcast network.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : galleries?.length === 0 ? (
          <div className="py-24 border border-dashed border-border/50 flex flex-col items-center justify-center text-center bg-card/20">
            <Box className="w-16 h-16 text-muted-foreground/20 mb-6" />
            <p className="font-mono text-muted-foreground mb-2 tracking-widest">NETWORK EMPTY</p>
            <p className="font-mono text-sm text-muted-foreground/60">No public galleries have been deployed yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {galleries?.map((gallery, i) => (
              <Card key={gallery.id} className="bg-card/40 border-border/50 backdrop-blur-sm rounded-none hover:bg-card/80 transition-all hover:border-primary/50 group animate-in fade-in slide-in-from-bottom-8" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="aspect-[4/3] bg-background/80 border-b border-border/50 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="text-center z-10 p-6 transform group-hover:scale-105 transition-transform duration-500">
                    <h3 className="font-display font-bold text-2xl text-white mb-2 group-hover:text-primary transition-colors drop-shadow-md">{gallery.title}</h3>
                    <p className="font-mono text-xs text-muted-foreground tracking-widest">BY {gallery.artistName || "UNKNOWN_NODE"}</p>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className="font-mono text-sm text-muted-foreground line-clamp-3 mb-6 min-h-[60px]">
                    {gallery.description || "No description provided."}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-border/30">
                    <div className="font-mono text-[10px] text-muted-foreground tracking-widest">
                      {gallery.artworkCount} ARTWORKS
                    </div>
                    <Button asChild variant="ghost" className="h-8 px-0 font-mono text-xs hover:bg-transparent text-primary hover:text-white group/btn">
                      <Link href={`/gallery/${gallery.slug}`}>
                        ENTER_NODE <ArrowRight className="w-3.5 h-3.5 ml-2 transform group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
