import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, galleriesTable, galleryDecorationsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";

const router: IRouter = Router();

const DecorationParams = z.object({ id: z.coerce.number().int().positive() });
const DecorationItemParams = z.object({
  id: z.coerce.number().int().positive(),
  decorId: z.coerce.number().int().positive(),
});
const DecorationInput = z.object({
  type: z.string().min(1),
  x: z.number(),
  z: z.number(),
  rotY: z.number(),
});
const DecorationPatch = z.object({
  x: z.number().optional(),
  z: z.number().optional(),
  rotY: z.number().optional(),
});

function serializeDecoration(d: typeof galleryDecorationsTable.$inferSelect) {
  return {
    id: d.id,
    galleryId: d.galleryId,
    type: d.type,
    x: d.x,
    z: d.z,
    rotY: d.rotY,
    createdAt: d.createdAt.toISOString(),
  };
}

async function assertOwner(galleryId: number, userId: number, res: any): Promise<boolean> {
  const [gallery] = await db
    .select({ id: galleriesTable.id })
    .from(galleriesTable)
    .where(and(eq(galleriesTable.id, galleryId), eq(galleriesTable.userId, userId)));
  if (!gallery) {
    res.status(404).json({ error: "Gallery not found" });
    return false;
  }
  return true;
}

router.get("/galleries/:id/decorations", requireAuth, async (req, res): Promise<void> => {
  const params = DecorationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const userId = req.user!.userId;
  if (!(await assertOwner(params.data.id, userId, res))) return;
  const decorations = await db
    .select()
    .from(galleryDecorationsTable)
    .where(eq(galleryDecorationsTable.galleryId, params.data.id));
  res.json(decorations.map(serializeDecoration));
});

router.post("/galleries/:id/decorations", requireAuth, async (req, res): Promise<void> => {
  const params = DecorationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = DecorationInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const userId = req.user!.userId;
  if (!(await assertOwner(params.data.id, userId, res))) return;
  const [decoration] = await db
    .insert(galleryDecorationsTable)
    .values({ galleryId: params.data.id, ...parsed.data })
    .returning();
  res.status(201).json(serializeDecoration(decoration));
});

router.patch("/galleries/:id/decorations/:decorId", requireAuth, async (req, res): Promise<void> => {
  const params = DecorationItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = DecorationPatch.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const userId = req.user!.userId;
  if (!(await assertOwner(params.data.id, userId, res))) return;
  const [decoration] = await db
    .update(galleryDecorationsTable)
    .set(parsed.data)
    .where(and(
      eq(galleryDecorationsTable.id, params.data.decorId),
      eq(galleryDecorationsTable.galleryId, params.data.id),
    ))
    .returning();
  if (!decoration) { res.status(404).json({ error: "Decoration not found" }); return; }
  res.json(serializeDecoration(decoration));
});

router.delete("/galleries/:id/decorations/reset", requireAuth, async (req, res): Promise<void> => {
  const params = DecorationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const userId = req.user!.userId;
  if (!(await assertOwner(params.data.id, userId, res))) return;
  await db
    .delete(galleryDecorationsTable)
    .where(eq(galleryDecorationsTable.galleryId, params.data.id));
  res.sendStatus(204);
});

router.delete("/galleries/:id/decorations/:decorId", requireAuth, async (req, res): Promise<void> => {
  const params = DecorationItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const userId = req.user!.userId;
  if (!(await assertOwner(params.data.id, userId, res))) return;
  const [deleted] = await db
    .delete(galleryDecorationsTable)
    .where(and(
      eq(galleryDecorationsTable.id, params.data.decorId),
      eq(galleryDecorationsTable.galleryId, params.data.id),
    ))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Decoration not found" }); return; }
  res.sendStatus(204);
});

export default router;
