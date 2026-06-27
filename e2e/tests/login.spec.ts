import { test, expect } from "@playwright/test";

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle(/SupportGrid/i);
});

test("admin can sign in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL ?? "");
  await page.getByLabel(/password/i).fill(process.env.TEST_ADMIN_PASSWORD ?? "");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
});
