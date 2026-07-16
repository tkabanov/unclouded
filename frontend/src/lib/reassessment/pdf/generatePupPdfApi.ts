import { supabase } from "@/integrations/supabase/client";
import type { PupPdfPayload } from "@/lib/reassessment/pdf/pupPdfTypes";

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pup-pdf`;

async function getAuthToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return token;
}

export class PupPdfEdgeError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "PupPdfEdgeError";
    this.code = code;
  }
}

export async function fetchPupPdfPayload(
  assessmentResultId: string,
  options?: { force?: boolean },
): Promise<PupPdfPayload> {
  const token = await getAuthToken();
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assessmentResultId,
      force: options?.force === true,
    }),
  });

  if (!response.ok) {
    let message = `PDF generation failed (${response.status})`;
    let code: string | undefined;
    try {
      const payload = (await response.json()) as { error?: string; code?: string };
      if (payload.error) message = payload.error;
      code = payload.code;
    } catch {
      // keep default
    }
    throw new PupPdfEdgeError(message, code);
  }

  const body = (await response.json()) as { payload?: PupPdfPayload };
  if (!body.payload) throw new PupPdfEdgeError("Empty PDF payload from server");
  return body.payload;
}
