---
name: project-e2e-setup
description: E2E infrastructure overview — config, fixtures, global setup, credentials, and directory layout
metadata:
  type: project
---

## Playwright config

- Config file: `playwright.config.ts` at monorepo root (not inside `e2e/`)
- `testDir`: `./e2e/tests` (relative to `playwright.config.ts`)
- `globalSetup`: `./e2e/global-setup.ts` — runs Prisma migrations and seeds the test admin user via raw SQL
- `baseURL`: `http://localhost:5173` (read from `BASE_URL` env var, falls back to default)
- `retries: 1`, `fullyParallel: false`
- Single project: `chromium`
- `webServer` starts both Express (`:4000`) and Vite (`:5173`); `reuseExistingServer` is true unless `CI=true`
- Env vars loaded from `e2e/.env.test` via dotenv

## Fixtures

- `e2e/fixtures/auth.ts` — exports `test` (extended with `authenticatedPage` fixture) and re-exports `expect`
- `e2e/fixtures/index.ts` — re-exports from `./auth.ts`; tests import from `../fixtures/index.ts`
- `authenticatedPage` fixture: navigates to `/login`, fills credentials from env vars, waits for `/dashboard`, saves `storageState` to `e2e/.auth/admin.json`, then yields the page

## Test users

- Admin: `process.env.TEST_ADMIN_EMAIL` / `process.env.TEST_ADMIN_PASSWORD` (set in `e2e/.env.test`)
- No agent user seeded yet — only admin exists in the test DB
- Global setup seeds the admin if not present; safe to run repeatedly

## Credential convention

Never hardcode credentials. Always read `process.env.TEST_ADMIN_EMAIL` and `process.env.TEST_ADMIN_PASSWORD`.

**Why:** Credentials are environment-specific and must not appear in source control.
**How to apply:** Every login helper must use env vars; fail loudly with `?? ""` only as a fallback to surface missing-env issues via auth error, not a crash.

## Key selectors (Login page)

- Email field: `getByLabel(/email/i)` — `<Label htmlFor="email">` + `<Input id="email">`
- Password field: `getByLabel(/password/i)` — `<Label htmlFor="password">` + `<Input id="password">`
- Submit button: `getByRole("button", { name: /sign in/i })`
- Server error banner: `getByText(/invalid email or password/i)` — rendered in a `<div>` with destructive colour classes
- Client validation errors: `getByText(/email is required/i)`, `getByText(/password is required/i)`, `getByText(/enter a valid email/i)`

## Route guard behaviour

- `ProtectedRoute`: if `isLoading` → renders null; if no user → `<Navigate to="/login" replace />`
- `AdminRoute`: if `isLoading` → renders null; if no user or role !== "Admin" → `<Navigate to="/dashboard" replace />`
- Already-authenticated users visiting `/login` should be redirected to `/dashboard` (handled by app routing logic)
- Sign-out: `auth.signOut()` → sets user to null → `navigate("/login")`

## Auth spec location

`e2e/tests/auth.spec.ts` — comprehensive auth coverage; replaces the skeletal `login.spec.ts`
