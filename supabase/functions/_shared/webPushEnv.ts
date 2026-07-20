/** VAPID env detection — no npm imports (safe for frontend tests). */

function trimEnv(name: string): string | null {
  const denoValue =
    typeof Deno !== "undefined" ? Deno.env.get(name)?.trim() : undefined;
  const nodeValue =
    typeof process !== "undefined" ? process.env[name]?.trim() : undefined;
  const value = denoValue ?? nodeValue;
  return value || null;
}

export function isWebPushConfigured(): boolean {
  return Boolean(
    trimEnv("VAPID_PUBLIC_KEY") &&
      trimEnv("VAPID_PRIVATE_KEY") &&
      trimEnv("VAPID_SUBJECT"),
  );
}

export function getWebPushConfig(): {
  publicKey: string;
  privateKey: string;
  subject: string;
} | null {
  const publicKey = trimEnv("VAPID_PUBLIC_KEY");
  const privateKey = trimEnv("VAPID_PRIVATE_KEY");
  const subject = trimEnv("VAPID_SUBJECT");
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}
