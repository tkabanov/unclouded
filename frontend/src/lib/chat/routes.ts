/** Chat page route and Bubble IR markers (bTHDV / bTHDZ slice). */

export const CHAT_ROUTE = "/chat" as const;

/** Page root element id (bTHDV). */

/** Page-level CustomElement instances — distinct from reusable roots ai_RNbBKLUc / ai_RNbBKLUe. */

/** chat-main content boundary — owned by MOD-DRSAM-CHAT. */

/** Chat page content layout (CHAT-01). */

/** Conversation thread sidebar (CHAT-02). */
/** Group chat-conv-cell — repeating-group cell root. */
/** Group chat-conv-cell-inner — sole child of cell root. */
/** Group chat-conv-cell-text — text column; sibling of actions group. */
/** Button chat-conv-select-btn — title/preview select control. */
/** Text chat-conv-date. */
/** Group chat-conv-actions — rename/delete icon row. */
/** Button chat-conv-rename-btn. */
/** Button chat-conv-delete-btn. */

/** Chat welcome / crisis empty-state panel (CHAT-06) — shown when ?conversation= is absent. */

/** Crisis resource suggestion cards (988, Crisis Text Line, SAMHSA). */



/** Delete conversation confirmation popup (CHAT-04). */

/** URL search param for active chatconversation (bTInF / bTInK GetParamFromUrl parity). */
export const CONVERSATION_SEARCH_PARAM = "conversation" as const;

/** Feature module that owns chat-main subtree (thread UI, delete popup). */
export const CHAT_MODULE_ID = "MOD-DRSAM-CHAT" as const;
