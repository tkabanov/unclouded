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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AdminSpecialistFormState = {
  name: string;
  email: string;
  bio: string;
  isActive: boolean;
  imageUrl: string | null;
};

type SpecialistRow = {
  id?: string;
  name?: string;
  email?: string;
  imageUrl?: string | null;
  bio?: string | null;
  isActive?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
    isActive: specialist.isActive,
    imageUrl: specialist.imageUrl,
  };
}

function validateForm(form: AdminSpecialistFormState): {
  name: string;
  email: string;
  bio: string;
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

export async function fetchAdminSpecialists(
  activeFilter: SpecialistActiveFilter = "all",
): Promise<AdminSpecialistRecord[]> {
  const client = supabase as unknown as UntypedSupabase;
  let query = client
    .from("specialist")
    .select("id, name, email, imageUrl, bio, isActive, createdAt, updatedAt")
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
      isActive: validated.isActive,
      imageUrl: form.imageUrl,
    } as never)
    .select("id, name, email, imageUrl, bio, isActive, createdAt, updatedAt")
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
  const { error } = await client
    .from("specialist")
    .update({
      name: validated.name,
      email: validated.email,
      bio: validated.bio,
      isActive: validated.isActive,
      imageUrl: form.imageUrl,
    } as never)
    .eq("id", specialistId);

  if (error) throw uniqueEmailError(error);
}

export async function setSpecialistActive(
  specialistId: string,
  isActive: boolean,
): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client
    .from("specialist")
    .update({ isActive } as never)
    .eq("id", specialistId);
  if (error) throw error;
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
