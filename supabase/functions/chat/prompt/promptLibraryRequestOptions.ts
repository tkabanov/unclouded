import type { ResolvePromptLibraryOptions } from "./loadPromptLibraryVersion.ts";

type HeaderReader = { get(name: string): string | null };

/**
 * Prompt Library layers are resolved with the service-role client, so RLS no longer blocks
 * non-admins from draft or arbitrary versions. Draft slot / explicit version are admin-only;
 * everyone else always gets the production version.
 */
export function resolvePromptLibraryRequestOptions(
  profile: { roleType?: unknown } | null | undefined,
  headers: HeaderReader,
  body: { promptLibraryVersionId?: string | null },
  envPreferDraft = false,
): Pick<ResolvePromptLibraryOptions, "versionId" | "preferDraft"> {
  if (profile?.roleType !== "admin") {
    return { versionId: null, preferDraft: false };
  }
  return {
    versionId: body.promptLibraryVersionId ?? null,
    preferDraft: envPreferDraft || headers.get("x-prompt-library-slot") === "draft",
  };
}
