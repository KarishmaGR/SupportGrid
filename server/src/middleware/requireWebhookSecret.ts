import type { Request, Response, NextFunction } from "express";

export function requireWebhookSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    res.status(500).json({ error: "WEBHOOK_SECRET is not configured" });
    return;
  }
  const provided =
    (req.headers["x-webhook-secret"] as string | undefined) ??
    (req.query["secret"] as string | undefined);
  if (provided !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
