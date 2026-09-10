import { describe, expect, it, vi } from "vitest";

import { deliverVulnerableOutreach } from "../../../../supabase/functions/_shared/vulnerableOutreachDelivery.ts";
import {
  VULNERABLE_OUTREACH_MESSAGE,
  buildVulnerableOutreachPushPayload,
} from "../../../../supabase/functions/_shared/vulnerableOutreachLogic.ts";

function stubVapidEnv() {
  vi.stubEnv("VAPID_PUBLIC_KEY", "test-public");
  vi.stubEnv("VAPID_PRIVATE_KEY", "test-private");
  vi.stubEnv("VAPID_SUBJECT", "mailto:ops@uncloud360.ai");
}

describe("vulnerableOutreachDelivery", () => {
  it("prefers web push when subscription exists", async () => {
    const sendPush = vi.fn(async () => ({ ok: true, detail: "push:sent" }));
    const sendNativePush = vi.fn();
    const sendEmail = vi.fn(async () => ({ ok: true, detail: "smtp:sent" }));

    stubVapidEnv();

    const result = await deliverVulnerableOutreach({
      email: "user@example.com",
      firstName: "Alex",
      subscriptions: [
        {
          id: "sub-1",
          platform: "web",
          endpoint: "https://push.example/1",
          p256dh: "key",
          auth: "auth",
          deviceToken: null,
        },
      ],
      appUrl: "https://uncloud360.ai",
      sendPush,
      sendNativePush,
      sendEmail,
    });

    expect(result.channel).toBe("web-push");
    expect(result.ok).toBe(true);
    expect(sendPush).toHaveBeenCalledOnce();
    expect(sendNativePush).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("falls back to email when push is unavailable", async () => {
    const sendPush = vi.fn(async () => ({ ok: false, detail: "push:expired", expired: true }));
    const sendNativePush = vi.fn();
    const sendEmail = vi.fn(async () => ({ ok: true, detail: "smtp:sent" }));

    stubVapidEnv();

    const result = await deliverVulnerableOutreach({
      email: "user@example.com",
      firstName: "Alex",
      subscriptions: [
        {
          id: "sub-expired",
          platform: "web",
          endpoint: "https://push.example/expired",
          p256dh: "key",
          auth: "auth",
          deviceToken: null,
        },
      ],
      appUrl: "https://uncloud360.ai",
      sendPush,
      sendNativePush,
      sendEmail,
    });

    expect(result.channel).toBe("email");
    expect(result.ok).toBe(true);
    expect(result.expiredSubscriptionIds).toEqual(["sub-expired"]);
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("uses email when no subscriptions are registered", async () => {
    const sendPush = vi.fn();
    const sendNativePush = vi.fn();
    const sendEmail = vi.fn(async () => ({ ok: true, detail: "smtp:sent" }));

    stubVapidEnv();

    const result = await deliverVulnerableOutreach({
      email: "user@example.com",
      firstName: null,
      subscriptions: [],
      appUrl: "https://uncloud360.ai",
      sendPush,
      sendNativePush,
      sendEmail,
    });

    expect(result.channel).toBe("email");
    expect(sendPush).not.toHaveBeenCalled();
    expect(sendNativePush).not.toHaveBeenCalled();
  });

  it("MOB-10: a native-only user is delivered by native push, web sender never called", async () => {
    const sendPush = vi.fn();
    const sendNativePush = vi.fn(async () => ({ ok: true, detail: "push:sent" }));
    const sendEmail = vi.fn(async () => ({ ok: true, detail: "smtp:sent" }));

    stubVapidEnv();

    const result = await deliverVulnerableOutreach({
      email: "user@example.com",
      firstName: "Alex",
      subscriptions: [
        {
          id: "sub-native",
          platform: "ios",
          endpoint: null,
          p256dh: null,
          auth: null,
          deviceToken: "fcm-token",
        },
      ],
      appUrl: "https://uncloud360.ai",
      sendPush,
      sendNativePush,
      sendEmail,
    });

    expect(result.channel).toBe("native-push");
    expect(result.ok).toBe(true);
    expect(sendPush).not.toHaveBeenCalled();
    expect(sendNativePush).toHaveBeenCalledOnce();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("MOB-10: a mixed web+native user calls both senders", async () => {
    const sendPush = vi.fn(async () => ({ ok: true, detail: "push:sent" }));
    const sendNativePush = vi.fn(async () => ({ ok: true, detail: "push:sent" }));
    const sendEmail = vi.fn();

    stubVapidEnv();

    const result = await deliverVulnerableOutreach({
      email: "user@example.com",
      firstName: "Alex",
      subscriptions: [
        {
          id: "sub-web",
          platform: "web",
          endpoint: "https://push.example/1",
          p256dh: "key",
          auth: "auth",
          deviceToken: null,
        },
        {
          id: "sub-native",
          platform: "android",
          endpoint: null,
          p256dh: null,
          auth: null,
          deviceToken: "fcm-token",
        },
      ],
      appUrl: "https://uncloud360.ai",
      sendPush,
      sendNativePush,
      sendEmail,
    });

    expect(result.ok).toBe(true);
    expect(sendPush).toHaveBeenCalledOnce();
    expect(sendNativePush).toHaveBeenCalledOnce();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("MOB-10: an invalid native token is reported for deletion", async () => {
    const sendPush = vi.fn();
    const sendNativePush = vi.fn(async () => ({
      ok: false,
      detail: "push:expired — UNREGISTERED",
      invalidToken: true,
    }));
    const sendEmail = vi.fn(async () => ({ ok: true, detail: "smtp:sent" }));

    stubVapidEnv();

    const result = await deliverVulnerableOutreach({
      email: "user@example.com",
      firstName: "Alex",
      subscriptions: [
        {
          id: "sub-dead-token",
          platform: "ios",
          endpoint: null,
          p256dh: null,
          auth: null,
          deviceToken: "stale-token",
        },
      ],
      appUrl: "https://uncloud360.ai",
      sendPush,
      sendNativePush,
      sendEmail,
    });

    expect(result.channel).toBe("email");
    expect(result.expiredSubscriptionIds).toEqual(["sub-dead-token"]);
  });

  it("builds push payload with REQ-07 copy", () => {
    const payload = buildVulnerableOutreachPushPayload("https://uncloud360.ai/");
    expect(payload.body).toBe(VULNERABLE_OUTREACH_MESSAGE);
    expect(payload.url).toBe("https://uncloud360.ai/dashboard");
  });
});
