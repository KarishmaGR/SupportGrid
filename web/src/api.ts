import type {
  CreateTicketInput,
  Paginated,
  Ticket,
  TicketDetail,
  UpdateTicketInput,
} from "@supportgrid/shared";

const BASE = "/api";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

async function authHttp<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const auth = {
  getSession: () =>
    authHttp<{ user: SessionUser } | null>("/api/auth/get-session"),
  signIn: (email: string, password: string) =>
    authHttp<{ user: SessionUser }>("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signOut: () =>
    authHttp<void>("/api/auth/sign-out", { method: "POST" }),
};

export const api = {
  listTickets: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return http<Paginated<Ticket>>(`/tickets${qs ? `?${qs}` : ""}`);
  },
  getTicket: (id: string) => http<TicketDetail>(`/tickets/${id}`),
  createTicket: (input: CreateTicketInput) =>
    http<TicketDetail>("/tickets", { method: "POST", body: JSON.stringify(input) }),
  updateTicket: (id: string, patch: UpdateTicketInput) =>
    http<Ticket>(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  addReply: (id: string, from: string, body: string) =>
    http(`/tickets/${id}/replies`, {
      method: "POST",
      body: JSON.stringify({ from, body }),
    }),
};
