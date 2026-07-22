import { cn } from "@/lib/utils";

/** Shared option-button styles for onboarding questionnaire steps. */
export function onboardingOptionButtonClass(isSelected: boolean, extra?: string) {
  return cn(
    "w-full text-left px-3.5 py-2.5 rounded-lg border transition-all text-sm",
    extra,
    isSelected
      ? "border-primary bg-primary/10 text-foreground font-semibold"
      : "border-border bg-background font-normal text-muted-foreground hover:border-primary/40 hover:bg-primary/5",
  );
}

/** Label wrapper used with bubble text tokens — keeps selected answers bold. */
export function onboardingOptionLabelClass(isSelected: boolean, bubbleTextClass?: string) {
  return cn(bubbleTextClass, isSelected ? "!font-semibold" : "!font-normal");
}
