import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ModuleDefinition } from "@/lib/modules/moduleConfigTypes";

interface ModuleCompletionScreenProps {
  definition: ModuleDefinition;
  submitting: boolean;
  onFinish: () => void;
}

export default function ModuleCompletionScreen({
  definition,
  submitting,
  onFinish,
}: ModuleCompletionScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            {definition.displayTitle} complete
          </h1>
          <p className="mx-auto max-w-lg text-base leading-relaxed text-muted-foreground">
            Your answers have been saved. Gidget will use this layer to coach you with more depth
            and precision.
          </p>
        </div>
        <Button
          variant="cta"
          size="lg"
          disabled={submitting}
          onClick={onFinish}
          className="group"
        >
          {submitting ? "Saving…" : "Back to profile"}
          {!submitting ? (
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          ) : null}
        </Button>
      </div>
    </div>
  );
}
