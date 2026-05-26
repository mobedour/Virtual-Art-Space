import { Router, type IRouter } from "express";
import { eq, and, count, sql } from "drizzle-orm";
import { db, galleriesTable, artworksTable } from "@workspace/db";
import {
  CreateGalleryBody,
  UpdateGalleryBody,
  GetGalleryParams,
  UpdateGalleryParams,
  DeleteGalleryParams,
  ToggleGalleryPublishParams,
  ToggleGalleryPublishBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

async function galleryWithCount(gallery: typeof galleriesTable.$inferSelect) {
  const [{ artworkCount }] = await db
    .select({ artworkCount: count() })
    .from(artworksTable)
    .where(eq(artworksTable.galleryId, gallery.id));
  return {
    id: gallery.id,
    userId: gallery.userId,
    title: gallery.title,
    description: gallery.description,
    roomTheme: gallery.roomTheme,
    published: gallery.published,
    slug: gallery.slug,
    roomSeed: gallery.roomSeed,
    roomMode: gallery.roomMode,
    roomSize: gallery.roomSize,
    decorationLevel: gallery.decorationLevel,
    artworkCount: Number(artworkCount),
    createdAt: gallery.createdAt.toISOString(),
  };
}

router.get("/galleries", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const galleries = await db
    .select()
    .from(galleriesTable)
    .where(eq(galleriesTable.userId, userId))
    .orderBy(sql`${galleriesTable.createdAt} DESC`);

  const result = await Promise.all(galleries.map(galleryWithCount));
  res.json(result);
});

router.post("/galleries", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const parsed = CreateGalleryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const slug = generateSlug(parsed.data.title);
  const roomSeed = parsed.data.roomSeed ?? Math.floor(Math.random() * 2_147_483_647);
  const [gallery] = await db
    .insert(galleriesTable)
    .values({
      userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      roomTheme: parsed.data.roomTheme ?? "dark_void",
      roomSeed,
      roomMode: parsed.data.roomMode ?? "basic",
      roomSize: parsed.data.roomSize ?? 5,
      decorationLevel: parsed.data.decorationLevel ?? 5,
      slug,
    })
    .returning();

  res.status(201).json(await galleryWithCount(gallery));
});

router.get("/galleries/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetGalleryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.user!.userId;

  const [gallery] = await db
    .select()
    .from(galleriesTable)
    .where(and(eq(galleriesTable.id, params.data.id), eq(galleriesTable.userId, userId)));

  if (!gallery) {
    res.status(404).json({ error: "Gallery not found" });
    return;
  }

  res.json(await galleryWithCount(gallery));
});

router.put("/galleries/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateGalleryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGalleryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.user!.userId;

  const [gallery] = await db
    .update(galleriesTable)
    .set(parsed.data)
    .where(and(eq(galleriesTable.id, params.data.id), eq(galleriesTable.userId, userId)))
    .returning();

  if (!gallery) {
    res.status(404).json({ error: "Gallery not found" });
    return;
  }

  res.json(await galleryWithCount(gallery));
});

router.delete("/galleries/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteGalleryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.user!.userId;

  const [gallery] = await db
    .delete(galleriesTable)
    .where(and(eq(galleriesTable.id, params.data.id), eq(galleriesTable.userId, userId)))
    .returning();

  if (!gallery) {
    res.status(404).json({ error: "Gallery not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/galleries/:id/publish", requireAuth, async (req, res): Promise<void> => {
  const params = ToggleGalleryPublishParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ToggleGalleryPublishBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.user!.userId;

  const [gallery] = await db
    .update(galleriesTable)
    .set({ published: parsed.data.published })
    .where(and(eq(galleriesTable.id, params.data.id), eq(galleriesTable.userId, userId)))
    .returning();

  if (!gallery) {
    res.status(404).json({ error: "Gallery not found" });
    return;
  }

  res.json(await galleryWithCount(gallery));
});

export default router;
