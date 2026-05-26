import { Router, type IRouter, type Request, type Response } from "express";
import { readFile, watch } from "node:fs";
import path from "node:path";

const router: IRouter = Router();

const REPLIT_MD = path.resolve(process.cwd(), "../../replit.md");

function devOnly(req: Request, res: Response, next: () => void) {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Not available in production." });
    return;
  }
  next();
}

router.get("/changelog/content", devOnly, (req: Request, res: Response) => {
  readFile(REPLIT_MD, "utf8", (err, data) => {
    if (err) {
      res.status(500).json({ error: "Could not read replit.md" });
      return;
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(data);
  });
});

router.get("/changelog/download", devOnly, (req: Request, res: Response) => {
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

router.get("/changelog/stream", devOnly, (req: Request, res: Response) => {
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
  const watcher = watch(REPLIT_MD, () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(send, 120);
  });

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 20000);

  req.on("close", () => {
    watcher.close();
    clearInterval(heartbeat);
    if (debounce) clearTimeout(debounce);
  });
});

export default router;
