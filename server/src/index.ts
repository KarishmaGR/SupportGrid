import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.ts";
import { ticketsRouter } from "./routes/tickets.ts";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: true, credentials: true }));

// better-auth must come before express.json()
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/tickets", ticketsRouter);

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

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
