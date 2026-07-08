import { useSessionCompletionRoute } from "@/hooks/useSessionCompletionRoute";

/**
 * Whether the paths session-completion overlay (bTJAB) is visible.
 * Must be used within PathsEnrollmentProvider.
 */
export function useSessionCompletionVisible(): boolean {
  return useSessionCompletionRoute().isVisible;
}
