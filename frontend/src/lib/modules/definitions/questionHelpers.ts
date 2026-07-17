import type { ModuleQuestionOption } from "../moduleConfigTypes";

export function numericScaleOptions(
  labels: [string, string, string, string, string],
): readonly ModuleQuestionOption[] {
  return labels.map((label, index) => ({
    slug: String(index + 1),
    label,
  }));
}

export function singleSelectOptions(
  entries: readonly { slug: string; label: string }[],
): readonly ModuleQuestionOption[] {
  return entries;
}
