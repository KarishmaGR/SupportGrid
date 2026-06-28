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
  senderName: z.string().min(1),
  senderEmail: z.string().email(),
  body: z.string().min(1),
  bodyHtml: z.string().optional(),
  category: z.nativeEnum(TicketCategory).optional(),
});

const updateSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  assignedToId: z.string().nullable().optional(),
});

const replySchema = z.object({
  body: z.string().min(1).max(10_000),
  bodyHtml: z.string().optional(),
});

const listQuerySchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["subject", "senderEmail", "status", "category", "createdAt", "updatedAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

ticketsRouter.get("/stats", async (_req, res, next) => {
  try {
    res.json(await store.getTicketStats());
  } catch (err) {
    next(err);
  }
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
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ticket id" });
    const ticket = await store.getTicket(id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

ticketsRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ticket id" });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const ticket = await store.updateTicket(id, parsed.data);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

ticketsRouter.post("/:id/replies", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ticket id" });
    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const from = (res.locals.session as { user: { email: string; name: string } }).user;
    const reply = await store.addReply(
      id,
      from.email,
      from.name,
      parsed.data.body,
      parsed.data.bodyHtml,
      "outbound",
    );
    if (!reply) return res.status(404).json({ error: "Ticket not found" });
    res.status(201).json(reply);
  } catch (err) {
    next(err);
  }
});
