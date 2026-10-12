/**
 * NCLDD-55 — DRAFT copy, pending product/legal approval (OVR-073). Legal note: Insights facts are
 * pseudonymized (kept per user for revocation); only the aggregates admins see are anonymous.
 * Bump AI_INSIGHTS_CONSENT_VERSION (TS + SQL) when this text or the analysis terms change.
 */
export const AI_INSIGHTS_CONSENT_COPY = {
  title: "Help improve Kota?",
  body: "With your permission, your AI coaching conversations (text and voice) are included in anonymized, aggregated product analytics. Admins only see combined trends across many people — like common topics and feedback — never your messages, voice audio, name, or individual conversations.",
  access: "Your choice doesn't affect your access: Kota works the same either way. You can change it anytime in Settings → Profile.",
  allow: "Allow anonymized analysis",
  decline: "Don't allow",
} as const;

/** Settings → Profile card (same terms as the first-use dialog). */
export const AI_INSIGHTS_SETTINGS_COPY = {
  title: "AI conversation analysis",
  description:
    "Choose whether your AI coaching conversations (text and voice) may be included in anonymized, aggregated product analytics. Admins only see combined trends across many people — never your messages, voice audio, name, or individual conversations. Kota works the same either way.",
  switchLabel: "Include my AI conversations in anonymized analysis",
  switchHint:
    "Applies to sessions you finish and ratings you give from now on. Turning it off deletes your analysis records and excludes you from all Insights.",
  confirmTitle: "Turn off anonymized analysis?",
  confirmBody:
    "Your AI conversations will no longer be analyzed, and the analysis records already created from your sessions will be deleted. Your conversations and access to Kota are not affected.",
  confirmKeep: "Keep it on",
  confirmOff: "Turn off",
  savedOn: "Anonymized analysis is on for your future AI sessions.",
  savedOff: "Anonymized analysis is off. Your analysis records were deleted.",
} as const;
