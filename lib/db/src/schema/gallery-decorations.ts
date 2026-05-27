import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { galleriesTable } from "./galleries";

export const galleryDecorationsTable = pgTable("gallery_decorations", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull().references(() => galleriesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  x: real("x").notNull().default(0),
  z: real("z").notNull().default(0),
  rotY: real("rot_y").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGalleryDecorationSchema = createInsertSchema(galleryDecorationsTable).omit({ id: true, createdAt: true });
export type InsertGalleryDecoration = z.infer<typeof insertGalleryDecorationSchema>;
export type GalleryDecoration = typeof galleryDecorationsTable.$inferSelect;
