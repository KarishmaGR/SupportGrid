import { readFileSync } from "fs";
import { join } from "path";
import OpenAI from "openai";
import { type Job } from "pg-boss";
import { boss, QUEUE_AUTO_RESOLVE_TICKET } from "../queue.ts";
import * as store from "../store.ts";

export interface AutoResolveTicketJob {
  ticketId: number;
  subject: string;
  body: string;
}

const knowledgeBase = readFileSync(
  join(import.meta.dir, "../../knowledge-base.md"),
  "utf-8",
);

const SYSTEM_PROMPT = `You are a support agent for Code with Mosh. You have access to the official support knowledge base below.

Your job: decide if the customer's ticket can be fully answered using ONLY the knowledge base. If yes, write a clear, polite reply. If no, respond with null.

Rules:
- Only use information from the knowledge base. Do not invent policies.
- If the ticket requires human judgement, account-specific details, or is not covered, respond with null.
- Keep replies concise and friendly. Sign off as "SupportGrid AI".

Knowledge Base:
${knowledgeBase}

Respond with JSON only — no markdown fences:
{ "canResolve": true, "reply": "..." }
or
{ "canResolve": false, "reply": null }`;

export async function registerAutoResolveTicketWorker() {
  await boss.createQueue(QUEUE_AUTO_RESOLVE_TICKET);
  await boss.work<AutoResolveTicketJob>(
    QUEUE_AUTO_RESOLVE_TICKET,
    async (jobs: Job<AutoResolveTicketJob>[]) => {
      const job = jobs[0]!;
      const { ticketId, subject, body } = job.data;

      await store.markProcessing(ticketId);

      const openai = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      });

      const completion = await openai.chat.completions.create({
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Subject: ${subject}\n\n${body}` },
        ],
      });

      const raw = completion.choices[0]?.message.content?.trim() ?? "";
      let parsed: { canResolve: boolean; reply: string | null };
      try {
        parsed = JSON.parse(raw);
      } catch {
        await store.markOpen(ticketId);
        return;
      }

      if (parsed.canResolve && parsed.reply) {
        await store.markAiResolved(ticketId, parsed.reply);
      } else {
        await store.markOpen(ticketId);
      }
    },
  );
}
