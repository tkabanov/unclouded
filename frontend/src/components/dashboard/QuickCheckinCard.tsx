import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardUserContext } from "@/hooks/useDashboardUser";
import { submitQuickCheckin } from "@/lib/chat/quickCheckinApi";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export default function QuickCheckinCard() {
  const { user } = useAuth();
  const { profile } = useDashboardUserContext();
  const [pulse, setPulse] = useState(7);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Add a brief note about how you're doing.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitQuickCheckin(
        user.id,
        { pulse, text: trimmed },
        profile?.onboardingData ?? null,
      );
      setText("");
      toast.success(result.reply.slice(0, 120) || "Quick check-in saved.");
    } catch (err) {
      console.error("Quick check-in failed", err);
      toast.error("Could not complete quick check-in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex w-full flex-col gap-4")}
    >
      <div className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}>
        <MessageCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <h2 className={cn(bubbleStyle("Text_heading_3_"), "text-lg")}>Quick Check-In</h2>
      </div>

      <div className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-2")}>
        <p className={cn(bubbleStyle("Text_label_"), "text-sm font-semibold text-primary")}>
          Pulse: {pulse}
        </p>
        <Slider
          value={[pulse]}
          onValueChange={([next]) => setPulse(next ?? 1)}
          min={1}
          max={10}
          step={1}
          aria-label="Pulse"
        />
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="One sentence on how you're doing today…"
        rows={2}
        className={cn(bubbleStyle("MultiLineInput_default_"), "min-h-[72px] w-full resize-none")}
      />

      <Button
        type="button"
        className={cn(bubbleStyle("Button_primary_"), "h-10 w-full")}
        disabled={submitting || !user}
        onClick={() => void handleSubmit()}
      >
        Submit Quick Check-In
      </Button>
    </div>
  );
}
