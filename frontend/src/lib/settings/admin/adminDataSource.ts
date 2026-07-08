export type AdminDataSource = "table" | "onboarding" | "static";

export function adminDataSourceNotice(source: AdminDataSource, entityLabel: string): string | null {
  if (source === "table") return null;

  if (source === "onboarding") {
    return `Showing ${entityLabel} from your profile onboarding_data fallback — changes stay local until database tables are available.`;
  }

  return `Showing demo ${entityLabel} — apply Supabase migrations and set role_type = 'admin' on a profile for shared admin writes.`;
}
