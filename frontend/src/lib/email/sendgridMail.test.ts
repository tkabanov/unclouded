import { describe, expect, it, vi } from "vitest";
import {
  buildSendGridMailPayload,
  DEFAULT_SENDGRID_FROM_EMAIL,
  DEFAULT_SENDGRID_FROM_NAME,
  isSendGridConfigured,
  sendGridSmtpLabel,
  sendTransactionalEmail,
} from "../../../../supabase/functions/_shared/sendgridMail.ts";

describe("sendgridMail", () => {
  it("builds SendGrid v3 payload with from defaults", () => {
    const built = buildSendGridMailPayload(
      {
        to: "member@example.com",
        subject: "Hello",
        html: "<p>Hi</p>",
      },
      {},
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.body.from).toEqual({
      email: DEFAULT_SENDGRID_FROM_EMAIL,
      name: DEFAULT_SENDGRID_FROM_NAME,
    });
    expect(built.body.personalizations).toEqual([
      { to: [{ email: "member@example.com" }] },
    ]);
    expect(built.body.subject).toBe("Hello");
    expect(built.body.content).toEqual([{ type: "text/html", value: "<p>Hi</p>" }]);
  });

  it("skips send when API key is missing", async () => {
    const result = await sendTransactionalEmail(
      { to: "a@b.com", subject: "x", html: "<p>x</p>" },
      { env: {} },
    );
    expect(result).toEqual({
      ok: false,
      detail: "smtp:skipped — SENDGRID_API_KEY not set",
    });
    expect(isSendGridConfigured({})).toBe(false);
    expect(sendGridSmtpLabel({})).toBe("skipped");
  });

  it("posts to SendGrid mail send when keyed", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 202 }));
    const result = await sendTransactionalEmail(
      {
        to: ["coach@pup.com", "ops@uncloud360.ai"],
        subject: "Brief",
        html: "<p>Brief</p>",
      },
      {
        env: { apiKey: "SG.test", fromEmail: "noreply@uncloud360.ai", fromName: "Uncloud360" },
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    );
    expect(result.ok).toBe(true);
    expect(result.detail).toBe("sent:coach@pup.com,ops@uncloud360.ai");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.sendgrid.com/v3/mail/send");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer SG.test",
    });
  });

  it("surfaces SendGrid HTTP errors", async () => {
    const fetchImpl = vi.fn(
      async () => new Response('{"errors":[{"message":"bad"}]}', { status: 401 }),
    );
    const result = await sendTransactionalEmail(
      { to: "a@b.com", subject: "x", html: "<p>x</p>" },
      {
        env: { apiKey: "SG.test" },
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    );
    expect(result.ok).toBe(false);
    expect(result.detail).toContain("sendgrid_error: 401");
  });
});
