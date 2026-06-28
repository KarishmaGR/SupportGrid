/**
 * E2E tests — User Management page (/users)
 *
 * Covers only flows that require a real database + server:
 * create, edit, delete user end-to-end; role-based access control.
 *
 * UI unit tests (column headers, dialog open/close, validation) live in
 * web/src/test/UsersPage.test.tsx.
 */

import { test, expect } from "../fixtures/index.ts";
import type { Page } from "@playwright/test";

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL ?? "");
  await page.getByLabel(/password/i).fill(process.env.TEST_ADMIN_PASSWORD ?? "");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard");
}

async function goToUsersPage(page: Page): Promise<void> {
  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /name/i })).toBeVisible();
}

async function createAgentViaUI(
  page: Page,
  name: string,
  email: string,
  password: string,
): Promise<void> {
  await page.getByRole("button", { name: /new user/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel(/^name$/i).fill(name);
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /create user/i }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();
}

// ---------------------------------------------------------------------------
// Role-based access
// ---------------------------------------------------------------------------

test.describe("Users page — access control", () => {
  test("admin can navigate to /users", async ({ page }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);
    await expect(page.getByRole("cell", { name: process.env.TEST_ADMIN_EMAIL ?? "" })).toBeVisible();
  });

  test("admin user row does not have a delete button", async ({ page }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);
    const adminRow = page.getByRole("row").filter({ hasText: process.env.TEST_ADMIN_EMAIL ?? "" });
    await expect(adminRow.getByRole("button", { name: /delete/i })).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

test.describe("Users page — create agent user", () => {
  test("admin can create a new agent and it appears in the list with Agent badge", async ({ page }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);

    const name = `Test Agent ${Date.now()}`;
    const email = `agent-${Date.now()}@e2e.test`;
    await createAgentViaUI(page, name, email, "AgentPass@1");

    await expect(page.getByRole("cell", { name: email, exact: true })).toBeVisible();
    const newRow = page.getByRole("row").filter({ hasText: email });
    await expect(newRow.locator("span[data-slot='badge']", { hasText: "Agent" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

test.describe("Users page — edit user", () => {
  test("admin can edit a user's name and email and see updated values in the list", async ({ page }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);

    const originalName = `Edit Target ${Date.now()}`;
    const originalEmail = `edit-target-${Date.now()}@e2e.test`;
    await createAgentViaUI(page, originalName, originalEmail, "EditPass@1");

    const targetRow = page.getByRole("row").filter({ hasText: originalEmail });
    await targetRow.getByRole("button", { name: new RegExp(`edit ${originalName}`, "i") }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const updatedName = `Edited Agent ${Date.now()}`;
    const updatedEmail = `edited-${Date.now()}@e2e.test`;
    await page.getByLabel(/^name$/i).clear();
    await page.getByLabel(/^name$/i).fill(updatedName);
    await page.getByLabel(/^email$/i).clear();
    await page.getByLabel(/^email$/i).fill(updatedEmail);
    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("cell", { name: updatedName, exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: updatedEmail, exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: originalEmail, exact: true })).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

test.describe("Users page — delete user", () => {
  test("admin can delete an agent and the user disappears from the list", async ({ page }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);

    const name = `Delete Target ${Date.now()}`;
    const email = `delete-target-${Date.now()}@e2e.test`;
    await createAgentViaUI(page, name, email, "DeletePass@1");

    const targetRow = page.getByRole("row").filter({ hasText: email });
    await targetRow.getByRole("button", { name: new RegExp(`delete ${name}`, "i") }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();

    await page.getByRole("button", { name: /^delete$/i }).click();

    await expect(page.getByRole("alertdialog")).not.toBeVisible();
    await expect(page.getByRole("cell", { name: email, exact: true })).not.toBeVisible();
  });
});
