/**
 * Bubble design system — tokens and style classes from ir/slices/styles.json.
 */
import "./tokens.css";
import "./bubble-styles.css";

/** All 71 Bubble style_ref IDs from styles.json */
export const BUBBLE_STYLE_IDS = [
  "Button_accent_",
  "Button_destructive_",
  "Button_ghost_",
  "Button_icon_",
  "Button_link_",
  "Button_outline_",
  "Button_primary_",
  "Button_secondary_",
  "Button_tab_",
  "Button_tab_active_",
  "Checkbox_default_",
  "Dropdown_default_",
  "Group_alert_banner_",
  "Group_badge_",
  "Group_badge_accent_",
  "Group_badge_destructive_",
  "Group_badge_primary_",
  "Group_badge_success_",
  "Group_card_",
  "Group_card_muted_",
  "Group_chip_",
  "Group_chip_active_",
  "Group_crisis_bar_",
  "Group_divider_",
  "Group_hero_",
  "Group_overlay_",
  "Group_panel_",
  "Group_pricing_card_",
  "Group_pricing_card_featured_",
  "Group_section_",
  "Group_sidebar_",
  "Group_tab_bar_",
  "Group_transparent_",
  "Icon_default_",
  "Icon_destructive_",
  "Icon_muted_",
  "Icon_primary_",
  "Icon_success_",
  "Image_avatar_",
  "Image_default_",
  "Input_default_",
  "Input_multiline_",
  "Link_inline_",
  "Link_nav_",
  "MultiLineInput_default_",
  "Popup_confirm_",
  "Popup_detail_",
  "Popup_dialog_",
  "RepeatingGroup_chips_",
  "RepeatingGroup_grid_",
  "RepeatingGroup_list_",
  "Text_body_",
  "Text_body_muted_",
  "Text_caption_",
  "Text_destructive_",
  "Text_disclaimer_",
  "Text_heading_1_",
  "Text_heading_1_copy_",
  "Text_heading_2_",
  "Text_heading_2_copy_",
  "Text_heading_3_",
  "Text_heading_3_copy_",
  "Text_inter_13__400__white_",
  "Text_inter_13__400__white_copy_",
  "Text_inter_13__400__white_copy_copy_",
  "Text_label_",
  "Text_label_copy_",
  "Text_link_",
  "Text_price_",
  "Text_small_",
  "Text_success_"
] as const;

export type BubbleStyleRef = (typeof BUBBLE_STYLE_IDS)[number];

const styleSet = new Set<string>(BUBBLE_STYLE_IDS);

/** Resolve presentation.style_ref to a Bubble CSS class name. */
export function bubbleStyle(ref: BubbleStyleRef | string): string {
  if (!styleSet.has(ref)) {
    console.warn(`Unknown Bubble style_ref: ${ref}`);
  }
  return ref;
}

/** Map of style_ref → CSS class (identity; class name equals style id). */
export const styleRef: Record<BubbleStyleRef, string> = Object.fromEntries(
  BUBBLE_STYLE_IDS.map((id) => [id, id]),
) as Record<BubbleStyleRef, string>;
