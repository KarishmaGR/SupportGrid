# Implementation Plan — AI Powered Ticket Management System

A phased, task-by-task plan. Each phase produces something testable. Phases are
roughly sequential, but Phase 5 (frontend) can start in parallel once Phase 3's
API contracts are defined.

---

## Phase 0 — Project Setup & Foundations
- [ ] Initialize monorepo (or two folders: `/server`, `/web`) with shared README.
- [ ] Set up `/server`: Node.js + Express + TypeScript, ESLint/Prettier.
- [ ] Set up `/web`: React + Vite + TypeScript, ESLint/Prettier.

## Phase 1 — Data Model & Migrations
- [ ] Define Prisma schema: `User` (role: admin/agent), `Ticket`, `Message` (email thread), `AiSuggestion` (draft reply, confidence, model used).
- [ ] Add enums: `TicketStatus` (Open/Resolved/Closed), `TicketCategory` (General/Technical/Refund), `UserRole` (Admin/Agent).
- [ ] Add indexes for ticket filtering (status, category, assignee, createdAt).
<!-- - [ ] Write seed script: create the deployed Admin user.
- [ ] Run and verify migrations. -->

## Phase 2 — Auth (Agent/Admin Console)
- [ ] Login endpoint: email + password → JWT access + refresh token.
- [ ] Refresh-token rotation endpoint; logout (revoke refresh token).
- [ ] Password hashing (bcrypt/argon2) for seeded admin and created agents.
- [ ] Auth middleware (verify JWT) + role guard (admin-only routes).
- [ ] User management endpoints (admin-only): create/list/deactivate agents.

## Phase 3 — Core Ticket API (no AI yet)
- [ ] CRUD/list endpoints for tickets with filtering + sorting + pagination.
- [ ] Ticket detail endpoint (ticket + message thread + AI suggestions).
- [ ] Update ticket status (Open/Resolved/Closed) and assignment.
- [ ] Add a reply to a ticket (manual agent reply — stored, send wired in Phase 6).
- [ ] Lock down API contract / shared types for the frontend.

## Phase 4 — Background Jobs Infrastructure
- [ ] Wire Redis + BullMQ; create queues: `classify`, `summarize`, `draft-reply`, `send-email`.
- [ ] Worker process + graceful shutdown; retry/backoff config per queue.
- [ ] Basic job dashboard or logging for observability.

## Phase 5 — Frontend Console (parallelizable after Phase 3)
- [ ] App shell: routing (React Router), TanStack Query client, auth context.
- [ ] Login page + protected routes + token refresh handling.
- [ ] Dashboard: ticket counts by status/category, recent activity.
- [ ] Ticket list: filtering, sorting, pagination.
- [ ] Ticket detail: thread view, AI summary, suggested reply, status/assignment controls.
- [ ] User management screen (admin-only).
- [ ] Pick + integrate component library (Material UI or shadcn/ui).

## Phase 6 — Email Ingestion & Sending
- [ ] Inbound webhook endpoint (SendGrid/Mailgun) → verify signature → enqueue ticket creation.
- [ ] Parse inbound email → create/append `Ticket` + `Message` (thread by subject/headers).
- [ ] Outbound send via provider API (`send-email` queue); record sent messages on the thread.
- [ ] Bounce/error handling and idempotency (dedupe repeated webhook deliveries).

## Phase 7 — AI Layer
> Models: classification/summary → **Haiku** (`claude-haiku-4-5-20251001`); drafted replies → **Opus** (`claude-opus-4-8`).
- [ ] Anthropic client wrapper (timeouts, retries, token/cost logging).
- [ ] **Classification** job: assign category + confidence score on ticket creation.
- [ ] **Summary** job: short summary of the email thread for agents.
- [ ] **Suggested reply** job: draft reply with confidence score.
- [ ] Persist model used, tokens, confidence on `AiSuggestion`.

## Phase 8 — Business Rules / Guardrails
- [ ] Refund category → always draft only, never auto-send (enforced server-side).
- [ ] General/Technical → auto-send only when confidence ≥ threshold **and** a KB answer exists.
- [ ] Low confidence (any category) → draft only, route/assign to an agent.
- [ ] Agent approval flow: review draft → edit → approve → triggers `send-email`.
- [ ] Audit log of auto-sent vs agent-approved replies.

## Phase 9 — Knowledge Base (future / RAG)
- [ ] Add `pgvector` extension + KB content tables + embeddings.
- [ ] Embed KB articles; retrieval step feeding the suggested-reply prompt.
- [ ] Gate auto-response on a retrieved KB match (ties into Phase 8 rule).

## Phase 10 — Hardening & Deploy
- [ ] Tests: unit (rules, AI wrappers), integration (auth, ticket API, webhook).
- [ ] Rate limiting, input validation, structured logging, error tracking.
- [ ] CI pipeline; production env config + secrets management.
- [ ] Deploy: server, worker, web, managed Postgres + Redis; admin seed on deploy.

---

### Suggested build order
0 → 1 → 2 → 3 → 4 → 6/7 (in parallel) → 8 → 5 (start after 3) → 9 → 10

**Critical path to a working demo:** Phases 0–3 + 5 give a usable console over
manually-created tickets. Adding 6 makes it real (email in/out). Adding 7–8
delivers the AI value proposition.
