import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RealtimeErrorNoticeProps {
  message: string;
  tone?: "error" | "info";
  className?: string;
}

/** NCLDD-57 — inline notice for the Conversation panel (errors, end reasons, hints). */
export function RealtimeErrorNotice({ message, tone = "error", className }: RealtimeErrorNoticeProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border bg-muted/40 text-muted-foreground",
        className,
      )}
    >
      {tone === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : null}
      <span>{message}</span>
    </div>
  );
}
