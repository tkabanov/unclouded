import type { UIMessage } from "npm:ai";
import { extractAllUserTexts } from "./crisisDetect.ts";

/** Block 3.32 — significant life event disclosure patterns (user text only). */
const LIFE_EVENT_DISCLOSURE_PATTERNS: RegExp[] = [
  // Job loss / role change (acute)
  /\b(lost my job|got (fired|laid off|made redundant)|I was (fired|laid off)|(?:they|company) fired me)\b/i,
  /\b(laid me off|made me redundant)\b/i,
  /\b(unemployed now|no longer employed|company (laid|let) me go)\b/i,
  /\bmy (job|position|role) (is gone|was eliminated|ended)\b/i,

  // Bereavement
  /\b(passed away|death of my)\b/i,
  /\bmy (mom|dad|mother|father|wife|husband|partner|child|son|daughter|parent|brother|sister|friend) (passed|died)\b/i,
  /\b(lost my (mom|dad|mother|father|wife|husband|partner|child|son|daughter|parent|brother|sister))\b/i,
  /\b(in mourning|recently (grieving|bereaved))\b/i,

  // Relapse
  /\b(relapsed|had a relapse|started (drinking|using) again|fell off the wagon|broke my sobriety)\b/i,

  // Major health event
  /\b(diagnosed with|heart attack|had a stroke|chemo|chemotherapy|hospitalized|major surgery)\b/i,
  /\b(terminal (diagnosis|illness|prognosis)|life-threatening)\b/i,

  // Relationship rupture
  /\b(getting divorced|going through a divorce|my (wife|husband|partner|spouse) left me)\b/i,
  /\b(broke up with me|ended (our|the) (relationship|marriage)|separated from my)\b/i,
  /\b((?:my )?partner and I|we) separated\b/i,
  /\b(caught (him|her|them) cheating|had an affair|relationship (is over|ended))\b/i,

  // Explicit mid-cycle shift language (Block 3.32)
  /\beverything has changed\b/i,
  /\b(in a )?(completely|totally) different place\b/i,
  /\blife (has|is) completely different\b/i,

  // Breakthrough / major positive shift
  /\b(life-changing (news|moment|event)|major breakthrough)\b/i,
];

export function detectSignificantLifeEventDisclosure(text: string): boolean {
  const normalized = text.trim();
  if (!normalized || normalized === "[SESSION START]") return false;
  return LIFE_EVENT_DISCLOSURE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function detectSignificantLifeEventInTexts(texts: string[]): boolean {
  return texts.some((text) => detectSignificantLifeEventDisclosure(text));
}

export function detectSignificantLifeEventInThread(
  messages: UIMessage[],
  extraText?: string,
): boolean {
  const segments = [...extractAllUserTexts(messages)];
  if (extraText?.trim()) segments.push(extraText.trim());
  return detectSignificantLifeEventInTexts(segments);
}

export function readSignificantLifeEventFlag(
  onboardingData: Record<string, unknown> | null | undefined,
): boolean {
  if (!onboardingData) return false;
  return (
    onboardingData.significant_life_event_flag === true ||
    onboardingData.significantLifeEventFlag === true
  );
}
