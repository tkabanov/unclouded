import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import {
  fetchAiInsightsConsent,
  setAiInsightsConsent,
  type AiInsightsConsentSource,
  type AiInsightsConsentState,
} from "@/lib/aiInsights/aiInsightsConsentApi";

export type UseAiInsightsConsent = {
  /** null while loading. */
  state: AiInsightsConsentState | null;
  saveChoice: (granted: boolean, source: AiInsightsConsentSource) => Promise<void>;
};

/** NCLDD-55 — current user's AI Insights consent (loads once per mount). */
export function useAiInsightsConsent(): UseAiInsightsConsent {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<AiInsightsConsentState | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setState(null);
    void fetchAiInsightsConsent(userId).then((loaded) => {
      if (!cancelled) setState(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const saveChoice = useCallback(async (granted: boolean, source: AiInsightsConsentSource) => {
    const saved = await setAiInsightsConsent(granted, source);
    setState({
      status: "loaded",
      granted: saved.granted,
      version: saved.version,
      updatedAt: saved.updatedAt,
      needsPrompt: false,
    });
  }, []);

  return { state, saveChoice };
}
