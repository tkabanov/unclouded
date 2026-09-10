import { describe, expect, it, vi } from "vitest";

import { fanOutPushToSubscriptions } from "../../../../supabase/functions/_shared/pushFanout.ts";

const payload = { title: "t", body: "b", url: "https://example.com/dashboard" };

describe("fanOutPushToSubscriptions", () => {
  it("calls both senders for a mix of web and native rows", async () => {
    const sendWebPush = vi.fn(async () => ({ ok: true, detail: "push:sent" }));
    const sendNativePush = vi.fn(async () => ({ ok: true, detail: "push:sent" }));

    const result = await fanOutPushToSubscriptions(
      [
        { id: "w1", platform: "web", endpoint: "https://p/1", p256dh: "k", auth: "a", deviceToken: null },
        { id: "n1", platform: "ios", endpoint: null, p256dh: null, auth: null, deviceToken: "tok" },
      ],
      payload,
      { sendWebPush, sendNativePush },
    );

    expect(sendWebPush).toHaveBeenCalledWith(
      { id: "w1", endpoint: "https://p/1", p256dh: "k", auth: "a" },
      payload,
    );
    expect(sendNativePush).toHaveBeenCalledWith({ id: "n1", deviceToken: "tok", platform: "ios" }, payload);
    expect(result.ok).toBe(true);
    expect(result.sentCount).toBe(2);
    expect(result.results).toHaveLength(2);
  });

  it("a native-only user never calls the web sender", async () => {
    const sendWebPush = vi.fn();
    const sendNativePush = vi.fn(async () => ({ ok: true, detail: "push:sent" }));

    const result = await fanOutPushToSubscriptions(
      [{ id: "n1", platform: "android", endpoint: null, p256dh: null, auth: null, deviceToken: "tok" }],
      payload,
      { sendWebPush, sendNativePush },
    );

    expect(sendWebPush).not.toHaveBeenCalled();
    expect(sendNativePush).toHaveBeenCalledOnce();
    expect(result.ok).toBe(true);
  });

  it("a web-only user never calls the native sender", async () => {
    const sendWebPush = vi.fn(async () => ({ ok: true, detail: "push:sent" }));
    const sendNativePush = vi.fn();

    const result = await fanOutPushToSubscriptions(
      [{ id: "w1", platform: "web", endpoint: "https://p/1", p256dh: "k", auth: "a", deviceToken: null }],
      payload,
      { sendWebPush, sendNativePush },
    );

    expect(sendNativePush).not.toHaveBeenCalled();
    expect(sendWebPush).toHaveBeenCalledOnce();
    expect(result.ok).toBe(true);
  });

  it("a missing FCM secret is reported as a skipped send, not an exception", async () => {
    const sendWebPush = vi.fn();
    // Mirrors what sendNativePushToSubscription itself returns when
    // FCM_SERVICE_ACCOUNT_JSON is unset — pushFanout must not throw either way.
    const sendNativePush = vi.fn(async () => ({
      ok: false,
      detail: "push:skipped — FCM_SERVICE_ACCOUNT_JSON not set",
    }));

    const result = await fanOutPushToSubscriptions(
      [{ id: "n1", platform: "ios", endpoint: null, p256dh: null, auth: null, deviceToken: "tok" }],
      payload,
      { sendWebPush, sendNativePush },
    );

    expect(result.ok).toBe(false);
    expect(result.sentCount).toBe(0);
    expect(result.results[0]).toMatchObject({ ok: false, channel: "native-push" });
    expect(result.invalidSubscriptionIds).toEqual([]);
  });

  it("an invalid-token native response is reported for deletion", async () => {
    const sendWebPush = vi.fn();
    const sendNativePush = vi.fn(async () => ({
      ok: false,
      detail: "push:expired — UNREGISTERED",
      invalidToken: true,
    }));

    const result = await fanOutPushToSubscriptions(
      [{ id: "n1", platform: "ios", endpoint: null, p256dh: null, auth: null, deviceToken: "tok" }],
      payload,
      { sendWebPush, sendNativePush },
    );

    expect(result.invalidSubscriptionIds).toEqual(["n1"]);
  });

  it("an expired web response is reported for deletion", async () => {
    const sendWebPush = vi.fn(async () => ({
      ok: false,
      detail: "push:expired — 410",
      expired: true,
    }));
    const sendNativePush = vi.fn();

    const result = await fanOutPushToSubscriptions(
      [{ id: "w1", platform: "web", endpoint: "https://p/1", p256dh: "k", auth: "a", deviceToken: null }],
      payload,
      { sendWebPush, sendNativePush },
    );

    expect(result.invalidSubscriptionIds).toEqual(["w1"]);
  });

  it("skips a native row with no device token instead of calling the sender", async () => {
    const sendWebPush = vi.fn();
    const sendNativePush = vi.fn();

    const result = await fanOutPushToSubscriptions(
      [{ id: "n1", platform: "ios", endpoint: null, p256dh: null, auth: null, deviceToken: null }],
      payload,
      { sendWebPush, sendNativePush },
    );

    expect(sendNativePush).not.toHaveBeenCalled();
    expect(result.results).toHaveLength(0);
  });

  it("returns ok:false with no results for an empty subscription list", async () => {
    const result = await fanOutPushToSubscriptions([], payload, {
      sendWebPush: vi.fn(),
      sendNativePush: vi.fn(),
    });

    expect(result).toEqual({ ok: false, sentCount: 0, results: [], invalidSubscriptionIds: [] });
  });
});
