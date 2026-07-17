import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ModuleDefinition } from "@/lib/modules/moduleConfigTypes";

interface ModuleIntroScreenProps {
  definition: ModuleDefinition;
  onStart: () => void;
  onSkip?: () => void;
  subtitle?: string;
}

export default function ModuleIntroScreen({
  definition,
  onStart,
  onSkip,
  subtitle,
}: ModuleIntroScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Optional deep-dive
          </p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
            {definition.headline}
          </h1>
          <p className="mx-auto max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
            {definition.sub}
          </p>
          {subtitle ? (
            <p className="mx-auto max-w-lg text-sm font-medium text-foreground">{subtitle}</p>
          ) : null}
          {definition.tone ? (
            <p className="mx-auto max-w-lg text-sm italic text-muted-foreground">{definition.tone}</p>
          ) : null}
          {definition.sensitivityTier === "high" ? (
            <p className="text-sm font-medium text-muted-foreground">
              Available when you&apos;re ready — there is no rush.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-3 pt-2">
          <Button variant="cta" size="lg" onClick={onStart} className="group min-w-[200px]">
            {subtitle ? "Refresh" : "Start"}
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          {onSkip ? (
            <Button type="button" variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
          ) : null}
          <p className="text-xs text-muted-foreground">
            About {definition.estimatedMinutes} minutes · {definition.questions.length} questions
          </p>
        </div>
      </div>
    </div>
  );
}
