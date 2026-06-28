/**
 * E2E tests — User Management page (/users)
 *
 * Covers: table rendering, create agent user, edit user, delete user.
 * All tests run as admin (the only role that can access /users).
 * Each test logs in independently to stay fully isolated.
 *
 * Run with:  npx playwright test e2e/tests/users.spec.ts
 */

import { test, expect } from "../fixtures/index.ts";
import type { Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL ?? "");
  await page.getByLabel(/password/i).fill(process.env.TEST_ADMIN_PASSWORD ?? "");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard");
}

/** Navigate to /users and wait for the table to be visible. */
async function goToUsersPage(page: Page): Promise<void> {
  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  // Wait until the table header is rendered (data has loaded)
  await expect(page.getByRole("columnheader", { name: /name/i })).toBeVisible();
}

/**
 * Create a new agent user through the UI and wait until the new row appears
 * in the table. Returns the values used so callers can assert on them.
 */
async function createAgentViaUI(
  page: Page,
  name: string,
  email: string,
  password: string,
): Promise<void> {
  await page.getByRole("button", { name: /new user/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: /create new user/i })).toBeVisible();

  await page.getByLabel(/^name$/i).fill(name);
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /create user/i }).click();

  // Dialog closes on success and the list refreshes
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();
}

// ---------------------------------------------------------------------------
// 1. Table rendering
// ---------------------------------------------------------------------------

test.describe("Users page — table rendering", () => {
  test("admin can navigate to /users and see the users table", async ({ page }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);

    // Column headers
    await expect(page.getByRole("columnheader", { name: /name/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /email/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /role/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /created/i })).toBeVisible();

    // At minimum the seeded admin row is always present
    await expect(
      page.getByRole("cell", { name: process.env.TEST_ADMIN_EMAIL ?? "" }),
    ).toBeVisible();

    // The seeded admin should show an "Admin" role badge
    await expect(page.getByText("Admin").first()).toBeVisible();
  });

  test("New User button is visible on the users page", async ({ page }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);
    await expect(page.getByRole("button", { name: /new user/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Create
// ---------------------------------------------------------------------------

test.describe("Users page — create agent user", () => {
  test("admin can create a new agent user and it appears in the list", async ({ page }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);

    const name = `Test Agent ${Date.now()}`;
    const email = `agent-${Date.now()}@e2e.test`;
    const password = "AgentPass@1";

    await createAgentViaUI(page, name, email, password);

    // Row should now contain the new email and an "Agent" badge
    await expect(page.getByRole("cell", { name: email, exact: true })).toBeVisible();

    // Find the row that contains the new email and check the role badge within it
    const newRow = page.getByRole("row").filter({ hasText: email });
    await expect(newRow.locator("span[data-slot='badge']", { hasText: "Agent" })).toBeVisible();
  });

  test("Create dialog closes when Cancel is clicked without saving", async ({ page }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);

    await page.getByRole("button", { name: /new user/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. Edit
// ---------------------------------------------------------------------------

test.describe("Users page — edit user", () => {
  test("admin can edit a user's name and email and see updated values in the list", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);

    // Create a fresh agent to edit so tests don't share mutable state
    const originalName = `Edit Target ${Date.now()}`;
    const originalEmail = `edit-target-${Date.now()}@e2e.test`;
    await createAgentViaUI(page, originalName, originalEmail, "EditPass@1");

    // Click the pencil icon for this specific row
    const targetRow = page.getByRole("row").filter({ hasText: originalEmail });
    await targetRow.getByRole("button", { name: new RegExp(`edit ${originalName}`, "i") }).click();

    // Edit dialog opens pre-populated
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /edit user/i })).toBeVisible();

    const updatedName = `Edited Agent ${Date.now()}`;
    const updatedEmail = `edited-${Date.now()}@e2e.test`;

    // Clear and re-fill the name and email fields
    await page.getByLabel(/^name$/i).clear();
    await page.getByLabel(/^name$/i).fill(updatedName);
    await page.getByLabel(/^email$/i).clear();
    await page.getByLabel(/^email$/i).fill(updatedEmail);

    await page.getByRole("button", { name: /save changes/i }).click();

    // Dialog closes and updated values appear in the table
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("cell", { name: updatedName, exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: updatedEmail, exact: true })).toBeVisible();

    // Original name/email should no longer be present
    await expect(page.getByRole("cell", { name: originalEmail, exact: true })).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4. Delete
// ---------------------------------------------------------------------------

test.describe("Users page — delete user", () => {
  test("admin can delete an agent user and the user disappears from the list", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);

    // Create a fresh agent to delete
    const name = `Delete Target ${Date.now()}`;
    const email = `delete-target-${Date.now()}@e2e.test`;
    await createAgentViaUI(page, name, email, "DeletePass@1");

    // Click the trash icon for this specific row
    const targetRow = page.getByRole("row").filter({ hasText: email });
    await targetRow.getByRole("button", { name: new RegExp(`delete ${name}`, "i") }).click();

    // Confirmation AlertDialog appears
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page.getByText(new RegExp(`delete ${name}`, "i"))).toBeVisible();
    await expect(
      page.getByText(/this will deactivate the account/i),
    ).toBeVisible();

    // Confirm deletion
    await page.getByRole("button", { name: /^delete$/i }).click();

    // AlertDialog closes and the row is removed from the table
    await expect(page.getByRole("alertdialog")).not.toBeVisible();
    await expect(page.getByRole("cell", { name: email, exact: true })).not.toBeVisible();
  });

  test("admin user row does not have a delete button", async ({ page }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);

    const adminEmail = process.env.TEST_ADMIN_EMAIL ?? "";
    const adminRow = page.getByRole("row").filter({ hasText: adminEmail });

    // The UsersPage only renders the Trash2 button for non-Admin users
    await expect(
      adminRow.getByRole("button", { name: /delete/i }),
    ).not.toBeVisible();
  });

  test("delete is cancelled when Cancel is clicked in the confirmation dialog", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);

    // Create a user to attempt deletion on
    const name = `Cancel Delete ${Date.now()}`;
    const email = `cancel-delete-${Date.now()}@e2e.test`;
    await createAgentViaUI(page, name, email, "CancelPass@1");

    const targetRow = page.getByRole("row").filter({ hasText: email });
    await targetRow.getByRole("button", { name: new RegExp(`delete ${name}`, "i") }).click();

    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: /cancel/i }).click();

    // AlertDialog closes; user still present in the list
    await expect(page.getByRole("alertdialog")).not.toBeVisible();
    await expect(page.getByRole("cell", { name: email, exact: true })).toBeVisible();
  });
});
