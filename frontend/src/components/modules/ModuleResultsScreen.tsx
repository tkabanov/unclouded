import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ModuleDefinition } from "@/lib/modules/moduleConfigTypes";
import type { NewlyUnlockedPath } from "@/lib/modules/results/moduleUnlockedPaths";
import type { ModuleResultsView } from "@/lib/modules/results/resolveModuleResults";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

interface ModuleResultsScreenProps {
  definition: ModuleDefinition;
  results: ModuleResultsView;
  unlockedPaths: NewlyUnlockedPath[];
  submitting: boolean;
  onFinish: () => void;
}

export default function ModuleResultsScreen({
  definition,
  results,
  unlockedPaths,
  submitting,
  onFinish,
}: ModuleResultsScreenProps) {
  const isHistory = definition.slug === "history";

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">{results.headline}</h1>
          <p className="mx-auto max-w-lg text-base leading-relaxed text-muted-foreground">
            {results.lead}
          </p>
        </div>

        {submitting ? (
          <div
            className={cn(bubbleStyle("Group_card_"), "animate-pulse space-y-3 p-6")}
            aria-live="polite"
            aria-busy="true"
          >
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
          </div>
        ) : (
          <>
            {results.reflections.length > 0 ? (
              <div className={cn(bubbleStyle("Group_card_"), "space-y-3 p-6")}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  What came through
                </h2>
                <ul className="space-y-2.5">
                  {results.reflections.map((sentence) => (
                    <li key={sentence} className="text-sm leading-relaxed text-foreground">
                      {sentence}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!isHistory && results.whatThisUnlocks.length > 0 ? (
              <div className={cn(bubbleStyle("Group_card_"), "space-y-3 p-6")}>
                <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-4 w-4" aria-hidden />
                  What this unlocks
                </h2>
                <ul className="space-y-2 text-sm leading-relaxed text-foreground">
                  {results.whatThisUnlocks.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!isHistory && unlockedPaths.length > 0 ? (
              <div className={cn(bubbleStyle("Group_card_"), "space-y-3 p-6")}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Newly unlocked paths
                </h2>
                <ul className="space-y-2">
                  {unlockedPaths.map((path) => (
                    <li
                      key={path.id}
                      className="flex items-center justify-between gap-3 text-sm text-foreground"
                    >
                      <span>{path.name}</span>
                      {path.requiresUpgrade ? (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Available on Pro
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}

        <div className="flex justify-center pt-2">
          <Button variant="cta" size="lg" disabled={submitting} onClick={onFinish} className="group">
            {submitting ? "Saving…" : "Back to profile"}
            {!submitting ? (
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            ) : null}
          </Button>
        </div>
      </div>
    </div>
  );
}
