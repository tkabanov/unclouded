import { useCallback, useMemo, useState } from "react";

import type { ModuleQuestion } from "@/lib/modules/moduleConfigTypes";
import { getModuleQuestions } from "@/lib/modules/moduleConfigApi";
import type { ModuleSlug } from "@/lib/modules/moduleSlugs";

export type ModuleWizardStep =
  | { kind: "intro" }
  | { kind: "question"; index: number; question: ModuleQuestion }
  | { kind: "complete" };

export function useModuleWizard(slug: ModuleSlug) {
  const questions = useMemo(() => getModuleQuestions(slug), [slug]);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const steps: ModuleWizardStep[] = useMemo(
    () => [
      { kind: "intro" },
      ...questions.map((question, index) => ({
        kind: "question" as const,
        index,
        question,
      })),
      { kind: "complete" },
    ],
    [questions],
  );

  const currentStep = steps[stepIndex] ?? steps[0];

  const goNext = useCallback(() => {
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const goBack = useCallback(() => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const setAnswer = useCallback((questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const toggleMultiSelect = useCallback((questionId: string, optionSlug: string) => {
    setAnswers((prev) => {
      const current = prev[questionId];
      const selected = Array.isArray(current) ? [...current] : [];
      const index = selected.indexOf(optionSlug);
      if (index >= 0) {
        selected.splice(index, 1);
      } else {
        selected.push(optionSlug);
      }
      return { ...prev, [questionId]: selected };
    });
  }, []);

  const resetToIntro = useCallback(() => {
    setStepIndex(0);
    setAnswers({});
  }, []);

  return {
    questions,
    steps,
    stepIndex,
    currentStep,
    answers,
    goNext,
    goBack,
    setAnswer,
    toggleMultiSelect,
    resetToIntro,
    isFirstStep: stepIndex === 0,
    isLastQuestionStep: currentStep.kind === "question" && stepIndex === steps.length - 2,
  };
}

export type ModuleWizardState = ReturnType<typeof useModuleWizard>;
