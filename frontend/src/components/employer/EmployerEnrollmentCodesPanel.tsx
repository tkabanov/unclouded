import WorkplaceEnrollmentCodesPanel from "@/components/workplace/WorkplaceEnrollmentCodesPanel";

type EmployerEnrollmentCodesPanelProps = {
  workplaceId: string;
  disabled?: boolean;
  enrollmentLocked?: boolean;
  refreshToken?: number | string;
};

/** US-206 — HR enrollment code management on /employer. */
export default function EmployerEnrollmentCodesPanel({
  workplaceId,
  disabled = false,
  enrollmentLocked = false,
  refreshToken = 0,
}: EmployerEnrollmentCodesPanelProps) {
  return (
    <WorkplaceEnrollmentCodesPanel
      workplaceId={workplaceId}
      disabled={disabled}
      enrollmentLocked={enrollmentLocked}
      compact
      className="mt-4"
      refreshToken={refreshToken}
    />
  );
}
