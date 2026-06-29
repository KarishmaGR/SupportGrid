import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TicketDetailPage } from "../pages/TicketDetail.tsx";
import { api } from "../api.ts";
import { ReplyDirection, SenderType, TicketStatus, TicketCategory } from "@supportgrid/shared";
import type { TicketDetail, User } from "@supportgrid/shared";

vi.mock("../api.ts", () => ({
  api: {
    getTicket: vi.fn(),
    updateTicket: vi.fn(),
    addReply: vi.fn(),
    listUsers: vi.fn(),
    polishReply: vi.fn(),
  },
  auth: { getSession: vi.fn(), signIn: vi.fn(), signOut: vi.fn() },
}));

// ── fixtures ──────────────────────────────────────────────────────────────────

const mockAgents: User[] = [
  {
    id: "agent-1",
    name: "Alice Smith",
    email: "alice@support.edu",
    role: "Agent",
    active: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

const baseTicket: TicketDetail = {
  id: 42,
  subject: "Cannot log in",
  body: "I cannot access my account at all.",
  bodyHtml: null,
  senderName: "Jane Doe",
  senderEmail: "jane@student.edu",
  status: TicketStatus.Open,
  category: TicketCategory.Technical,
  assignedToId: null,
  assignedToName: null,
  createdAt: "2024-03-01T10:00:00.000Z",
  updatedAt: "2024-03-01T10:00:00.000Z",
  replies: [],
};

const ticketWithReplies: TicketDetail = {
  ...baseTicket,
  replies: [
    {
      id: 1,
      ticketId: 42,
      direction: ReplyDirection.Inbound,
      senderType: SenderType.Customer,
      senderName: "Jane Doe",
      senderEmail: "jane@student.edu",
      body: "Still having issues logging in.",
      bodyHtml: null,
      createdAt: "2024-03-01T11:00:00.000Z",
    },
    {
      id: 2,
      ticketId: 42,
      direction: ReplyDirection.Outbound,
      senderType: SenderType.Agent,
      senderName: "Support Agent",
      senderEmail: "agent@support.edu",
      body: "Please try resetting your password.",
      bodyHtml: null,
      createdAt: "2024-03-01T12:00:00.000Z",
    },
  ],
};

// ── helpers ───────────────────────────────────────────────────────────────────

function renderPage(ticketId = "42") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/tickets" element={<div>Ticket list</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.listUsers).mockResolvedValue(mockAgents);
  vi.mocked(api.updateTicket).mockResolvedValue({ ...baseTicket, replies: undefined } as never);
});

// ── TicketDetailPage ──────────────────────────────────────────────────────────

describe("TicketDetailPage", () => {
  describe("loading and error states", () => {
    it("shows loading text while fetching", () => {
      vi.mocked(api.getTicket).mockReturnValue(new Promise(() => {}));
      renderPage();
      expect(screen.getByText("Loading…")).toBeInTheDocument();
    });

    it("shows the error message when the request fails", async () => {
      vi.mocked(api.getTicket).mockRejectedValue(new Error("Server error"));
      renderPage();
      await waitFor(() => expect(screen.getByText("Server error")).toBeInTheDocument());
    });
  });

  describe("ticket header", () => {
    beforeEach(() => {
      vi.mocked(api.getTicket).mockResolvedValue(baseTicket);
    });

    it("renders the ticket subject as a heading", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByRole("heading", { name: "Cannot log in" })).toBeInTheDocument(),
      );
    });

    it("renders the sender name and email in the header meta row", async () => {
      renderPage();
      await waitFor(() => screen.getByRole("heading", { name: "Cannot log in" }));
      // The meta row renders "Jane Doe <jane@student.edu>" inside a single span
      const metaSpan = screen.getByText((_, el) =>
        el?.tagName === "SPAN" &&
        !!el.textContent?.includes("Jane Doe") &&
        !!el.textContent?.includes("jane@student.edu"),
      );
      expect(metaSpan).toBeInTheDocument();
    });

    it("renders a back link to the ticket list", async () => {
      renderPage();
      await waitFor(() => screen.getByRole("heading", { name: "Cannot log in" }));
      expect(screen.getByRole("link", { name: /back to tickets/i })).toHaveAttribute("href", "/tickets");
    });
  });

  describe("sidebar properties", () => {
    it("shows the Status section with the current status", async () => {
      vi.mocked(api.getTicket).mockResolvedValue(baseTicket);
      renderPage();
      await waitFor(() => screen.getByRole("heading", { name: "Cannot log in" }));
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText(TicketStatus.Open)).toBeInTheDocument();
    });

    it("shows the Category section with the current category", async () => {
      vi.mocked(api.getTicket).mockResolvedValue(baseTicket);
      renderPage();
      await waitFor(() => screen.getByRole("heading", { name: "Cannot log in" }));
      expect(screen.getByText("Category")).toBeInTheDocument();
      expect(screen.getByText(TicketCategory.Technical)).toBeInTheDocument();
    });

    it("shows the Assigned to section as unassigned", async () => {
      vi.mocked(api.getTicket).mockResolvedValue(baseTicket);
      renderPage();
      await waitFor(() => screen.getByRole("heading", { name: "Cannot log in" }));
      expect(screen.getByText("Assigned to")).toBeInTheDocument();
      expect(screen.getByText("Unassigned")).toBeInTheDocument();
    });

    it("shows the assigned agent name when a ticket is assigned", async () => {
      vi.mocked(api.getTicket).mockResolvedValue({
        ...baseTicket,
        assignedToId: "agent-1",
        assignedToName: "Alice Smith",
      });
      renderPage();
      await waitFor(() => screen.getByRole("heading", { name: "Cannot log in" }));
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });
  });
});

// ── Reply Thread ──────────────────────────────────────────────────────────────

describe("Reply Thread", () => {
  describe("original message", () => {
    it("always shows the original ticket body at the top of the thread", async () => {
      vi.mocked(api.getTicket).mockResolvedValue(baseTicket);
      renderPage();
      await waitFor(() => screen.getByRole("heading", { name: "Cannot log in" }));
      expect(screen.getByText("I cannot access my account at all.")).toBeInTheDocument();
    });

    it("labels the original message as Customer", async () => {
      vi.mocked(api.getTicket).mockResolvedValue(baseTicket);
      renderPage();
      await waitFor(() => screen.getByRole("heading", { name: "Cannot log in" }));
      expect(screen.getByText("Customer")).toBeInTheDocument();
    });

    it("shows no reply bubbles when there are no replies", async () => {
      vi.mocked(api.getTicket).mockResolvedValue(baseTicket);
      renderPage();
      await waitFor(() => screen.getByRole("heading", { name: "Cannot log in" }));
      // Only the "Customer" label from the original message — no "Agent" label
      expect(screen.queryByText("Agent")).not.toBeInTheDocument();
    });
  });

  describe("reply bubbles", () => {
    beforeEach(() => {
      vi.mocked(api.getTicket).mockResolvedValue(ticketWithReplies);
    });

    it("renders all reply bodies", async () => {
      renderPage();
      await waitFor(() => screen.getByText("Still having issues logging in."));
      expect(screen.getByText("Please try resetting your password.")).toBeInTheDocument();
    });

    it("labels customer replies with 'Customer'", async () => {
      renderPage();
      await waitFor(() => screen.getByText("Still having issues logging in."));
      // Original message + inbound reply both labelled Customer
      expect(screen.getAllByText("Customer").length).toBeGreaterThanOrEqual(1);
    });

    it("labels agent replies with 'Agent'", async () => {
      renderPage();
      await waitFor(() => screen.getByText("Please try resetting your password."));
      expect(screen.getByText("Agent")).toBeInTheDocument();
    });

    it("shows the sender name in each reply bubble", async () => {
      renderPage();
      await waitFor(() => screen.getByText("Still having issues logging in."));
      // Jane Doe appears in original + inbound reply; Support Agent in outbound
      expect(screen.getByText("Support Agent")).toBeInTheDocument();
    });

    it("renders the correct number of reply bubbles", async () => {
      renderPage();
      await waitFor(() => screen.getByText("Still having issues logging in."));
      expect(screen.getByText("Still having issues logging in.")).toBeInTheDocument();
      expect(screen.getByText("Please try resetting your password.")).toBeInTheDocument();
    });
  });
});

// ── Reply Form ────────────────────────────────────────────────────────────────

describe("Reply Form", () => {
  beforeEach(() => {
    vi.mocked(api.getTicket).mockResolvedValue(baseTicket);
  });

  it("renders the textarea and Send reply button", async () => {
    renderPage();
    await waitFor(() => screen.getByRole("heading", { name: "Cannot log in" }));
    expect(screen.getByPlaceholderText("Write a reply…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reply/i })).toBeInTheDocument();
  });

  it("disables the Send button when the textarea is empty", async () => {
    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /send reply/i }));
    expect(screen.getByRole("button", { name: /send reply/i })).toBeDisabled();
  });

  it("enables the Send button once text is entered", async () => {
    renderPage();
    await waitFor(() => screen.getByPlaceholderText("Write a reply…"));
    await userEvent.type(screen.getByPlaceholderText("Write a reply…"), "Hello");
    expect(screen.getByRole("button", { name: /send reply/i })).toBeEnabled();
  });

  it("shows the Discard button only when there is text", async () => {
    renderPage();
    await waitFor(() => screen.getByPlaceholderText("Write a reply…"));
    expect(screen.queryByRole("button", { name: /discard/i })).not.toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("Write a reply…"), "Draft");
    expect(screen.getByRole("button", { name: /discard/i })).toBeInTheDocument();
  });

  it("clears the textarea when Discard is clicked", async () => {
    renderPage();
    await waitFor(() => screen.getByPlaceholderText("Write a reply…"));
    await userEvent.type(screen.getByPlaceholderText("Write a reply…"), "Draft reply");
    await userEvent.click(screen.getByRole("button", { name: /discard/i }));
    expect(screen.getByPlaceholderText("Write a reply…")).toHaveValue("");
  });

  it("calls api.addReply with the ticket id and trimmed body on submit", async () => {
    vi.mocked(api.addReply).mockResolvedValue({});
    renderPage();
    await waitFor(() => screen.getByPlaceholderText("Write a reply…"));

    await userEvent.type(screen.getByPlaceholderText("Write a reply…"), "  Thanks for reaching out!  ");
    await userEvent.click(screen.getByRole("button", { name: /send reply/i }));

    await waitFor(() =>
      expect(api.addReply).toHaveBeenCalledWith(
        "42",
        "Thanks for reaching out!",
        expect.any(String),
      ),
    );
  });

  it("does not call api.addReply when the textarea is blank", async () => {
    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /send reply/i }));
    await userEvent.click(screen.getByRole("button", { name: /send reply/i }));
    expect(api.addReply).not.toHaveBeenCalled();
  });

  it("clears the textarea after a successful reply", async () => {
    vi.mocked(api.addReply).mockResolvedValue({});
    vi.mocked(api.getTicket).mockResolvedValue(baseTicket);
    renderPage();
    await waitFor(() => screen.getByPlaceholderText("Write a reply…"));

    await userEvent.type(screen.getByPlaceholderText("Write a reply…"), "My reply");
    await userEvent.click(screen.getByRole("button", { name: /send reply/i }));

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Write a reply…")).toHaveValue(""),
    );
  });

  it("shows 'Sending…' on the button while the mutation is in flight", async () => {
    let resolve!: (v: unknown) => void;
    vi.mocked(api.addReply).mockReturnValue(new Promise((r) => { resolve = r; }));
    renderPage();
    await waitFor(() => screen.getByPlaceholderText("Write a reply…"));

    await userEvent.type(screen.getByPlaceholderText("Write a reply…"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: /send reply/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled(),
    );

    resolve({});
  });
});

// ── Polish Button ─────────────────────────────────────────────────────────────

describe("Polish Button", () => {
  beforeEach(() => {
    vi.mocked(api.getTicket).mockResolvedValue(baseTicket);
  });

  it("is hidden when the reply textarea is empty", async () => {
    renderPage();
    await waitFor(() => screen.getByPlaceholderText("Write a reply…"));
    expect(screen.queryByRole("button", { name: /polish/i })).not.toBeInTheDocument();
  });

  it("appears once text is typed in the reply textarea", async () => {
    renderPage();
    await waitFor(() => screen.getByPlaceholderText("Write a reply…"));
    await userEvent.type(screen.getByPlaceholderText("Write a reply…"), "Draft reply");
    expect(screen.getByRole("button", { name: /polish/i })).toBeInTheDocument();
  });

  it("calls api.polishReply with the ticket id, draft, and customer name", async () => {
    vi.mocked(api.polishReply).mockResolvedValue({ polished: "Polished reply" });
    renderPage();
    await waitFor(() => screen.getByPlaceholderText("Write a reply…"));

    await userEvent.type(screen.getByPlaceholderText("Write a reply…"), "Draft reply");
    await userEvent.click(screen.getByRole("button", { name: /polish/i }));

    await waitFor(() =>
      expect(api.polishReply).toHaveBeenCalledWith(
        "42",
        "Draft reply",
        baseTicket.body,
        baseTicket.senderName,
      ),
    );
  });

  it("replaces the textarea content with the polished reply", async () => {
    vi.mocked(api.polishReply).mockResolvedValue({ polished: "Polished reply" });
    renderPage();
    await waitFor(() => screen.getByPlaceholderText("Write a reply…"));

    await userEvent.type(screen.getByPlaceholderText("Write a reply…"), "Draft reply");
    await userEvent.click(screen.getByRole("button", { name: /polish/i }));

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Write a reply…")).toHaveValue("Polished reply"),
    );
  });

  it("shows 'Polishing…' and disables the button while in flight", async () => {
    let resolve!: (v: { polished: string }) => void;
    vi.mocked(api.polishReply).mockReturnValue(new Promise((r) => { resolve = r; }));
    renderPage();
    await waitFor(() => screen.getByPlaceholderText("Write a reply…"));

    await userEvent.type(screen.getByPlaceholderText("Write a reply…"), "Draft");
    await userEvent.click(screen.getByRole("button", { name: /polish/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /polishing/i })).toBeDisabled(),
    );

    resolve({ polished: "Done" });
  });

  it("shows an error message when polishReply fails", async () => {
    vi.mocked(api.polishReply).mockRejectedValue(new Error("AI request failed"));
    renderPage();
    await waitFor(() => screen.getByPlaceholderText("Write a reply…"));

    await userEvent.type(screen.getByPlaceholderText("Write a reply…"), "Draft");
    await userEvent.click(screen.getByRole("button", { name: /polish/i }));

    await waitFor(() =>
      expect(screen.getByText("AI request failed")).toBeInTheDocument(),
    );
  });
});
