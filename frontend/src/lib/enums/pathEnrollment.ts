/** Bubble option set: path_enrollment_status (Path Enrollment Status OS) */

export const PATH_ENROLLMENT_STATUS_OPTION_SET_ID = "path_enrollment_status" as const;

export const PATH_ENROLLMENT_STATUS = {
  /** bTIqc */
  ACTIVE: "active",
  /** bTIqd */
  PAUSED: "paused",
  /** bTIqe */
  COMPLETED: "completed",
  /** bTIqi */
  ABANDONED: "abandoned",
} as const;

export type PathEnrollmentStatusSlug =
  (typeof PATH_ENROLLMENT_STATUS)[keyof typeof PATH_ENROLLMENT_STATUS];

/** Display strings from drsam-99657.bubble → path_enrollment_status */
export const PATH_ENROLLMENT_STATUS_LABELS: Record<PathEnrollmentStatusSlug, string> = {
  active: "active", // bTIqc
  paused: "paused", // bTIqd
  completed: "completed", // bTIqe
  abandoned: "abandoned", // bTIqi
};

export const PATH_ENROLLMENT_STATUS_ORDER: readonly PathEnrollmentStatusSlug[] = [
  PATH_ENROLLMENT_STATUS.ACTIVE,
  PATH_ENROLLMENT_STATUS.PAUSED,
  PATH_ENROLLMENT_STATUS.COMPLETED,
  PATH_ENROLLMENT_STATUS.ABANDONED,
];
