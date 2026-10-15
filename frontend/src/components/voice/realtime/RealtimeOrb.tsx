import { motion, useReducedMotion, type TargetAndTransition, type Transition } from "motion/react";
import type { RealtimePhase } from "@/lib/realtime/realtimeSessionMachine";
import { realtimeStatusLabel } from "@/lib/realtime/realtimeUi";
import { cn } from "@/lib/utils";

type Visual = "idle" | "connecting" | "listening" | "user" | "thinking" | "speaking" | "off";

function visualFor(phase: RealtimePhase): Visual {
  switch (phase) {
    case "requesting_mic":
    case "connecting":
      return "connecting";
    case "listening":
      return "listening";
    case "user_speaking":
      return "user";
    case "thinking":
      return "thinking";
    case "speaking":
      return "speaking";
    case "ending":
    case "ended":
    case "error":
      return "off";
    default:
      return "idle";
  }
}

const COLOR: Record<Visual, string> = {
  idle: "from-primary/50 to-primary/20",
  connecting: "from-muted-foreground/40 to-muted-foreground/10",
  listening: "from-primary/70 to-primary/30",
  user: "from-sky-500/80 to-sky-400/30",
  thinking: "from-violet-500/70 to-violet-400/30",
  speaking: "from-primary to-primary/40",
  off: "from-muted-foreground/30 to-muted-foreground/10",
};

export interface RealtimeOrbProps {
  phase: RealtimePhase;
  /** Smoothed 0..1 level (mic while the user speaks, Kota while speaking). */
  level: number;
  /** Smaller orb once the transcript takes the space. */
  compact?: boolean;
  className?: string;
}

/** NCLDD-57 — animated status orb; reduced motion keeps only colour + label. */
export function RealtimeOrb({ phase, level, compact = false, className }: RealtimeOrbProps) {
  const reduceMotion = useReducedMotion();
  const visual = visualFor(phase);
  const levelScale = 1 + Math.min(1, Math.max(0, level)) * 0.35;

  let animate: TargetAndTransition = { scale: 1, opacity: 1, rotate: 0 };
  let transition: Transition = { duration: 0.3 };
  if (!reduceMotion) {
    switch (visual) {
      case "connecting":
        animate = { rotate: 360, opacity: 0.6, scale: 0.95 };
        transition = { rotate: { repeat: Infinity, duration: 4, ease: "linear" }, opacity: { duration: 0.4 } };
        break;
      case "listening":
        animate = { scale: [1, 1.05, 1], opacity: 1 };
        transition = { duration: 3, repeat: Infinity, ease: "easeInOut" };
        break;
      case "user":
      case "speaking":
        animate = { scale: levelScale, opacity: 1 };
        transition = { type: "spring", stiffness: 300, damping: 20 };
        break;
      case "thinking":
        animate = { opacity: [0.65, 1, 0.65], scale: [0.97, 1.02, 0.97] };
        transition = { duration: 1.6, repeat: Infinity, ease: "easeInOut" };
        break;
      case "off":
        animate = { scale: 0.9, opacity: 0.7 };
        break;
      default:
        break;
    }
  }

  return (
    <div className={cn("flex shrink-0 flex-col items-center", compact ? "gap-2" : "gap-4", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center",
          compact ? "h-24 w-24" : "h-40 w-40 sm:h-48 sm:w-48",
        )}
      >
        <motion.div
          data-testid="realtime-orb"
          data-visual={visual}
          aria-hidden
          className={cn(
            "rounded-full bg-gradient-to-br shadow-lg",
            compact ? "h-16 w-16" : "h-28 w-28 sm:h-32 sm:w-32",
            COLOR[visual],
          )}
          animate={animate}
          transition={transition}
        />
      </div>
      <p role="status" aria-live="polite" className="text-sm font-medium text-foreground">
        {realtimeStatusLabel(phase)}
      </p>
    </div>
  );
}
