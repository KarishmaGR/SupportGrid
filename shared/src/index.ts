// Domain model + API contract shared between the server and web app.
// See project-scop.md and tech-stack.md for the source of these definitions.

export const TicketStatus = {
  New: "New",
  Open: "Open",
  Resolved: "Resolved",
  Closed: "Closed",
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketCategory = {
  General: "General",
  Technical: "Technical",
  Refund: "Refund",
} as const;
export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const UserRole = {
  Admin: "Admin",
  Agent: "Agent",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface Reply {
  id: number;
  ticketId: number;
  direction: "inbound" | "outbound";
  senderName: string | null;
  senderEmail: string;
  body: string;
  bodyHtml: string | null;
  createdAt: string;
}

export interface Ticket {
  id: number;
  subject: string;
  body: string;
  bodyHtml: string | null;
  senderName: string;
  senderEmail: string;
  status: TicketStatus;
  category: TicketCategory | null;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail extends Ticket {
  replies: Reply[];
}

// ---- API request/response shapes ----

export interface CreateTicketInput {
  subject: string;
  senderName: string;
  senderEmail: string;
  body: string;
  bodyHtml?: string;
  category?: TicketCategory;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  category?: TicketCategory;
  assignedToId?: string | null;
}

export interface InboundEmailPayload {
  from: string;       // "Name <email>" or bare email
  subject: string;
  body: string;
  bodyHtml?: string;
  messageId?: string; // email Message-ID for dedup
  inReplyTo?: string; // email In-Reply-To for threading
}

export interface ListTicketsQuery {
  status?: TicketStatus;
  category?: TicketCategory;
  page?: number;
  pageSize?: number;
  sort?: "createdAt" | "updatedAt";
  order?: "asc" | "desc";
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
