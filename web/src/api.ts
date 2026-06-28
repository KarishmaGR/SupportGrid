import axios from "axios";
import type {
  CreateTicketInput,
  CreateUserInput,
  UpdateUserInput,
  Paginated,
  Ticket,
  TicketDetail,
  UpdateTicketInput,
  User,
} from "@supportgrid/shared";

const client = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ??
      err.response?.data?.message ??
      `Request failed: ${err.response?.status ?? "unknown"}`;
    return Promise.reject(new Error(message));
  },
);

const authClient = axios.create({
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

authClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ??
      err.response?.data?.error ??
      `Request failed: ${err.response?.status ?? "unknown"}`;
    return Promise.reject(new Error(message));
  },
);

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const auth = {
  getSession: () =>
    authClient
      .get<{ user: SessionUser } | null>("/api/auth/get-session")
      .then((r) => r.data),
  signIn: (email: string, password: string) =>
    authClient
      .post<{ user: SessionUser }>("/api/auth/sign-in/email", { email, password })
      .then((r) => r.data),
  signOut: () =>
    authClient.post<void>("/api/auth/sign-out").then((r) => r.data),
};

export const api = {
  listTickets: (params: Record<string, string> = {}) =>
    client
      .get<Paginated<Ticket>>("/tickets", { params })
      .then((r) => r.data),
  getTicket: (id: string) =>
    client.get<TicketDetail>(`/tickets/${id}`).then((r) => r.data),
  createTicket: (input: CreateTicketInput) =>
    client.post<TicketDetail>("/tickets", input).then((r) => r.data),
  updateTicket: (id: string, patch: UpdateTicketInput) =>
    client.patch<Ticket>(`/tickets/${id}`, patch).then((r) => r.data),
  addReply: (id: string, from: string, body: string) =>
    client.post(`/tickets/${id}/replies`, { from, body }).then((r) => r.data),
  listUsers: () =>
    client.get<User[]>("/users").then((r) => r.data),
  createUser: (input: CreateUserInput) =>
    client.post<User>("/users", input).then((r) => r.data),
  updateUser: (id: string, input: UpdateUserInput) =>
    client.patch<User>(`/users/${id}`, input).then((r) => r.data),
  deleteUser: (id: string) =>
    client.delete(`/users/${id}`).then((r) => r.data),
};
