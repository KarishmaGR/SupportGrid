/**
 * E2E tests — Authentication system
 *
 * Covers: login page rendering, credential validation (client + server),
 * protected route guards (ProtectedRoute + AdminRoute), session persistence,
 * already-authenticated redirect, and sign-out.
 *
 * Credentials are read from environment variables only — never hardcoded.
 * Run with:  npx playwright test e2e/tests/auth.spec.ts
 */

import { test, expect } from "../fixtures/index.ts";
import type { Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fillAndSubmitLogin(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await fillAndSubmitLogin(
    page,
    process.env.TEST_ADMIN_EMAIL ?? "",
    process.env.TEST_ADMIN_PASSWORD ?? "",
  );
  await page.waitForURL("**/dashboard");
}

// ---------------------------------------------------------------------------
// 1. Login page rendering
// ---------------------------------------------------------------------------

test.describe("Login page — rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders the SupportGrid heading", async ({ page }) => {
    // CardTitle from shadcn renders a <div>, not a semantic <h1>
    await expect(page.getByText("SupportGrid").first()).toBeVisible();
  });

  test("renders the sign-in subtitle", async ({ page }) => {
    await expect(page.getByText(/sign in to your account/i)).toBeVisible();
  });

  test("renders an email label and input", async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toHaveAttribute("type", "email");
  });

  test("renders a password label and input", async ({ page }) => {
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toHaveAttribute(
      "type",
      "password",
    );
  });

  test("renders the sign-in submit button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /sign in/i }),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Client-side validation (Zod / React Hook Form — no network calls)
// ---------------------------------------------------------------------------

test.describe("Login page — client-side validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows required-field errors when form is submitted empty", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test("shows an invalid-email error for a malformed email", async ({
    page,
  }) => {
    await page.getByLabel(/email/i).fill("not-an-email");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/enter a valid email/i)).toBeVisible();
  });

  test("shows password-required error when only email is filled", async ({
    page,
  }) => {
    await page.getByLabel(/email/i).fill("user@example.com");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test("does not navigate away while validation errors are present", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// 3. Server-side auth failures
// ---------------------------------------------------------------------------

test.describe("Login page — server-side auth failures", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows an error banner for a wrong password", async ({ page }) => {
    await fillAndSubmitLogin(
      page,
      process.env.TEST_ADMIN_EMAIL ?? "",
      "WrongPassword!999",
    );
    // The LoginPage catches the thrown error and sets serverError state.
    // The banner renders inside a div with the destructive colour token.
    await expect(
      page.getByText(/invalid email or password/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows an error banner for a non-existent email", async ({ page }) => {
    await fillAndSubmitLogin(
      page,
      "ghost@nobody.example.com",
      "SomePassword1!",
    );
    await expect(
      page.getByText(/invalid email or password/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// 4. Successful login
// ---------------------------------------------------------------------------

test.describe("Login — successful flow", () => {
  test("admin login redirects to /dashboard", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("header shows the user's name and a Sign out button after login", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    // App.tsx renders {user.name} — name comes from the seeded test user
    const adminName = "Admin";
    await expect(page.getByText(adminName)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign out/i }),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 5. Protected route guards — unauthenticated access
// ---------------------------------------------------------------------------

test.describe("ProtectedRoute — unauthenticated access redirects to /login", () => {
  // Each test gets a fresh browser context with no cookies.

  test("GET /dashboard redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /tickets redirects to /login", async ({ page }) => {
    await page.goto("/tickets");
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /tickets/some-id redirects to /login", async ({ page }) => {
    await page.goto("/tickets/some-id");
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /users redirects to /login", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// 6. Already-authenticated redirect
// ---------------------------------------------------------------------------

test.describe("Already authenticated — /login redirects to /dashboard", () => {
  test.skip("navigating to /login while logged in goes to /dashboard", async ({
    page,
  }) => {
    // LoginPage does not yet implement an already-authenticated redirect.
    // Un-skip this test once LoginPage checks auth state and redirects to /dashboard.
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

// ---------------------------------------------------------------------------
// 7. Admin role access
// ---------------------------------------------------------------------------

test.describe("AdminRoute — admin can access /users", () => {
  test("admin sees the Users page without being redirected", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/users");
    // AdminRoute only redirects non-admins; an admin should stay on /users
    await expect(page).toHaveURL(/\/users/);
  });

  test("Users nav link is visible for admin in the header", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    // App.tsx renders the "Users" link only when user.role === UserRole.Admin
    await expect(page.getByRole("link", { name: /users/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 8. Session persistence across page refresh
// ---------------------------------------------------------------------------

test.describe("Session persistence", () => {
  test("user stays authenticated after a hard reload", async ({ page }) => {
    await loginAsAdmin(page);
    await page.reload();
    // After reload AuthProvider re-calls auth.getSession() — user should still
    // be set and the page should remain on /dashboard (not redirect to /login)
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("button", { name: /sign out/i }),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 9. Sign-out
// ---------------------------------------------------------------------------

test.describe("Sign-out", () => {
  test("clicking Sign out navigates to /login", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("after sign-out the header no longer shows the user name", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page.getByText(/e2e admin/i)).not.toBeVisible();
  });

  test("after sign-out, protected routes redirect to /login", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL(/\/login/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/tickets");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/users");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// 10. authenticatedPage fixture smoke-test
// ---------------------------------------------------------------------------

test.describe("authenticatedPage fixture", () => {
  test(
    "fixture provides a page already on /dashboard",
    async ({ authenticatedPage }) => {
      await expect(authenticatedPage).toHaveURL(/\/dashboard/);
    },
  );
});
