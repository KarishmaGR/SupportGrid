import { Router } from "express";
import { z } from "zod";
import { ReplyDirection, FieldLimits } from "@supportgrid/shared";
import { sanitizeBodyHtml } from "../sanitize.ts";
import { requireWebhookSecret } from "../middleware/requireWebhookSecret.ts";
import * as store from "../store.ts";
import { boss, QUEUE_CLASSIFY_TICKET, QUEUE_AUTO_RESOLVE_TICKET } from "../queue.ts";

export const webhooksRouter = Router();

const inboundEmailSchema = z.object({
  from:      z.string().min(1).max(FieldLimits.senderName),
  subject:   z.string().min(1).max(FieldLimits.subject),
  body:      z.string().min(1).max(FieldLimits.body),
  bodyHtml:  z.string().max(FieldLimits.bodyHtml).optional(),
  messageId: z.string().optional(),
  inReplyTo: z.string().optional(),
});

// Strip Re:/Fwd:/Fw: prefixes recursively for thread matching.
function normalizeSubject(subject: string): string {
  return subject.replace(/^(re|fwd?)\s*:\s*/i, "").trim();
}

// Parse "Name <email>" or bare email into { name, email }.
function parseFrom(from: string): { senderName: string; senderEmail: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>\s*$/);
  if (match) {
    return { senderName: match[1]!.trim(), senderEmail: match[2]!.trim().toLowerCase() };
  }
  return { senderName: from.trim(), senderEmail: from.trim().toLowerCase() };
}

webhooksRouter.post("/webhooks/inbound-email", requireWebhookSecret, async (req, res, next) => {
  try {
    const parsed = inboundEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const { from, subject, body, messageId, inReplyTo } = parsed.data;
    const bodyHtml = parsed.data.bodyHtml ? sanitizeBodyHtml(parsed.data.bodyHtml) : undefined;
    const { senderName, senderEmail } = parseFrom(from);

    // Dedup: skip if we've already stored this messageId.
    if (messageId && (await store.findReplyByMessageId(messageId))) {
      return res.status(200).json({ duplicate: true });
    }

    // Thread matching: try inReplyTo first (most reliable), then subject.
    const normalizedSubject = normalizeSubject(subject);
    let existingTicket = null;

    if (inReplyTo) {
      // Find a ticket whose sender matches and subject normalizes to the same string.
      existingTicket = await store.findTicketForThread(senderEmail, normalizedSubject);
    }
    if (!existingTicket) {
      existingTicket = await store.findTicketForThread(senderEmail, normalizedSubject);
    }

    if (existingTicket) {
      await store.addReply(
        existingTicket.id,
        senderEmail,
        senderName,
        body,
        bodyHtml,
        ReplyDirection.Inbound,
        messageId,
      );
      return res.status(201).json({ ticketId: existingTicket.id, created: false });
    }

    const { ticket } = await store.createTicketFromEmail({
      subject: normalizedSubject,
      body,
      bodyHtml,
      senderName,
      senderEmail,
      messageId,
    });

    await Promise.all([
      boss.send(QUEUE_CLASSIFY_TICKET, { ticketId: ticket.id, subject: ticket.subject, body: ticket.body }),
      boss.send(QUEUE_AUTO_RESOLVE_TICKET, { ticketId: ticket.id, subject: ticket.subject, body: ticket.body }),
    ]);

    res.status(201).json({ ticketId: ticket.id, created: true });
  } catch (err) {
    next(err);
  }
});
