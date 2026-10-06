import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = resolve(
  import.meta.dirname,
  "../../../../supabase/migrations/20261006120000_protect_profiles_admin_role.sql",
);
const PROOF_PATH = resolve(
  import.meta.dirname,
  "../../../../supabase/tests/profiles_admin_role_guard_proof.sql",
);

describe("profiles admin role guard migration security contract", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

  it("installs a BEFORE INSERT OR UPDATE row trigger on profiles", () => {
    expect(sql).toMatch(
      /CREATE TRIGGER profiles_protect_admin_role\s+BEFORE INSERT OR UPDATE ON public\.profiles\s+FOR EACH ROW/,
    );
  });

  it("bypasses only for service_role JWT, no-JWT privileged sessions, or explicit opt-in", () => {
    expect(sql).toMatch(/current_setting\('app\.role_admin_sync', true\), ''\) = 'true'/);
    expect(sql).toMatch(/v_jwt_role = 'service_role'/);
    expect(sql).toMatch(
      /v_jwt_role IS NULL AND current_user NOT IN \('authenticated', 'anon'\)/,
    );
  });

  it("is not SECURITY DEFINER (current_user must reflect the caller)", () => {
    const fn = sql.slice(sql.indexOf("FUNCTION public.profiles_protect_admin_role()"));
    expect(fn.slice(0, fn.indexOf("$$"))).not.toMatch(/SECURITY DEFINER/);
  });

  it("keeps OLD roleType on admin transitions instead of raising", () => {
    expect(sql).toMatch(/NEW\."roleType" := OLD\."roleType";/);
    expect(sql).not.toMatch(/RAISE EXCEPTION/);
  });

  it("clears admin roleType on INSERT and guards the roleTypes array", () => {
    expect(sql).toMatch(/IF TG_OP = 'INSERT' THEN[\s\S]*?NEW\."roleType" := NULL;/);
    expect(sql).toMatch(/NEW\."roleTypes" := ARRAY\(/);
  });

  it("matches admin case- and whitespace-insensitively", () => {
    expect(sql).toMatch(/lower\(btrim\(coalesce\(p_value, ''\)\)\) = 'admin'/);
  });
});

describe("profiles admin role guard proof", () => {
  const proof = readFileSync(PROOF_PATH, "utf8");

  it("is wrapped in a transaction that is rolled back", () => {
    expect(proof).toMatch(/^BEGIN;/m);
    expect(proof.trimEnd()).toMatch(/ROLLBACK;$/);
    expect(proof).not.toMatch(/^COMMIT;/m);
  });

  it("covers normal user, existing admin, and service_role paths", () => {
    expect(proof).toMatch(/FAIL 1a: authenticated user promoted self to admin/);
    expect(proof).toMatch(/FAIL 1b: is_settings_admin\(\) true after self-promotion attempt/);
    expect(proof).toMatch(/FAIL 2a: admin demoted by own profile save/);
    expect(proof).toMatch(/SET LOCAL ROLE service_role;/);
    expect(proof).toMatch(/FAIL 3a: service_role could not promote to admin/);
  });
});
