/** Bubble option set: state_energy_level_os (State Energy Level OS) */

export const STATE_ENERGY_LEVEL_OPTION_SET_ID = "state_energy_level_os" as const;

export const STATE_ENERGY_LEVEL = {
  /** bTIBk */
  STRONG: "strong",
  /** bTIBl */
  MODERATE: "moderate",
  /** bTIBm */
  LOW: "low",
  /** bTIBq */
  DEPLETED: "depleted",
} as const;

export type StateEnergyLevelSlug =
  (typeof STATE_ENERGY_LEVEL)[keyof typeof STATE_ENERGY_LEVEL];

/** Display strings from drsam-99657.bubble → state_energy_level_os */
export const STATE_ENERGY_LEVEL_LABELS: Record<StateEnergyLevelSlug, string> = {
  strong: "strong", // bTIBk
  moderate: "moderate", // bTIBl
  low: "low", // bTIBm
  depleted: "depleted", // bTIBq
};

export const STATE_ENERGY_LEVEL_ORDER: readonly StateEnergyLevelSlug[] = [
  STATE_ENERGY_LEVEL.STRONG,
  STATE_ENERGY_LEVEL.MODERATE,
  STATE_ENERGY_LEVEL.LOW,
  STATE_ENERGY_LEVEL.DEPLETED,
];

/** Bubble option set: state_nervous_system_os (State Nervous System OS) */

export const STATE_NERVOUS_SYSTEM_OPTION_SET_ID = "state_nervous_system_os" as const;

export const STATE_NERVOUS_SYSTEM = {
  /** bTIBa */
  WIRED: "wired",
  /** bTIBe */
  REGULATED: "regulated",
  /** bTIBf */
  DEPLETED: "depleted",
  /** bTIBg */
  SHUT_DOWN: "shut_down",
} as const;

export type StateNervousSystemSlug =
  (typeof STATE_NERVOUS_SYSTEM)[keyof typeof STATE_NERVOUS_SYSTEM];

/** Display strings from drsam-99657.bubble → state_nervous_system_os */
export const STATE_NERVOUS_SYSTEM_LABELS: Record<StateNervousSystemSlug, string> = {
  wired: "Wired", // bTIBa
  regulated: "Regulated", // bTIBe
  depleted: "Depleted", // bTIBf
  shut_down: "Shut Down", // bTIBg
};

export const STATE_NERVOUS_SYSTEM_ORDER: readonly StateNervousSystemSlug[] = [
  STATE_NERVOUS_SYSTEM.WIRED,
  STATE_NERVOUS_SYSTEM.REGULATED,
  STATE_NERVOUS_SYSTEM.DEPLETED,
  STATE_NERVOUS_SYSTEM.SHUT_DOWN,
];
