// Domain model + API contract shared between the server and web app.
// See project-scop.md and tech-stack.md for the source of these definitions.

export const TicketStatus = {
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

export interface Message {
  id: string;
  ticketId: string;
  direction: "inbound" | "outbound";
  from: string;
  body: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  subject: string;
  requesterEmail: string;
  status: TicketStatus;
  category: TicketCategory | null;
  assigneeId: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail extends Ticket {
  messages: Message[];
}

// ---- API request/response shapes ----

export interface CreateTicketInput {
  subject: string;
  requesterEmail: string;
  body: string;
  category?: TicketCategory;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  category?: TicketCategory;
  assigneeId?: string | null;
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

export interface ApiError {
  error: string;
  details?: unknown;
}
