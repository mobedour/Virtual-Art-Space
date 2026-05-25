import { pgTable, text, serial, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { galleriesTable } from "./galleries";

export const artworksTable = pgTable("artworks", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull().references(() => galleriesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  artistName: text("artist_name"),
  year: text("year"),
  medium: text("medium"),
  dimensions: text("dimensions"),
  xPosition: real("x_position").notNull().default(0),
  yPosition: real("y_position").notNull().default(1.5),
  zPosition: real("z_position").notNull().default(-3),
  rotation: real("rotation").notNull().default(0),
  scale: real("scale").notNull().default(1),
  isManuallyPlaced: boolean("is_manually_placed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertArtworkSchema = createInsertSchema(artworksTable).omit({ id: true, createdAt: true });
export type InsertArtwork = z.infer<typeof insertArtworkSchema>;
export type Artwork = typeof artworksTable.$inferSelect;
