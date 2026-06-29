
// Prisma-backed data access for tickets, replies, and users.
import type {
  CreateTicketInput,
  ListTicketsQuery,
  Reply,
  Ticket,
  TicketDetail,
  UpdateTicketInput,
} from "@supportgrid/shared";
import { ReplyDirection, SenderType } from "@supportgrid/shared";
import { prisma } from "./db.ts";

function toTicket(t: {
  id: number;
  subject: string;
  body: string;
  bodyHtml: string | null;
  senderName: string;
  senderEmail: string;
  status: string;
  category: string | null;
  assignedToId: string | null;
  assignedTo?: { name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}): Ticket {
  return {
    id: t.id,
    subject: t.subject,
    body: t.body,
    bodyHtml: t.bodyHtml,
    senderName: t.senderName,
    senderEmail: t.senderEmail,
    status: t.status as Ticket["status"],
    category: t.category as Ticket["category"],
    assignedToId: t.assignedToId,
    assignedToName: t.assignedTo?.name ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function toReply(r: {
  id: number;
  ticketId: number;
  direction: string;
  senderName: string | null;
  senderEmail: string;
  body: string;
  bodyHtml: string | null;
  createdAt: Date;
}): Reply {
  const direction = r.direction as ReplyDirection;
  return {
    id: r.id,
    ticketId: r.ticketId,
    direction,
    senderType: direction === ReplyDirection.Outbound ? SenderType.Agent : SenderType.Customer,
    senderName: r.senderName,
    senderEmail: r.senderEmail,
    body: r.body,
    bodyHtml: r.bodyHtml,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function createTicket(input: CreateTicketInput): Promise<TicketDetail> {
  const ticket = await prisma.ticket.create({
    data: {
      subject: input.subject,
      body: input.body,
      bodyHtml: input.bodyHtml ?? null,
      senderName: input.senderName,
      senderEmail: input.senderEmail,
      category: input.category ?? null,
    },
    include: { replies: { orderBy: { createdAt: "asc" } } },
  });
  return { ...toTicket(ticket), replies: ticket.replies.map(toReply) };
}

export async function getTicketStats() {
  const rows = await prisma.ticket.groupBy({ by: ["status"], _count: { _all: true } });
  const map = Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
  const total = rows.reduce((s, r) => s + r._count._all, 0);
  return {
    total,
    open:     map["Open"]     ?? 0,
    resolved: map["Resolved"] ?? 0,
    closed:   map["Closed"]   ?? 0,
  };
}

export async function listTickets(
  query: ListTicketsQuery,
): Promise<{ items: Ticket[]; total: number; page: number; pageSize: number }> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const sort = query.sort ?? "createdAt";
  const order = query.order ?? "desc";
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.search
      ? {
          OR: [
            { subject:     { contains: query.search, mode: "insensitive" as const } },
            { senderEmail: { contains: query.search, mode: "insensitive" as const } },
            { senderName:  { contains: query.search, mode: "insensitive" as const } },
            { body:        { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { assignedTo: { select: { name: true } } },
    }),
    prisma.ticket.count({ where }),
  ]);
  return { items: items.map(toTicket), total, page, pageSize };
}

export async function getTicket(id: number): Promise<TicketDetail | null> {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      replies: { orderBy: { createdAt: "asc" } },
      assignedTo: { select: { name: true } },
    },
  });
  if (!ticket) return null;
  return { ...toTicket(ticket), replies: ticket.replies.map(toReply) };
}

export async function updateTicket(
  id: number,
  patch: UpdateTicketInput,
): Promise<Ticket | null> {
  const exists = await prisma.ticket.findUnique({ where: { id } });
  if (!exists) return null;
  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.assignedToId !== undefined ? { assignedToId: patch.assignedToId } : {}),
    },
    include: { assignedTo: { select: { name: true } } },
  });
  return toTicket(ticket);
}

export async function addReply(
  ticketId: number,
  senderEmail: string,
  senderName: string | null,
  body: string,
  bodyHtml?: string,
  direction: ReplyDirection = ReplyDirection.Outbound,
  messageId?: string,
): Promise<Reply | null> {
  const exists = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!exists) return null;
  const [reply] = await prisma.$transaction([
    prisma.reply.create({
      data: {
        ticketId,
        direction,
        senderEmail,
        senderName: senderName ?? null,
        body,
        bodyHtml: bodyHtml ?? null,
        messageId: messageId ?? null,
      },
    }),
    prisma.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } }),
  ]);
  return toReply(reply);
}

export async function findTicketForThread(
  senderEmail: string,
  normalizedSubject: string,
): Promise<Ticket | null> {
  const ticket = await prisma.ticket.findFirst({
    where: {
      senderEmail,
      subject: { equals: normalizedSubject, mode: "insensitive" },
      status: { in: ["Open"] },
    },
    orderBy: { createdAt: "desc" },
  });
  return ticket ? toTicket(ticket) : null;
}

export async function findReplyByMessageId(messageId: string): Promise<boolean> {
  const reply = await prisma.reply.findUnique({ where: { messageId } });
  return reply !== null;
}

export async function createTicketFromEmail(data: {
  subject: string;
  body: string;
  bodyHtml?: string;
  senderName: string;
  senderEmail: string;
  messageId?: string;
}): Promise<{ ticket: Ticket; reply: Reply }> {
  const ticket = await prisma.ticket.create({
    data: {
      subject: data.subject,
      body: data.body,
      bodyHtml: data.bodyHtml ?? null,
      senderName: data.senderName,
      senderEmail: data.senderEmail,
      replies: {
        create: {
          direction: "inbound",
          senderEmail: data.senderEmail,
          senderName: data.senderName,
          body: data.body,
          bodyHtml: data.bodyHtml ?? null,
          messageId: data.messageId ?? null,
        },
      },
    },
    include: { replies: true },
  });
  const reply = ticket.replies[0]!;
  return { ticket: toTicket(ticket), reply: toReply(reply) };
}
