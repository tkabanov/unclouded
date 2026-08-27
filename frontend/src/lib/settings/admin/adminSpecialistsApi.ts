import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export const SPECIALIST_IMAGES_BUCKET = "specialist-images" as const;

export type SpecialistActiveFilter = "all" | "active" | "inactive";

export interface AdminSpecialistRecord {
  specialistId: string;
  name: string;
  email: string;
  imageUrl: string | null;
  bio: string;
  timezone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AdminSpecialistFormState = {
  name: string;
  email: string;
  bio: string;
  timezone: string;
  isActive: boolean;
  imageUrl: string | null;
};

type SpecialistRow = {
  id?: string;
  name?: string;
  email?: string;
  imageUrl?: string | null;
  bio?: string | null;
  timezone?: string | null;
  isActive?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
};

const SPECIALIST_SELECT =
  "id, name, email, imageUrl, bio, timezone, isActive, createdAt, updatedAt" as const;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeTimezone(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || null;
}

function toAdminSpecialist(row: SpecialistRow): AdminSpecialistRecord | null {
  if (!row.id) return null;
  const name = row.name?.trim();
  const email = row.email?.trim();
  if (!name || !email) return null;

  return {
    specialistId: row.id,
    name,
    email,
    imageUrl: row.imageUrl?.trim() || null,
    bio: row.bio?.trim() ?? "",
    timezone: normalizeTimezone(row.timezone),
    isActive: row.isActive ?? true,
    createdAt: row.createdAt ?? "",
    updatedAt: row.updatedAt ?? "",
  };
}

export function emptyAdminSpecialistForm(): AdminSpecialistFormState {
  return {
    name: "",
    email: "",
    bio: "",
    timezone: "",
    isActive: true,
    imageUrl: null,
  };
}

export function adminSpecialistToForm(
  specialist: AdminSpecialistRecord,
): AdminSpecialistFormState {
  return {
    name: specialist.name,
    email: specialist.email,
    bio: specialist.bio,
    timezone: specialist.timezone ?? "",
    isActive: specialist.isActive,
    imageUrl: specialist.imageUrl,
  };
}

function validateForm(form: AdminSpecialistFormState): {
  name: string;
  email: string;
  bio: string;
  timezone: string | null;
  isActive: boolean;
} {
  const name = form.name.trim();
  const email = normalizeEmail(form.email);
  if (!name) throw new Error("Name is required.");
  if (!email) throw new Error("Email is required.");
  if (!isValidEmail(email)) throw new Error("Enter a valid email address.");
  return {
    name,
    email,
    bio: form.bio.trim(),
    timezone: normalizeTimezone(form.timezone),
    isActive: form.isActive,
  };
}

function uniqueEmailError(error: { code?: string; message?: string }): Error {
  const message = error.message?.toLowerCase() ?? "";
  if (
    error.code === "23505" ||
    message.includes("specialist_email_unique") ||
    message.includes("duplicate key")
  ) {
    return new Error("A specialist with this email already exists.");
  }
  return new Error(error.message || "Couldn't save specialist.");
}

function activeToggleError(error: { message?: string }): Error {
  const message = error.message?.trim();
  if (message) return new Error(message);
  return new Error("Couldn't update specialist status.");
}

export async function fetchAdminSpecialists(
  activeFilter: SpecialistActiveFilter = "all",
): Promise<AdminSpecialistRecord[]> {
  const client = supabase as unknown as UntypedSupabase;
  let query = client
    .from("specialist")
    .select(SPECIALIST_SELECT)
    .order("name", { ascending: true });

  if (activeFilter === "active") {
    query = query.eq("isActive", true);
  } else if (activeFilter === "inactive") {
    query = query.eq("isActive", false);
  }

  const { data, error } = await query;
  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }
  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toAdminSpecialist(row as SpecialistRow))
    .filter((item): item is AdminSpecialistRecord => item !== null);
}

export async function createAdminSpecialist(
  form: AdminSpecialistFormState,
): Promise<AdminSpecialistRecord> {
  const validated = validateForm(form);
  const id = crypto.randomUUID();
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("specialist")
    .insert({
      id,
      name: validated.name,
      email: validated.email,
      bio: validated.bio,
      timezone: validated.timezone,
      isActive: validated.isActive,
      imageUrl: form.imageUrl,
    } as never)
    .select(SPECIALIST_SELECT)
    .single();

  if (error) throw uniqueEmailError(error);
  const created = toAdminSpecialist((data ?? {}) as SpecialistRow);
  if (!created) throw new Error("Failed to create specialist.");
  return created;
}

export async function updateAdminSpecialist(
  specialistId: string,
  form: AdminSpecialistFormState,
): Promise<void> {
  const validated = validateForm(form);
  const client = supabase as unknown as UntypedSupabase;

  // Persist profile fields without isActive; CL-10 guard goes through RPC.
  const { error } = await client
    .from("specialist")
    .update({
      name: validated.name,
      email: validated.email,
      bio: validated.bio,
      timezone: validated.timezone,
      imageUrl: form.imageUrl,
    } as never)
    .eq("id", specialistId);

  if (error) throw uniqueEmailError(error);

  await setSpecialistActive(specialistId, validated.isActive);
}

export async function setSpecialistActive(
  specialistId: string,
  isActive: boolean,
): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client.rpc("admin_set_specialist_active", {
    p_specialist_id: specialistId,
    p_is_active: isActive,
  });

  if (error) throw activeToggleError(error);

  const row = (data && typeof data === "object" ? data : {}) as {
    ok?: boolean;
    error?: string;
  };
  if (row.ok === false) {
    throw new Error(row.error || "Couldn't update specialist status.");
  }
}

export async function deleteAdminSpecialist(specialistId: string): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error: readError } = await client
    .from("specialist")
    .select("isActive")
    .eq("id", specialistId)
    .maybeSingle();

  if (readError) throw readError;
  if ((data as { isActive?: boolean } | null)?.isActive !== false) {
    throw new Error("Deactivate the specialist before deleting.");
  }

  const { error } = await client.from("specialist").delete().eq("id", specialistId);
  if (error) throw error;
}

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export async function uploadSpecialistImage(
  specialistId: string,
  file: File,
): Promise<string> {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const ext = extensionForMime(file.type);
  const path = `${specialistId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(SPECIALIST_IMAGES_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(SPECIALIST_IMAGES_BUCKET).getPublicUrl(path);
  const imageUrl = data.publicUrl;

  const client = supabase as unknown as UntypedSupabase;
  const { error: updateError } = await client
    .from("specialist")
    .update({ imageUrl } as never)
    .eq("id", specialistId);
  if (updateError) throw updateError;

  return imageUrl;
}
