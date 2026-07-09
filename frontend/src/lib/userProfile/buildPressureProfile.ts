/** Bubble custom event bTIAw — load_signal_list + state_nervous_system → pressure profile text. */

import {
  getLoadSignalAnswerMeta,
  LOAD_SIGNAL_HIGH_INTENSITY_TEXT,
  LOAD_SIGNAL_QUESTIONS,
} from "@/lib/enums/onboardingQuestions";
import {
  STATE_NERVOUS_SYSTEM,
  STATE_NERVOUS_SYSTEM_LABELS,
  type StateNervousSystemSlug,
} from "@/lib/enums/wellnessState";

function nervousSystemDisplay(slug: string): string {
  return STATE_NERVOUS_SYSTEM_LABELS[slug as StateNervousSystemSlug] ?? slug;
}

/**
 * Resolves pressure profile text matching bTIAw / bTIBB branch logic.
 * @param loadSignalSlugs — answer slugs in LOAD_SIGNAL_QUESTIONS field order
 * @param nervousSystemSlug — state_nervous_system_os slug (wired, regulated, depleted, shut_down)
 */
export function resolvePressureProfile(
  loadSignalSlugs: string[],
  nervousSystemSlug: string,
): string {
  const highIntensityTexts: string[] = [];

  for (const question of LOAD_SIGNAL_QUESTIONS) {
    const slug = loadSignalSlugs.find((candidate) =>
      question.answers.some((answer) => answer.slug === candidate),
    );
    if (!slug) continue;

    const meta = getLoadSignalAnswerMeta(slug);
    if (meta?.intensity === "high") {
      highIntensityTexts.push(LOAD_SIGNAL_HIGH_INTENSITY_TEXT[meta.loadType]);
    }
  }

  const nervousDisplay = nervousSystemDisplay(nervousSystemSlug);

  if (highIntensityTexts.length > 0) {
    return `${highIntensityTexts.join(" + ")} + ${nervousDisplay} Nervous System`;
  }

  if (nervousSystemSlug === STATE_NERVOUS_SYSTEM.WIRED) {
    return "Low External Load / Wired Nervous System — investigate in session";
  }

  return `Low Pressure / ${nervousDisplay} Nervous System`;
}
