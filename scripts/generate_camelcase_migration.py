"""Generate Supabase migration: rename Bubble artifact tables/columns to camelCase."""
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "supabase" / "migrations" / "20260709180000_camelcase_schema_rename.sql"

# table -> { old_col: new_col }
TABLE_COLUMNS: dict[str, dict[str, str]] = {
    "chatconversation": {
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "title_text": "title",
        "user_user": "userId",
    },
    "chatmessage": {
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "content_text": "content",
        "conversation_custom_chatconversation": "conversationId",
        "is_from_user_boolean": "isFromUser",
        "responce_received_boolean": "responseReceived",
        "sender_text": "sender",
        "user_user": "userId",
    },
    "dailycheckin": {
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "date_date": "date",
        "energy_stress_level_number": "energyStressLevel",
        "mood_number": "mood",
        "reflection_text": "reflection",
        "user_user": "userId",
    },
    "path": {
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "ai_coaching_mode_option_ai_coaching_mode_os": "aiCoachingMode",
        "classification_list_list_option_classification_os": "classifications",
        "description_text": "description",
        "name_text": "name",
        "pillar_option_customer_pillar_os": "pillar",
        "sessions_count_number": "sessionsCount",
        "sub_mode_text": "subMode",
        "tier_option_tier_os": "tier",
        "trigger_signals_text": "triggerSignals",
    },
    "pathenrollment1": {
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "completed_micro_commitment_session_list_list_custom_pathsession": "completedMicroCommitmentSessionIds",
        "completed_sessions_count_number": "completedSessionsCount",
        "current_session_custom_pathsession": "currentSessionId",
        "focused_m_commitment_custom_pathsession": "focusedMicroCommitmentSessionId",
        "is_m_commitment_in_focus_boolean": "isMicroCommitmentInFocus",
        "path_custom_path": "pathId",
        "status_option_path_enrollment_status": "status",
        "user_user": "userId",
    },
    "pathquestion": {
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "index_number": "index",
        "q_text_text": "questionText",
        "session_custom_pathsession": "sessionId",
    },
    "pathsession": {
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "coaching_text_text": "coachingText",
        "estimated_minutes_number": "estimatedMinutes",
        "index_number": "index",
        "micro_commitment_text": "microCommitment",
        "path_custom_path": "pathId",
        "title_text": "title",
    },
    "profiles": {
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "ai_confidence_level_option_ai_confidence_level_os": "aiConfidenceLevel",
        "alignment_score_number": "alignmentScore",
        "behavioral_fingerprint_text": "behavioralFingerprint",
        "check_in_frequency_text": "checkInFrequency",
        "classification_option_classification_os": "classification",
        "customer_role_option_customer_role_os": "customerRole",
        "daily_check_in_streak_number": "dailyCheckInStreak",
        "first_name": "firstName",
        "is_admin_boolean": "isAdmin",
        "notification_frequency_text": "notificationFrequency",
        "onboarding_completed": "onboardingCompleted",
        "onboarding_completed_at": "onboardingCompletedAt",
        "onboarding_data": "onboardingData",
        "orientation_score_number": "orientationScore",
        "performance_score_number": "performanceScore",
        "preferences_text": "preferences",
        "pressure_profile_text": "pressureProfile",
        "primary_pillar": "primaryPillar",
        "reassessment_completed_at": "reassessmentCompletedAt",
        "reassessment_data": "reassessmentData",
        "reassessment_reflections": "reassessmentReflections",
        "reassessment_results": "reassessmentResults",
        "role_type": "roleType",
        "stability_score_number": "stabilityScore",
        "streak_days_number": "streakDays",
        "tier_option_tier_os": "tier",
        "workplace_custom_workplace": "workplaceId",
    },
    "resource": {
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "content_text": "content",
        "external_link_text": "externalLink",
        "is_crisis_resource_boolean": "isCrisisResource",
        "is_free_boolean": "isFree",
        "primary_mode_tag_text": "primaryModeTag",
        "sensitivity_flag_text": "sensitivityFlag",
        "sub_mode_tag_text": "subModeTag",
        "title_text": "title",
    },
    "subscription_plan": {
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "description_text": "description",
        "features_text": "features",
        "name_text": "name",
        "price_number": "price",
        "tier_slug": "tierSlug",
    },
    "uds_journalentry": {
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "ai_reflection_text": "aiReflection",
        "content_text": "content",
        "mood_tag_text": "moodTag",
        "title_text": "title",
        "user_user": "userId",
    },
    "uds_milestone": {
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "achieved_at_date": "achievedAt",
        "description_text": "description",
        "title_text": "title",
        "user_user": "userId",
    },
    "uds_relapseevent": {
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "event_date_date": "eventDate",
        "notes_text": "notes",
        "user_user": "userId",
    },
    "workplace": {
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "contact_email_text": "contactEmail",
        "name_text": "name",
    },
}

TABLE_RENAMES: dict[str, str] = {
    "chatconversation": "chatConversation",
    "chatmessage": "chatMessage",
    "dailycheckin": "dailyCheckin",
    "pathenrollment1": "pathEnrollment",
    "pathquestion": "pathQuestion",
    "pathsession": "pathSession",
    "subscription_plan": "subscriptionPlan",
    "uds_journalentry": "journalEntry",
    "uds_milestone": "milestone",
    "uds_relapseevent": "relapseEvent",
}


def q(name: str) -> str:
    return f'"{name}"'


def main() -> None:
    lines: list[str] = [
        "-- Rename Bubble artifact table/column names to camelCase.",
        "-- Drops and recreates RLS policies and helper functions.",
        "",
    ]

    all_tables = list(TABLE_COLUMNS.keys())
    for tbl in all_tables:
        lines.append(f"DROP POLICY IF EXISTS \"Owner selects {tbl}\" ON public.{tbl};")
        lines.append(f"DROP POLICY IF EXISTS \"Owner inserts {tbl}\" ON public.{tbl};")
        lines.append(f"DROP POLICY IF EXISTS \"Owner updates {tbl}\" ON public.{tbl};")
        lines.append(f"DROP POLICY IF EXISTS \"Owner deletes {tbl}\" ON public.{tbl};")
        lines.append(f"DROP POLICY IF EXISTS \"Owner manages {tbl}\" ON public.{tbl};")
    for extra in [
        "Enrolled user selects pathsession",
        "Settings admin inserts pathsession",
        "Settings admin updates pathsession",
        "Settings admin deletes pathsession",
        "Enrolled user selects pathquestion",
        "Settings admin inserts pathquestion",
        "Settings admin updates pathquestion",
        "Settings admin deletes pathquestion",
        "Authenticated selects subscription_plan",
        "Settings admin inserts subscription_plan",
        "Settings admin updates subscription_plan",
        "Settings admin deletes subscription_plan",
        "Authenticated read pathsession",
        "Authenticated read pathquestion",
        "Settings admins write pathsession",
        "Settings admins write pathquestion",
        "Authenticated read subscription_plan",
        "Authenticated users can read subscription plans",
        "Settings admins write subscription_plan",
        "Settings admins can insert subscription plans",
        "Settings admins can update subscription plans",
        "Settings admins can delete subscription plans",
        "Authenticated users can insert subscription plans",
        "Authenticated users can update subscription plans",
        "Authenticated users can delete subscription plans",
        "Users can view their own profile",
        "Users can insert their own profile",
        "Users can update their own profile",
        "Users can delete their own profile",
        "Owner selects profile",
        "Owner inserts profile",
        "Owner updates profile",
        "Owner deletes profile",
    ]:
        for tbl in ["pathsession", "pathquestion", "subscription_plan", "profiles"]:
            lines.append(f"DROP POLICY IF EXISTS \"{extra}\" ON public.{tbl};")

    lines += [
        "",
        "DROP FUNCTION IF EXISTS public.bubble_user_owns_chatconversation(UUID);",
        "DROP FUNCTION IF EXISTS public.user_can_access_pathsession(UUID);",
        "DROP FUNCTION IF EXISTS public.user_can_access_pathquestion(UUID);",
        "",
    ]

    for tbl, cols in TABLE_COLUMNS.items():
        lines.append(f"-- columns: {tbl}")
        for old, new in cols.items():
            if old == new:
                continue
            lines.append(
                f"ALTER TABLE public.{tbl} RENAME COLUMN {old} TO {q(new)};"
            )
        lines.append("")

    lines.append("-- table renames")
    for old, new in TABLE_RENAMES.items():
        lines.append(f"ALTER TABLE public.{old} RENAME TO {q(new)};")
    lines.append("")

    lines += [
        "CREATE OR REPLACE FUNCTION public.userOwnsRow(owner UUID)",
        "RETURNS boolean",
        "LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public",
        "AS $$ SELECT auth.uid() IS NOT NULL AND owner IS NOT NULL AND auth.uid() = owner; $$;",
        "GRANT EXECUTE ON FUNCTION public.userOwnsRow(UUID) TO authenticated;",
        "",
        "CREATE OR REPLACE FUNCTION public.userOwnsChatConversation(conversation_id UUID)",
        "RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$",
        "  SELECT EXISTS (",
        "    SELECT 1 FROM public.\"chatConversation\" c",
        "    WHERE c.id = conversation_id AND public.userOwnsRow(c.\"userId\")",
        "  );",
        "$$;",
        "GRANT EXECUTE ON FUNCTION public.userOwnsChatConversation(UUID) TO authenticated;",
        "",
        "CREATE OR REPLACE FUNCTION public.userCanAccessPathSession(session_id UUID)",
        "RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$",
        "  SELECT public.is_settings_admin() OR EXISTS (",
        "    SELECT 1 FROM public.\"pathSession\" ps",
        "    JOIN public.\"pathEnrollment\" pe ON pe.\"pathId\" = ps.\"pathId\"",
        "    WHERE ps.id = session_id AND public.userOwnsRow(pe.\"userId\")",
        "  );",
        "$$;",
        "GRANT EXECUTE ON FUNCTION public.userCanAccessPathSession(UUID) TO authenticated;",
        "",
        "CREATE OR REPLACE FUNCTION public.userCanAccessPathQuestion(question_id UUID)",
        "RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$",
        "  SELECT public.is_settings_admin() OR EXISTS (",
        "    SELECT 1 FROM public.\"pathQuestion\" pq",
        "    JOIN public.\"pathSession\" ps ON ps.id = pq.\"sessionId\"",
        "    JOIN public.\"pathEnrollment\" pe ON pe.\"pathId\" = ps.\"pathId\"",
        "    WHERE pq.id = question_id AND public.userOwnsRow(pe.\"userId\")",
        "  );",
        "$$;",
        "GRANT EXECUTE ON FUNCTION public.userCanAccessPathQuestion(UUID) TO authenticated;",
        "",
        "DROP FUNCTION IF EXISTS public.bubble_user_owns_row(UUID);",
        "",
    ]

    owner_tables = [
        ("chatConversation", "userId"),
        ("chatMessage", "userId"),
        ("dailyCheckin", "userId"),
        ("pathEnrollment", "userId"),
        ("journalEntry", "userId"),
        ("milestone", "userId"),
        ("relapseEvent", "userId"),
    ]
    for tbl, col in owner_tables:
        c = q(col)
        t = q(tbl)
        for action, cmd in [
            ("selects", "SELECT"),
            ("inserts", "INSERT"),
            ("updates", "UPDATE"),
            ("deletes", "DELETE"),
        ]:
            using = f"public.userOwnsRow({c})"
            if cmd == "INSERT":
                lines.append(
                    f'CREATE POLICY "Owner inserts {tbl}" ON public.{t} FOR INSERT TO authenticated WITH CHECK ({using});'
                )
            elif cmd == "UPDATE":
                lines.append(
                    f'CREATE POLICY "Owner updates {tbl}" ON public.{t} FOR UPDATE TO authenticated USING ({using}) WITH CHECK ({using});'
                )
            elif cmd == "DELETE":
                lines.append(
                    f'CREATE POLICY "Owner deletes {tbl}" ON public.{t} FOR DELETE TO authenticated USING ({using});'
                )
            else:
                lines.append(
                    f'CREATE POLICY "Owner selects {tbl}" ON public.{t} FOR SELECT TO authenticated USING ({using});'
                )

    lines += [
        "",
        'CREATE POLICY "Owner selects chatMessage conv" ON public."chatMessage" FOR SELECT TO authenticated',
        '  USING (public.userOwnsRow("userId") AND ("conversationId" IS NULL OR public.userOwnsChatConversation("conversationId")));',
        'DROP POLICY IF EXISTS "Owner selects chatMessage" ON public."chatMessage";',
    ]
    # Fix: chatMessage needs special policies - drop generic and recreate
    lines = [l for l in lines if 'CREATE POLICY "Owner selects chatMessage"' not in l or "conv" in l]
    # Regenerate chatMessage policies properly at end
    chat_msg_policies = [
        'DROP POLICY IF EXISTS "Owner selects chatMessage conv" ON public."chatMessage";',
        'DROP POLICY IF EXISTS "Owner selects chatMessage" ON public."chatMessage";',
        'DROP POLICY IF EXISTS "Owner inserts chatMessage" ON public."chatMessage";',
        'DROP POLICY IF EXISTS "Owner updates chatMessage" ON public."chatMessage";',
        'DROP POLICY IF EXISTS "Owner deletes chatMessage" ON public."chatMessage";',
    ]
    conv_check = '("conversationId" IS NULL OR public.userOwnsChatConversation("conversationId"))'
    own = 'public.userOwnsRow("userId")'
    for p in chat_msg_policies:
        lines.append(p)
    for name, cmd in [
        ("selects", "SELECT"),
        ("inserts", "INSERT"),
        ("updates", "UPDATE"),
        ("deletes", "DELETE"),
    ]:
        if cmd == "INSERT":
            lines.append(
                f'CREATE POLICY "Owner inserts chatMessage" ON public."chatMessage" FOR INSERT TO authenticated WITH CHECK ({own} AND {conv_check});'
            )
        elif cmd == "UPDATE":
            lines.append(
                f'CREATE POLICY "Owner updates chatMessage" ON public."chatMessage" FOR UPDATE TO authenticated USING ({own} AND {conv_check}) WITH CHECK ({own} AND {conv_check});'
            )
        elif cmd == "DELETE":
            lines.append(
                f'CREATE POLICY "Owner deletes chatMessage" ON public."chatMessage" FOR DELETE TO authenticated USING ({own} AND {conv_check});'
            )
        else:
            lines.append(
                f'CREATE POLICY "Owner selects chatMessage" ON public."chatMessage" FOR SELECT TO authenticated USING ({own} AND {conv_check});'
            )

    # pathSession / pathQuestion / subscriptionPlan / profiles policies
    lines += [
        "",
        'CREATE POLICY "Enrolled user selects pathSession" ON public."pathSession" FOR SELECT TO authenticated USING (public.userCanAccessPathSession(id));',
        'CREATE POLICY "Settings admin inserts pathSession" ON public."pathSession" FOR INSERT TO authenticated WITH CHECK (public.is_settings_admin());',
        'CREATE POLICY "Settings admin updates pathSession" ON public."pathSession" FOR UPDATE TO authenticated USING (public.is_settings_admin()) WITH CHECK (public.is_settings_admin());',
        'CREATE POLICY "Settings admin deletes pathSession" ON public."pathSession" FOR DELETE TO authenticated USING (public.is_settings_admin());',
        "",
        'CREATE POLICY "Enrolled user selects pathQuestion" ON public."pathQuestion" FOR SELECT TO authenticated USING (public.userCanAccessPathQuestion(id));',
        'CREATE POLICY "Settings admin inserts pathQuestion" ON public."pathQuestion" FOR INSERT TO authenticated WITH CHECK (public.is_settings_admin());',
        'CREATE POLICY "Settings admin updates pathQuestion" ON public."pathQuestion" FOR UPDATE TO authenticated USING (public.is_settings_admin()) WITH CHECK (public.is_settings_admin());',
        'CREATE POLICY "Settings admin deletes pathQuestion" ON public."pathQuestion" FOR DELETE TO authenticated USING (public.is_settings_admin());',
        "",
        'CREATE POLICY "Authenticated selects subscriptionPlan" ON public."subscriptionPlan" FOR SELECT TO authenticated USING (true);',
        'CREATE POLICY "Settings admin inserts subscriptionPlan" ON public."subscriptionPlan" FOR INSERT TO authenticated WITH CHECK (public.is_settings_admin());',
        'CREATE POLICY "Settings admin updates subscriptionPlan" ON public."subscriptionPlan" FOR UPDATE TO authenticated USING (public.is_settings_admin()) WITH CHECK (public.is_settings_admin());',
        'CREATE POLICY "Settings admin deletes subscriptionPlan" ON public."subscriptionPlan" FOR DELETE TO authenticated USING (public.is_settings_admin());',
        "",
        'CREATE POLICY "Owner selects profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);',
        'CREATE POLICY "Owner inserts profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);',
        'CREATE POLICY "Owner updates profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);',
        'CREATE POLICY "Owner deletes profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);',
    ]

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} ({len(lines)} lines)")


if __name__ == "__main__":
    main()
