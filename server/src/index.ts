import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.ts";
import { ticketsRouter } from "./routes/tickets.ts";
import { usersRouter } from "./routes/users.ts";
import { webhooksRouter } from "./routes/webhooks.ts";
import { boss } from "./queue.ts";
import { registerClassifyTicketWorker } from "./workers/classifyTicket.ts";
import { registerAutoResolveTicketWorker } from "./workers/autoResolveTicket.ts";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(helmet());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
      else cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

if (process.env.NODE_ENV === "production") {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  });
  app.use("/api/auth/sign-in", authLimiter);
}

// better-auth must come before express.json()
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/tickets", ticketsRouter);
app.use("/api/users", usersRouter);
app.use("/api", webhooksRouter);

// Serve the Vite build in production. The web package builds to ../web/dist
// relative to the server package root.
if (process.env.NODE_ENV === "production") {
  const webDist = path.resolve(import.meta.dirname, "../../web/dist");
  app.use(express.static(webDist));
  // SPA fallback — all non-API routes return index.html
  app.get("*", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

// Centralized error handler.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  },
);

boss
  .start()
  .then(() => Promise.all([registerClassifyTicketWorker(), registerAutoResolveTicketWorker()]))
  .catch(console.error);

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
