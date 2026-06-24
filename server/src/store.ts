
// Prisma-backed data access for tickets, messages, and users.
import type {
  CreateTicketInput,
  ListTicketsQuery,
  Message,
  Ticket,
  TicketDetail,
  UpdateTicketInput,
} from "@supportgrid/shared";
import { prisma } from "./db.ts";

// Prisma returns DateTime as Date and enums as strings that match our shared
// union types, so we serialize dates to ISO strings to match the API contract.
function toTicket(t: {
  id: string;
  subject: string;
  requesterEmail: string;
  status: string;
  category: string | null;
  assigneeId: string | null;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Ticket {
  return {
    id: t.id,
    subject: t.subject,
    requesterEmail: t.requesterEmail,
    status: t.status as Ticket["status"],
    category: t.category as Ticket["category"],
    assigneeId: t.assigneeId,
    summary: t.summary,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function toMessage(m: {
  id: string;
  ticketId: string;
  direction: string;
  from: string;
  body: string;
  createdAt: Date;
}): Message {
  return {
    id: m.id,
    ticketId: m.ticketId,
    direction: m.direction as Message["direction"],
    from: m.from,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  };
}

export async function createTicket(input: CreateTicketInput): Promise<TicketDetail> {
  const ticket = await prisma.ticket.create({
    data: {
      subject: input.subject,
      requesterEmail: input.requesterEmail,
      category: input.category ?? null,
      messages: {
        create: {
          direction: "inbound",
          from: input.requesterEmail,
          body: input.body,
        },
      },
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return { ...toTicket(ticket), messages: ticket.messages.map(toMessage) };
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
  };
  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);
  return { items: items.map(toTicket), total, page, pageSize };
}

export async function getTicket(id: string): Promise<TicketDetail | null> {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) return null;
  return { ...toTicket(ticket), messages: ticket.messages.map(toMessage) };
}

export async function updateTicket(
  id: string,
  patch: UpdateTicketInput,
): Promise<Ticket | null> {
  const exists = await prisma.ticket.findUnique({ where: { id } });
  if (!exists) return null;
  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.category ? { category: patch.category } : {}),
      ...(patch.assigneeId !== undefined ? { assigneeId: patch.assigneeId } : {}),
    },
  });
  return toTicket(ticket);
}

export async function addReply(
  ticketId: string,
  from: string,
  body: string,
): Promise<Message | null> {
  const exists = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!exists) return null;
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { ticketId, direction: "outbound", from, body },
    }),
    prisma.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } }),
  ]);
  return toMessage(message);
}
