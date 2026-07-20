import { describe, expect, it, vi } from "vitest";

import { deliverVulnerableOutreach } from "../../../../supabase/functions/_shared/vulnerableOutreachDelivery.ts";
import {
  VULNERABLE_OUTREACH_MESSAGE,
  buildVulnerableOutreachPushPayload,
} from "../../../../supabase/functions/_shared/vulnerableOutreachLogic.ts";

describe("vulnerableOutreachDelivery", () => {
  it("prefers web push when subscription exists", async () => {
    const sendPush = vi.fn(async () => ({ ok: true, detail: "push:sent" }));
    const sendEmail = vi.fn(async () => ({ ok: true, detail: "smtp:sent" }));

    vi.stubEnv("VAPID_PUBLIC_KEY", "test-public");
    vi.stubEnv("VAPID_PRIVATE_KEY", "test-private");
    vi.stubEnv("VAPID_SUBJECT", "mailto:ops@uncloud360.ai");

    const result = await deliverVulnerableOutreach({
      email: "user@example.com",
      firstName: "Alex",
      subscriptions: [
        {
          id: "sub-1",
          endpoint: "https://push.example/1",
          p256dh: "key",
          auth: "auth",
        },
      ],
      appUrl: "https://uncloud360.ai",
      sendPush,
      sendEmail,
    });

    expect(result.channel).toBe("web-push");
    expect(result.ok).toBe(true);
    expect(sendPush).toHaveBeenCalledOnce();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("falls back to email when push is unavailable", async () => {
    const sendPush = vi.fn(async () => ({ ok: false, detail: "push:expired", expired: true }));
    const sendEmail = vi.fn(async () => ({ ok: true, detail: "smtp:sent" }));

    vi.stubEnv("VAPID_PUBLIC_KEY", "test-public");
    vi.stubEnv("VAPID_PRIVATE_KEY", "test-private");
    vi.stubEnv("VAPID_SUBJECT", "mailto:ops@uncloud360.ai");

    const result = await deliverVulnerableOutreach({
      email: "user@example.com",
      firstName: "Alex",
      subscriptions: [
        {
          id: "sub-expired",
          endpoint: "https://push.example/expired",
          p256dh: "key",
          auth: "auth",
        },
      ],
      appUrl: "https://uncloud360.ai",
      sendPush,
      sendEmail,
    });

    expect(result.channel).toBe("email");
    expect(result.ok).toBe(true);
    expect(result.expiredSubscriptionIds).toEqual(["sub-expired"]);
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("uses email when no subscriptions are registered", async () => {
    const sendPush = vi.fn();
    const sendEmail = vi.fn(async () => ({ ok: true, detail: "smtp:sent" }));

    vi.stubEnv("VAPID_PUBLIC_KEY", "test-public");
    vi.stubEnv("VAPID_PRIVATE_KEY", "test-private");
    vi.stubEnv("VAPID_SUBJECT", "mailto:ops@uncloud360.ai");

    const result = await deliverVulnerableOutreach({
      email: "user@example.com",
      firstName: null,
      subscriptions: [],
      appUrl: "https://uncloud360.ai",
      sendPush,
      sendEmail,
    });

    expect(result.channel).toBe("email");
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("builds push payload with REQ-07 copy", () => {
    const payload = buildVulnerableOutreachPushPayload("https://uncloud360.ai/");
    expect(payload.body).toBe(VULNERABLE_OUTREACH_MESSAGE);
    expect(payload.url).toBe("https://uncloud360.ai/dashboard");
  });
});
