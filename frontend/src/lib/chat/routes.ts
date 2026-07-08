/** Chat page route and Bubble IR markers (bTHDV / bTHDZ slice). */

export const CHAT_ROUTE = "/chat" as const;

/** Page root element id (bTHDV). */
export const CHAT_PAGE_BUBBLE_ID = "bTHDV" as const;

/** Page-level CustomElement instances — distinct from reusable roots ai_RNbBKLUc / ai_RNbBKLUe. */
export const CHAT_HEADER_INSTANCE_BUBBLE_ID = "ai_RNbBKLUj" as const;
export const CHAT_SIDEBAR_INSTANCE_BUBBLE_ID = "ai_RNbBKLUk" as const;

/** chat-main content boundary — owned by MOD-DRSAM-CHAT. */
export const CHAT_MAIN_BUBBLE_ID = "ai_RNbBHXbD" as const;

/** Chat page content layout (CHAT-01). */
export const CHAT_SIDEBAR_REGION_BUBBLE_ID = "ai_RNbBHXbE" as const;
export const CHAT_PAGE_TITLE_ROW_BUBBLE_ID = "ai_RNbBHXbF" as const;
export const CHAT_PAGE_TITLE_BUBBLE_ID = "ai_RNbBHXbG" as const;
export const NEW_CONVERSATION_BTN_BUBBLE_ID = "ai_RNbBHXbH" as const;
export const CHAT_PANEL_MOUNT_BUBBLE_ID = "bTIUt" as const;

/** Conversation thread sidebar (CHAT-02). */
export const CONVERSATION_SIDEBAR_BUBBLE_ID = "ai_RNbBHXbK" as const;
export const CONVERSATION_THREADS_RG_BUBBLE_ID = "ai_RNbBHXbL" as const;
/** Group chat-conv-cell — repeating-group cell root. */
export const CONVERSATION_THREAD_CELL_BUBBLE_ID = "ai_RNbBHXbM" as const;
/** Group chat-conv-cell-inner — sole child of cell root. */
export const CONVERSATION_THREAD_DELETE_GROUP_BUBBLE_ID = "ai_RNbBHXbN" as const;
/** Group chat-conv-cell-text — text column; sibling of actions group. */
export const CONVERSATION_THREAD_TITLE_BUBBLE_ID = "ai_RNbBHXbO" as const;
/** Button chat-conv-select-btn — title/preview select control. */
export const CONVERSATION_THREAD_PREVIEW_BUBBLE_ID = "ai_RNbBHXbP" as const;
/** Text chat-conv-date. */
export const CONVERSATION_THREAD_DATE_BUBBLE_ID = "ai_RNbBHXbQ" as const;
/** Group chat-conv-actions — rename/delete icon row. */
export const CONVERSATION_THREAD_DELETE_ACTIONS_BUBBLE_ID = "ai_RNbBHXbR" as const;
/** Button chat-conv-rename-btn. */
export const CONVERSATION_THREAD_DELETE_TRIGGER_BTN_BUBBLE_ID = "ai_RNbBHXbS" as const;
/** Button chat-conv-delete-btn. */
export const CONVERSATION_THREAD_DELETE_CONFIRM_BTN_BUBBLE_ID = "ai_RNbBHXbU" as const;

/** Chat welcome / crisis empty-state panel (CHAT-06) — shown when ?conversation= is absent. */
export const CHAT_WELCOME_PANEL_BUBBLE_ID = "ai_RNbBHXcE" as const;
export const CHAT_WELCOME_HEADER_BUBBLE_ID = "ai_RNbBHXcF" as const;
export const CHAT_WELCOME_TITLE_ROW_BUBBLE_ID = "ai_RNbBHXcG" as const;
export const CHAT_WELCOME_ICON_GROUP_BUBBLE_ID = "ai_RNbBHXcH" as const;
export const CHAT_WELCOME_ICON_BUBBLE_ID = "ai_RNbBHXcI" as const;
export const CHAT_WELCOME_TITLE_BUBBLE_ID = "ai_RNbBHXcJ" as const;
export const CHAT_WELCOME_SUBTITLE_BUBBLE_ID = "ai_RNbBHXcK" as const;
export const CHAT_WELCOME_SUGGESTIONS_BUBBLE_ID = "ai_RNbBHXcL" as const;

/** Crisis resource suggestion cards (988, Crisis Text Line, SAMHSA). */
export const CHAT_SUGGESTION_988_CARD_BUBBLE_ID = "ai_RNbBHXcM" as const;
export const CHAT_SUGGESTION_988_HEADER_BUBBLE_ID = "ai_RNbBHXcN" as const;
export const CHAT_SUGGESTION_988_ICON_BUBBLE_ID = "ai_RNbBHXcO" as const;
export const CHAT_SUGGESTION_988_LABEL_BUBBLE_ID = "ai_RNbBHXcP" as const;
export const CHAT_SUGGESTION_988_DESC_BUBBLE_ID = "ai_RNbBHXcQ" as const;
export const CHAT_SUGGESTION_988_ACTION_BUBBLE_ID = "ai_RNbBHXcR" as const;

export const CHAT_SUGGESTION_TEXTLINE_CARD_BUBBLE_ID = "ai_RNbBHXcS" as const;
export const CHAT_SUGGESTION_TEXTLINE_HEADER_BUBBLE_ID = "ai_RNbBHXcT" as const;
export const CHAT_SUGGESTION_TEXTLINE_ICON_BUBBLE_ID = "ai_RNbBHXcU" as const;
export const CHAT_SUGGESTION_TEXTLINE_LABEL_BUBBLE_ID = "ai_RNbBHXcV" as const;
export const CHAT_SUGGESTION_TEXTLINE_DESC_BUBBLE_ID = "ai_RNbBHXcW" as const;
export const CHAT_SUGGESTION_TEXTLINE_ACTION_BUBBLE_ID = "ai_RNbBHXcX" as const;

export const CHAT_SUGGESTION_SAMHSA_CARD_BUBBLE_ID = "ai_RNbBHXcY" as const;
export const CHAT_SUGGESTION_SAMHSA_HEADER_BUBBLE_ID = "ai_RNbBHXcZ" as const;
export const CHAT_SUGGESTION_SAMHSA_ICON_BUBBLE_ID = "ai_RNbBHXca" as const;
export const CHAT_SUGGESTION_SAMHSA_LABEL_BUBBLE_ID = "ai_RNbBHXcb" as const;
export const CHAT_SUGGESTION_SAMHSA_DESC_BUBBLE_ID = "ai_RNbBHXcc" as const;
export const CHAT_SUGGESTION_SAMHSA_ACTION_BUBBLE_ID = "ai_RNbBHXcd" as const;
export const CHAT_WELCOME_DISCLAIMER_BUBBLE_ID = "ai_RNbBHXce" as const;

/** Delete conversation confirmation popup (CHAT-04). */
export const DELETE_CONVERSATION_POPUP_BUBBLE_ID = "ai_RNbBHXct" as const;
export const DELETE_CONVERSATION_HEADER_BUBBLE_ID = "ai_RNbBHXcv" as const;
export const DELETE_CONVERSATION_ICON_WRAP_BUBBLE_ID = "ai_RNbBHXcw" as const;
export const DELETE_CONVERSATION_ICON_BUBBLE_ID = "ai_RNbBHXcx" as const;
export const DELETE_CONVERSATION_TITLE_WRAP_BUBBLE_ID = "ai_RNbBHXcy" as const;
export const DELETE_CONVERSATION_TITLE_BUBBLE_ID = "ai_RNbBHXeq" as const;
export const DELETE_CONVERSATION_SUBTITLE_BUBBLE_ID = "ai_RNbBHXer" as const;
export const DELETE_CONVERSATION_BODY_BUBBLE_ID = "ai_RNbBHXes" as const;
export const DELETE_CONVERSATION_ACTIONS_BUBBLE_ID = "ai_RNbBHXet" as const;
export const DELETE_CONVERSATION_CANCEL_BTN_BUBBLE_ID = "ai_RNbBHXeu" as const;
export const DELETE_CONVERSATION_CONFIRM_BTN_BUBBLE_ID = "ai_RNbBHXev" as const;

/** URL search param for active chatconversation (bTInF / bTInK GetParamFromUrl parity). */
export const CONVERSATION_SEARCH_PARAM = "conversation" as const;

/** Feature module that owns chat-main subtree (thread UI, delete popup). */
export const CHAT_MODULE_ID = "MOD-DRSAM-CHAT" as const;
