/** Dashboard page route and Bubble IR markers (bTHDT / bTHDU slice). */

export const DASHBOARD_ROUTE = "/dashboard" as const;

/** Page root element id (bTHDT). */
export const DASHBOARD_PAGE_BUBBLE_ID = "bTHDT" as const;

/** Page-level CustomElement instances — distinct from reusable roots ai_RNbBKLUc / ai_RNbBKLUe. */
export const DASHBOARD_HEADER_INSTANCE_BUBBLE_ID = "ai_RNbBKLUh" as const;
export const DASHBOARD_SIDEBAR_INSTANCE_BUBBLE_ID = "ai_RNbBKLUi" as const;

/** dashboard-main content boundary — owned by MOD-DRSAM-DASHBOARD. */
export const DASHBOARD_MAIN_BUBBLE_ID = "ai_RNbBHXRD" as const;

/** dashboard-content region inside dashboard-main. */
export const DASHBOARD_CONTENT_BUBBLE_ID = "ai_RNbBHXRE" as const;

/** Greeting row region (widgets deferred to DASH-02+). */
export const DASHBOARD_GREETING_ROW_BUBBLE_ID = "ai_RNbBHXRF" as const;

/** Two-column dashboard grid. */
export const DASHBOARD_GRID_BUBBLE_ID = "ai_RNbBHXRW" as const;

/** Left column anchor — daily check-in widget group (DASH-04). */
export const DASHBOARD_DAILY_CHECKIN_SLOT_BUBBLE_ID = "ai_RNbBHXRX" as const;

/** Right column widget slots (DASH-05–DASH-07). */
export const DASHBOARD_CURRENT_PATH_SLOT_BUBBLE_ID = "ai_RNbBHXSf" as const;
export const DASHBOARD_CHAT_PREVIEW_SLOT_BUBBLE_ID = "ai_RNbBHXSM" as const;
export const DASHBOARD_JOURNAL_PREVIEW_SLOT_BUBBLE_ID = "ai_RNbBHXSx" as const;
export const DASHBOARD_CRISIS_SLOT_BUBBLE_ID = "bTIfU" as const;

/** Feature module that owns dashboard-main subtree widgets. */
export const DASHBOARD_MODULE_ID = "MOD-DRSAM-DASHBOARD" as const;
