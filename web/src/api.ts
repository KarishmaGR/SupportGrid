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
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

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
