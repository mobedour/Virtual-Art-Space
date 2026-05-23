import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, artworksTable, galleriesTable } from "@workspace/db";
import {
  CreateArtworkBody,
  UpdateArtworkBody,
  UpdateArtworkParams,
  DeleteArtworkParams,
  ListArtworksParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function serializeArtwork(a: typeof artworksTable.$inferSelect) {
  return {
    id: a.id,
    galleryId: a.galleryId,
    title: a.title,
    description: a.description,
    imageUrl: a.imageUrl,
    artistName: a.artistName,
    xPosition: a.xPosition,
    yPosition: a.yPosition,
    zPosition: a.zPosition,
    rotation: a.rotation,
    scale: a.scale,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/artworks/gallery/:galleryId", requireAuth, async (req, res): Promise<void> => {
  const params = ListArtworksParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const artworks = await db
    .select()
    .from(artworksTable)
    .where(eq(artworksTable.galleryId, params.data.galleryId));

  res.json(artworks.map(serializeArtwork));
});

router.post("/artworks", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const parsed = CreateArtworkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [gallery] = await db
    .select()
    .from(galleriesTable)
    .where(and(eq(galleriesTable.id, parsed.data.galleryId), eq(galleriesTable.userId, userId)));

  if (!gallery) {
    res.status(404).json({ error: "Gallery not found" });
    return;
  }

  const [artwork] = await db
    .insert(artworksTable)
    .values({
      galleryId: parsed.data.galleryId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      imageUrl: parsed.data.imageUrl,
      artistName: parsed.data.artistName ?? null,
      xPosition: parsed.data.xPosition ?? 0,
      yPosition: parsed.data.yPosition ?? 1.5,
      zPosition: parsed.data.zPosition ?? -3,
      rotation: parsed.data.rotation ?? 0,
      scale: parsed.data.scale ?? 1,
    })
    .returning();

  res.status(201).json(serializeArtwork(artwork));
});

router.put("/artworks/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateArtworkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateArtworkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [artwork] = await db
    .update(artworksTable)
    .set(parsed.data)
    .where(eq(artworksTable.id, params.data.id))
    .returning();

  if (!artwork) {
    res.status(404).json({ error: "Artwork not found" });
    return;
  }

  res.json(serializeArtwork(artwork));
});

router.delete("/artworks/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteArtworkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [artwork] = await db
    .delete(artworksTable)
    .where(eq(artworksTable.id, params.data.id))
    .returning();

  if (!artwork) {
    res.status(404).json({ error: "Artwork not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
