import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  isNativePushConfigured,
  resetNativePushDeliveryForTests,
  sendNativePushToSubscription,
} from "../../../../supabase/functions/_shared/nativePushDelivery.ts";

function toPem(der: ArrayBuffer): string {
  const bytes = new Uint8Array(der);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = btoa(binary);
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----\n`;
}

let privateKeyPem: string;

beforeAll(async () => {
  const keyPair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  privateKeyPem = toPem(pkcs8);
});

function stubServiceAccountEnv() {
  vi.stubEnv(
    "FCM_SERVICE_ACCOUNT_JSON",
    JSON.stringify({
      project_id: "test-project",
      client_email: "test@test-project.iam.gserviceaccount.com",
      private_key: privateKeyPem,
    }),
  );
}

function mockFetchSequence(tokenStatus: number, sendStatus: number, sendBody: unknown) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes("oauth2.googleapis.com")) {
      return new Response(JSON.stringify({ access_token: "test-access-token", expires_in: 3600 }), {
        status: tokenStatus,
      });
    }
    return new Response(JSON.stringify(sendBody), { status: sendStatus });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const payload = { title: "Hello", body: "World", url: "https://uncloud360.ai/dashboard" };

describe("nativePushDelivery", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetNativePushDeliveryForTests();
  });

  it("isNativePushConfigured is false without the secret", () => {
    expect(isNativePushConfigured()).toBe(false);
  });

  it("isNativePushConfigured is true with a valid service account JSON", () => {
    stubServiceAccountEnv();
    expect(isNativePushConfigured()).toBe(true);
  });

  it("returns skipped (not a throw) when the FCM secret is missing", async () => {
    const result = await sendNativePushToSubscription(
      { id: "n1", deviceToken: "tok", platform: "ios" },
      payload,
    );
    expect(result).toEqual({ ok: false, detail: "push:skipped — FCM_SERVICE_ACCOUNT_JSON not set" });
  });

  it("sends successfully and builds the FCM v1 message shape", async () => {
    stubServiceAccountEnv();
    const fetchMock = mockFetchSequence(200, 200, { name: "projects/test-project/messages/1" });

    const result = await sendNativePushToSubscription(
      { id: "n1", deviceToken: "tok-abc", platform: "android" },
      payload,
    );

    expect(result).toEqual({ ok: true, detail: "push:sent" });

    const sendCall = fetchMock.mock.calls.find(([url]) => url.includes("fcm.googleapis.com"));
    expect(sendCall?.[0]).toBe(
      "https://fcm.googleapis.com/v1/projects/test-project/messages:send",
    );
    const sentBody = JSON.parse((sendCall?.[1] as RequestInit).body as string);
    expect(sentBody.message).toMatchObject({
      token: "tok-abc",
      notification: { title: "Hello", body: "World" },
      data: { url: "https://uncloud360.ai/dashboard" },
      android: { notification: { channel_id: "uncloud360_default" } },
      apns: { payload: { aps: { sound: "default", badge: 1 } } },
    });
  });

  it("marks UNREGISTERED as an invalid token for deletion", async () => {
    stubServiceAccountEnv();
    mockFetchSequence(200, 404, {
      error: { code: 404, status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] },
    });

    const result = await sendNativePushToSubscription(
      { id: "n1", deviceToken: "dead-token", platform: "ios" },
      payload,
    );

    expect(result.ok).toBe(false);
    expect(result.invalidToken).toBe(true);
  });

  it("marks INVALID_ARGUMENT as an invalid token for deletion", async () => {
    stubServiceAccountEnv();
    mockFetchSequence(200, 400, {
      error: { code: 400, status: "INVALID_ARGUMENT", details: [{ errorCode: "INVALID_ARGUMENT" }] },
    });

    const result = await sendNativePushToSubscription(
      { id: "n1", deviceToken: "malformed-token", platform: "ios" },
      payload,
    );

    expect(result.invalidToken).toBe(true);
  });

  it("does not mark a transient error (e.g. UNAVAILABLE) as invalid", async () => {
    stubServiceAccountEnv();
    mockFetchSequence(200, 503, {
      error: { code: 503, status: "UNAVAILABLE", details: [{ errorCode: "UNAVAILABLE" }] },
    });

    const result = await sendNativePushToSubscription(
      { id: "n1", deviceToken: "tok", platform: "ios" },
      payload,
    );

    expect(result.ok).toBe(false);
    expect(result.invalidToken).toBeUndefined();
  });
});
