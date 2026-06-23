# SupportGrid — AI Powered Ticket Management System

A full-stack web console for AI-assisted support ticket management.
Built as a **Bun workspace monorepo** with React, Express, and TypeScript.

See [`project-scop.md`](./project-scop.md), [`tech-stack.md`](./tech-stack.md), and
[`implementation-plan.md`](./implementation-plan.md) for the full product spec.

> **Status:** Phase 1 — Persistence. Tickets are stored in **PostgreSQL** via
> **Prisma** (database: `SupportGrid`).

## Stack

| Layer    | Tech                                                 |
| -------- | ---------------------------------------------------- |
| Runtime  | [Bun](https://bun.sh) 1.3+                            |
| Backend  | Express 4 + TypeScript, Zod validation               |
| Database | PostgreSQL + Prisma ORM                              |
| Frontend | React 18 + Vite + TypeScript, TanStack Query, Router |
| Shared   | `@supportgrid/shared` — domain types + API contract  |

## Layout

```
.
├── shared/   # @ticket/shared — types shared by server + web
├── server/   # Express REST API (Bun runtime)
└── web/      # React + Vite single-page app
```

## Getting started

```bash
bun install        # install all workspace deps

bun run dev        # run server (:4000) + web (:5173) together
# or individually:
bun run dev:server
bun run dev:web
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to the Express
server on port 4000.

## API (Phase 0)

| Method | Path                      | Description                       |
| ------ | ------------------------- | --------------------------------- |
| GET    | `/api/health`             | Health check                      |
| GET    | `/api/tickets`            | List tickets (filter/sort/paginate) |
| POST   | `/api/tickets`            | Create a ticket                   |
| GET    | `/api/tickets/:id`        | Ticket detail + message thread    |
| PATCH  | `/api/tickets/:id`        | Update status / category / assignee |
| POST   | `/api/tickets/:id/replies`| Add an agent reply                |

## Scripts

- `bun run typecheck` — type-check all workspaces
- `bun run build` — build shared, server, and web

## Next steps (see implementation-plan.md)

- Phase 1: Prisma schema + PostgreSQL migrations
- Phase 2: JWT auth + agent/admin roles
- Phase 4: Redis + BullMQ background jobs
- Phase 7: Anthropic AI layer (classification, summaries, suggested replies)
