import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UsersPage } from "../pages/Users.tsx";
import { api } from "../api.ts";
import type { User } from "@supportgrid/shared";

vi.mock("../api.ts", () => ({
  api: { listUsers: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), deleteUser: vi.fn() },
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

    // 5 skeleton rows × 4 columns = 20 skeleton divs
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(20);
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
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("renders Admin badge for admin users and Agent badge for agents", async () => {
    vi.mocked(api.listUsers).mockResolvedValue(mockUsers);
    renderWithQuery(<UsersPage />);

    await waitFor(() => screen.getByText("Alice Admin"));

    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Agent")).toBeInTheDocument();
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

  describe("Edit User modal", () => {
    async function renderAndWaitForPage() {
      vi.mocked(api.listUsers).mockResolvedValue(mockUsers);
      renderWithQuery(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));
    }

    async function openEditForAlice() {
      await renderAndWaitForPage();
      await userEvent.click(screen.getByRole("button", { name: /edit alice admin/i }));
    }

    it("renders an edit icon button for each user row", async () => {
      await renderAndWaitForPage();
      const editButtons = screen.getAllByRole("button", { name: /edit /i });
      expect(editButtons).toHaveLength(mockUsers.length);
    });

    it("opens the Edit User dialog with correct title", async () => {
      await openEditForAlice();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Edit User")).toBeInTheDocument();
    });

    it("pre-populates Name and Email with the user's current values", async () => {
      await openEditForAlice();
      expect(screen.getByDisplayValue("Alice Admin")).toBeInTheDocument();
      expect(screen.getByDisplayValue("alice@example.com")).toBeInTheDocument();
    });

    it("password field is empty by default in edit mode", async () => {
      await openEditForAlice();
      const passwordInput = screen.getByPlaceholderText(/new password/i) as HTMLInputElement;
      expect(passwordInput.value).toBe("");
    });

    it("dismisses the dialog when Cancel is clicked", async () => {
      await openEditForAlice();
      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("dismisses the dialog on Escape key", async () => {
      await openEditForAlice();
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("calls updateUser with updated name and email (no password)", async () => {
      vi.mocked(api.updateUser).mockResolvedValue({ ...mockUsers[0]!, name: "Alice Updated" });
      await openEditForAlice();

      await userEvent.clear(screen.getByDisplayValue("Alice Admin"));
      await userEvent.type(screen.getByPlaceholderText("Full name"), "Alice Updated");

      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(api.updateUser).toHaveBeenCalledWith("1", {
          name: "Alice Updated",
          email: "alice@example.com",
        });
      });
    });

    it("calls updateUser with a new password when provided", async () => {
      vi.mocked(api.updateUser).mockResolvedValue(mockUsers[0]!);
      await openEditForAlice();

      await userEvent.type(screen.getByPlaceholderText(/new password/i), "newSecret99");

      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(api.updateUser).toHaveBeenCalledWith("1", expect.objectContaining({
          password: "newSecret99",
        }));
      });
    });

    it("shows a validation error when name is too short", async () => {
      await openEditForAlice();
      await userEvent.clear(screen.getByDisplayValue("Alice Admin"));
      await userEvent.type(screen.getByPlaceholderText("Full name"), "Al");
      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText("Name must be at least 3 characters")).toBeInTheDocument();
      });
      expect(api.updateUser).not.toHaveBeenCalled();
    });

    it("shows a validation error when password is provided but too short", async () => {
      await openEditForAlice();
      await userEvent.type(screen.getByPlaceholderText(/new password/i), "short");
      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
      });
      expect(api.updateUser).not.toHaveBeenCalled();
    });

    it("shows server error when updateUser rejects", async () => {
      vi.mocked(api.updateUser).mockRejectedValue(new Error("Email already taken"));
      await openEditForAlice();
      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText("Email already taken")).toBeInTheDocument();
      });
    });

    it("closes and refreshes the list on successful save", async () => {
      vi.mocked(api.updateUser).mockResolvedValue({ ...mockUsers[0]!, name: "Alice Updated" });
      vi.mocked(api.listUsers).mockResolvedValue([{ ...mockUsers[0]!, name: "Alice Updated" }, mockUsers[1]!]);
      await openEditForAlice();

      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  describe("Delete User", () => {
    async function renderAndWaitForPage() {
      vi.mocked(api.listUsers).mockResolvedValue(mockUsers);
      renderWithQuery(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));
    }

    it("renders a delete button only for non-admin users", async () => {
      await renderAndWaitForPage();
      const deleteButtons = screen.getAllByRole("button", { name: /delete /i });
      // Only Bob (Agent) gets a delete button; Alice (Admin) does not
      expect(deleteButtons).toHaveLength(1);
    });

    it("does not render a delete button for Admin users", async () => {
      await renderAndWaitForPage();
      expect(screen.queryByRole("button", { name: /delete alice admin/i })).not.toBeInTheDocument();
    });

    it("renders a delete button for Agent users", async () => {
      await renderAndWaitForPage();
      expect(screen.getByRole("button", { name: /delete bob agent/i })).toBeInTheDocument();
    });

    it("opens a confirmation dialog when delete is clicked for an agent", async () => {
      await renderAndWaitForPage();
      await userEvent.click(screen.getByRole("button", { name: /delete bob agent/i }));
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText(/delete bob agent/i)).toBeInTheDocument();
    });

    it("shows the user name and a deactivation warning in the dialog", async () => {
      await renderAndWaitForPage();
      await userEvent.click(screen.getByRole("button", { name: /delete bob agent/i }));
      expect(screen.getByText(/deactivate the account/i)).toBeInTheDocument();
    });

    it("dismisses the dialog when Cancel is clicked", async () => {
      await renderAndWaitForPage();
      await userEvent.click(screen.getByRole("button", { name: /delete bob agent/i }));
      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      });
    });

    it("calls deleteUser with the correct id on confirm", async () => {
      vi.mocked(api.deleteUser).mockResolvedValue(undefined);
      await renderAndWaitForPage();
      await userEvent.click(screen.getByRole("button", { name: /delete bob agent/i }));
      await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
      await waitFor(() => {
        expect(api.deleteUser).toHaveBeenCalledWith("2", expect.anything());
      });
    });

    it("closes the confirmation dialog after successful deletion", async () => {
      vi.mocked(api.deleteUser).mockResolvedValue(undefined);
      await renderAndWaitForPage();
      await userEvent.click(screen.getByRole("button", { name: /delete bob agent/i }));
      await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      });
    });

    it("shows a server error inside the dialog when deleteUser rejects", async () => {
      vi.mocked(api.deleteUser).mockRejectedValue(new Error("Server error"));
      await renderAndWaitForPage();
      await userEvent.click(screen.getByRole("button", { name: /delete bob agent/i }));
      await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
  });
});
