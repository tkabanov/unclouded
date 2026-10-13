import { callRpc } from "@/lib/supabase/rpc";

/**
 * NCLDD-56 — anonymous link-visit counting for `/signup?ref=CODE`. The browser keeps a random
 * visitor id (no account, IP or user agent is sent); the server stores only a hash and counts a
 * visit once per browser, code and day. Best-effort: failures never affect signup.
 */

const VISITOR_ID_STORAGE_KEY = "uncloud360.referralVisitorId";
const RECORDED_STORAGE_PREFIX = "uncloud360.referralVisitRecorded.";

function randomUuid(): string {
  return crypto.randomUUID();
}

export function getReferralVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const created = randomUuid();
    localStorage.setItem(VISITOR_ID_STORAGE_KEY, created);
    return created;
  } catch {
    // Storage blocked: still count this visit with a throwaway id.
    return randomUuid();
  }
}

/** Record one visit per code per browser session (the server also dedupes per day). */
export async function recordReferralLinkVisit(code: string): Promise<void> {
  const flag = `${RECORDED_STORAGE_PREFIX}${code}`;
  try {
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
  } catch {
    // Ignore storage failures.
  }
  try {
    await callRpc("record_referral_link_click", {
      p_code: code,
      p_visitor_id: getReferralVisitorId(),
    });
  } catch {
    // Best-effort only.
  }
}
