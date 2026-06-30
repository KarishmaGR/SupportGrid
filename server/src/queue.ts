import { PgBoss } from "pg-boss";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for pg-boss");

export const boss = new PgBoss(DATABASE_URL);

boss.on("error", (err: unknown) => console.error("[pg-boss]", err));

export const QUEUE_CLASSIFY_TICKET = "classify-ticket";
export const QUEUE_AUTO_RESOLVE_TICKET = "auto-resolve-ticket";
