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
      where: { active: true },
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

usersRouter.delete("/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (user.role === UserRole.Admin) {
      res.status(403).json({ error: "Admin users cannot be deleted" });
      return;
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: req.params.id }, data: { active: false, deletedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId: req.params.id } }),
      prisma.ticket.updateMany({ where: { assignedToId: req.params.id }, data: { assignedToId: null } }),
    ]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

const updateUserSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});

usersRouter.patch("/:id", async (req, res, next) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (email && email !== existing.email) {
      const taken = await prisma.user.findUnique({ where: { email } });
      if (taken) {
        res.status(409).json({ error: "A user with that email already exists" });
        return;
      }
    }

    const userUpdate = prisma.user.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(email && { email }) },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });

    if (password) {
      const hashed = await hashPassword(password);
      const [user] = await prisma.$transaction([
        userUpdate,
        prisma.account.updateMany({
          where: { userId: req.params.id, providerId: "credential" },
          data: { password: hashed },
        }),
      ]);
      res.json(user);
    } else {
      const user = await userUpdate;
      res.json(user);
    }
  } catch (err) {
    next(err);
  }
});
