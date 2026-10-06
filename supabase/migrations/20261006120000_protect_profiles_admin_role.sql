-- Security: block self-promotion to platform admin via profiles."roleType" / "roleTypes".
-- PM REVIEW REQUIRED — do NOT apply until PM accepts this SQL.
--
-- "Owner updates profile" lets authenticated users UPDATE any column of their own row, and
-- public.is_settings_admin() / edge functions trust "roleType" = 'admin'. A column-level REVOKE
-- does not help while authenticated holds a table-level UPDATE grant, so this is enforced by trigger.
--
-- Non-privileged callers (authenticated / anon JWT, including inside SECURITY DEFINER RPCs they call):
--   * INSERT: an admin "roleType" is cleared to NULL; admin entries are stripped from "roleTypes".
--   * UPDATE: "roleType" cannot change to or from admin — the OLD value is kept silently, so an existing
--     admin saving Settings → Profile (which writes a customer role slug) stays admin.
--     Admin entries in "roleTypes" are kept exactly as in OLD; customer roles update normally.
-- Privileged callers (unchanged behavior):
--   * service_role JWT (admin-users edge, scripts/seed_platform_admin_test_user.mjs);
--   * direct DB sessions without a JWT that are not authenticated/anon (SQL editor, migrations);
--   * explicit opt-in: set_config('app.role_admin_sync', 'true', true) inside a trusted function.
-- Admin matching is case/whitespace-insensitive so 'Admin' / ' admin ' cannot be smuggled in.

CREATE OR REPLACE FUNCTION public.profiles_role_value_is_admin(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(btrim(coalesce(p_value, ''))) = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.profiles_protect_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_jwt_role text := nullif(auth.role(), '');
  v_new_admin_entries text[];
  v_old_admin_entries text[] := '{}';
BEGIN
  IF coalesce(current_setting('app.role_admin_sync', true), '') = 'true'
     OR v_jwt_role = 'service_role'
     OR (v_jwt_role IS NULL AND current_user NOT IN ('authenticated', 'anon')) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF public.profiles_role_value_is_admin(NEW."roleType") THEN
      NEW."roleType" := NULL;
    END IF;
  ELSE
    IF NEW."roleType" IS DISTINCT FROM OLD."roleType"
       AND (public.profiles_role_value_is_admin(NEW."roleType")
            OR public.profiles_role_value_is_admin(OLD."roleType")) THEN
      NEW."roleType" := OLD."roleType";
    END IF;

    v_old_admin_entries := ARRAY(
      SELECT r FROM unnest(OLD."roleTypes") AS r
      WHERE public.profiles_role_value_is_admin(r)
    );
  END IF;

  v_new_admin_entries := ARRAY(
    SELECT r FROM unnest(NEW."roleTypes") AS r
    WHERE public.profiles_role_value_is_admin(r)
  );

  IF v_new_admin_entries IS DISTINCT FROM v_old_admin_entries THEN
    NEW."roleTypes" := ARRAY(
      SELECT r FROM unnest(NEW."roleTypes") WITH ORDINALITY AS t(r, ord)
      WHERE NOT public.profiles_role_value_is_admin(r)
      ORDER BY ord
    ) || v_old_admin_entries;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_admin_role ON public.profiles;
CREATE TRIGGER profiles_protect_admin_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_protect_admin_role();

REVOKE ALL ON FUNCTION public.profiles_protect_admin_role() FROM PUBLIC, anon, authenticated;
