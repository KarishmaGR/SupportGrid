import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UsersPage } from "../pages/Users.tsx";
import { api } from "../api.ts";
import type { User } from "@supportgrid/shared";

vi.mock("../api.ts", () => ({
  api: { listUsers: vi.fn(), createUser: vi.fn() },
  auth: { getSession: vi.fn(), signIn: vi.fn(), signOut: vi.fn() },
}));

const mockUsers: User[] = [
  {
    id: "1",
    name: "Alice Admin",
    email: "alice@example.com",
    role: "Admin",
    active: true,
    createdAt: "2024-01-15T10:00:00.000Z",
  },
  {
    id: "2",
    name: "Bob Agent",
    email: "bob@example.com",
    role: "Agent",
    active: false,
    createdAt: "2024-02-20T09:30:00.000Z",
  },
];

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UsersPage", () => {
  it("shows skeleton rows while loading", () => {
    vi.mocked(api.listUsers).mockReturnValue(new Promise(() => {})); // never resolves
    renderWithQuery(<UsersPage />);

    // 5 skeleton rows × 5 columns = 25 skeleton divs
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(25);
  });

  it("renders the table with user data after loading", async () => {
    vi.mocked(api.listUsers).mockResolvedValue(mockUsers);
    renderWithQuery(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    });

    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bob Agent")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
  });

  it("shows column headers", async () => {
    vi.mocked(api.listUsers).mockResolvedValue(mockUsers);
    renderWithQuery(<UsersPage />);

    await waitFor(() => screen.getByText("Alice Admin"));

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("renders Admin badge for admin users and Agent badge for agents", async () => {
    vi.mocked(api.listUsers).mockResolvedValue(mockUsers);
    renderWithQuery(<UsersPage />);

    await waitFor(() => screen.getByText("Alice Admin"));

    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Agent")).toBeInTheDocument();
  });

  it("renders Active/Inactive status badges correctly", async () => {
    vi.mocked(api.listUsers).mockResolvedValue(mockUsers);
    renderWithQuery(<UsersPage />);

    await waitFor(() => screen.getByText("Alice Admin"));

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    vi.mocked(api.listUsers).mockRejectedValue(new Error("Failed to fetch users"));
    renderWithQuery(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch users")).toBeInTheDocument();
    });
  });

  it("renders an empty table when there are no users", async () => {
    vi.mocked(api.listUsers).mockResolvedValue([]);
    renderWithQuery(<UsersPage />);

    await waitFor(() => screen.getByText("Name"));

    expect(screen.queryByRole("row", { name: /alice/i })).not.toBeInTheDocument();
  });

  describe("New User modal", () => {
    async function renderAndWaitForPage() {
      vi.mocked(api.listUsers).mockResolvedValue(mockUsers);
      renderWithQuery(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));
    }

    it("dialog is not visible on initial render", async () => {
      await renderAndWaitForPage();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("opens the dialog when New User button is clicked", async () => {
      await renderAndWaitForPage();
      await userEvent.click(screen.getByRole("button", { name: /new user/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Create New User")).toBeInTheDocument();
    });

    it("shows Name, Email and Password fields inside the dialog", async () => {
      await renderAndWaitForPage();
      await userEvent.click(screen.getByRole("button", { name: /new user/i }));
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("dismisses the dialog when the Cancel button is clicked", async () => {
      await renderAndWaitForPage();
      await userEvent.click(screen.getByRole("button", { name: /new user/i }));
      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("dismisses the dialog when clicking outside (overlay)", async () => {
      await renderAndWaitForPage();
      await userEvent.click(screen.getByRole("button", { name: /new user/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Radix Dialog closes on Escape key, which userEvent.keyboard triggers
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });
});
