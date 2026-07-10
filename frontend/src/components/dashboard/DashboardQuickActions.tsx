import { CalendarDays, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { Button } from "@/components/ui/button";

export default function DashboardQuickActions() {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        bubbleStyle("Group_transparent_"),
        "flex w-full flex-wrap gap-2",
      )}
    >
      <Button
        type="button"
        data-style-ref="Button_accent_"
        className={cn(bubbleStyle("Button_accent_"), "gap-1.5")}
        onClick={() => navigate("/paths")}
      >
        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
        Plan tomorrow
      </Button>
      <Button
        type="button"
        data-style-ref="Button_outline_"
        variant="outline"
        className={cn(bubbleStyle("Button_outline_"), "gap-1.5")}
        onClick={() => navigate("/journal")}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Reflect on today
      </Button>
    </div>
  );
}
