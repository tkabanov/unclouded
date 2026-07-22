/** Dashboard page route and Bubble IR markers (bTHDT / bTHDU slice). */

export const DASHBOARD_ROUTE = "/dashboard" as const;

/** Page root element id (bTHDT). */

/** Page-level CustomElement instances — distinct from reusable roots ai_RNbBKLUc / ai_RNbBKLUe. */

/** dashboard-main content boundary — owned by MOD-DRSAM-DASHBOARD. */

/** dashboard-content region inside dashboard-main. */

/** Greeting row region (widgets deferred to DASH-02+). */

/** Two-column dashboard grid. */

/** Left column anchor — daily check-in widget group (DASH-04). */
export const DASHBOARD_DAILY_CHECKIN_ID = "dashboard-daily-checkin" as const;

/** Right column widget slots (DASH-05–DASH-07). */

/** Feature module that owns dashboard-main subtree widgets. */
export const DASHBOARD_MODULE_ID = "MOD-DRSAM-DASHBOARD" as const;
