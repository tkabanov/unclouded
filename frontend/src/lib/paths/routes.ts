/** Paths page route and Bubble IR markers (bTHDf / bTHDg slice). */

export const PATHS_ROUTE = "/paths" as const;

/** Page root element id (bTHDf). */
export const PATHS_PAGE_BUBBLE_ID = "bTHDf" as const;

/** Page-level CustomElement instances — distinct from reusable roots ai_RNbBKLUc / ai_RNbBKLUe. */
export const PATHS_HEADER_INSTANCE_BUBBLE_ID = "ai_RNbBKLUn" as const;
export const PATHS_SIDEBAR_INSTANCE_BUBBLE_ID = "ai_RNbBKLUo" as const;

/** paths-main content boundary — owned by MOD-DRSAM-PATHS. */
export const PATHS_MAIN_BUBBLE_ID = "ai_RNbBHYGq" as const;

/** G - path content (hides when session completion overlay bTJAB is visible). */
export const PATHS_CONTENT_BUBBLE_ID = "bTJDf" as const;

/** Page header and title stack (PATHS-01). */
export const PATHS_PAGE_HEADER_BUBBLE_ID = "ai_RNbBHYGr" as const;
export const PATHS_PAGE_TITLE_GROUP_BUBBLE_ID = "ai_RNbBHYGs" as const;
export const PATHS_PAGE_TITLE_BUBBLE_ID = "ai_RNbBHYGt" as const;
export const PATHS_PAGE_SUBTITLE_BUBBLE_ID = "ai_RNbBHYGu" as const;

/** Tab bar repeating group and cell button (path_page_tab_os). */
export const PATHS_TAB_BAR_BUBBLE_ID = "ai_RNbBHYHB" as const;
export const PATHS_TAB_BTN_BUBBLE_ID = "ai_RNbBHYHD" as const;

/** My Paths guided grid panel (bTJDr / ai_RNbBHYHE). */
export const PATHS_GUIDED_PANEL_BUBBLE_ID = "ai_RNbBHYHE" as const;
export const PATHS_GUIDED_PANEL_ROOT_BUBBLE_ID = "bTJDr" as const;

/** Paths Library resources panel (bTJDs / ai_RNbBHYIK). */
export const PATHS_RESOURCES_PANEL_BUBBLE_ID = "ai_RNbBHYIK" as const;
export const PATHS_RESOURCES_PANEL_ROOT_BUBBLE_ID = "bTJDs" as const;

/** Session completion overlay mount (PATHS-07). */
export const PATHS_SESSION_COMPLETION_MOUNT_BUBBLE_ID = "bTJAG" as const;
export const PATHS_SESSION_COMPLETION_BUBBLE_ID = "bTJAB" as const;

/** URL search param for active pathsession (GetParamFromUrl parity). */
export const SESSION_SEARCH_PARAM = "session" as const;

/** path_page_tab_os option value keys. */
export const PATH_PAGE_TAB_OPTION_MY_PATHS = "bTIsz" as const;
export const PATH_PAGE_TAB_OPTION_LIBRARY = "bTItA" as const;

/** Feature module that owns paths-main subtree (tabs, enrollment UI). */
export const PATHS_MODULE_ID = "MOD-DRSAM-PATHS" as const;

/** PATHS-02 — guided panel filter row and tier dropdown. */
export const PATHS_FILTER_ROW_BUBBLE_ID = "ai_RNbBHYHF" as const;
export const PATHS_FILTER_TIER_GROUP_BUBBLE_ID = "ai_RNbBHYHZ" as const;
export const PATHS_FILTER_TIER_LABEL_BUBBLE_ID = "ai_RNbBHYHa" as const;
export const PATHS_FILTER_TIER_DD_BUBBLE_ID = "ai_RNbBHYHb" as const;

/** PATHS-02 — recommended section above enrolled paths grid. */
export const PATHS_RECOMMENDED_SECTION_BUBBLE_ID = "ai_RNbBHYHh" as const;
export const PATHS_RECOMMENDED_INDICATOR_BUBBLE_ID = "ai_RNbBHYHi" as const;
export const PATHS_RECOMMENDED_INDICATOR_DOT_BUBBLE_ID = "ai_RNbBHYHj" as const;
export const PATHS_RECOMMENDED_TITLE_BUBBLE_ID = "ai_RNbBHYHk" as const;

/** PATHS-02 — empty enrolled grid copy (bTJEI / bTJEK). */
export const PATHS_GRID_EMPTY_TEXT_BUBBLE_ID = "bTJEI" as const;
export const PATHS_GRID_EMPTY_TEXT = "You haven't enrolled in any path yet" as const;

/** PATHS-06 — floating enrollment services bar (FG-services / bTItX). */
export const PATHS_FLOATING_BAR_BUBBLE_ID = "bTItS" as const;

/** PATHS-02 / PATHS-06 — enrolled paths repeating group (bTItY GetElement parity). */
export const PATHS_ENROLLMENT_RG_BUBBLE_ID = "bTItY" as const;
export const PATHS_GRID_RG_BUBBLE_ID = "ai_RNbBHYHn" as const;
export const PATHS_GRID_CELL_BUBBLE_ID = "ai_RNbBHYHo" as const;

/** PATHS-02 — path card regions. */
export const PATH_CARD_HEADER_BUBBLE_ID = "ai_RNbBHYHp" as const;
export const PATH_CARD_BADGES_ROW_BUBBLE_ID = "ai_RNbBHYHq" as const;
export const PATH_CARD_PILLAR_BADGE_BUBBLE_ID = "ai_RNbBHYHr" as const;
export const PATH_CARD_SUBMODE_BADGE_BUBBLE_ID = "ai_RNbBHYHt" as const;
export const PATH_CARD_TIER_BADGE_WRAP_BUBBLE_ID = "ai_RNbBHYHv" as const;
export const PATH_CARD_TIER_BADGE_BUBBLE_ID = "ai_RNbBHYHw" as const;
export const PATH_CARD_BODY_BUBBLE_ID = "ai_RNbBHYHy" as const;
export const PATH_CARD_TITLE_BUBBLE_ID = "ai_RNbBHYHz" as const;
export const PATH_CARD_FOOTER_BUBBLE_ID = "ai_RNbBHYIF" as const;
export const PATH_CARD_PROGRESS_WRAP_BUBBLE_ID = "bTIvg" as const;
export const PATH_CARD_PROGRESS_BAR_WRAP_BUBBLE_ID = "bTIva" as const;
export const PATH_CARD_PROGRESS_PCT_BUBBLE_ID = "bTIvt" as const;
export const PATH_CARD_ENROLLED_INDICATOR_BUBBLE_ID = "bTIvJ" as const;
export const PATH_CARD_ENROLLED_ICON_BUBBLE_ID = "bTIvO" as const;
export const PATH_CARD_ENROLLED_TEXT_BUBBLE_ID = "bTIvP" as const;
export const PATH_CARD_VIEW_DETAILS_BTN_BUBBLE_ID = "ai_RNbBHYIJ" as const;

/** PATHS-04 — pinned crisis resources section. */
export const PATHS_PINNED_SECTION_BUBBLE_ID = "ai_RNbBHYIL" as const;
export const PATHS_PINNED_HEADER_BUBBLE_ID = "ai_RNbBHYIM" as const;
export const PATHS_PINNED_HEADER_ICON_BUBBLE_ID = "ai_RNbBHYIN" as const;
export const PATHS_PINNED_HEADER_TITLE_BUBBLE_ID = "ai_RNbBHYIO" as const;
export const PATHS_PINNED_CARDS_GRID_BUBBLE_ID = "ai_RNbBHYIP" as const;

/** PATHS-04 — static crisis resource cards (988, Crisis Text Line, SAMHSA). */
export const PATHS_CRISIS_CARD_988_BUBBLE_ID = "ai_RNbBHYIQ" as const;
export const PATHS_CRISIS_CARD_988_ICON_ROW_BUBBLE_ID = "ai_RNbBHYIR" as const;
export const PATHS_CRISIS_CARD_988_ICON_WRAP_BUBBLE_ID = "ai_RNbBHYIS" as const;
export const PATHS_CRISIS_CARD_988_ICON_BUBBLE_ID = "ai_RNbBHYIT" as const;
export const PATHS_CRISIS_CARD_988_TITLE_BUBBLE_ID = "ai_RNbBHYIU" as const;
export const PATHS_CRISIS_CARD_988_DESC_BUBBLE_ID = "ai_RNbBHYIV" as const;
export const PATHS_CRISIS_CARD_988_BADGE_BUBBLE_ID = "ai_RNbBHYIW" as const;
export const PATHS_CRISIS_CARD_988_BADGE_ICON_BUBBLE_ID = "ai_RNbBHYIX" as const;
export const PATHS_CRISIS_CARD_988_BADGE_TEXT_BUBBLE_ID = "ai_RNbBHYIY" as const;

export const PATHS_CRISIS_CARD_TEXTLINE_BUBBLE_ID = "ai_RNbBHYIZ" as const;
export const PATHS_CRISIS_CARD_TEXTLINE_ICON_ROW_BUBBLE_ID = "ai_RNbBHYIa" as const;
export const PATHS_CRISIS_CARD_TEXTLINE_ICON_WRAP_BUBBLE_ID = "ai_RNbBHYIb" as const;
export const PATHS_CRISIS_CARD_TEXTLINE_ICON_BUBBLE_ID = "ai_RNbBHYIc" as const;
export const PATHS_CRISIS_CARD_TEXTLINE_TITLE_BUBBLE_ID = "ai_RNbBHYId" as const;
export const PATHS_CRISIS_CARD_TEXTLINE_DESC_BUBBLE_ID = "ai_RNbBHYIe" as const;
export const PATHS_CRISIS_CARD_TEXTLINE_BADGE_BUBBLE_ID = "ai_RNbBHYIf" as const;
export const PATHS_CRISIS_CARD_TEXTLINE_BADGE_ICON_BUBBLE_ID = "ai_RNbBHYIg" as const;
export const PATHS_CRISIS_CARD_TEXTLINE_BADGE_TEXT_BUBBLE_ID = "ai_RNbBHYIh" as const;

export const PATHS_CRISIS_CARD_SAMHSA_BUBBLE_ID = "ai_RNbBHYIi" as const;
export const PATHS_CRISIS_CARD_SAMHSA_ICON_ROW_BUBBLE_ID = "ai_RNbBHYIj" as const;
export const PATHS_CRISIS_CARD_SAMHSA_ICON_WRAP_BUBBLE_ID = "ai_RNbBHYIk" as const;
export const PATHS_CRISIS_CARD_SAMHSA_ICON_BUBBLE_ID = "ai_RNbBHYIl" as const;
export const PATHS_CRISIS_CARD_SAMHSA_TITLE_BUBBLE_ID = "ai_RNbBHYIm" as const;
export const PATHS_CRISIS_CARD_SAMHSA_DESC_BUBBLE_ID = "ai_RNbBHYIn" as const;
export const PATHS_CRISIS_CARD_SAMHSA_BADGE_BUBBLE_ID = "ai_RNbBHYIo" as const;
export const PATHS_CRISIS_CARD_SAMHSA_BADGE_ICON_BUBBLE_ID = "ai_RNbBHYIp" as const;
export const PATHS_CRISIS_CARD_SAMHSA_BADGE_TEXT_BUBBLE_ID = "ai_RNbBHYIq" as const;

/** PATHS-04 — resource library intro and search RG. */
export const PATHS_RESOURCES_INTRO_BUBBLE_ID = "ai_RNbBHYIr" as const;
export const PATHS_RESOURCES_INTRO_TITLE_BUBBLE_ID = "ai_RNbBHYIs" as const;
export const PATHS_RESOURCES_RG_BUBBLE_ID = "ai_RNbBHYIu" as const;
export const PATHS_RESOURCE_CELL_BUBBLE_ID = "ai_RNbBHYIv" as const;

/** PATHS-04 — resource card regions. */
export const PATHS_RESOURCE_HEADER_BUBBLE_ID = "ai_RNbBHYIw" as const;
export const PATHS_RESOURCE_TAGS_ROW_BUBBLE_ID = "ai_RNbBHYIx" as const;
export const PATHS_RESOURCE_PRIMARY_TAG_BUBBLE_ID = "ai_RNbBHYIy" as const;
export const PATHS_RESOURCE_SUBMODE_TAG_BUBBLE_ID = "ai_RNbBHYJA" as const;
export const PATHS_RESOURCE_FREE_BADGE_BUBBLE_ID = "ai_RNbBHYJC" as const;
export const PATHS_RESOURCE_BODY_BUBBLE_ID = "ai_RNbBHYJE" as const;
export const PATHS_RESOURCE_TITLE_BUBBLE_ID = "ai_RNbBHYJF" as const;
export const PATHS_RESOURCE_CONTENT_BUBBLE_ID = "ai_RNbBHYJG" as const;
export const PATHS_RESOURCE_SENSITIVITY_WRAP_BUBBLE_ID = "ai_RNbBHYJH" as const;
export const PATHS_RESOURCE_SENSITIVITY_BADGE_BUBBLE_ID = "ai_RNbBHYJI" as const;
export const PATHS_RESOURCE_SENSITIVITY_ICON_BUBBLE_ID = "ai_RNbBHYJJ" as const;
export const PATHS_RESOURCE_SENSITIVITY_TEXT_BUBBLE_ID = "ai_RNbBHYJK" as const;
export const PATHS_RESOURCE_FOOTER_BUBBLE_ID = "ai_RNbBHYJL" as const;
export const PATHS_RESOURCE_DISCLAIMER_BUBBLE_ID = "ai_RNbBHYJM" as const;
export const PATHS_RESOURCE_VIEW_BTN_BUBBLE_ID = "ai_RNbBHYJN" as const;

/** Resource detail popup (PATHS-05 — wired from PATHS-04 view button). */
export const PATHS_RESOURCE_DETAIL_POPUP_BUBBLE_ID = "ai_RNbBHYJx" as const;
export const PATHS_RESOURCE_DETAIL_OVERLAY_BUBBLE_ID = "ai_RNbBHYMy" as const;
export const PATHS_RESOURCE_DETAIL_HEADER_BUBBLE_ID = "ai_RNbBHYJz" as const;
export const PATHS_RESOURCE_DETAIL_TITLE_GROUP_BUBBLE_ID = "ai_RNbBHYKA" as const;
export const PATHS_RESOURCE_DETAIL_BADGES_ROW_BUBBLE_ID = "ai_RNbBHYKB" as const;
export const PATHS_RESOURCE_DETAIL_MODE_BADGE_BUBBLE_ID = "ai_RNbBHYKC" as const;
export const PATHS_RESOURCE_DETAIL_SUBMODE_BADGE_BUBBLE_ID = "ai_RNbBHYKE" as const;
export const PATHS_RESOURCE_DETAIL_SENSITIVITY_BADGE_BUBBLE_ID = "ai_RNbBHYKG" as const;
/** @deprecated Use PATHS_RESOURCE_DETAIL_MODE_BADGE_BUBBLE_ID — ai_RNbBHYKC is mode badge, not title */
export const PATHS_RESOURCE_DETAIL_PRIMARY_TAG_BUBBLE_ID =
  PATHS_RESOURCE_DETAIL_MODE_BADGE_BUBBLE_ID;
/** @deprecated Use PATHS_RESOURCE_DETAIL_SUBMODE_BADGE_BUBBLE_ID */
export const PATHS_RESOURCE_DETAIL_SUBMODE_TAG_BUBBLE_ID =
  PATHS_RESOURCE_DETAIL_SUBMODE_BADGE_BUBBLE_ID;
export const PATHS_RESOURCE_DETAIL_TITLE_BUBBLE_ID = "ai_RNbBHYKI" as const;
export const PATHS_RESOURCE_DETAIL_CLOSE_BTN_BUBBLE_ID = "ai_RNbBHYKJ" as const;
export const PATHS_RESOURCE_DETAIL_BODY_BUBBLE_ID = "ai_RNbBHYKL" as const;
export const PATHS_RESOURCE_DETAIL_DISCLAIMER_ROW_BUBBLE_ID = "ai_RNbBHYKM" as const;
export const PATHS_RESOURCE_DETAIL_DISCLAIMER_ICON_BUBBLE_ID = "ai_RNbBHYKN" as const;
export const PATHS_RESOURCE_DETAIL_DISCLAIMER_TEXT_BUBBLE_ID = "ai_RNbBHYKO" as const;
export const PATHS_RESOURCE_DETAIL_DISCLAIMER_COPY =
  "This resource is for coaching purposes only — not therapy or medical advice. Please seek professional help if needed." as const;
export const PATHS_RESOURCE_DETAIL_CONTENT_GROUP_BUBBLE_ID = "ai_RNbBHYKP" as const;
export const PATHS_RESOURCE_DETAIL_CONTENT_LABEL_BUBBLE_ID = "ai_RNbBHYKQ" as const;
export const PATHS_RESOURCE_DETAIL_CONTENT_BUBBLE_ID = "ai_RNbBHYKR" as const;
export const PATHS_RESOURCE_DETAIL_LINK_GROUP_BUBBLE_ID = "ai_RNbBHYKS" as const;
export const PATHS_RESOURCE_DETAIL_LINK_LABEL_BUBBLE_ID = "ai_RNbBHYKT" as const;
export const PATHS_RESOURCE_DETAIL_LINK_LABEL_COPY = "External Link" as const;
export const PATHS_RESOURCE_DETAIL_LINK_BUBBLE_ID = "ai_RNbBHYKU" as const;
export const PATHS_RESOURCE_DETAIL_FOOTER_BUBBLE_ID = "ai_RNbBHYKV" as const;
export const PATHS_RESOURCE_DETAIL_DONE_BTN_BUBBLE_ID = "ai_RNbBHYKW" as const;

/** PATHS-03 — path detail enrollment popup (ai_RNbBHYJO / Popup ai_RNbBHYMU). */
export const PATHS_PATH_DETAIL_POPUP_BUBBLE_ID = "ai_RNbBHYJO" as const;
export const PATHS_PATH_DETAIL_OVERLAY_BUBBLE_ID = "ai_RNbBHYMU" as const;
export const PATHS_PATH_DETAIL_HEADER_BUBBLE_ID = "ai_RNbBHYJQ" as const;
export const PATHS_PATH_DETAIL_BADGES_ROW_BUBBLE_ID = "ai_RNbBHYJS" as const;
export const PATHS_PATH_DETAIL_TITLE_BUBBLE_ID = "ai_RNbBHYJZ" as const;
export const PATHS_PATH_DETAIL_CLOSE_BTN_BUBBLE_ID = "ai_RNbBHYJa" as const;
export const PATHS_PATH_DETAIL_BODY_BUBBLE_ID = "ai_RNbBHYJc" as const;
export const PATHS_PATH_DETAIL_STEPS_LABEL_BUBBLE_ID = "ai_RNbBHYJh" as const;
export const PATHS_PATH_DETAIL_STEPS_TEXT_BUBBLE_ID = "ai_RNbBHYJi" as const;
export const PATHS_PATH_DETAIL_DISCLAIMER_BUBBLE_ID = "ai_RNbBHYJk" as const;
export const PATHS_PATH_DETAIL_DISCLAIMER_ICON_BUBBLE_ID = "ai_RNbBHYJl" as const;
export const PATHS_PATH_DETAIL_DISCLAIMER_TEXT_BUBBLE_ID = "ai_RNbBHYJm" as const;
export const PATHS_PATH_DETAIL_PROGRESS_GROUP_BUBBLE_ID = "ai_RNbBHYJn" as const;
export const PATHS_PATH_DETAIL_PROGRESS_WRAP_BUBBLE_ID = "bTItq" as const;
export const PATHS_PATH_DETAIL_PROGRESS_BAR_BUBBLE_ID = "bTIuq" as const;
export const PATHS_PATH_DETAIL_PROGRESS_PCT_BUBBLE_ID = "ai_RNbBHYJs" as const;
export const PATHS_PATH_DETAIL_LAST_STEP_BUBBLE_ID = "ai_RNbBHYJt" as const;
export const PATHS_PATH_DETAIL_FOOTER_BUBBLE_ID = "ai_RNbBHYJu" as const;
export const PATHS_PATH_DETAIL_UNENROLL_BTN_BUBBLE_ID = "ai_RNbBHYJv" as const;
export const PATHS_PATH_DETAIL_ENROLL_BTN_BUBBLE_ID = "ai_RNbBHYJw" as const;
export const PATHS_PATH_DETAIL_UPGRADE_BTN_BUBBLE_ID = "bTJHa" as const;

export const PATHS_PATH_DETAIL_DISCLAIMER_TEXT =
  "Uncloud360 is coaching only, not therapy or medical advice. If you need professional support, please reach out to a licensed provider." as const;
