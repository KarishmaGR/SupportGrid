import { Router } from "express";
import { z } from "zod";
import { TicketCategory, TicketStatus } from "@supportgrid/shared";
import type { Paginated, Ticket } from "@supportgrid/shared";
import * as store from "../store.ts";
import { requireAuth } from "../middleware/requireAuth.ts";

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

const createSchema = z.object({
  subject: z.string().min(1),
  requesterEmail: z.string().email(),
  body: z.string().min(1),
  category: z.nativeEnum(TicketCategory).optional(),
});

const updateSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  assigneeId: z.string().nullable().optional(),
});

const replySchema = z.object({
  from: z.string().min(1),
  body: z.string().min(1),
});

const listQuerySchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

ticketsRouter.get("/", async (req, res, next) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
    }
    const { items, total, page, pageSize } = await store.listTickets(parsed.data);
    const result: Paginated<Ticket> = { items, page, pageSize, total };
    res.json(result);
  } catch (err) {
    next(err);
  }
});

ticketsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const ticket = await store.createTicket(parsed.data);
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

ticketsRouter.get("/:id", async (req, res, next) => {
  try {
    const ticket = await store.getTicket(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

ticketsRouter.patch("/:id", async (req, res, next) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const ticket = await store.updateTicket(req.params.id, parsed.data);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

ticketsRouter.post("/:id/replies", async (req, res, next) => {
  try {
    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const message = await store.addReply(req.params.id, parsed.data.from, parsed.data.body);
    if (!message) return res.status(404).json({ error: "Ticket not found" });
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});
