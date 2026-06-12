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
  let clerkUserId: string | undefined | null;
  try {
    const auth = getAuth(req);
    clerkUserId = auth?.userId;

    if (!clerkUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

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
        // Insert failed — could be a race condition or an email collision
        // with an existing account that predates Clerk auth. Try to find the
        // user by clerk_user_id first, then by email (and link the Clerk ID).
        [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.clerkUserId, clerkUserId));

        if (!user) {
          const [existingByEmail] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, email));

          if (existingByEmail) {
            // Link this Clerk identity to the pre-existing account.
            [user] = await db
              .update(usersTable)
              .set({ clerkUserId })
              .where(eq(usersTable.id, existingByEmail.id))
              .returning();
          }
        }

        // Ensure a profile row exists regardless of which code path provisioned the user.
        if (user) {
          await db
            .insert(profilesTable)
            .values({ userId: user.id })
            .onConflictDoNothing();
        }

        if (!user) {
          logger.error({ clerkUserId, email }, "requireAuth: failed to provision user");
          res.status(500).json({ error: "Failed to provision user" });
          return;
        }
      }
    }

    req.user = { userId: user.id, email: user.email, username: user.username };
    next();
  } catch (err) {
    logger.error({ err, clerkUserId }, "requireAuth: unexpected error");
    res.status(401).json({ error: "Unauthorized" });
  }
}
