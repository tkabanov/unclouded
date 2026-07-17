import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { PROMPT_TEST_SCENARIOS } from "@/lib/admin/promptTestScenarios";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminPromptTestSuite() {
  const [runningId, setRunningId] = useState<string | null>(null);

  const handleRun = (scenarioId: string, title: string) => {
    setRunningId(scenarioId);
    toast.message(`Prompt test "${title}" queued (stub).`);
    window.setTimeout(() => setRunningId(null), 600);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className={cn(bubbleStyle("Group_card_muted_"), "flex gap-4 p-6")}>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FlaskConical className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <h3 className={bubbleStyle("Text_heading_3_")}>Prompt Test Suite</h3>
          <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
            Regression scenarios for coaching prompts ({PROMPT_TEST_SCENARIOS.length} stubs).
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {PROMPT_TEST_SCENARIOS.map((scenario) => (
          <li
            key={scenario.id}
            className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between")}
          >
            <div>
              <p className="font-medium">{scenario.title}</p>
              <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
                {scenario.expectedBehavior}
              </p>
              <p className={cn(bubbleStyle("Text_body_muted_"), "text-xs")}>ID: {scenario.id}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={runningId === scenario.id}
              onClick={() => handleRun(scenario.id, scenario.title)}
            >
              Run (stub)
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
