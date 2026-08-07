import { supabase } from "@/integrations/supabase/client";

const PATH_CLOSING_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-path-closing`;

export type PathClosingInsight = {
  acknowledgment: string;
  sitWith: string;
  ctaText: string;
};

export async function generatePathClosingInsight(input: {
  sessionId: string;
  enrollmentId?: string;
  pathName?: string;
  sessionNumber?: string;
  sessionTheme?: string;
  reflectionResponses?: string;
}): Promise<PathClosingInsight | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return null;

  const response = await fetch(PATH_CLOSING_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    acknowledgment?: string;
    sitWith?: string;
    ctaText?: string;
  };

  if (!payload.acknowledgment?.trim() || !payload.sitWith?.trim()) return null;

  return {
    acknowledgment: payload.acknowledgment.trim(),
    sitWith: payload.sitWith.trim(),
    ctaText:
      payload.ctaText?.trim() || "Something come up? Start a chat with Kota.",
  };
}
