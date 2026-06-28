import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TicketList } from "../pages/TicketList.tsx";
import { api } from "../api.ts";
import type { Paginated, Ticket } from "@supportgrid/shared";

vi.mock("../api.ts", () => ({
  api: { listTickets: vi.fn() },
  auth: { getSession: vi.fn(), signIn: vi.fn(), signOut: vi.fn() },
}));

const mockTickets: Ticket[] = [
  {
    id: 1,
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
  },
  {
    id: 2,
    subject: "Refund request",
    body: "I would like a refund.",
    bodyHtml: null,
    senderName: "Bob Smith",
    senderEmail: "bob@student.edu",
    status: "Resolved",
    category: "Refund",
    assignedToId: null,
    createdAt: "2024-03-02T09:00:00.000Z",
    updatedAt: "2024-03-02T09:00:00.000Z",
  },
];

const mockPaginated: Paginated<Ticket> = {
  items: mockTickets,
  total: 2,
  page: 1,
  pageSize: 20,
};

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TicketList", () => {
  it("shows loading text while fetching", () => {
    vi.mocked(api.listTickets).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<TicketList />);
    expect(screen.getByText("Loading tickets…")).toBeInTheDocument();
  });

  it("renders column headers after data loads", async () => {
    vi.mocked(api.listTickets).mockResolvedValue(mockPaginated);
    renderWithProviders(<TicketList />);

    await waitFor(() => screen.getByText("Cannot log in"));

    expect(screen.getByText("Subject")).toBeInTheDocument();
    expect(screen.getByText("Requester")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("renders ticket rows with subject, sender email and category", async () => {
    vi.mocked(api.listTickets).mockResolvedValue(mockPaginated);
    renderWithProviders(<TicketList />);

    await waitFor(() => screen.getByText("Cannot log in"));

    expect(screen.getByText("Cannot log in")).toBeInTheDocument();
    expect(screen.getByText("jane@student.edu")).toBeInTheDocument();
    expect(screen.getByText("Technical")).toBeInTheDocument();

    expect(screen.getByText("Refund request")).toBeInTheDocument();
    expect(screen.getByText("bob@student.edu")).toBeInTheDocument();
    expect(screen.getByText("Refund")).toBeInTheDocument();
  });

  it("renders status badges for each ticket", async () => {
    vi.mocked(api.listTickets).mockResolvedValue(mockPaginated);
    renderWithProviders(<TicketList />);

    await waitFor(() => screen.getByText("Cannot log in"));

    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it("shows '—' for tickets with no category", async () => {
    const noCategory: Paginated<Ticket> = {
      ...mockPaginated,
      items: [{ ...mockTickets[0]!, category: null }],
    };
    vi.mocked(api.listTickets).mockResolvedValue(noCategory);
    renderWithProviders(<TicketList />);

    await waitFor(() => screen.getByText("Cannot log in"));
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the total ticket count and page number", async () => {
    vi.mocked(api.listTickets).mockResolvedValue(mockPaginated);
    renderWithProviders(<TicketList />);

    await waitFor(() => screen.getByText(/2 ticket\(s\)/));
    expect(screen.getByText(/page 1/)).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    vi.mocked(api.listTickets).mockRejectedValue(new Error("Failed to load tickets"));
    renderWithProviders(<TicketList />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load tickets")).toBeInTheDocument();
    });
  });

  it("renders an empty table body when there are no tickets", async () => {
    vi.mocked(api.listTickets).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    renderWithProviders(<TicketList />);

    await waitFor(() => screen.getByText("Subject"));
    expect(screen.queryByText("Cannot log in")).not.toBeInTheDocument();
    expect(screen.getByText(/0 ticket\(s\)/)).toBeInTheDocument();
  });
});
