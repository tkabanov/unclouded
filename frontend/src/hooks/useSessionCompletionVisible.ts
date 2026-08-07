import { useSessionCompletionRoute } from "@/hooks/useSessionCompletionRoute";

/**
 * Whether the paths session-completion route should stay mounted (bTJAB).
 * Driven by `?session=` so the closing-insight screen survives enrollment refresh.
 * Must be used within PathsEnrollmentProvider.
 */
export function useSessionCompletionVisible(): boolean {
  return useSessionCompletionRoute().isRouteActive;
}
