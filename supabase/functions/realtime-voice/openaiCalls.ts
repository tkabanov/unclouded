/**
 * NCLDD-57 — OpenAI Realtime unified interface (spike §1.3, D1): the server posts the browser's
 * SDP offer + session config and returns the SDP answer. The API key never reaches the client.
 */

export const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

export type CreateCallResult =
  | { ok: true; sdpAnswer: string; callId: string | null }
  | { ok: false; status: number };

/** `Location: /v1/realtime/calls/rtc_…` → `rtc_…` (C10: validate only the prefix). */
export function parseCallId(location: string | null): string | null {
  if (!location) return null;
  const segment = location.split("?")[0].split("/").filter(Boolean).pop() ?? "";
  return /^rtc_[A-Za-z0-9_-]{1,200}$/.test(segment) ? segment : null;
}

export async function createRealtimeCall(
  fetchImpl: typeof fetch,
  apiKey: string,
  sdpOffer: string,
  session: Record<string, unknown>,
): Promise<CreateCallResult> {
  const form = new FormData();
  form.set("sdp", sdpOffer);
  form.set("session", JSON.stringify(session));
  let response: Response;
  try {
    response = await fetchImpl(OPENAI_REALTIME_CALLS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch {
    return { ok: false, status: 0 };
  }
  // Probed: 201 + text/plain (C10). Accept any 2xx; never log the body (it may echo the prompt).
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    return { ok: false, status: response.status };
  }
  const sdpAnswer = await response.text();
  if (!sdpAnswer.trim()) return { ok: false, status: response.status };
  return { ok: true, sdpAnswer, callId: parseCallId(response.headers.get("Location")) };
}

/** Server-side kill switch (C7). Best-effort: failures are only logged. */
export async function hangupRealtimeCall(fetchImpl: typeof fetch, apiKey: string, callId: string): Promise<void> {
  try {
    const response = await fetchImpl(`${OPENAI_REALTIME_CALLS_URL}/${encodeURIComponent(callId)}/hangup`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) console.warn("realtime hangup failed", response.status);
    await response.body?.cancel().catch(() => undefined);
  } catch (err) {
    console.warn("realtime hangup threw", err instanceof Error ? err.name : "error");
  }
}
