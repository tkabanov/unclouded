-- Harden profiles_protect_entitlement_columns(): NULL-safe GUC check on INSERT.
-- PM REVIEW REQUIRED — do NOT apply until PM accepts this SQL.
--
-- Problem: current_setting('app.billing_sync', true) returns NULL when the GUC was never set in the
-- session, so `NULL <> 'true' AND NULL <> 'true'` is NULL and the INSERT reset was skipped.
-- The "Owner inserts profile" policy already rejects subscribed=true / non-free tier, but it does NOT
-- cover "accountType" / "enterpriseTier" / "enrollmentDate": a client that deletes its own profile
-- (owner DELETE policy) and re-inserts could self-assign enterprise entitlement.
-- Fix: coalesce(..., '') (same pattern as profiles_protect_admin_role). Only the INSERT branch changes;
-- the UPDATE branch already uses `= 'true'` (NULL-safe) and is kept verbatim.

CREATE OR REPLACE FUNCTION public.profiles_protect_entitlement_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF coalesce(current_setting('app.billing_sync', true), '') <> 'true'
       AND coalesce(current_setting('app.enterprise_sync', true), '') <> 'true' THEN
      NEW.subscribed := false;
      NEW.tier := 'free';
      NEW."accountType" := 'individual';
      NEW."enterpriseTier" := NULL;
      NEW."enrollmentDate" := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF current_setting('app.enterprise_sync', true) = 'true' THEN
      RETURN NEW;
    END IF;

    IF NEW.subscribed IS DISTINCT FROM OLD.subscribed
       OR NEW.tier IS DISTINCT FROM OLD.tier THEN
      IF current_setting('app.billing_sync', true) = 'true' THEN
        NULL;
      ELSE
        NEW.subscribed := OLD.subscribed;
        NEW.tier := OLD.tier;
      END IF;
    END IF;

    IF NEW."accountType" IS DISTINCT FROM OLD."accountType"
       OR NEW."enterpriseTier" IS DISTINCT FROM OLD."enterpriseTier"
       OR NEW."enrollmentDate" IS DISTINCT FROM OLD."enrollmentDate"
       OR NEW."workplaceId" IS DISTINCT FROM OLD."workplaceId" THEN
      NEW."accountType" := OLD."accountType";
      NEW."enterpriseTier" := OLD."enterpriseTier";
      NEW."enrollmentDate" := OLD."enrollmentDate";
      NEW."workplaceId" := OLD."workplaceId";
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
