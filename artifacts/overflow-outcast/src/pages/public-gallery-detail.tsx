import { Link, useParams } from "wouter";
import { useGetPublicGallery } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Box } from "lucide-react";

export default function PublicGalleryDetail() {
  const { slug } = useParams();
  
  const { data: gallery, isLoading, error } = useGetPublicGallery(slug || "", {
    query: { enabled: !!slug }
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex justify-center items-center h-[70vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  if (error || !gallery) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-6 py-32 text-center">
          <h1 className="text-6xl font-display font-black text-white mb-4">404</h1>
          <p className="font-mono text-muted-foreground mb-8">NODE_NOT_FOUND</p>
          <Button asChild variant="outline" className="rounded-none border-primary/50 font-mono">
            <Link href="/galleries"><ArrowLeft className="w-4 h-4 mr-2" /> RETURN_TO_NETWORK</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Immersive Gallery Header (replaces standard header for this view) */}
      <header className="absolute top-0 w-full z-50 p-6 flex justify-between items-start pointer-events-none">
        <Button asChild variant="outline" size="sm" className="pointer-events-auto rounded-none border-white/20 bg-black/50 backdrop-blur-md text-white hover:bg-white hover:text-black font-mono text-xs">
          <Link href="/galleries"><ArrowLeft className="w-4 h-4 mr-2" /> EXIT</Link>
        </Button>
        
        <div className="text-right">
          <div className="inline-block px-3 py-1 bg-black/50 backdrop-blur-md border border-white/20 font-mono text-[10px] text-white tracking-widest mb-2">
            ENV: {gallery.roomTheme.toUpperCase()}
          </div>
        </div>
      </header>

      {/* Stage 1 Placeholder for 3D Canvas */}
      <main className="flex-1 relative flex flex-col items-center justify-center overflow-hidden bg-black">
        {/* Background gradient based on theme */}
        <div className={`absolute inset-0 opacity-20 ${
          gallery.roomTheme === 'neon_grid' ? 'bg-[linear-gradient(to_bottom,#000,#7C3AED)]' :
          gallery.roomTheme === 'purple_mist' ? 'bg-[radial-gradient(ellipse_at_center,#7C3AED,#000)]' :
          gallery.roomTheme === 'white_cube' ? 'bg-white opacity-5' :
          'bg-black'
        }`} />
        
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTIwIDIwaDIwdjIwSDIwdi0yMHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')] opacity-20" />

        <div className="z-10 max-w-3xl text-center px-6 animate-in fade-in zoom-in duration-1000">
          <div className="mb-8">
            <Box className="w-20 h-20 mx-auto text-primary/50 animate-pulse" />
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-black text-white mb-6 tracking-tight drop-shadow-[0_0_15px_rgba(124,58,237,0.5)]">
            {gallery.title}
          </h1>
          <p className="font-mono text-lg text-primary mb-2 tracking-widest">
            ARTIST_NODE: {gallery.artistName || "UNKNOWN"}
          </p>
          {gallery.description && (
            <p className="font-mono text-sm text-muted-foreground mt-6 max-w-xl mx-auto leading-relaxed">
              {gallery.description}
            </p>
          )}

          <div className="mt-16 p-6 border border-primary/30 bg-black/60 backdrop-blur-md">
            <h2 className="font-mono text-xs tracking-widest text-primary mb-4">[SYSTEM_MESSAGE]</h2>
            <p className="font-mono text-sm text-white leading-relaxed">
              3D VIRTUAL ENVIRONMENT RENDERING ENGINE IS CURRENTLY OFFLINE.
              <br/><br/>
              STAGE 2 DEPLOYMENT WILL ENABLE FULL IMMERSIVE EXPLORATION OF {gallery.artworkCount} CONNECTED ARTWORKS.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
