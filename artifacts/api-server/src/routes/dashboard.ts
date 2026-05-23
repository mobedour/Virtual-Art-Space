import { Router, type IRouter } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, galleriesTable, artworksTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const galleries = await db
    .select()
    .from(galleriesTable)
    .where(eq(galleriesTable.userId, userId))
    .orderBy(sql`${galleriesTable.createdAt} DESC`);

  const publishedCount = galleries.filter((g) => g.published).length;

  const [{ total: totalArtworks }] = await db
    .select({ total: count() })
    .from(artworksTable)
    .leftJoin(galleriesTable, eq(artworksTable.galleryId, galleriesTable.id))
    .where(eq(galleriesTable.userId, userId));

  const recentGalleries = await Promise.all(
    galleries.slice(0, 5).map(async (g) => {
      const [{ artworkCount }] = await db
        .select({ artworkCount: count() })
        .from(artworksTable)
        .where(eq(artworksTable.galleryId, g.id));
      return {
        id: g.id,
        userId: g.userId,
        title: g.title,
        description: g.description,
        roomTheme: g.roomTheme,
        published: g.published,
        slug: g.slug,
        artworkCount: Number(artworkCount),
        createdAt: g.createdAt.toISOString(),
      };
    })
  );

  res.json({
    totalGalleries: galleries.length,
    publishedGalleries: publishedCount,
    totalArtworks: Number(totalArtworks),
    recentGalleries,
  });
});

export default router;
