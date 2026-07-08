import { supabase } from "@/integrations/supabase/client";

const WORKPLACE_NAME_KEY = "workplace_name_text";
const WORKPLACE_EMAIL_KEY = "workplace_contact_email_text";
const WORKPLACE_LINKED_AT_KEY = "workplace_linked_at";

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

function isSchemaUnavailable(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("relation") ||
    message.includes("does not exist") ||
    message.includes("could not find the table")
  );
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

  const { error: workplaceError } = await supabase.from("workplace").upsert(
    {
      name_text: name,
      contact_email_text: email,
    } as never,
    { onConflict: "contact_email_text" },
  );

  if (workplaceError) {
    if (isSchemaUnavailable(workplaceError)) {
      return;
    }
    throw new Error(
      "Your workplace link was saved to your profile, but the shared workplace directory could not be updated.",
    );
  }
}

export function emptyWorkplaceForm(): WorkplaceFormState {
  return { ...EMPTY_FORM };
}
