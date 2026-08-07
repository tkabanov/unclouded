/**
 * Shared SendGrid v3 mail sender for platform transactional emails.
 *
 * Secrets (Supabase Edge Function env — not required until SendGrid is configured):
 * - SENDGRID_API_KEY — required to actually send
 * - SENDGRID_FROM_EMAIL — optional; default noreply@uncloud360.ai
 * - SENDGRID_FROM_NAME — optional; default Uncloud360
 */

export const DEFAULT_SENDGRID_FROM_EMAIL = "noreply@uncloud360.ai";
export const DEFAULT_SENDGRID_FROM_NAME = "Uncloud360";

export type SendGridMailResult = { ok: boolean; detail: string };

export type SendGridMailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Override From email (defaults to SENDGRID_FROM_EMAIL / noreply@uncloud360.ai). */
  fromEmail?: string;
  /** Override From display name. */
  fromName?: string;
};

export type SendGridEnv = {
  apiKey?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
};

export function readSendGridEnv(
  getEnv: (key: string) => string | undefined = (key) => Deno.env.get(key),
): SendGridEnv {
  return {
    apiKey: getEnv("SENDGRID_API_KEY"),
    fromEmail: getEnv("SENDGRID_FROM_EMAIL"),
    fromName: getEnv("SENDGRID_FROM_NAME"),
  };
}

export function isSendGridConfigured(env: SendGridEnv = readSendGridEnv()): boolean {
  return Boolean(env.apiKey?.trim());
}

/** Provider label for edge JSON responses (`smtp` field). */
export function sendGridSmtpLabel(env: SendGridEnv = readSendGridEnv()): "sendgrid" | "skipped" {
  return isSendGridConfigured(env) ? "sendgrid" : "skipped";
}

export function normalizeRecipients(to: string | string[]): string[] {
  const list = Array.isArray(to) ? to : [to];
  return list.map((entry) => entry.trim()).filter((entry) => entry.includes("@"));
}

export function resolveSendGridFrom(
  env: SendGridEnv = readSendGridEnv(),
  overrides?: { fromEmail?: string; fromName?: string },
): { email: string; name: string } {
  const email =
    overrides?.fromEmail?.trim() ||
    env.fromEmail?.trim() ||
    DEFAULT_SENDGRID_FROM_EMAIL;
  const name =
    overrides?.fromName?.trim() ||
    env.fromName?.trim() ||
    DEFAULT_SENDGRID_FROM_NAME;
  return { email, name };
}

/** Pure payload builder — safe to unit-test without Deno fetch. */
export function buildSendGridMailPayload(
  input: SendGridMailInput,
  env: SendGridEnv = readSendGridEnv(),
):
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; detail: string } {
  const recipients = normalizeRecipients(input.to);
  if (recipients.length === 0) {
    return { ok: false, detail: "smtp:skipped — no recipients" };
  }

  const from = resolveSendGridFrom(env, {
    fromEmail: input.fromEmail,
    fromName: input.fromName,
  });

  const content: Array<{ type: string; value: string }> = [];
  if (input.text?.trim()) {
    content.push({ type: "text/plain", value: input.text });
  }
  content.push({ type: "text/html", value: input.html });

  return {
    ok: true,
    body: {
      personalizations: [
        {
          to: recipients.map((email) => ({ email })),
        },
      ],
      from: { email: from.email, name: from.name },
      subject: input.subject,
      content,
    },
  };
}

/**
 * Send one transactional email via SendGrid Mail Send API.
 * When SENDGRID_API_KEY is missing, returns smtp:skipped (callers still stamp cohorts).
 */
export async function sendTransactionalEmail(
  input: SendGridMailInput,
  options?: {
    env?: SendGridEnv;
    fetchImpl?: typeof fetch;
  },
): Promise<SendGridMailResult> {
  const env = options?.env ?? readSendGridEnv();
  const apiKey = env.apiKey?.trim();
  if (!apiKey) {
    return { ok: false, detail: "smtp:skipped — SENDGRID_API_KEY not set" };
  }

  const built = buildSendGridMailPayload(input, env);
  if (!built.ok) return built;

  const fetchImpl = options?.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(built.body),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, detail: `sendgrid_error: ${res.status} ${text}` };
    }

    const recipients = normalizeRecipients(input.to);
    return {
      ok: true,
      detail: recipients.length === 1 ? "sent" : `sent:${recipients.join(",")}`,
    };
  } catch (err) {
    return {
      ok: false,
      detail: `sendgrid_error: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}
