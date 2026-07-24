import WorkplaceEnrollmentCodesPanel from "@/components/workplace/WorkplaceEnrollmentCodesPanel";

type EmployerEnrollmentCodesPanelProps = {
  workplaceId: string;
  disabled?: boolean;
};

/** US-206 — HR enrollment code management on /employer. */
export default function EmployerEnrollmentCodesPanel({
  workplaceId,
  disabled = false,
}: EmployerEnrollmentCodesPanelProps) {
  return (
    <WorkplaceEnrollmentCodesPanel
      workplaceId={workplaceId}
      disabled={disabled}
      compact
      className="mt-4"
    />
  );
}
