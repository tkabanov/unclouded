/**
 * Canonical app origin for auth redirects (password reset, email confirm).
 * Prefer VITE_APP_URL so emails always point at a stable URL, not whatever
 * origin happened to be open when the user clicked "Forgot password".
 */
export function getAppOrigin(): string {
  const configured = import.meta.env.VITE_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return window.location.origin;
}
