# CLAUDE.md

Project memory for the **AI Powered Ticket Management System**. Read this before working in the repo.

## Documentation — use Context7

Use the **Context7 MCP** to fetch current documentation whenever working with a library, framework, SDK, API, CLI tool, or cloud service used here — even well-known ones (React, Express, Vite, TanStack Query, React Router, Prisma, Zod, BullMQ, Bun). This covers API syntax, configuration, version migration, library-specific debugging, and setup. Use it even when you think you know the answer — training data may be stale. Prefer it over web search for library docs.

Workflow: `resolve-library-id` (unless given an exact `/org/project` id) → pick the best match → `query-docs` with the full question.

Do **not** use Context7 for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

## What this is

A web console for AI-assisted support ticket management. Students never use the app — they interact only via support emails. Agents/admins use the console. Full product spec lives in `project-scop.md`, `tech-stack.md`, and `implementation-plan.md`.

**Status:** Auth + DB foundations complete. Prisma + PostgreSQL in place. better-auth handles session management. Two seeded users exist (see Seeds section below).

## Stack

- **Runtime / package manager:** Bun 1.3+ (workspace monorepo)
- **Backend:** Express 4 + TypeScript, Zod validation — `server/`
- **Frontend:** React 18 + Vite + TypeScript, TanStack Query, React Router — `web/`
- **Shared:** `@supportgrid/shared` — domain types + API contract, imported by both — `shared/src/index.ts`
- **Auth:** `better-auth` (email/password, session cookies, JWT plugin) — `server/src/auth.ts`
- **HTTP client:** Axios — `web/src/api.ts` (two instances: `client` for `/api/*`, `authClient` for better-auth endpoints; both use `withCredentials: true`; errors are normalized in response interceptors)
- **Data fetching:** TanStack Query (`useQuery` / `useMutation`) — always use it to call `api.*` functions from components; never call `api.*` directly outside of query/mutation functions
- **UI components:** shadcn/ui (Radix-based) — `web/src/components/ui/`
- **Form validation:** React Hook Form + Zod (`@hookform/resolvers/zod`) — used in Login
- **Database:** PostgreSQL on port `5432`, accessed via Prisma ORM — DB name `SupportGrid`

## Layout

```
shared/   @supportgrid/shared — types shared by server + web (source-only, no build step)
server/   Express REST API (Bun runtime), Prisma + PostgreSQL
web/      React + Vite SPA; dev server proxies /api/* → :4000
```

## Commands

Bun is on PATH via `~/.zshrc` — open a fresh shell or `source ~/.zshrc` if `bun` is missing.

```bash
bun install        # install all workspace deps
bun run dev        # run server (:4000) + web (:5173) together
bun run dev:server # API only
bun run dev:web    # web only
bun run typecheck  # type-check shared + server + web
bun run build      # production build of all workspaces
```

Web: http://localhost:5173 · API: http://localhost:4000 · health: `GET /api/health`

## Authentication flow

- Login page: `web/src/pages/Login.tsx` — React Hook Form + Zod, posts to `better-auth` via `web/src/api.ts` (`auth.signIn`)
- Session stored as a cookie; `auth.getSession()` called on app load in `AuthProvider` (`web/src/auth.tsx`)
- After login → redirects to `/dashboard`
- `ProtectedRoute` (`web/src/ProtectedRoute.tsx`) — redirects unauthenticated users to `/login`
- `AdminRoute` (`web/src/AdminRoute.tsx`) — redirects non-admins to `/dashboard`; checks `user.role === UserRole.Admin`
- `UserRole` enum lives in `shared/src/index.ts` — always use it instead of hardcoding role strings

## Roles

| Role | Value (`UserRole`) | Access |
|------|--------------------|--------|
| Admin | `UserRole.Admin` = `"Admin"` | All routes including `/users` |
| Agent | `UserRole.Agent` | All routes except `/users` |

## Seeds

Run from the `server/` directory:

```bash
# Admin user
SEED_ADMIN_EMAIL=<email> SEED_ADMIN_PASSWORD=<password> bun run src/generate/prisma/seed.ts


```

To inspect DB tables in the browser:
```bash
cd server && bunx prisma studio   # opens http://localhost:5555
```

## Routing (web)

| Path | Component | Guard |
|------|-----------|-------|
| `/login` | `LoginPage` | public |
| `/dashboard` | `Dashboard` | auth |
| `/tickets` | `TicketList` | auth |
| `/tickets/:id` | `TicketDetailPage` | auth |
| `/users` | `UsersPage` | admin only |

## Conventions

- TypeScript is `strict` with `noUncheckedIndexedAccess`. Bun resolves `.ts` import extensions directly (`allowImportingTsExtensions` in `tsconfig.base.json`) — keep explicit `.ts` extensions on relative imports in `server/`.
- Shared types are the source of truth for the API contract — update `shared/src/index.ts` first, then server and web.
- Validate all request bodies/queries with Zod in `server/src/routes/`.

## Component Testing

Use **Vitest + React Testing Library** for component-level tests in the `web/` workspace.

```bash
bun run --cwd web test        # run all component tests once
bun run --cwd web test:watch  # watch mode
```

- Test files go in `web/src/test/*.test.tsx`
- Import `describe`, `it`, `expect`, `vi`, `beforeEach` from `vitest` (globals are enabled — no explicit import needed, but be explicit for clarity)
- Render with a fresh `QueryClient` per test — use a local `renderWithQuery` helper that wraps the component in `QueryClientProvider` with `retry: false`
- Always mock `../api.ts` with `vi.mock` — tests must never hit the network
- Clear mocks in `beforeEach` with `vi.clearAllMocks()`
- Use `waitFor` from `@testing-library/react` to assert after async data loads
- Setup file: `web/src/test/setup.ts` (imports `@testing-library/jest-dom` — do not remove)

**What to cover in every page/component test:**
1. Loading state (skeleton or spinner visible)
2. Successful data render (key fields appear)
3. Column/section headers
4. Badges or status indicators
5. Error state (error message shown)
6. Empty state (no rows / empty list)

## E2E Testing

Use the **`e2e-test-writer` agent** to write Playwright tests after implementing any new page, route, or significant feature.

```bash
bun run test:e2e       # run all tests headlessly
bun run test:e2e:ui    # open Playwright UI
```

- Test files go in `e2e/tests/*.spec.ts`
- Import `test` and `expect` from `../fixtures/index.ts` (not directly from `@playwright/test`)
- Always use `SupportGrid_test` database for tests — never the dev `SupportGrid` DB
- Test DB config lives in `e2e/.env.test` (gitignored); `global-setup.ts` runs migrations + seeds automatically
- Test admin: `admin@e2e.test` / `E2ePassword@123` (read from `process.env.TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD`)
- Rate limiting is disabled in dev/test — only active when `NODE_ENV=production`

## Roadmap

See `implementation-plan.md`. Phase 0 (auth + DB) done. Next: Phase 4 (Redis + BullMQ), Phase 7 (Anthropic AI: classification, summaries, suggested replies — Haiku for classify/summary, Opus for drafted replies).
