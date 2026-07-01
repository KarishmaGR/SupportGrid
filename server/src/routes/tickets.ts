import { Router } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { TicketCategory, TicketStatus, TicketSortField, SortOrder, ReplyDirection, FieldLimits } from "@supportgrid/shared";
import { boss, QUEUE_CLASSIFY_TICKET, QUEUE_AUTO_RESOLVE_TICKET } from "../queue.ts";
import { sanitizeBodyHtml } from "../sanitize.ts";
import type { Paginated, Ticket } from "@supportgrid/shared";
import * as store from "../store.ts";
import { requireAuth } from "../middleware/requireAuth.ts";
import { sendReply } from "../email.ts";

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

const createSchema = z.object({
  subject:    z.string().min(1).max(FieldLimits.subject),
  senderName: z.string().min(1).max(FieldLimits.senderName),
  senderEmail: z.string().email(),
  body:       z.string().min(1).max(FieldLimits.body),
  bodyHtml:   z.string().max(FieldLimits.bodyHtml).optional(),
  category:   z.nativeEnum(TicketCategory).optional(),
});

const updateSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).nullable().optional(),
  assignedToId: z.string().nullable().optional(),
});

const replySchema = z.object({
  body:     z.string().min(1).max(FieldLimits.body),
  bodyHtml: z.string().max(FieldLimits.bodyHtml).optional(),
});

const listQuerySchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.nativeEnum(TicketSortField).default(TicketSortField.CreatedAt),
  order: z.nativeEnum(SortOrder).default(SortOrder.Desc),
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
    const ticket = await store.createTicket({
      ...parsed.data,
      bodyHtml: parsed.data.bodyHtml ? sanitizeBodyHtml(parsed.data.bodyHtml) : undefined,
    });
    res.status(201).json(ticket);
    await Promise.all([
      boss.send(QUEUE_CLASSIFY_TICKET, { ticketId: ticket.id, subject: ticket.subject, body: ticket.body }),
      boss.send(QUEUE_AUTO_RESOLVE_TICKET, { ticketId: ticket.id, subject: ticket.subject, body: ticket.body }),
    ]);
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

const polishSchema = z.object({
  reply: z.string().min(1).max(FieldLimits.body),
  ticketBody: z.string().max(FieldLimits.body),
  customerName: z.string().optional(),
});

ticketsRouter.post("/:id/polish-reply", async (req, res, next) => {
  try {
    const parsed = polishSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const { reply, ticketBody, customerName } = parsed.data;
    const openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });
    const completion = await openai.chat.completions.create({
      model: "nvidia/nemotron-3-super-120b-a12b:free",
      messages: [
        {
          role: "system",
          content:
            `You are a professional support agent. Improve the draft reply to be clear, polite, and concise.${customerName ? ` Address the customer by their first name: ${customerName}.` : ""} Return only the improved reply text — no commentary or explanation.`,
        },
        {
          role: "user",
          content: `Customer message:\n${ticketBody}\n\nDraft reply:\n${reply}`,
        },
      ],
    });
    const agentName = (res.locals.session as { user: { name: string } }).user.name;
    const text = completion.choices[0]?.message.content ?? "";
    const signed = `${text}\n\n— ${agentName}\nhttps://codewithai.com`;
    res.json({ polished: signed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    res.status(502).json({ error: message });
  }
});

ticketsRouter.post("/:id/summarize", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ticket id" });
    const ticket = await store.getTicket(id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const thread = [
      `Customer (${ticket.senderName}): ${ticket.body}`,
      ...ticket.replies.map((r) => `${r.senderType === "customer" ? `Customer (${r.senderName})` : `Agent (${r.senderName})`}: ${r.body}`),
    ].join("\n\n");

    const openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });
    const completion = await openai.chat.completions.create({
      model: "nvidia/nemotron-3-super-120b-a12b:free",
      messages: [
        {
          role: "system",
          content:
            "You are a support ticket summarizer. Summarize the ticket and conversation in 2–4 concise sentences: the customer's issue, any steps taken, and current status. Be factual and neutral.",
        },
        { role: "user", content: thread },
      ],
    });
    res.json({ summary: completion.choices[0]?.message.content ?? "" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    res.status(502).json({ error: message });
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
    const ticket = await store.getTicket(id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const reply = await store.addReply(
      id,
      from.email,
      from.name,
      parsed.data.body,
      parsed.data.bodyHtml ? sanitizeBodyHtml(parsed.data.bodyHtml) : undefined,
      ReplyDirection.Outbound,
    );
    if (!reply) return res.status(404).json({ error: "Ticket not found" });
    res.status(201).json(reply);

    // Send outbound email to the customer (fire-and-forget after response).
    store.getFirstInboundMessageId(id).then((inReplyToMessageId) =>
      sendReply({
        to:      ticket.senderEmail,
        toName:  ticket.senderName,
        subject: ticket.subject,
        text:    parsed.data.body,
        html:    parsed.data.bodyHtml ? sanitizeBodyHtml(parsed.data.bodyHtml) : undefined,
        inReplyToMessageId,
      })
    ).catch((err) => console.error("SendGrid outbound error:", err));
  } catch (err) {
    next(err);
  }
});
