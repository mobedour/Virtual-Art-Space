import { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable, profilesTable } from "@workspace/db";
import { logger } from "../lib/logger";

export interface LocalUser {
  userId: number;
  email: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: LocalUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId));

    if (!user) {
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      const email =
        clerkUser.emailAddresses[0]?.emailAddress ?? `${clerkUserId}@clerk.local`;
      const base =
        clerkUser.username ??
        clerkUser.firstName ??
        email.split("@")[0];
      const username = `${base.slice(0, 20)}_${clerkUserId.slice(-6)}`;

      try {
        [user] = await db
          .insert(usersTable)
          .values({ email, username, clerkUserId })
          .returning();
        await db.insert(profilesTable).values({ userId: user.id });
      } catch {
        [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.clerkUserId, clerkUserId));
        if (!user) {
          res.status(500).json({ error: "Failed to provision user" });
          return;
        }
      }
    }

    req.user = { userId: user.id, email: user.email, username: user.username };
    next();
  } catch (err) {
    logger.error({ err, clerkUserId }, "requireAuth: inner error");
    res.status(401).json({ error: "Unauthorized" });
  }
  } catch (err) {
    logger.error({ err, url: req.url }, "requireAuth: outer error (getAuth threw)");
    res.status(401).json({ error: "Unauthorized" });
  }
}
