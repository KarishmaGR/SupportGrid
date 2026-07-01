import { Router } from "express";
import express from "express";
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

// Extract a header value from a raw headers string (e.g. from SendGrid).
function extractHeader(headers: string, name: string): string | undefined {
  const regex = new RegExp(`^${name}:\\s*(.+)$`, "im");
  return headers.match(regex)?.[1]?.trim();
}

async function processInboundEmail(opts: {
  from: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  messageId?: string;
  inReplyTo?: string;
}) {
  const { from, subject, body, bodyHtml, messageId, inReplyTo } = opts;
  const { senderName, senderEmail } = parseFrom(from);

  if (messageId && (await store.findReplyByMessageId(messageId))) {
    return { duplicate: true, ticketId: null, created: false };
  }

  const normalizedSubject = normalizeSubject(subject);
  let existingTicket = null;

  if (inReplyTo) {
    existingTicket = await store.findTicketByMessageId(inReplyTo);
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
    return { duplicate: false, ticketId: existingTicket.id, created: false };
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

  return { duplicate: false, ticketId: ticket.id, created: true };
}

// Existing JSON webhook (kept for testing / other integrations).
webhooksRouter.post("/webhooks/inbound-email", requireWebhookSecret, async (req, res, next) => {
  try {
    const parsed = inboundEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const result = await processInboundEmail(parsed.data);
    if (result.duplicate) return res.status(200).json({ duplicate: true });
    return res.status(201).json({ ticketId: result.ticketId, created: result.created });
  } catch (err) {
    next(err);
  }
});

// SendGrid Inbound Parse webhook — receives multipart/form-data.
// Point your SendGrid Inbound Parse MX at this URL (no auth header needed;
// SendGrid does not support custom request headers on inbound parse).
webhooksRouter.post(
  "/webhooks/sendgrid-inbound",
  express.urlencoded({ extended: true, limit: "10mb" }),
  async (req, res, next) => {
    try {
      const body = req.body as Record<string, string>;

      const from    = body["from"]    ?? "";
      const subject = body["subject"] ?? "(no subject)";
      const text    = body["text"]    ?? "";
      const html    = body["html"];
      const headers = body["headers"] ?? "";

      // Extract Message-ID and In-Reply-To from raw headers string.
      const messageId  = extractHeader(headers, "Message-ID");
      const inReplyTo  = extractHeader(headers, "In-Reply-To");

      if (!from || !text) {
        return res.status(400).json({ error: "Missing from or text" });
      }

      const result = await processInboundEmail({
        from,
        subject,
        body: text.slice(0, FieldLimits.body),
        bodyHtml: html ? sanitizeBodyHtml(html) : undefined,
        messageId,
        inReplyTo,
      });

      if (result.duplicate) return res.status(200).json({ duplicate: true });
      return res.status(201).json({ ticketId: result.ticketId, created: result.created });
    } catch (err) {
      next(err);
    }
  },
);
