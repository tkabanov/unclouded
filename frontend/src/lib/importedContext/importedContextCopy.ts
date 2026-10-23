/**
 * NCLDD-63 (OVR-081) — Settings → Profile "Help Kota Know You Faster" copy.
 * Bump IMPORTED_CONTEXT_CONSENT_VERSION when the consent wording or terms change.
 */
export const IMPORTED_CONTEXT_CONSENT_VERSION = 1;

/** Must match the CHECK / RPC limit in 20261023140000_user_imported_context.sql. */
export const IMPORTED_CONTEXT_MAX_CHARS = 10_000;

export const IMPORTED_CONTEXT_COPY = {
  title: "Help Kota Know You Faster",
  description:
    "Share what other AI assistants know about you, your personality test results, or describe yourself in your own words. Kota uses this as background to personalize your coaching from the first session.",
  emptyHint: "You haven't added anything yet.",
  textareaLabel: "About you",
  textareaPlaceholder:
    "Paste notes from ChatGPT, Claude or another assistant, your MBTI / Enneagram / DISC / Big Five results, or write about yourself…",
  importButton: "Import from file",
  fileHint: "Supported: .txt, .md, .json, .csv, .pdf (up to 5 MB each).",
  addButton: "Add information",
  editButton: "Edit",
  deleteButton: "Delete my imported data",
  cancelButton: "Cancel",
  saveButton: "Save",
  savingButton: "Saving…",
  consentLabel:
    "I agree that Kota may use this information to personalize my coaching. I can edit or delete it anytime, and deleting it withdraws my consent.",
  consentRequired: "Please agree to the use of this information before saving.",
  consentGrantedOn: (date: string) => `You agreed to its use for personalized coaching on ${date}.`,
  previewTitle: "Preview imported text",
  previewDescription:
    "Check what was read from your files. You can still edit it before saving.",
  previewEmpty: "No readable text was found in these files.",
  previewAdd: "Add to my information",
  savedTitle: "What Kota knows from your import",
  saved: "Saved. Kota will use this in your next coaching sessions.",
  deleteConfirmTitle: "Delete your imported data?",
  deleteConfirmBody:
    "Kota will stop using this information and it will be permanently deleted. This also withdraws your consent. Your conversations and other profile data are not affected.",
  deleteConfirmKeep: "Keep it",
  deleteConfirmDelete: "Delete",
  deleted: "Your imported data was deleted.",
  tooLong: (max: number) => `Text is too long — keep it under ${max.toLocaleString("en-US")} characters.`,
  loadError: "Couldn't load your imported information.",
} as const;
