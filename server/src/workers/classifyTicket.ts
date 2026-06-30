import OpenAI from "openai";
import { type Job } from "pg-boss";
import { TicketCategory } from "@supportgrid/shared";
import { boss, QUEUE_CLASSIFY_TICKET } from "../queue.ts";
import * as store from "../store.ts";

export interface ClassifyTicketJob {
  ticketId: number;
  subject: string;
  body: string;
}

export async function registerClassifyTicketWorker() {
  await boss.createQueue(QUEUE_CLASSIFY_TICKET);
  await boss.work<ClassifyTicketJob>(QUEUE_CLASSIFY_TICKET, async (jobs: Job<ClassifyTicketJob>[]) => {
    const job = jobs[0]!;
    const { ticketId, subject, body } = job.data;
    const openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });
    const completion = await openai.chat.completions.create({
      model: "nvidia/nemotron-3-super-120b-a12b:free",
      messages: [
        {
          role: "system",
          content: `Classify the support ticket into exactly one of these categories: ${Object.values(TicketCategory).join(", ")}. Reply with only the category name — nothing else.`,
        },
        { role: "user", content: `Subject: ${subject}\n\n${body}` },
      ],
    });
    const raw = completion.choices[0]?.message.content?.trim() ?? "";
    const category = Object.values(TicketCategory).find(
      (c) => c.toLowerCase() === raw.toLowerCase(),
    );
    if (category) {
      await store.updateTicket(ticketId, { category });
    }
  });
}
