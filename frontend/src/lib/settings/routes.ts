/** Settings page route and Bubble IR markers (bTHDh / bTHDl slice). */

export const SETTINGS_ROUTE = "/settings" as const;

/** Page root element id (bTHDh). */
export const SETTINGS_PAGE_BUBBLE_ID = "bTHDh" as const;

/** Page-level CustomElement instances — distinct from reusable roots ai_RNbBKLUc / ai_RNbBKLUe. */
export const SETTINGS_HEADER_INSTANCE_BUBBLE_ID = "ai_RNbBKLUp" as const;
export const SETTINGS_SIDEBAR_INSTANCE_BUBBLE_ID = "ai_RNbBKLUq" as const;

/** settings-main content boundary — owned by MOD-DRSAM-SETTINGS. */
export const SETTINGS_MAIN_BUBBLE_ID = "ai_RNbBHYUr" as const;

/** Feature module that owns settings-main subtree (tabs, panels, admin popups). */
export const SETTINGS_MODULE_ID = "MOD-DRSAM-SETTINGS" as const;

/** settings-content-wrapper and page chrome (SET-01). */
export const SETTINGS_CONTENT_WRAPPER_BUBBLE_ID = "ai_RNbBHYUs" as const;
export const SETTINGS_PAGE_HEADER_BUBBLE_ID = "ai_RNbBHYUt" as const;
export const SETTINGS_PAGE_TITLE_BUBBLE_ID = "ai_RNbBHYUu" as const;
export const SETTINGS_PAGE_SUBTITLE_BUBBLE_ID = "ai_RNbBHYUv" as const;
export const SETTINGS_TAB_BAR_BUBBLE_ID = "ai_RNbBHYUw" as const;

/** Profile tab panel (SET-02). */
export const PROFILE_PANEL_BUBBLE_ID = "ai_RNbBHYVG" as const;
export const PROFILE_FORM_CARD_BUBBLE_ID = "ai_RNbBHYVH" as const;
export const PROFILE_FORM_BUBBLE_ID = "ai_RNbBHYVL" as const;
export const PROFILE_RECOVERY_SECTION_BUBBLE_ID = "ai_RNbBHYWA" as const;
export const PROFILE_SOBRIETY_GROUP_BUBBLE_ID = "ai_RNbBHYWF" as const;
export const PROFILE_FIRST_NAME_INPUT_BUBBLE_ID = "ai_RNbBHYVO" as const;
export const PROFILE_EMAIL_INPUT_BUBBLE_ID = "ai_RNbBHYVR" as const;
export const PROFILE_SOBRIETY_DATE_INPUT_BUBBLE_ID = "ai_RNbBHYWH" as const;
export const PROFILE_SAVE_BTN_BUBBLE_ID = "ai_RNbBHYWT" as const;

/** Coaching tab panel (SET-03). */
export const COACHING_PANEL_BUBBLE_ID = "ai_RNbBHYWU" as const;
export const COACHING_FORM_CARD_BUBBLE_ID = "ai_RNbBHYWV" as const;
export const COACHING_CARD_HEADER_BUBBLE_ID = "ai_RNbBHYWW" as const;
export const COACHING_FORM_BUBBLE_ID = "ai_RNbBHYWZ" as const;
export const COACHING_MODE_DROPDOWN_BUBBLE_ID = "bTIiC" as const;
export const COACHING_DISCLAIMER_BANNER_BUBBLE_ID = "ai_RNbBHYWq" as const;
export const COACHING_SAVE_BTN_BUBBLE_ID = "ai_RNbBHYWt" as const;

/** Privacy tab panel (SET-04). */
export const PRIVACY_PANEL_BUBBLE_ID = "ai_RNbBHYWu" as const;
export const PRIVACY_INFO_CARD_BUBBLE_ID = "ai_RNbBHYWv" as const;
export const PRIVACY_SECTIONS_BUBBLE_ID = "ai_RNbBHYWz" as const;
export const PRIVACY_EXPORT_BTN_BUBBLE_ID = "ai_RNbBHYXS" as const;
export const PRIVACY_DELETE_BTN_BUBBLE_ID = "ai_RNbBHYXV" as const;
export const DELETE_CONFIRM_POPUP_BUBBLE_ID = "ai_RNbBHYXY" as const;
export const DELETE_CANCEL_BTN_BUBBLE_ID = "ai_RNbBHYXe" as const;
export const DELETE_CONFIRM_BTN_BUBBLE_ID = "ai_RNbBHYXf" as const;

/** Security tab panel (SET-05). */
export const SECURITY_PANEL_BUBBLE_ID = "ai_RNbBHYXg" as const;
export const SECURITY_FORM_CARD_BUBBLE_ID = "ai_RNbBHYXh" as const;
export const SECURITY_FORM_BUBBLE_ID = "ai_RNbBHYXl" as const;
export const SECURITY_CURRENT_PASSWORD_INPUT_BUBBLE_ID = "ai_RNbBHYXo" as const;
export const SECURITY_NEW_PASSWORD_INPUT_BUBBLE_ID = "ai_RNbBHYXr" as const;
export const SECURITY_CONFIRM_PASSWORD_INPUT_BUBBLE_ID = "ai_RNbBHYXu" as const;
export const SECURITY_CHANGE_PWD_BTN_BUBBLE_ID = "ai_RNbBHYXw" as const;
export const SECURITY_RESET_EMAIL_BTN_BUBBLE_ID = "ai_RNbBHYXx" as const;

/** Notifications tab panel (SET-06). */
export const NOTIFICATIONS_PANEL_BUBBLE_ID = "ai_RNbBHYXy" as const;
export const NOTIFICATIONS_FORM_CARD_BUBBLE_ID = "ai_RNbBHYXz" as const;
export const NOTIFICATIONS_CARD_HEADER_BUBBLE_ID = "ai_RNbBHYYA" as const;
export const NOTIFICATIONS_FORM_BUBBLE_ID = "ai_RNbBHYYD" as const;
export const NOTIFICATIONS_FREQ_SELECT_BUBBLE_ID = "ai_RNbBHYYG" as const;
export const NOTIFICATIONS_SAVE_BTN_BUBBLE_ID = "ai_RNbBHYYL" as const;

/** Subscription tab panel (SET-07). */
export const SUBSCRIPTION_PANEL_BUBBLE_ID = "ai_RNbBHYYc" as const;
export const SUBSCRIPTION_CURRENT_CARD_BUBBLE_ID = "ai_RNbBHYYd" as const;
export const SUBSCRIPTION_CURRENT_HEADER_BUBBLE_ID = "ai_RNbBHYYe" as const;
export const SUBSCRIPTION_CURRENT_TEXT_BUBBLE_ID = "ai_RNbBHYYf" as const;
export const SUBSCRIPTION_CURRENT_TITLE_BUBBLE_ID = "ai_RNbBHYYg" as const;
export const SUBSCRIPTION_CURRENT_SUBTITLE_BUBBLE_ID = "ai_RNbBHYYh" as const;
export const SUBSCRIPTION_BADGE_WRAP_BUBBLE_ID = "ai_RNbBHYYi" as const;
export const SUBSCRIPTION_CURRENT_TIER_BADGE_BUBBLE_ID = "ai_RNbBHYYj" as const;
export const SUBSCRIPTION_TIER_TEXT_BUBBLE_ID = "ai_RNbBHYYl" as const;
export const SUBSCRIPTION_PLANS_GRID_BUBBLE_ID = "ai_RNbBHYYm" as const;
export const PLAN_CARD_BUBBLE_ID = "ai_RNbBHYYn" as const;
export const PLAN_CARD_ICON_BUBBLE_ID = "ai_RNbBHYYo" as const;
export const PLAN_CARD_INFO_BUBBLE_ID = "ai_RNbBHYYq" as const;
export const PLAN_CARD_NAME_BUBBLE_ID = "ai_RNbBHYYr" as const;
export const PLAN_CARD_PRICE_BUBBLE_ID = "ai_RNbBHYYs" as const;
export const PLAN_CARD_DESC_BUBBLE_ID = "ai_RNbBHYYt" as const;
export const PLAN_CARD_FEATURES_BUBBLE_ID = "ai_RNbBHYYu" as const;
export const PLAN_SELECT_BTN_BUBBLE_ID = "ai_RNbBHYYv" as const;
export const SUBSCRIPTION_BILLING_CARD_BUBBLE_ID = "ai_RNbBHYYw" as const;
export const BILLING_CARD_HEADER_BUBBLE_ID = "ai_RNbBHYYx" as const;
export const BILLING_CARD_TITLE_BUBBLE_ID = "ai_RNbBHYYy" as const;
export const BILLING_CARD_SUBTITLE_BUBBLE_ID = "ai_RNbBHYYz" as const;
export const BILLING_ACTIONS_ROW_BUBBLE_ID = "ai_RNbBHYZA" as const;
export const BILLING_UPDATE_BTN_BUBBLE_ID = "ai_RNbBHYZB" as const;
export const BILLING_INVOICES_BTN_BUBBLE_ID = "ai_RNbBHYZC" as const;

/** Workplace tab panel (SET-08). */
export const WORKPLACE_PANEL_BUBBLE_ID = "ai_RNbBHYYM" as const;
export const WORKPLACE_INFO_CARD_BUBBLE_ID = "ai_RNbBHYYN" as const;
export const WORKPLACE_CARD_HEADER_BUBBLE_ID = "ai_RNbBHYYO" as const;
export const WORKPLACE_CARD_TITLE_BUBBLE_ID = "ai_RNbBHYYP" as const;
export const WORKPLACE_CARD_SUBTITLE_BUBBLE_ID = "ai_RNbBHYYQ" as const;
export const WORKPLACE_PRIVACY_NOTICE_BUBBLE_ID = "ai_RNbBHYYR" as const;
export const WORKPLACE_PRIVACY_ICON_BUBBLE_ID = "ai_RNbBHYYS" as const;
export const WORKPLACE_PRIVACY_TEXT_BUBBLE_ID = "ai_RNbBHYYT" as const;
export const WORKPLACE_FORM_BUBBLE_ID = "ai_RNbBHYYU" as const;
export const WORKPLACE_NAME_GROUP_BUBBLE_ID = "ai_RNbBHYYV" as const;
export const WORKPLACE_NAME_LABEL_BUBBLE_ID = "ai_RNbBHYYW" as const;
export const WORKPLACE_NAME_INPUT_BUBBLE_ID = "ai_RNbBHYYX" as const;
export const WORKPLACE_EMAIL_GROUP_BUBBLE_ID = "ai_RNbBHYYY" as const;
export const WORKPLACE_EMAIL_LABEL_BUBBLE_ID = "ai_RNbBHYYZ" as const;
export const WORKPLACE_EMAIL_INPUT_BUBBLE_ID = "ai_RNbBHYYa" as const;
export const WORKPLACE_LINK_BTN_BUBBLE_ID = "ai_RNbBHYYb" as const;

/** Admin tab panel (SET-09+). */
export const ADMIN_PANEL_BUBBLE_ID = "ai_RNbBHYZD" as const;
export const ADMIN_HEADER_CARD_BUBBLE_ID = "ai_RNbBHYZE" as const;
export const ADMIN_ICON_WRAP_BUBBLE_ID = "ai_RNbBHYZF" as const;
export const ADMIN_HEADER_TEXT_BUBBLE_ID = "ai_RNbBHYZH" as const;
export const ADMIN_CARD_TITLE_BUBBLE_ID = "ai_RNbBHYZI" as const;
export const ADMIN_CARD_SUBTITLE_BUBBLE_ID = "ai_RNbBHYZJ" as const;
export const ADMIN_SUB_TAB_BAR_BUBBLE_ID = "ai_RNbBHYZK" as const;
export const ADMIN_TAB_BTN_PATHS_BUBBLE_ID = "ai_RNbBHYZL" as const;
export const ADMIN_TAB_BTN_RESOURCES_BUBBLE_ID = "ai_RNbBHYZM" as const;
export const ADMIN_TAB_BTN_PLANS_BUBBLE_ID = "ai_RNbBHYZN" as const;
export const ADMIN_TAB_BTN_WORKPLACES_BUBBLE_ID = "ai_RNbBHYZO" as const;
export const ADMIN_TAB_BTN_ANALYTICS_BUBBLE_ID = "ai_RNbBHYZP" as const;
export const ADMIN_SUB_CONTENTS_BUBBLE_ID = "ai_RNbBHYZQ" as const;
export const ADMIN_TAB_PATHS_BUBBLE_ID = "ai_RNbBHYZR" as const;
export const ADMIN_PATHS_TOOLBAR_BUBBLE_ID = "ai_RNbBHYZS" as const;
export const ADMIN_PATHS_TITLE_BUBBLE_ID = "ai_RNbBHYZT" as const;
export const ADMIN_ADD_PATH_BTN_BUBBLE_ID = "ai_RNbBHYZU" as const;
export const ADMIN_PATHS_GRID_BUBBLE_ID = "ai_RNbBHYZX" as const;
export const ADMIN_PATH_CARD_TEMPLATE_BUBBLE_ID = "ai_RNbBHYZY" as const;
export const ADMIN_PATH_TIER_BADGE_BUBBLE_ID = "ai_RNbBHYZf" as const;
export const ADMIN_PATH_MODE_BADGE_BUBBLE_ID = "ai_RNbBHYZb" as const;
export const ADMIN_PATH_SUB_BADGE_BUBBLE_ID = "ai_RNbBHYZe" as const;
export const ADMIN_PATH_DESC_BUBBLE_ID = "ai_RNbBHYZl" as const;
export const ADMIN_PATH_SENSITIVITY_ROW_BUBBLE_ID = "ai_RNbBHYZm" as const;
export const ADMIN_PATH_SENSITIVITY_BUBBLE_ID = "ai_RNbBHYZo" as const;
export const ADMIN_PATH_CARD_ACTIONS_BUBBLE_ID = "ai_RNbBHYZg" as const;
export const ADMIN_PATH_EDIT_BTN_BUBBLE_ID = "ai_RNbBHYZh" as const;
export const ADMIN_PATH_DELETE_BTN_BUBBLE_ID = "ai_RNbBHYZj" as const;
export const ADMIN_TAB_RESOURCES_BUBBLE_ID = "ai_RNbBHYZp" as const;
export const ADMIN_RESOURCES_TOOLBAR_BUBBLE_ID = "ai_RNbBHYZq" as const;
export const ADMIN_RESOURCES_TITLE_BUBBLE_ID = "ai_RNbBHYZr" as const;
export const ADMIN_ADD_RESOURCE_BTN_BUBBLE_ID = "ai_RNbBHYZs" as const;
export const ADMIN_RESOURCES_GRID_BUBBLE_ID = "ai_RNbBHYZv" as const;
export const ADMIN_RESOURCE_CARD_TEMPLATE_BUBBLE_ID = "ai_RNbBHYZw" as const;
export const ADMIN_RESOURCE_TAGS_ROW_BUBBLE_ID = "ai_RNbBHYaA" as const;
export const ADMIN_RESOURCE_MODE_BADGE_BUBBLE_ID = "ai_RNbBHYaB" as const;
export const ADMIN_RESOURCE_SUBMODE_BADGE_BUBBLE_ID = "ai_RNbBHYaC" as const;
export const ADMIN_RESOURCE_FLAGS_ROW_BUBBLE_ID = "ai_RNbBHYaI" as const;
export const ADMIN_RESOURCE_SENSITIVITY_BADGE_BUBBLE_ID = "ai_RNbBHYaL" as const;
export const ADMIN_RESOURCE_FREE_BADGE_BUBBLE_ID = "ai_RNbBHYaM" as const;
export const ADMIN_RESOURCE_IS_CRISIS_TEXT_BUBBLE_ID = "ai_RNbBHYaO" as const;
export const ADMIN_RESOURCE_CARD_ACTIONS_BUBBLE_ID = "ai_RNbBHYaD" as const;
export const ADMIN_RESOURCE_EDIT_BTN_BUBBLE_ID = "ai_RNbBHYaE" as const;
export const ADMIN_RESOURCE_DELETE_BTN_BUBBLE_ID = "ai_RNbBHYaG" as const;
export const ADD_PATH_POPUP_BUBBLE_ID = "ai_RNbBHYbP" as const;
export const ADD_PATH_POPUP_TITLE_BUBBLE_ID = "ai_RNbBHYbS" as const;
export const ADD_PATH_CLOSE_BTN_BUBBLE_ID = "ai_RNbBHYbT" as const;
export const ADD_PATH_FORM_BUBBLE_ID = "ai_RNbBHYbV" as const;
export const ADD_PATH_TITLE_INPUT_BUBBLE_ID = "ai_RNbBHYbY" as const;
export const ADD_PATH_TIER_SELECT_BUBBLE_ID = "ai_RNbBHYcA" as const;
export const ADD_PATH_SUBMIT_BTN_BUBBLE_ID = "ai_RNbBHYcM" as const;
export const ADD_RESOURCE_POPUP_BUBBLE_ID = "ai_RNbBHYcN" as const;
export const ADD_RESOURCE_POPUP_TITLE_BUBBLE_ID = "ai_RNbBHYcQ" as const;
export const ADD_RESOURCE_CLOSE_BTN_BUBBLE_ID = "ai_RNbBHYcR" as const;
export const ADD_RESOURCE_FORM_BUBBLE_ID = "ai_RNbBHYcT" as const;
export const ADD_RESOURCE_TITLE_INPUT_BUBBLE_ID = "ai_RNbBHYcW" as const;
export const ADD_RESOURCE_SENSITIVITY_SELECT_BUBBLE_ID = "ai_RNbBHYcy" as const;
export const ADD_RESOURCE_SUBMIT_BTN_BUBBLE_ID = "ai_RNbBHYdK" as const;

/** Admin plans/workplaces/analytics (SET-10). */
export const ADMIN_TAB_PLANS_BUBBLE_ID = "ai_RNbBHYaP" as const;
export const ADMIN_PLANS_TOOLBAR_BUBBLE_ID = "ai_RNbBHYaQ" as const;
export const ADMIN_PLANS_TITLE_BUBBLE_ID = "ai_RNbBHYaR" as const;
export const ADMIN_ADD_PLAN_BTN_BUBBLE_ID = "ai_RNbBHYaS" as const;
export const ADMIN_PLANS_GRID_BUBBLE_ID = "ai_RNbBHYaV" as const;
export const ADMIN_PLAN_CARD_TEMPLATE_BUBBLE_ID = "ai_RNbBHYaW" as const;
export const ADMIN_PLAN_CARD_NAME_BUBBLE_ID = "ai_RNbBHYaZ" as const;
export const ADMIN_PLAN_CARD_ACTIONS_BUBBLE_ID = "ai_RNbBHYab" as const;
export const ADMIN_PLAN_EDIT_BTN_BUBBLE_ID = "ai_RNbBHYac" as const;
export const ADMIN_PLAN_DELETE_BTN_BUBBLE_ID = "ai_RNbBHYae" as const;
export const ADMIN_TAB_WORKPLACES_BUBBLE_ID = "ai_RNbBHYah" as const;
export const ADMIN_WORKPLACES_TOOLBAR_BUBBLE_ID = "ai_RNbBHYai" as const;
export const ADMIN_WORKPLACES_TITLE_BUBBLE_ID = "ai_RNbBHYaj" as const;
export const ADMIN_ADD_WORKPLACE_BTN_BUBBLE_ID = "ai_RNbBHYak" as const;
export const ADMIN_WORKPLACES_GRID_BUBBLE_ID = "ai_RNbBHYan" as const;
export const ADMIN_WORKPLACE_CARD_TEMPLATE_BUBBLE_ID = "ai_RNbBHYao" as const;
export const ADMIN_WORKPLACE_NAME_BUBBLE_ID = "ai_RNbBHYar" as const;
export const ADMIN_WORKPLACE_EMAIL_BUBBLE_ID = "ai_RNbBHYas" as const;
export const ADMIN_WORKPLACE_CARD_ACTIONS_BUBBLE_ID = "ai_RNbBHYat" as const;
export const ADMIN_WORKPLACE_EDIT_BTN_BUBBLE_ID = "ai_RNbBHYau" as const;
export const ADMIN_WORKPLACE_DELETE_BTN_BUBBLE_ID = "ai_RNbBHYaw" as const;
export const ADMIN_TAB_ANALYTICS_BUBBLE_ID = "ai_RNbBHYay" as const;
export const ADMIN_ANALYTICS_NOTICE_BUBBLE_ID = "ai_RNbBHYaz" as const;
export const ADMIN_ANALYTICS_NOTICE_TEXT_BUBBLE_ID = "ai_RNbBHYbB" as const;
export const ADMIN_ANALYTICS_GRID_BUBBLE_ID = "ai_RNbBHYbC" as const;
export const ADMIN_STAT_TOTAL_USERS_BUBBLE_ID = "ai_RNbBHYbD" as const;
export const ADMIN_STAT_TOTAL_USERS_LABEL_BUBBLE_ID = "ai_RNbBHYbE" as const;
export const ADMIN_STAT_TOTAL_USERS_VAL_BUBBLE_ID = "ai_RNbBHYbF" as const;
export const ADMIN_STAT_CHECKINS_BUBBLE_ID = "ai_RNbBHYbG" as const;
export const ADMIN_STAT_CHECKINS_LABEL_BUBBLE_ID = "ai_RNbBHYbH" as const;
export const ADMIN_STAT_CHECKINS_VAL_BUBBLE_ID = "ai_RNbBHYbI" as const;
export const ADMIN_STAT_MODE_DIST_BUBBLE_ID = "ai_RNbBHYbJ" as const;
export const ADMIN_STAT_MODE_DIST_LABEL_BUBBLE_ID = "ai_RNbBHYbK" as const;
export const ADMIN_STAT_MODE_DIST_VAL_BUBBLE_ID = "ai_RNbBHYbL" as const;
export const ADMIN_STAT_ENROLLED_BUBBLE_ID = "ai_RNbBHYbM" as const;
export const ADMIN_STAT_ENROLLED_LABEL_BUBBLE_ID = "ai_RNbBHYbN" as const;
export const ADMIN_STAT_ENROLLED_VAL_BUBBLE_ID = "ai_RNbBHYbO" as const;
export const ADD_PLAN_POPUP_BUBBLE_ID = "ai_RNbBHYdL" as const;
export const ADD_PLAN_POPUP_TITLE_BUBBLE_ID = "ai_RNbBHYdO" as const;
export const ADD_PLAN_CLOSE_BTN_BUBBLE_ID = "ai_RNbBHYdP" as const;
export const ADD_PLAN_FORM_BUBBLE_ID = "ai_RNbBHYdR" as const;
export const ADD_PLAN_NAME_INPUT_BUBBLE_ID = "ai_RNbBHYdU" as const;
export const ADD_PLAN_SUBMIT_BTN_BUBBLE_ID = "ai_RNbBHYde" as const;
export const ADD_WORKPLACE_POPUP_BUBBLE_ID = "ai_RNbBHYdf" as const;
export const ADD_WORKPLACE_POPUP_TITLE_BUBBLE_ID = "ai_RNbBHYdi" as const;
export const ADD_WORKPLACE_CLOSE_BTN_BUBBLE_ID = "ai_RNbBHYdj" as const;
export const ADD_WORKPLACE_FORM_BUBBLE_ID = "ai_RNbBHYdl" as const;
export const ADD_WORKPLACE_NAME_INPUT_BUBBLE_ID = "ai_RNbBHYdo" as const;
export const ADD_WORKPLACE_SUBMIT_BTN_BUBBLE_ID = "ai_RNbBHYds" as const;
