import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../fixtures/index.ts";

const BASE = "http://localhost:4000/api";
const SECRET = process.env.WEBHOOK_SECRET ?? "dev-webhook-secret";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "Password@123";

function webhookPost(request: APIRequestContext, body: object, secret: string = SECRET) {
  return request.post(`${BASE}/webhooks/inbound-email`, {
    headers: { "x-webhook-secret": secret },
    data: body,
  });
}

async function getAdminCookie(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BASE}/auth/sign-in/email`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const header = res.headers()["set-cookie"] ?? "";
  return header.split(";")[0] ?? "";
}

test.describe("POST /api/webhooks/inbound-email", () => {
  test.describe("auth", () => {
    test("rejects missing secret with 401", async ({ request }) => {
      const res = await request.post(`${BASE}/webhooks/inbound-email`, {
        data: { from: "a@b.com", subject: "Hi", body: "Hello" },
      });
      expect(res.status()).toBe(401);
    });

    test("rejects wrong secret with 401", async ({ request }) => {
      const res = await webhookPost(
        request,
        { from: "a@b.com", subject: "Hi", body: "Hello" },
        "wrong-secret",
      );
      expect(res.status()).toBe(401);
    });
  });

  test.describe("validation", () => {
    test("returns 400 when subject is missing", async ({ request }) => {
      const res = await webhookPost(request, { from: "a@b.com", body: "Hello" });
      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json).toHaveProperty("error");
    });

    test("returns 400 when body is missing", async ({ request }) => {
      const res = await webhookPost(request, { from: "a@b.com", subject: "Hi" });
      expect(res.status()).toBe(400);
    });

    test("returns 400 when from is missing", async ({ request }) => {
      const res = await webhookPost(request, { subject: "Hi", body: "Hello" });
      expect(res.status()).toBe(400);
    });
  });

  test.describe("new ticket creation", () => {
    test("creates a ticket and returns 201 with created: true", async ({ request }) => {
      const subject = `E2E Test ${Date.now()}`;
      const res = await webhookPost(request, {
        from: "Jane Doe <jane@student.edu>",
        subject,
        body: "I need help with my account.",
        messageId: `msg-${Date.now()}`,
      });
      expect(res.status()).toBe(201);
      const json = await res.json();
      expect(json).toMatchObject({ created: true });
      expect(typeof json.ticketId).toBe("number");
    });

    test("ticket is visible via GET /api/tickets", async ({ request }) => {
      const subject = `Visible ${Date.now()}`;
      const webhookRes = await webhookPost(request, {
        from: "student@test.edu",
        subject,
        body: "Can you help?",
      });
      const { ticketId } = await webhookRes.json();

      const cookie = await getAdminCookie(request);
      const listRes = await request.get(`${BASE}/tickets`, {
        headers: { Cookie: cookie },
      });
      const { items } = await listRes.json();
      expect(items.some((t: { id: number }) => t.id === ticketId)).toBe(true);
    });
  });

  test.describe("from field parsing", () => {
    test("parses 'Name <email>' format correctly", async ({ request }) => {
      const subject = `Parse ${Date.now()}`;
      const webhookRes = await webhookPost(request, {
        from: "Alice Smith <alice@university.edu>",
        subject,
        body: "Hello",
      });
      const { ticketId } = await webhookRes.json();

      const cookie = await getAdminCookie(request);
      const detailRes = await request.get(`${BASE}/tickets/${ticketId}`, {
        headers: { Cookie: cookie },
      });
      const ticket = await detailRes.json();
      expect(ticket.senderName).toBe("Alice Smith");
      expect(ticket.senderEmail).toBe("alice@university.edu");
    });

    test("uses email as senderName for bare email address", async ({ request }) => {
      const subject = `BareEmail ${Date.now()}`;
      const email = `bare${Date.now()}@test.edu`;
      const webhookRes = await webhookPost(request, {
        from: email,
        subject,
        body: "Hello",
      });
      const { ticketId } = await webhookRes.json();

      const cookie = await getAdminCookie(request);
      const detailRes = await request.get(`${BASE}/tickets/${ticketId}`, {
        headers: { Cookie: cookie },
      });
      const ticket = await detailRes.json();
      expect(ticket.senderEmail).toBe(email);
    });
  });

  test.describe("thread matching", () => {
    test("Re: subject appends to existing ticket", async ({ request }) => {
      const ts = Date.now();
      const baseSubject = `Thread Test ${ts}`;
      const sender = `threader${ts}@test.edu`;

      const first = await webhookPost(request, {
        from: sender,
        subject: baseSubject,
        body: "First message",
        messageId: `thread-first-${ts}`,
      });
      const { ticketId } = await first.json();

      const second = await webhookPost(request, {
        from: sender,
        subject: `Re: ${baseSubject}`,
        body: "Follow-up",
        messageId: `thread-second-${ts}`,
        inReplyTo: `thread-first-${ts}`,
      });
      expect(second.status()).toBe(201);
      const secondJson = await second.json();
      expect(secondJson).toMatchObject({ ticketId, created: false });
    });

    test("Fwd: subject appends to existing ticket", async ({ request }) => {
      const ts = Date.now();
      const baseSubject = `Fwd Thread ${ts}`;
      const sender = `fwder${ts}@test.edu`;

      const first = await webhookPost(request, {
        from: sender,
        subject: baseSubject,
        body: "Original",
        messageId: `fwd-first-${ts}`,
      });
      const { ticketId } = await first.json();

      const fwd = await webhookPost(request, {
        from: sender,
        subject: `Fwd: ${baseSubject}`,
        body: "Forwarded",
        messageId: `fwd-second-${ts}`,
      });
      const fwdJson = await fwd.json();
      expect(fwdJson).toMatchObject({ ticketId, created: false });
    });
  });

  test.describe("dedup", () => {
    test("second POST with same messageId returns 200 duplicate: true", async ({ request }) => {
      const messageId = `dedup-${Date.now()}`;
      const payload = {
        from: "dup@test.edu",
        subject: `Dup Subject ${Date.now()}`,
        body: "Should not duplicate",
        messageId,
      };

      const first = await webhookPost(request, payload);
      expect(first.status()).toBe(201);
      expect((await first.json()).created).toBe(true);

      const second = await webhookPost(request, payload);
      expect(second.status()).toBe(200);
      expect(await second.json()).toMatchObject({ duplicate: true });
    });
  });

  test.describe("resolved ticket starts new thread", () => {
    test("same sender + subject on Resolved ticket creates a new ticket", async ({ request }) => {
      const ts = Date.now();
      const subject = `Resolve Test ${ts}`;
      const sender = `resolver${ts}@test.edu`;

      const first = await webhookPost(request, {
        from: sender,
        subject,
        body: "First time",
        messageId: `resolve-first-${ts}`,
      });
      const { ticketId: originalId } = await first.json();

      const cookie = await getAdminCookie(request);
      await request.patch(`${BASE}/tickets/${originalId}`, {
        headers: { Cookie: cookie },
        data: { status: "Resolved" },
      });

      const second = await webhookPost(request, {
        from: sender,
        subject,
        body: "Came back again",
        messageId: `resolve-second-${ts}`,
      });
      expect(second.status()).toBe(201);
      const secondJson = await second.json();
      expect(secondJson.created).toBe(true);
      expect(secondJson.ticketId).not.toBe(originalId);
    });
  });
});
