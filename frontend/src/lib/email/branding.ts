/** Shared transactional email branding — US-606 / Build Brief Section 8. */
export const TRANSACTIONAL_EMAIL_FROM = "noreply@uncloud360.ai" as const;

export const TRANSACTIONAL_EMAIL_PRODUCT_NAME = "Uncloud360" as const;

export const TRANSACTIONAL_EMAIL_DISCLAIMER =
  "Uncloud360 is AI-powered coaching only — not therapy or medical advice. In an emergency, call 988 or 911." as const;

/** Sampled from frontend design tokens (primary + brand gradient). */
export const TRANSACTIONAL_EMAIL_BRAND = {
  primary: "#0987C5",
  teal: "#00B8B8",
  blue: "#0570C9",
  text: "#2D3E45",
  muted: "#6B7C85",
  background: "#F5FAFC",
  card: "#FFFFFF",
} as const;
