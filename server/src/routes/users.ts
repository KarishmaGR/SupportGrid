import { randomUUID } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import { requireAuth } from "../middleware/requireAuth.ts";
import { requireAdmin } from "../middleware/requireAdmin.ts";
import { prisma } from "../db.ts";
import { UserRole } from "@supportgrid/shared";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireAdmin);

usersRouter.get("/", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

const createUserSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([UserRole.Admin,UserRole.Agent]),
});

usersRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const { name, email, password, role } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "A user with that email already exists" });
      return;
    }

    const hashed = await hashPassword(password);
    const userId = randomUUID();
    const accountId = randomUUID();

    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: { id: userId, email, name, emailVerified: true, role },
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      }),
      prisma.account.create({
        data: { id: accountId, accountId: userId, providerId: "credential", userId, password: hashed },
      }),
    ]);

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});
