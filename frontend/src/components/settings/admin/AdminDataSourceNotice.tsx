import {
  adminDataSourceNotice,
  type AdminDataSource,
} from "@/lib/settings/admin/adminDataSource";

type AdminDataSourceNoticeProps = {
  source: AdminDataSource;
  entityLabel: string;
};

export default function AdminDataSourceNotice({
  source,
  entityLabel,
}: AdminDataSourceNoticeProps) {
  const message = adminDataSourceNotice(source, entityLabel);
  if (!message) return null;

  return (
    <div
      role="status"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
    >
      {message}
    </div>
  );
}
