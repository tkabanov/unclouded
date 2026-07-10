import { z } from "zod";
import { getAppOrigin } from "@/lib/appUrl";
import { supabase } from "@/integrations/supabase/client";

export const authCredentialsSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(72),
});

export const authEmailSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
});

export function getSignUpEmailRedirectUrl(): string {
  return getAppOrigin();
}

export type SignUpUserMetadata = Record<string, string>;

export async function signInWithEmailPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithEmailPassword(
  email: string,
  password: string,
  metadata?: SignUpUserMetadata,
): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: getSignUpEmailRedirectUrl(),
      ...(metadata ? { data: metadata } : {}),
    },
  });
  if (error) throw error;
}

export function getSignInErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "Something went wrong";
  if (message.toLowerCase().includes("invalid login")) {
    return "Incorrect email or password.";
  }
  return message;
}

export type SignUpErrorKind = "already_registered" | "unknown";

export function getSignUpErrorKind(err: unknown): SignUpErrorKind {
  const message = err instanceof Error ? err.message : "";
  if (message.toLowerCase().includes("already registered")) {
    return "already_registered";
  }
  return "unknown";
}

export function getSignUpErrorMessage(err: unknown): string {
  if (getSignUpErrorKind(err) === "already_registered") {
    return "This email is already registered. Try signing in instead.";
  }
  return err instanceof Error ? err.message : "Something went wrong";
}
