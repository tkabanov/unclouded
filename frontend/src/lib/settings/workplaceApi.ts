import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

const WORKPLACE_NAME_KEY = "workplace_name_text";
const WORKPLACE_EMAIL_KEY = "workplace_contact_email_text";
const WORKPLACE_LINKED_AT_KEY = "workplace_linked_at";

/** Bubble ai_RNbBHYYP — workplace card title. */
export const WORKPLACE_CARD_TITLE = "Workplace" as const;

/** Bubble ai_RNbBHYYQ — workplace card subtitle. */
export const WORKPLACE_CARD_SUBTITLE =
  "Link your employer account to unlock Pro-level coaching. Your employer will only ever see anonymized, aggregated insights — never your personal data." as const;

/** Bubble ai_RNbBHYYT — workplace privacy notice copy. */
export const WORKPLACE_PRIVACY_TEXT =
  "Your chats, journals, check-ins, and all personal entries remain 100% private. Your employer only receives anonymized, group-level trends — no individual data is ever shared." as const;

/** Bubble ai_RNbBHYYW — workplace name label. */
export const WORKPLACE_NAME_LABEL = "Organization Name" as const;

/** Bubble ai_RNbBHYYX — workplace name input placeholder. */
export const WORKPLACE_NAME_PLACEHOLDER = "Your employer or organization name" as const;

/** Bubble ai_RNbBHYYZ — workplace email label. */
export const WORKPLACE_EMAIL_LABEL = "Workplace Contact Email" as const;

/** Bubble ai_RNbBHYYa — workplace email input placeholder. */
export const WORKPLACE_EMAIL_PLACEHOLDER = "hr@yourcompany.com" as const;

/** Bubble ai_RNbBHYYb — workplace link button label. */
export const WORKPLACE_LINK_BTN_LABEL = "Link Workplace Account" as const;

export type WorkplaceFormState = {
  name: string;
  email: string;
};

export type WorkplaceLinkState = WorkplaceFormState & {
  linkedAt: string | null;
};

const EMPTY_FORM: WorkplaceFormState = {
  name: "",
  email: "",
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function parseWorkplaceFromOnboarding(
  onboarding: Record<string, unknown> | null | undefined,
): WorkplaceLinkState {
  const data = onboarding ?? {};
  return {
    name: typeof data[WORKPLACE_NAME_KEY] === "string" ? data[WORKPLACE_NAME_KEY] : "",
    email: typeof data[WORKPLACE_EMAIL_KEY] === "string" ? data[WORKPLACE_EMAIL_KEY] : "",
    linkedAt:
      typeof data[WORKPLACE_LINKED_AT_KEY] === "string" ? data[WORKPLACE_LINKED_AT_KEY] : null,
  };
}

export async function loadWorkplaceLink(userId: string): Promise<WorkplaceLinkState> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_data")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const onboarding =
    (data?.onboarding_data as Record<string, unknown> | null | undefined) ?? {};
  return parseWorkplaceFromOnboarding(onboarding);
}

function validateWorkplaceForm(form: WorkplaceFormState): void {
  const name = form.name.trim();
  const email = form.email.trim();

  if (!name) {
    throw new Error("Workplace name is required.");
  }
  if (!email) {
    throw new Error("Workplace contact email is required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid workplace contact email.");
  }
}

function isRlsOrPermissionDenied(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42501" ||
    message.includes("row-level security") ||
    message.includes("permission denied")
  );
}

function workplaceUpsertErrorMessage(error: { code?: string; message?: string }): string {
  if (isRlsOrPermissionDenied(error)) {
    return "Your workplace link was saved to your profile, but the shared workplace directory is not writable for your account. Ask an admin to apply workplace RLS policies.";
  }
  if (error.message?.trim()) {
    return `Your workplace link was saved to your profile, but the shared workplace directory could not be updated: ${error.message.trim()}`;
  }
  return "Your workplace link was saved to your profile, but the shared workplace directory could not be updated.";
}

async function upsertWorkplaceDirectory(name: string, email: string): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client.from("workplace").upsert(
    {
      name_text: name,
      contact_email_text: email,
    } as never,
    { onConflict: "contact_email_text" },
  );

  if (!error) return;

  if (isSchemaUnavailable(error)) {
    return;
  }

  throw new Error(workplaceUpsertErrorMessage(error));
}

export async function linkWorkplace(userId: string, form: WorkplaceFormState): Promise<void> {
  validateWorkplaceForm(form);

  const name = form.name.trim();
  const email = form.email.trim();
  const linkedAt = new Date().toISOString();

  const { data, error: readError } = await supabase
    .from("profiles")
    .select("onboarding_data")
    .eq("id", userId)
    .maybeSingle();

  if (readError) throw readError;

  const onboarding =
    (data?.onboarding_data as Record<string, unknown> | null | undefined) ?? {};

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_data: {
        ...onboarding,
        [WORKPLACE_NAME_KEY]: name,
        [WORKPLACE_EMAIL_KEY]: email,
        [WORKPLACE_LINKED_AT_KEY]: linkedAt,
        workplace_custom_workplace: name,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;

  await upsertWorkplaceDirectory(name, email);
}

export function emptyWorkplaceForm(): WorkplaceFormState {
  return { ...EMPTY_FORM };
}
