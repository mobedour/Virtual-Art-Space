import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/auth/me", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId));

    if (!user) {
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      const email =
        clerkUser.emailAddresses[0]?.emailAddress ?? `${clerkUserId}@clerk.local`;
      res.json({
        id: null,
        email,
        username: clerkUser.username ?? email.split("@")[0],
        createdAt: new Date().toISOString(),
      });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt.toISOString(),
    });
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
});

export default router;
