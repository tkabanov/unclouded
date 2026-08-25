const POST_SESSION_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-post-session`;

export type CoachPostSessionPeek = {
  ok: true;
  scheduledAt: string | null;
  durationMinutes: number;
  status: string | null;
  memberFirstName: string | null;
  alreadySubmitted: boolean;
  submittedAt: string | null;
  notes: string | null;
};

export type CoachPostSessionPeekResult =
  | CoachPostSessionPeek
  | { ok: false; code?: string; error?: string };

export type CoachPostSessionSubmitResult =
  | { ok: true; code: "submitted" | "already_submitted"; submittedAt?: string }
  | { ok: false; code?: string; error?: string };

export function coachPostSessionFormUrl(token: string): string {
  const trimmed = token.trim();
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://uncloud360.vercel.app";
  return `${origin}/coach-session/${encodeURIComponent(trimmed)}`;
}

async function postSessionRequest(body: Record<string, unknown>): Promise<Response> {
  return fetch(POST_SESSION_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
}

export async function peekCoachPostSession(
  token: string,
): Promise<CoachPostSessionPeekResult> {
  try {
    const response = await postSessionRequest({ token, action: "peek" });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok || payload.ok !== true) {
      return {
        ok: false,
        code: typeof payload.code === "string" ? payload.code : undefined,
        error:
          (typeof payload.error === "string" && payload.error) ||
          "Session not found.",
      };
    }
    return payload as CoachPostSessionPeek;
  } catch {
    return { ok: false, error: "Could not load this session." };
  }
}

export async function submitCoachPostSession(
  token: string,
  notes: string,
): Promise<CoachPostSessionSubmitResult> {
  try {
    const response = await postSessionRequest({ token, action: "submit", notes });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok || payload.ok !== true) {
      return {
        ok: false,
        code: typeof payload.code === "string" ? payload.code : undefined,
        error:
          (typeof payload.error === "string" && payload.error) ||
          "Could not submit session notes.",
      };
    }
    const code =
      payload.code === "already_submitted" ? "already_submitted" : "submitted";
    return {
      ok: true,
      code,
      submittedAt:
        typeof payload.submittedAt === "string" ? payload.submittedAt : undefined,
    };
  } catch {
    return { ok: false, error: "Could not submit session notes." };
  }
}

function formatSessionWhen(iso: string | null, durationMinutes: number): string {
  if (!iso) return "Unscheduled";
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return "Unscheduled";
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return `${start.toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  })} – ${end.toLocaleTimeString(undefined, { timeStyle: "short" })} (${durationMinutes} min)`;
}

export function formatCoachPostSessionWhen(
  scheduledAt: string | null,
  durationMinutes: number,
): string {
  return formatSessionWhen(scheduledAt, durationMinutes);
}
