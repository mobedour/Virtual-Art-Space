import { Router, type IRouter } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, galleriesTable, artworksTable, profilesTable, galleryDecorationsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/public/galleries", async (req, res): Promise<void> => {
  const galleries = await db
    .select({
      id: galleriesTable.id,
      title: galleriesTable.title,
      description: galleriesTable.description,
      slug: galleriesTable.slug,
      roomTheme: galleriesTable.roomTheme,
      roomSize: galleriesTable.roomSize,
      createdAt: galleriesTable.createdAt,
      userId: galleriesTable.userId,
      artworkCount: count(artworksTable.id),
      artistName: profilesTable.displayName,
    })
    .from(galleriesTable)
    .leftJoin(artworksTable, eq(artworksTable.galleryId, galleriesTable.id))
    .leftJoin(profilesTable, eq(profilesTable.userId, galleriesTable.userId))
    .where(eq(galleriesTable.published, true))
    .groupBy(
      galleriesTable.id,
      galleriesTable.title,
      galleriesTable.description,
      galleriesTable.slug,
      galleriesTable.roomTheme,
      galleriesTable.roomSize,
      galleriesTable.createdAt,
      galleriesTable.userId,
      profilesTable.displayName
    )
    .orderBy(sql`${galleriesTable.createdAt} DESC`);

  res.json(
    galleries.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      slug: g.slug,
      roomTheme: g.roomTheme,
      roomSize: g.roomSize,
      artworkCount: Number(g.artworkCount),
      artistName: g.artistName,
      createdAt: g.createdAt.toISOString(),
    }))
  );
});

router.get("/public/galleries/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const rawSlug = Array.isArray(slug) ? slug[0] : slug;

  const [gallery] = await db
    .select({
      id: galleriesTable.id,
      title: galleriesTable.title,
      description: galleriesTable.description,
      slug: galleriesTable.slug,
      roomTheme: galleriesTable.roomTheme,
      roomSeed: galleriesTable.roomSeed,
      roomMode: galleriesTable.roomMode,
      roomSize: galleriesTable.roomSize,
      roomHeight: galleriesTable.roomHeight,
      decorationLevel: galleriesTable.decorationLevel,
      lightingMood: galleriesTable.lightingMood,
      userId: galleriesTable.userId,
      artistName: profilesTable.displayName,
    })
    .from(galleriesTable)
    .leftJoin(profilesTable, eq(profilesTable.userId, galleriesTable.userId))
    .where(eq(galleriesTable.slug, rawSlug));

  if (!gallery) {
    res.status(404).json({ error: "Gallery not found" });
    return;
  }

  const artworks = await db
    .select()
    .from(artworksTable)
    .where(eq(artworksTable.galleryId, gallery.id));

  res.json({
    id: gallery.id,
    userId: gallery.userId,
    title: gallery.title,
    description: gallery.description,
    slug: gallery.slug,
    roomTheme: gallery.roomTheme,
    roomSeed: gallery.roomSeed,
    roomMode: gallery.roomMode,
    roomSize: gallery.roomSize,
    roomHeight: gallery.roomHeight,
    decorationLevel: gallery.decorationLevel,
    lightingMood: gallery.lightingMood,
    artistName: gallery.artistName,
    artworks: artworks.map((a) => ({
      id: a.id,
      galleryId: a.galleryId,
      title: a.title,
      description: a.description,
      imageUrl: a.imageUrl,
      artistName: a.artistName,
      year: a.year,
      medium: a.medium,
      dimensions: a.dimensions,
      xPosition: a.xPosition,
      yPosition: a.yPosition,
      zPosition: a.zPosition,
      rotation: a.rotation,
      scale: a.scale,
      isManuallyPlaced: a.isManuallyPlaced,
      createdAt: a.createdAt.toISOString(),
    })),
  });
});

router.get("/public/galleries/:slug/decorations", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const rawSlug = Array.isArray(slug) ? slug[0] : slug;

  const [gallery] = await db
    .select({ id: galleriesTable.id })
    .from(galleriesTable)
    .where(eq(galleriesTable.slug, rawSlug));

  if (!gallery) {
    res.status(404).json({ error: "Gallery not found" });
    return;
  }

  const decorations = await db
    .select()
    .from(galleryDecorationsTable)
    .where(eq(galleryDecorationsTable.galleryId, gallery.id));

  res.json(
    decorations.map((d) => ({
      id: d.id,
      galleryId: d.galleryId,
      type: d.type,
      x: d.x,
      z: d.z,
      rotY: d.rotY,
      createdAt: d.createdAt.toISOString(),
    }))
  );
});

export default router;
