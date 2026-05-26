import { Link } from "wouter";
import { useListPublicGalleries } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Box } from "lucide-react";
import { FadeUp, FadeDown, Stagger, StaggerItem } from "@/lib/motion";

export default function PublicGalleries() {
  const { data: galleries, isLoading } = useListPublicGalleries();

  return (
    <PublicLayout>
      <div className="container mx-auto px-6 py-12">
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <FadeDown className="inline-block mb-4 px-3 py-1 border border-primary/30 bg-primary/5 text-primary font-sans text-[10px] tracking-[0.2em] uppercase rounded-sm">
            Open Exhibitions
          </FadeDown>
          <FadeUp delay={80}>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Current Shows
            </h1>
          </FadeUp>
          <FadeUp delay={160}>
            <p className="text-muted-foreground font-sans text-sm leading-relaxed">
              Explore virtual exhibitions from artists across Amman and beyond.
            </p>
          </FadeUp>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : galleries?.length === 0 ? (
          <FadeUp>
            <div className="py-24 border border-dashed border-border/50 flex flex-col items-center justify-center text-center bg-card/20 rounded-sm">
              <Box className="w-14 h-14 text-muted-foreground/20 mb-6" />
              <p className="font-sans text-muted-foreground mb-1">No exhibitions open yet</p>
              <p className="font-sans text-sm text-muted-foreground/60">Be the first to publish your gallery.</p>
            </div>
          </FadeUp>
        ) : (
          <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {galleries?.map((gallery) => (
              <StaggerItem key={gallery.id}>
                <Card className="bg-card/40 border-border/50 backdrop-blur-sm rounded-sm hover:bg-card/70 transition-all duration-500 hover:border-primary/40 group overflow-hidden h-full flex flex-col">
                  <div className="aspect-[4/3] bg-background/80 border-b border-border/50 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/8 group-hover:to-background/0 transition-all duration-700" />
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-background/60 to-transparent" />
                    <div className="text-center z-10 p-6 transform group-hover:scale-[1.03] transition-transform duration-700">
                      <h3 className="font-display font-semibold text-xl text-foreground mb-2 group-hover:text-primary transition-colors duration-300">{gallery.title}</h3>
                      <p className="font-sans text-xs text-muted-foreground">by {gallery.artistName || "Unknown Artist"}</p>
                    </div>
                  </div>
                  <CardContent className="p-6 flex flex-col flex-1">
                    <p className="font-sans text-sm text-muted-foreground line-clamp-3 mb-6 min-h-[60px] flex-1">
                      {gallery.description || "No description provided."}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-border/30">
                      <div className="font-sans text-[10px] text-muted-foreground tracking-wide uppercase">
                        {gallery.artworkCount} artworks
                      </div>
                      <Button asChild variant="ghost" className="h-8 px-0 font-sans text-sm hover:bg-transparent text-primary hover:text-primary/80 group/btn">
                        <Link href={`/gallery/${gallery.slug}`}>
                          Enter Gallery <ArrowRight className="w-3.5 h-3.5 ml-1.5 transform group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </PublicLayout>
  );
}
