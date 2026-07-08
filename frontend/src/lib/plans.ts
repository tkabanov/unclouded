export type PlanId = "free" | "pro" | "premium";

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  badge?: string;
  features: string[];
  /** "subscribe" flips the demo subscribed flag; "contact" opens an apply/contact flow */
  cta: "current" | "subscribe" | "contact";
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    tagline: "Everything you need to get started with AI coaching.",
    features: [
      "AI coaching chat (limited)",
      "Daily check-ins & journal",
      "Free guided paths",
      "Crisis resources always available",
    ],
    cta: "current",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/month",
    tagline: "Deeper coaching, richer insights, and your 90-day reassessment.",
    badge: "Most Popular",
    features: [
      "Unlimited AI coaching chat",
      "All guided paths & resources",
      "AI journal reflections",
      "90-day reassessment to track progress",
      "Advanced insights & milestones",
      "Priority support",
    ],
    cta: "subscribe",
  },
  {
    id: "premium",
    name: "Premium",
    price: "Custom",
    period: "",
    tagline:
      "1:1 human coaching with the Proven Under Pressure team, matched to your PuP 360 data.",
    badge: "1:1 Coaching",
    features: [
      "Everything in Pro",
      "1:1 sessions with the Proven Under Pressure coaching team",
      "Led & certified by Dr. Sam",
      "Coach matched to your PuP 360 data",
      "Personalized between-session support",
    ],
    cta: "contact",
  },
];

export const PREMIUM_CONTACT_EMAIL = "coaching@uncloud360.com";
