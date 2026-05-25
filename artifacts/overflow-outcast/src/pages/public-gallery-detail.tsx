import { Link, useParams } from "wouter";
import { useGetPublicGallery } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { GalleryRoom } from "@/components/gallery-room/GalleryRoom";

export default function PublicGalleryDetail() {
  const { slug } = useParams();

  const {
    data: gallery,
    isLoading,
    error,
  } = useGetPublicGallery(slug || "", {
    query: { enabled: !!slug },
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
          <h1 className="text-6xl font-display font-black text-white mb-4">
            404
          </h1>
          <p className="font-mono text-muted-foreground mb-8">
            NODE_NOT_FOUND
          </p>
          <Button
            asChild
            variant="outline"
            className="rounded-none border-primary/50 font-mono"
          >
            <Link href="/galleries">
              <ArrowLeft className="w-4 h-4 mr-2" /> RETURN_TO_NETWORK
            </Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Immersive overlay header */}
      <header className="absolute top-0 w-full z-50 p-5 flex justify-between items-start pointer-events-none">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="pointer-events-auto rounded-none border-white/20 bg-black/50 backdrop-blur-md text-white hover:bg-white hover:text-black font-mono text-xs"
        >
          <Link href="/galleries">
            <ArrowLeft className="w-4 h-4 mr-2" /> EXIT
          </Link>
        </Button>

        <div className="pointer-events-auto text-right">
          <div className="inline-block px-3 py-1 bg-black/50 backdrop-blur-md border border-white/20 font-mono text-[10px] text-white tracking-widest mb-1">
            ENV: {gallery.roomTheme.toUpperCase()}
          </div>
          <div className="block px-3 py-1 bg-black/50 backdrop-blur-md border border-white/10 font-mono text-[10px] text-white/50 tracking-wider">
            {gallery.title}
            {gallery.artistName ? ` · ${gallery.artistName}` : ""}
          </div>
        </div>
      </header>

      {/* Full-screen 3D gallery */}
      <main className="flex-1 relative">
        <GalleryRoom
          gallery={{
            artworks: gallery.artworks,
            roomTheme: gallery.roomTheme,
          }}
        />
      </main>
    </div>
  );
}
