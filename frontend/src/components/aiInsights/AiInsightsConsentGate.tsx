import type { ReactNode } from "react";
import { toast } from "sonner";

import { useAiInsightsConsent } from "@/hooks/useAiInsightsConsent";
import { cn } from "@/lib/utils";

import { AiInsightsConsentDialog } from "./AiInsightsConsentDialog";

export type AiInsightsConsentGateProps = {
  children: ReactNode;
  className?: string;
};

/**
 * NCLDD-55 — asks for the AI Insights choice before the first text or voice AI session.
 * Children (the AI panel) mount only after a choice exists, because panels send the session
 * opener to the model on mount. Either answer unlocks AI; if consent can't be read, AI is
 * never blocked.
 */
export function AiInsightsConsentGate({ children, className }: AiInsightsConsentGateProps) {
  const { state, saveChoice } = useAiInsightsConsent();

  if (state === null) {
    return (
      <div
        className={cn(
          "flex flex-1 items-center justify-center text-sm text-muted-foreground",
          className,
        )}
      >
        Loading…
      </div>
    );
  }

  if (state.status === "loaded" && state.needsPrompt) {
    return (
      <div className={cn("flex flex-1", className)}>
        <AiInsightsConsentDialog
          open
          onChoose={async (granted) => {
            try {
              await saveChoice(granted, "first_use");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Couldn't save your choice.");
            }
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
