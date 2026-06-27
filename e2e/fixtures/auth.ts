import { test as base, type Page } from "@playwright/test";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const storageStatePath = resolve(__dirname, "../.auth/admin.json");

/**
 * Fixture: authenticatedPage
 * Logs in once as the test admin and reuses the session for the test.
 * Tests that need an authenticated browser should use this fixture.
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL ?? "");
    await page.getByLabel(/password/i).fill(process.env.TEST_ADMIN_PASSWORD ?? "");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("**/dashboard");
    await page.context().storageState({ path: storageStatePath });
    await use(page);
  },
});

export { expect } from "@playwright/test";
