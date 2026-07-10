/** Bubble option set: customer_pillar_os (Customer Pillar OS) */

export const CUSTOMER_PILLAR_OPTION_SET_ID = "customer_pillar_os" as const;

export const CUSTOMER_PILLAR = {
  /** bTHQE */
  EMOTIONAL: "emotional",
  /** bTHQF */
  PROFESSIONAL: "professional",
  /** bTHQG */
  HEALTH: "health",
} as const;

export type CustomerPillarSlug = (typeof CUSTOMER_PILLAR)[keyof typeof CUSTOMER_PILLAR];

/** Display strings from drsam-99657.bubble → customer_pillar_os */
export const CUSTOMER_PILLAR_LABELS: Record<CustomerPillarSlug, string> = {
  emotional: "Emotional well-being", // bTHQE
  professional: "Professional", // bTHQF
  health: "Health & wellness", // bTHQG
};

export const CUSTOMER_PILLAR_DESCRIPTIONS: Record<CustomerPillarSlug, string> = {
  emotional: "Stress, relationships, grief, confidence, boundaries", // bTHQE
  professional: "Career, leadership, growth, productivity, burnout at work", // bTHQF
  health: "Habits, recovery, sobriety, energy, daily routines", // bTHQG
};

export const CUSTOMER_PILLAR_ORDER: readonly CustomerPillarSlug[] = [
  CUSTOMER_PILLAR.EMOTIONAL,
  CUSTOMER_PILLAR.PROFESSIONAL,
  CUSTOMER_PILLAR.HEALTH,
];

/** Bubble option set: customer_role_os (Customer Role OS) */

export const CUSTOMER_ROLE_OPTION_SET_ID = "customer_role_os" as const;

export const CUSTOMER_ROLE = {
  /** bTHKW */
  PRO: "pro",
  /** bTHKX */
  STUDENT: "student",
  /** bTHKY */
  CAREGIVER: "caregiver",
  /** bTHKc */
  TRANSITION: "transition",
  /** bTHKd */
  RETIRED: "retired",
} as const;

export type CustomerRoleSlug = (typeof CUSTOMER_ROLE)[keyof typeof CUSTOMER_ROLE];

export const CUSTOMER_ROLE_LABELS: Record<CustomerRoleSlug, string> = {
  pro: "Working professional or leader", // bTHKW
  student: "Student", // bTHKX
  caregiver: "Caregiver or stay-at-home parent", // bTHKY
  transition: "Between jobs or in transition", // bTHKc
  retired: "Retired or semi-retired", // bTHKd
};

export const CUSTOMER_ROLE_DESCRIPTIONS: Record<CustomerRoleSlug, string> = {
  pro: "Employed, running a business, or in a leadership role", // bTHKW
  student: "In school, university, or a training program", // bTHKX
  caregiver: "Primary caregiver for children, family members, or household", // bTHKY
  transition: "Job searching, career changing, or in a period of change", // bTHKc
  retired: "No longer working full time by choice or circumstance", // bTHKd
};

export const CUSTOMER_ROLE_ORDER: readonly CustomerRoleSlug[] = [
  CUSTOMER_ROLE.PRO,
  CUSTOMER_ROLE.STUDENT,
  CUSTOMER_ROLE.CAREGIVER,
  CUSTOMER_ROLE.TRANSITION,
  CUSTOMER_ROLE.RETIRED,
];

/** Bubble option set: customer_state_os (Customer State OS) */

export const CUSTOMER_STATE_OPTION_SET_ID = "customer_state_os" as const;

export const CUSTOMER_STATE = {
  /** bTHoW */
  WIRED: "wired",
  /** bTHoX */
  REGULATED: "regulated",
  /** bTHoY */
  DEPLETED: "depleted",
  /** bTHoc */
  SHUT_DOWN: "shut_down",
  /** bTHod */
  STRONG: "strong",
  /** bTHoe */
  MODERATE: "moderate",
  /** bTHoi */
  LOW: "low",
} as const;

export type CustomerStateSlug = (typeof CUSTOMER_STATE)[keyof typeof CUSTOMER_STATE];

export const CUSTOMER_STATE_LABELS: Record<CustomerStateSlug, string> = {
  wired: "wired", // bTHoW
  regulated: "regulated", // bTHoX
  depleted: "depleted", // bTHoY
  shut_down: "shut_down", // bTHoc
  strong: "strong", // bTHod
  moderate: "moderate", // bTHoe
  low: "low", // bTHoi
};

export const CUSTOMER_STATE_ORDER: readonly CustomerStateSlug[] = [
  CUSTOMER_STATE.WIRED,
  CUSTOMER_STATE.REGULATED,
  CUSTOMER_STATE.DEPLETED,
  CUSTOMER_STATE.SHUT_DOWN,
  CUSTOMER_STATE.STRONG,
  CUSTOMER_STATE.MODERATE,
  CUSTOMER_STATE.LOW,
];
