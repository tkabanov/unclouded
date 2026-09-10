/**
 * Native (iOS/Android) push delivery via FCM HTTP v1. APNs delivery for iOS
 * goes through FCM's `apns` payload block — there is no separate APNs key
 * path; FCM handles the APNs connection using the Firebase project's
 * configured APNs auth key.
 *
 * Credential: `FCM_SERVICE_ACCOUNT_JSON` edge secret — the full JSON key
 * downloaded for a Firebase service account with the
 * "Firebase Cloud Messaging API" role (Project settings → Service accounts →
 * Generate new private key). Never committed; read only from
 * `Deno.env`/`process.env` at runtime, exactly like the VAPID keys in
 * `webPushEnv.ts`.
 */
import type { WebPushPayload } from "./webPushDelivery.ts";

export type NativePushSubscriptionRow = {
  id: string;
  deviceToken: string;
  platform: "ios" | "android";
};

export type NativePushSendResult = {
  ok: boolean;
  detail: string;
  invalidToken?: boolean;
};

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function trimEnv(name: string): string | null {
  const denoValue = typeof Deno !== "undefined" ? Deno.env.get(name)?.trim() : undefined;
  const nodeValue = typeof process !== "undefined" ? process.env[name]?.trim() : undefined;
  const value = denoValue ?? nodeValue;
  return value || null;
}

function parseServiceAccount(): ServiceAccount | null {
  const raw = trimEnv("FCM_SERVICE_ACCOUNT_JSON");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return parsed as ServiceAccount;
  } catch {
    return null;
  }
}

export function isNativePushConfigured(): boolean {
  return parseServiceAccount() !== null;
}

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncode(new TextEncoder().encode(value));
}

function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function signJwtAssertion(account: ServiceAccount): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: account.client_email,
    scope: FCM_SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: nowSec,
    exp: nowSec + 3600,
  };

  const unsigned = `${base64UrlEncodeString(JSON.stringify(header))}.${base64UrlEncodeString(
    JSON.stringify(claims),
  )}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );

  return `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;
}

let cachedToken: { value: string; expiresAtMs: number; projectId: string } | null = null;

/** Mints an FCM OAuth access token, cached in-module like `webPushDelivery`'s VAPID config. */
async function getFcmAccessToken(account: ServiceAccount): Promise<string> {
  const now = Date.now();
  if (
    cachedToken &&
    cachedToken.projectId === account.project_id &&
    cachedToken.expiresAtMs > now + 60_000
  ) {
    return cachedToken.value;
  }

  const assertion = await signJwtAssertion(account);
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`FCM token exchange failed: ${response.status}`);
  }

  const body = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: body.access_token,
    expiresAtMs: now + body.expires_in * 1000,
    projectId: account.project_id,
  };
  return cachedToken.value;
}

/** Android channel id — must match `ANDROID_PUSH_CHANNEL_ID` in `nativePushRegistration.ts`. */
const ANDROID_CHANNEL_ID = "uncloud360_default";

function buildFcmMessage(row: NativePushSubscriptionRow, payload: WebPushPayload) {
  return {
    message: {
      token: row.deviceToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        url: payload.url,
      },
      android: {
        notification: {
          channel_id: ANDROID_CHANNEL_ID,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    },
  };
}

/** True for FCM error codes meaning the token will never work again. */
function isUnregisteredOrInvalid(errorCode: unknown): boolean {
  return errorCode === "UNREGISTERED" || errorCode === "INVALID_ARGUMENT";
}

export async function sendNativePushToSubscription(
  row: NativePushSubscriptionRow,
  payload: WebPushPayload,
): Promise<NativePushSendResult> {
  const account = parseServiceAccount();
  if (!account) {
    return { ok: false, detail: "push:skipped — FCM_SERVICE_ACCOUNT_JSON not set" };
  }

  try {
    const accessToken = await getFcmAccessToken(account);
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildFcmMessage(row, payload)),
      },
    );

    if (response.ok) {
      return { ok: true, detail: "push:sent" };
    }

    const errorBody = (await response.json().catch(() => null)) as {
      error?: { status?: string; details?: Array<{ errorCode?: string }> };
    } | null;
    const errorCode = errorBody?.error?.details?.find((d) => d.errorCode)?.errorCode;

    if (isUnregisteredOrInvalid(errorCode)) {
      return {
        ok: false,
        detail: `push:expired — ${errorCode}`,
        invalidToken: true,
      };
    }

    const status = errorBody?.error?.status ?? response.status;
    return { ok: false, detail: `push:error — ${status}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: `push:error — ${message}` };
  }
}

/** Test-only: clear the cached OAuth token between cases. */
export function resetNativePushDeliveryForTests(): void {
  cachedToken = null;
}
