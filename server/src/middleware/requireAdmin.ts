import { UserRole } from "@supportgrid/shared";
import type { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = res.locals.session as { user?: { role?: string } } | undefined;
  if (session?.user?.role !== UserRole.Admin) {
    res.status(403).json({ error: "Forbidden: Admin access required" });
    return;
  }
  next();
}
