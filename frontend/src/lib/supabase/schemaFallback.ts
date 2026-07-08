/** Shared helpers for optional Supabase tables / columns (brownfield demo fallbacks). */

export function isSchemaUnavailable(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (error.code === "42703" && message.includes("column")) ||
    message.includes("relation") ||
    message.includes("does not exist") ||
    message.includes("could not find the table")
  );
}

export function parseBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "yes";
}
