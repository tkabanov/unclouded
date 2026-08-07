import { supabase } from "@/integrations/supabase/client";

async function authHeaders(): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export async function generateTrajectoryStatement(
  assessmentResultId: string,
): Promise<string | null> {
  const headers = await authHeaders();
  if (!headers) return null;
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-trajectory-statement`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ assessmentResultId }),
    },
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as { trajectoryStatement?: string };
  return typeof payload.trajectoryStatement === "string"
    ? payload.trajectoryStatement.trim()
    : null;
}

/** Fire-and-forget Premium coaching summary (async notify when ready). */
export async function requestCoachingSummaryGeneration(
  assessmentResultId: string,
): Promise<void> {
  const headers = await authHeaders();
  if (!headers) return;
  void fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-coaching-summary`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ assessmentResultId }),
    },
  );
}
