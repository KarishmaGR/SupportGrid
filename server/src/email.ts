import sgMail from "@sendgrid/mail";

const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) sgMail.setApiKey(apiKey);

export const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? "";
export const FROM_NAME  = process.env.SENDGRID_FROM_NAME  ?? "SupportGrid";

export interface SendReplyOptions {
  to: string;
  toName: string;
  subject: string;
  text: string;
  html?: string;
  /** Message-ID of the original inbound email for threading */
  inReplyToMessageId?: string | null;
}

export async function sendReply(opts: SendReplyOptions): Promise<void> {
  if (!apiKey) {
    console.warn("SENDGRID_API_KEY not set — skipping outbound email");
    return;
  }

  const headers: Record<string, string> = {};
  if (opts.inReplyToMessageId) {
    headers["In-Reply-To"] = opts.inReplyToMessageId;
    headers["References"]  = opts.inReplyToMessageId;
  }

  await sgMail.send({
    to:      { email: opts.to, name: opts.toName },
    from:    { email: FROM_EMAIL, name: FROM_NAME },
    subject: opts.subject.startsWith("Re:") ? opts.subject : `Re: ${opts.subject}`,
    text:    opts.text,
    html:    opts.html ?? opts.text.replace(/\n/g, "<br>"),
    headers,
  });
}
