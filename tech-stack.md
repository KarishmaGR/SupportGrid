# Tech Stack — AI Powered Ticket Management System

This is a **web application** (agent/admin console). Students never use the app — they interact only by sending support emails.

## Frontend
- **React** — UI library for the web app.
- **React Router** — client-side routing (dashboard, ticket list, ticket detail, user management).
- **Vite** — dev server and build tooling.
- **TanStack Query** — server-state/data fetching and caching against the backend API.
- **Component/UI:** a component library such as Material UI or shadcn/ui (TBD).

## Backend
- **Node.js + Express.js** — REST API server, handles inbound email webhooks and outbound replies.
- **PostgreSQL** — primary database for tickets, users, and knowledge base content.
- **Prisma** — ORM for type-safe database access and schema migrations.
- **Redis + BullMQ** — background job queue so classification, AI calls, and email sending don't block the webhook response.

## AI Layer
- **Claude (Anthropic API)**
  - **Haiku 4.5** — fast/cheap classification and summaries.
  - **Opus 4.8** — higher-quality drafted/suggested replies.
- **Knowledge base:** none yet. To be added later (likely RAG with `pgvector` in PostgreSQL once KB content exists).

## Email
- **SendGrid or Mailgun**
  - Inbound webhook → create ticket.
  - Outbound API → send replies.
- Webhook signature verification to prevent forged inbound tickets.

## Auth
- **JWT + refresh tokens** for the agent/admin console.
- Admin is seeded on deploy; admin creates and manages agents.

## Business Rules / Guardrails
- **Refund requests:** AI drafts a suggested reply but **never auto-sends** — always requires agent approval.
- **General / Technical questions:** AI may auto-respond only when confident and a KB answer exists.
- **Low confidence (any category):** draft only, route to an agent.
