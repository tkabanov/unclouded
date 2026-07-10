"""Generate Supabase migration SQL from drsam-99657.bubble user_types."""
import json
from pathlib import Path

BUBBLE_PATH = Path(__file__).resolve().parents[1] / "drsam-99657.bubble"
OUT_PATH = Path(__file__).resolve().parents[1] / "supabase" / "migrations" / "20260709140000_bubble_schema_from_drsam.sql"

TABLE_NAMES = {
    "subscriptionplan": "subscription_plan",
    "journalentry": "uds_journalentry",
    "milestone": "uds_milestone",
    "relapseevent": "uds_relapseevent",
}


def bubble_table(ref: str) -> str:
    return TABLE_NAMES.get(ref, ref)


def sql_table_name(tbl: str) -> str:
    return f'"{tbl}"' if tbl == "user" else tbl


def pg_type(field_id: str, value: str | None) -> str:
    if value == "text":
        return "TEXT"
    if value == "number":
        return "NUMERIC"
    if value == "boolean":
        return "BOOLEAN"
    if value == "date":
        return "TIMESTAMPTZ"
    if value == "user":
        return "UUID"
    if value and value.startswith("custom."):
        return "UUID"
    if value and (value.startswith("option.") or value.startswith("list.option.")):
        return "TEXT"
    if value and value.startswith("list.custom."):
        return "JSONB"
    if value and value.startswith("list.text"):
        return "JSONB"
    if field_id.endswith("_text"):
        return "TEXT"
    if field_id.endswith("_number"):
        return "NUMERIC"
    if field_id.endswith("_boolean"):
        return "BOOLEAN"
    if field_id.endswith("_date"):
        return "TIMESTAMPTZ"
    return "TEXT"


def fk_target(field_id: str, value: str | None) -> str | None:
    if value == "user":
        return "auth.users(id)"
    if value and value.startswith("custom."):
        ref = value.split(".", 1)[1]
        return f"public.{bubble_table(ref)}(id)"
    return None


def main() -> None:
    with BUBBLE_PATH.open(encoding="utf-8") as f:
        d = json.load(f)

    user_types = d["user_types"]
    lines: list[str] = [
        "-- Recreate Bubble (drsam-99657) data model in Supabase",
        "-- Generated from drsam-99657.bubble user_types",
        "",
        "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
        "",
    ]

    drop_order = [
        "checkintag",
        "chatmessage",
        "pathuseranswer",
        "pathquestion",
        "pathenrollment1",
        "pathenrollment",
        "pathsession",
        "module",
        "dailycheckin",
        "journalentry",
        "milestone",
        "relapseevent",
        "chatconversation",
        "guidedpath",
        "path",
        "resource",
        "subscriptionplan",
        "workplace",
        "user",
    ]
    for ref in drop_order:
        tbl = bubble_table(ref)
        lines.append(f"DROP TABLE IF EXISTS public.{sql_table_name(tbl)} CASCADE;")
    lines.append("DROP TABLE IF EXISTS public.journal_entries CASCADE;")
    lines.append("")

    created_tables: list[str] = []
    create_order = [
        "workplace",
        "subscriptionplan",
        "guidedpath",
        "path",
        "pathsession",
        "pathquestion",
        "resource",
        "user",
        "chatconversation",
        "chatmessage",
        "dailycheckin",
        "checkintag",
        "journalentry",
        "milestone",
        "relapseevent",
        "pathenrollment",
        "pathenrollment1",
        "pathuseranswer",
        "module",
    ]

    for ref in create_order:
        if ref not in user_types or ref == "chat":
            continue
        ut = user_types[ref]
        fields = ut.get("fields") or {}
        tbl = bubble_table(ref)
        col_defs = ["  id UUID PRIMARY KEY DEFAULT gen_random_uuid()"]
        fk_defs: list[str] = []

        for fid, fdef in fields.items():
            v = fdef.get("value")
            col = pg_type(fid, v)
            col_defs.append(f"  {fid} {col} NULL")
            fk = fk_target(fid, v)
            if fk:
                on_delete = (
                    "ON DELETE CASCADE"
                    if fid in ("user_user",) or v == "user"
                    else "ON DELETE SET NULL"
                )
                fk_defs.append(
                    f"ALTER TABLE public.{sql_table_name(tbl)} ADD CONSTRAINT {tbl}_{fid}_fkey "
                    f"FOREIGN KEY ({fid}) REFERENCES {fk} {on_delete};"
                )

        if ref == "user":
            col_defs[0] = "  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE"
        if ref == "subscriptionplan":
            col_defs[0] = "  id TEXT PRIMARY KEY"
            col_defs.append("  tier_slug TEXT NULL")

        col_defs.append("  created_at TIMESTAMPTZ NOT NULL DEFAULT now()")
        col_defs.append("  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()")

        lines.append(f"CREATE TABLE public.{sql_table_name(tbl)} (")
        lines.append(",\n".join(col_defs))
        lines.append(");")
        lines.append("")
        lines.extend(fk_defs)
        if fk_defs:
            lines.append("")
        created_tables.append(tbl)

    lines.extend(
        [
            "-- Legacy journal_entries table (privacy export + preview fallbacks)",
            "CREATE TABLE public.journal_entries (",
            "  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),",
            "  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,",
            "  title TEXT NOT NULL DEFAULT '',",
            "  body TEXT NOT NULL DEFAULT '',",
            "  mood TEXT,",
            "  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),",
            "  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()",
            ");",
            "",
            "-- Bubble user fields surfaced on profiles for the React app",
        ]
    )

    profile_additions = [
        ("is_admin_boolean", "BOOLEAN", "false"),
        ("daily_check_in_streak_number", "NUMERIC", "0"),
        ("streak_days_number", "NUMERIC", "0"),
        ("ai_confidence_level_option_ai_confidence_level_os", "TEXT", None),
        ("classification_option_classification_os", "TEXT", None),
        ("customer_role_option_customer_role_os", "TEXT", None),
        ("tier_option_tier_os", "TEXT", None),
        ("notification_frequency_text", "TEXT", None),
        ("check_in_frequency_text", "TEXT", None),
        ("preferences_text", "TEXT", None),
        ("behavioral_fingerprint_text", "TEXT", None),
        ("pressure_profile_text", "TEXT", None),
        ("alignment_score_number", "NUMERIC", None),
        ("orientation_score_number", "NUMERIC", None),
        ("performance_score_number", "NUMERIC", None),
        ("stability_score_number", "NUMERIC", None),
        ("workplace_custom_workplace", "UUID", None),
    ]
    for col_name, col_type, default in profile_additions:
        default_clause = f" DEFAULT {default}" if default is not None else ""
        lines.append(
            f"ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS {col_name} {col_type}{default_clause};"
        )

    lines.append(
        """
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_workplace_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_workplace_fkey
  FOREIGN KEY (workplace_custom_workplace) REFERENCES public.workplace(id) ON DELETE SET NULL;
"""
    )

    lines.append(
        """
CREATE OR REPLACE FUNCTION public.bubble_user_owns_row(owner UUID)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT auth.uid() IS NOT NULL AND auth.uid() = owner;
$$;
"""
    )

    for tbl in created_tables:
        qtbl = sql_table_name(tbl)
        lines.append(f"ALTER TABLE public.{qtbl} ENABLE ROW LEVEL SECURITY;")
        lines.append(f"GRANT SELECT, INSERT, UPDATE, DELETE ON public.{qtbl} TO authenticated;")
        lines.append(f"GRANT ALL ON public.{qtbl} TO service_role;")

    user_owned = [
        "chatconversation",
        "chatmessage",
        "dailycheckin",
        "uds_journalentry",
        "uds_milestone",
        "uds_relapseevent",
        "pathenrollment1",
        "pathenrollment",
        "pathuseranswer",
        "module",
    ]
    public_read = [
        "path",
        "pathsession",
        "pathquestion",
        "resource",
        "guidedpath",
        "subscription_plan",
        "workplace",
    ]

    lines.append("")
    for tbl in user_owned:
        lines.append(
            f'CREATE POLICY "Owner manages {tbl}" ON public.{tbl} FOR ALL TO authenticated '
            f"USING (public.bubble_user_owns_row(user_user)) "
            f"WITH CHECK (public.bubble_user_owns_row(user_user));"
        )

    lines.append(
        'CREATE POLICY "Owner manages checkintag" ON public.checkintag FOR ALL TO authenticated USING (true) WITH CHECK (true);'
    )

    for tbl in public_read:
        lines.append(
            f'CREATE POLICY "Authenticated read {tbl}" ON public.{tbl} FOR SELECT TO authenticated USING (true);'
        )

    for tbl in ["path", "resource", "subscription_plan", "workplace", "pathsession", "pathquestion", "guidedpath"]:
        lines.append(
            f'CREATE POLICY "Settings admins write {tbl}" ON public.{tbl} FOR ALL TO authenticated '
            f"USING (public.is_settings_admin()) WITH CHECK (public.is_settings_admin());"
        )

    lines.append(
        'CREATE POLICY "Users manage own user row" ON public."user" FOR ALL TO authenticated '
        "USING (auth.uid() = id) WITH CHECK (auth.uid() = id);"
    )

    lines.extend(
        [
            "ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;",
            'CREATE POLICY "Users manage own journal_entries" ON public.journal_entries FOR ALL TO authenticated '
            "USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);",
            "GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;",
            "",
            """CREATE OR REPLACE FUNCTION public.handle_new_user_bubble()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public."user" (id, name_text, first_name_text)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_bubble ON auth.users;
CREATE TRIGGER on_auth_user_created_bubble
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_bubble();

INSERT INTO public."user" (id, name_text, first_name_text)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'first_name', ''),
  COALESCE(u.raw_user_meta_data ->> 'first_name', '')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
""",
        ]
    )

    for tbl in created_tables:
        if tbl == "user":
            lines.append(
                f"""
DROP TRIGGER IF EXISTS update_user_updated_at ON public."user";
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON public."user"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
"""
            )
        else:
            lines.append(
                f"""
DROP TRIGGER IF EXISTS update_{tbl}_updated_at ON public.{tbl};
CREATE TRIGGER update_{tbl}_updated_at BEFORE UPDATE ON public.{tbl}
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
"""
            )

    lines.extend(
        [
            "CREATE INDEX IF NOT EXISTS idx_chatmessage_conversation ON public.chatmessage (conversation_custom_chatconversation);",
            "CREATE INDEX IF NOT EXISTS idx_chatmessage_user ON public.chatmessage (user_user);",
            "CREATE INDEX IF NOT EXISTS idx_chatconversation_user ON public.chatconversation (user_user);",
            "CREATE INDEX IF NOT EXISTS idx_dailycheckin_user_date ON public.dailycheckin (user_user, date_date DESC);",
            "CREATE INDEX IF NOT EXISTS idx_uds_journalentry_user ON public.uds_journalentry (user_user, created_at DESC);",
            "CREATE INDEX IF NOT EXISTS idx_pathenrollment1_user ON public.pathenrollment1 (user_user);",
            "CREATE INDEX IF NOT EXISTS idx_pathsession_path ON public.pathsession (path_custom_path);",
            "CREATE INDEX IF NOT EXISTS idx_pathquestion_session ON public.pathquestion (session_custom_pathsession);",
            "",
            """INSERT INTO public.subscription_plan (id, name_text, price_number, description_text, features_text, tier_slug)
VALUES
  ('free', 'Free', 0, 'Everything you need to get started with AI coaching.',
   E'AI coaching chat (limited)\\nDaily check-ins & journal\\nFree guided paths\\nCrisis resources always available', 'free'),
  ('pro', 'Pro', 29, 'Deeper coaching, richer insights, and your 90-day reassessment.',
   E'Unlimited AI coaching chat\\nAll guided paths & resources\\nAI journal reflections\\n90-day reassessment to track progress\\nAdvanced insights & milestones\\nPriority support', 'pro'),
  ('premium', 'Premium', 0, '1:1 human coaching with the Proven Under Pressure team, matched to your PuP 360 data.',
   E'Everything in Pro\\n1:1 sessions with the Proven Under Pressure coaching team\\nLed & certified by Dr. Sam\\nCoach matched to your PuP 360 data\\nPersonalized between-session support', 'premium')
ON CONFLICT (id) DO NOTHING;
""",
        ]
    )

    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size} bytes)")
    print(f"Tables: {len(created_tables)}")


if __name__ == "__main__":
    main()
