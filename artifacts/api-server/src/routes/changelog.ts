import { Router, type IRouter, type Request, type Response } from "express";
import { readFile, watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const router: IRouter = Router();

// Works in both dev (dist/ inside artifacts/api-server/) and production
// (same relative position from the bundle). Goes up: dist → api-server → artifacts → workspace root.
const REPLIT_MD = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../replit.md"
);

router.get("/changelog/content", (req: Request, res: Response) => {
  readFile(REPLIT_MD, "utf8", (err, data) => {
    if (err) {
      res.status(500).json({ error: "Could not read replit.md" });
      return;
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(data);
  });
});

router.get("/changelog/download", (req: Request, res: Response) => {
  readFile(REPLIT_MD, "utf8", (err, data) => {
    if (err) {
      res.status(500).json({ error: "Could not read replit.md" });
      return;
    }
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="technical_changelog.md"');
    res.send(data);
  });
});

router.get("/changelog/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = () => {
    readFile(REPLIT_MD, "utf8", (err, data) => {
      if (!err) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    });
  };

  send();

  let debounce: ReturnType<typeof setTimeout> | null = null;
  let watcher: ReturnType<typeof watch> | null = null;

  try {
    watcher = watch(REPLIT_MD, () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(send, 120);
    });
  } catch {
    // File watching not available — initial content already sent, no live updates
  }

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 20000);

  req.on("close", () => {
    watcher?.close();
    clearInterval(heartbeat);
    if (debounce) clearTimeout(debounce);
  });
});

export default router;
