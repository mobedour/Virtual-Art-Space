import { useCallback } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useGetPublicGallery, getGetPublicGalleryQueryKey, useGetMe } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { GalleryRoom } from "@/components/gallery-room/GalleryRoom";
import { THEME_DISPLAY_NAMES } from "@/components/gallery-room/theme-config";

export default function PublicGalleryDetail() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();

  const { data: gallery, isLoading, error } = useGetPublicGallery(slug || "", {
    query: { queryKey: getGetPublicGalleryQueryKey(slug || ""), enabled: !!slug },
  });

  const { data: me } = useGetMe({});

  const handleExit = useCallback(() => setLocation("/galleries"), [setLocation]);

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
          <p className="font-sans text-muted-foreground mb-8">Gallery not found</p>
          <Button asChild variant="outline" className="rounded-sm border-primary/50 font-sans">
            <Link href="/galleries">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to exhibitions
            </Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const themeLabel = THEME_DISPLAY_NAMES[gallery.roomTheme] ?? gallery.roomTheme;
  const isOwner = me != null && gallery.userId != null && me.id === gallery.userId;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Immersive overlay header */}
      <header className="absolute top-0 w-full z-50 p-4 flex justify-between items-start pointer-events-none">
        {/* Left — Exit */}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="pointer-events-auto rounded-sm border-white/20 bg-black/50 backdrop-blur-md text-white hover:bg-white hover:text-black font-sans text-xs"
        >
          <Link href="/galleries">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Exit
          </Link>
        </Button>

        {/* Right — Theme + Title */}
        <div className="pointer-events-none text-right">
          <div className="inline-block px-3 py-1 bg-black/50 backdrop-blur-md border border-white/15 font-sans text-[10px] text-white/60 tracking-widest mb-1 rounded-sm">
            {themeLabel}
          </div>
          <div className="block px-3 py-1 bg-black/50 backdrop-blur-md border border-white/10 font-display text-sm text-white/70 italic rounded-sm">
            {gallery.title}
            {gallery.artistName ? (
              <span className="font-sans text-[10px] not-italic text-white/40 ml-2">
                · {gallery.artistName}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {/* Full-screen 3D gallery */}
      <main className="flex-1 relative">
        <GalleryRoom
          gallery={{
            artworks: gallery.artworks,
            roomTheme: gallery.roomTheme,
            roomSeed: gallery.roomSeed,
            roomMode: gallery.roomMode,
            roomSize: gallery.roomSize,
            decorationLevel: gallery.decorationLevel,
            roomHeight: gallery.roomHeight,
            lightingMood: gallery.lightingMood,
            galleryTitle: gallery.title,
            artistName: gallery.artistName ?? undefined,
          }}
          onExit={handleExit}
          isOwner={isOwner}
          onEditRequest={isOwner ? () => setLocation(`/dashboard`) : undefined}
        />
      </main>
    </div>
  );
}
