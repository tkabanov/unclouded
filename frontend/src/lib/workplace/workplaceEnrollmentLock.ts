import { isWorkplaceContractActive } from "../../../../supabase/functions/_shared/workplaceEnrollmentHelpers.ts";

/** Matches SQL enroll / invite failures for inactive or ended contracts. */
export const WORKPLACE_ENROLLMENT_INACTIVE_MESSAGE =
  "This organization's enrollment is not active.";

export const WORKPLACE_ENROLLMENT_INACTIVE_BANNER =
  "This organization is inactive. New enrollments, invitations, and enrollment codes are blocked. Existing members keep access.";

export type WorkplaceEnrollmentLockFields = {
  isActive?: boolean | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
};

export function isWorkplaceEnrollmentLocked(
  workplace: WorkplaceEnrollmentLockFields | null | undefined,
): boolean {
  if (!workplace) return false;
  return !isWorkplaceContractActive({
    id: "lock-check",
    isActive: workplace.isActive,
    contractStartDate: workplace.contractStartDate,
    contractEndDate: workplace.contractEndDate,
  });
}
