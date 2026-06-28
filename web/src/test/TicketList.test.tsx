import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
    assignedToName: null,
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
    assignedToName: null,
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

    expect(screen.getByRole("columnheader", { name: /subject/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /requester/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /category/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /created/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /updated/i })).toBeInTheDocument();
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

  it("calls listTickets with sort params when a column header is clicked", async () => {
    vi.mocked(api.listTickets).mockResolvedValue(mockPaginated);
    renderWithProviders(<TicketList />);

    await waitFor(() => screen.getByText("Cannot log in"));

    fireEvent.click(screen.getByRole("columnheader", { name: /created/i }));

    await waitFor(() => {
      expect(api.listTickets).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "createdAt", order: "asc" }),
      );
    });
  });

  it("toggles sort order to desc on second click of the same header", async () => {
    vi.mocked(api.listTickets).mockResolvedValue(mockPaginated);
    renderWithProviders(<TicketList />);

    await waitFor(() => screen.getByText("Cannot log in"));

    // First click → asc
    fireEvent.click(screen.getByRole("columnheader", { name: /created/i }));
    await waitFor(() =>
      expect(api.listTickets).toHaveBeenCalledWith(expect.objectContaining({ order: "asc" })),
    );

    // Wait for data to re-render, then second click → desc
    await waitFor(() => screen.getByText("Cannot log in"));
    fireEvent.click(screen.getByRole("columnheader", { name: /created/i }));
    await waitFor(() =>
      expect(api.listTickets).toHaveBeenCalledWith(expect.objectContaining({ order: "desc" })),
    );
  });

  it("renders an empty table body when there are no tickets", async () => {
    vi.mocked(api.listTickets).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    renderWithProviders(<TicketList />);

    await waitFor(() => screen.getByText("Subject"));
    expect(screen.queryByText("Cannot log in")).not.toBeInTheDocument();
    expect(screen.getByText(/0 ticket\(s\)/)).toBeInTheDocument();
  });
});
