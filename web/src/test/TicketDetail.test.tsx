import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TicketDetailPage } from "../pages/TicketDetail.tsx";
import { api } from "../api.ts";
import type { TicketDetail } from "@supportgrid/shared";

vi.mock("../api.ts", () => ({
  api: {
    getTicket: vi.fn(),
    updateTicket: vi.fn(),
    addReply: vi.fn(),
  },
  auth: { getSession: vi.fn(), signIn: vi.fn(), signOut: vi.fn() },
}));

const mockTicket: TicketDetail = {
  id: 42,
  subject: "Cannot log in",
  body: "I cannot log in to my account.",
  bodyHtml: null,
  senderName: "Jane Doe",
  senderEmail: "jane@student.edu",
  status: "Open",
  category: "Technical",
  assignedToId: null,
  createdAt: "2024-03-01T10:00:00.000Z",
  updatedAt: "2024-03-01T10:00:00.000Z",
  replies: [
    {
      id: 1,
      ticketId: 42,
      direction: "inbound",
      senderName: "Jane Doe",
      senderEmail: "jane@student.edu",
      body: "I cannot log in to my account.",
      bodyHtml: null,
      createdAt: "2024-03-01T10:00:00.000Z",
    },
    {
      id: 2,
      ticketId: 42,
      direction: "outbound",
      senderName: "Support Agent",
      senderEmail: "agent@support.edu",
      body: "Please try resetting your password.",
      bodyHtml: null,
      createdAt: "2024-03-01T11:00:00.000Z",
    },
  ],
};

function renderWithProviders(ticketId = "42") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TicketDetailPage", () => {
  it("shows loading text while fetching", () => {
    vi.mocked(api.getTicket).mockReturnValue(new Promise(() => {}));
    renderWithProviders();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    vi.mocked(api.getTicket).mockRejectedValue(new Error("Ticket not found"));
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Ticket not found")).toBeInTheDocument();
    });
  });

  it("renders the ticket subject", async () => {
    vi.mocked(api.getTicket).mockResolvedValue(mockTicket);
    renderWithProviders();

    await waitFor(() => screen.getByText("Cannot log in"));
    expect(screen.getByRole("heading", { name: "Cannot log in" })).toBeInTheDocument();
  });

  it("renders sender name and email", async () => {
    vi.mocked(api.getTicket).mockResolvedValue(mockTicket);
    renderWithProviders();

    await waitFor(() => screen.getByText(/From:/));
    expect(screen.getByText(/jane@student\.edu/)).toBeInTheDocument();
  });

  it("renders all replies in the thread", async () => {
    vi.mocked(api.getTicket).mockResolvedValue(mockTicket);
    renderWithProviders();

    await waitFor(() => screen.getByText("I cannot log in to my account."));
    expect(screen.getByText("Please try resetting your password.")).toBeInTheDocument();
  });

  it("labels inbound replies with the sender name", async () => {
    vi.mocked(api.getTicket).mockResolvedValue(mockTicket);
    renderWithProviders();

    await waitFor(() => screen.getByText("Jane Doe"));
    expect(screen.getByText("Support Agent")).toBeInTheDocument();
  });

  it("renders the reply form with a textarea and Send button", async () => {
    vi.mocked(api.getTicket).mockResolvedValue(mockTicket);
    renderWithProviders();

    await waitFor(() => screen.getByText("Cannot log in"));
    expect(screen.getByPlaceholderText("Write a reply…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reply/i })).toBeInTheDocument();
  });

  it("calls addReply when the form is submitted with text", async () => {
    vi.mocked(api.getTicket).mockResolvedValue(mockTicket);
    vi.mocked(api.addReply).mockResolvedValue({});
    renderWithProviders();

    await waitFor(() => screen.getByPlaceholderText("Write a reply…"));

    await userEvent.type(screen.getByPlaceholderText("Write a reply…"), "Thanks for reaching out!");
    await userEvent.click(screen.getByRole("button", { name: /send reply/i }));

    await waitFor(() => {
      expect(api.addReply).toHaveBeenCalledWith("42", expect.any(String), "Thanks for reaching out!");
    });
  });

  it("does not call addReply when the textarea is empty", async () => {
    vi.mocked(api.getTicket).mockResolvedValue(mockTicket);
    renderWithProviders();

    await waitFor(() => screen.getByRole("button", { name: /send reply/i }));
    await userEvent.click(screen.getByRole("button", { name: /send reply/i }));

    expect(api.addReply).not.toHaveBeenCalled();
  });

  it("renders a status selector with the current ticket status selected", async () => {
    vi.mocked(api.getTicket).mockResolvedValue(mockTicket);
    renderWithProviders();

    await waitFor(() => screen.getByText("Cannot log in"));
    expect(screen.getByText("Open")).toBeInTheDocument();
  });
});
