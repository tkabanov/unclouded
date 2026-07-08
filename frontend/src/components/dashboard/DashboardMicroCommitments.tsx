import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardUserContext } from "@/hooks/useDashboardUser";
import { useUserProfile } from "@/lib/userProfile";
import {
  fetchMicroCommitments,
  markMicroCommitmentCompleted,
  type MicroCommitmentItem,
} from "@/lib/dashboard/microCommitmentsApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DashboardMicroCommitments() {
  const { user } = useAuth();
  const { profile } = useDashboardUserContext();
  const { refresh } = useUserProfile();
  const [items, setItems] = useState<MicroCommitmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const next = await fetchMicroCommitments(user.id, profile?.onboardingData ?? null);
      setItems(next);
    } catch (err) {
      console.error("Failed to load micro-commitments", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.onboardingData]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleComplete = async (sessionId: string) => {
    if (!user) return;
    setCompletingId(sessionId);
    try {
      await markMicroCommitmentCompleted(user.id, sessionId, profile?.onboardingData ?? null);
      await refresh();
      await loadItems();
    } catch (err) {
      console.error("Failed to mark micro-commitment complete", err);
      toast.error("Could not update micro-commitment. Please try again.");
    } finally {
      setCompletingId(null);
    }
  };

  if (loading || items.length === 0) {
    return null;
  }

  return (
    <div
      data-bubble-id="bTJFv"
      data-style-ref="Group_transparent_"
      className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-2")}
    >
      <p
        data-bubble-id="bTJGB"
        data-style-ref="Text_heading_3_"
        className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold")}
      >
        Your current micro-commitments
      </p>

      <div
        data-bubble-id="bTJGH"
        data-style-ref="RepeatingGroup_list_"
        className={cn(bubbleStyle("RepeatingGroup_list_"), "flex w-full flex-wrap gap-2")}
      >
        {items.map((item) => (
          <div
            key={item.id}
            data-bubble-id="bTJGS"
            data-style-ref="Group_transparent_"
            className={cn(
              bubbleStyle("Group_transparent_"),
              "flex min-w-0 flex-row flex-wrap items-center gap-2",
            )}
          >
            <p
              data-bubble-id="bTJGY"
              data-style-ref="Text_body_"
              className={cn(bubbleStyle("Text_body_"), "min-w-0 flex-1 text-sm leading-snug")}
            >
              <span className="font-semibold">
                {item.pathName}, Session {item.sessionIndex}:
              </span>{" "}
              {item.microCommitmentText}
            </p>

            {item.isCompleted ? (
              <span
                className={cn(
                  bubbleStyle("Text_success_"),
                  "inline-flex shrink-0 items-center gap-1 text-xs font-medium",
                )}
                aria-label="Completed"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Completed
              </span>
            ) : (
              <Button
                type="button"
                data-bubble-id="bTJGe"
                data-style-ref="Button_primary_"
                size="sm"
                className={cn(bubbleStyle("Button_primary_"), "h-8 shrink-0 gap-1 px-2.5 text-xs")}
                disabled={completingId === item.id}
                onClick={() => void handleComplete(item.id)}
              >
                <Star className="h-3.5 w-3.5" aria-hidden />
                Mark as Completed
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
