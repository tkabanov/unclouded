"""Apply camelCase table/column renames across frontend and edge functions."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET_DIRS = [
    ROOT / "frontend" / "src",
    ROOT / "supabase" / "functions",
]

# Longest-first to avoid partial replacements
REPLACEMENTS: list[tuple[str, str]] = [
    # tables
    ('"pathenrollment1"', '"pathEnrollment"'),
    ("'pathenrollment1'", "'pathEnrollment'"),
    ('"uds_journalentry"', '"journalEntry"'),
    ("'uds_journalentry'", "'journalEntry'"),
    ('"uds_milestone"', '"milestone"'),
    ("'uds_milestone'", "'milestone'"),
    ('"uds_relapseevent"', '"relapseEvent"'),
    ("'uds_relapseevent'", "'relapseEvent'"),
    ('"subscription_plan"', '"subscriptionPlan"'),
    ("'subscription_plan'", "'subscriptionPlan'"),
    ('"chatconversation"', '"chatConversation"'),
    ("'chatconversation'", "'chatConversation'"),
    ('"chatmessage"', '"chatMessage"'),
    ("'chatmessage'", "'chatMessage'"),
    ('"dailycheckin"', '"dailyCheckin"'),
    ("'dailycheckin'", "'dailyCheckin'"),
    ('"pathquestion"', '"pathQuestion"'),
    ("'pathquestion'", "'pathQuestion'"),
    ('"pathsession"', '"pathSession"'),
    ("'pathsession'", "'pathSession'"),
    # columns — longest bubble artifacts first
    ("completed_micro_commitment_session_list_list_custom_pathsession", "completedMicroCommitmentSessionIds"),
    ("focused_m_commitment_custom_pathsession", "focusedMicroCommitmentSessionId"),
    ("current_session_custom_pathsession", "currentSessionId"),
    ("conversation_custom_chatconversation", "conversationId"),
    ("status_option_path_enrollment_status", "status"),
    ("completed_sessions_count_number", "completedSessionsCount"),
    ("is_m_commitment_in_focus_boolean", "isMicroCommitmentInFocus"),
    ("classification_list_list_option_classification_os", "classifications"),
    ("ai_coaching_mode_option_ai_coaching_mode_os", "aiCoachingMode"),
    ("ai_confidence_level_option_ai_confidence_level_os", "aiConfidenceLevel"),
    ("classification_option_classification_os", "classification"),
    ("customer_role_option_customer_role_os", "customerRole"),
    ("pillar_option_customer_pillar_os", "pillar"),
    ("tier_option_tier_os", "tier"),
    ("energy_stress_level_number", "energyStressLevel"),
    ("sessions_count_number", "sessionsCount"),
    ("workplace_custom_workplace", "workplaceId"),
    ("behavioral_fingerprint_text", "behavioralFingerprint"),
    ("daily_check_in_streak_number", "dailyCheckInStreak"),
    ("notification_frequency_text", "notificationFrequency"),
    ("check_in_frequency_text", "checkInFrequency"),
    ("pressure_profile_text", "pressureProfile"),
    ("alignment_score_number", "alignmentScore"),
    ("orientation_score_number", "orientationScore"),
    ("performance_score_number", "performanceScore"),
    ("stability_score_number", "stabilityScore"),
    ("streak_days_number", "streakDays"),
    ("is_crisis_resource_boolean", "isCrisisResource"),
    ("is_from_user_boolean", "isFromUser"),
    ("responce_received_boolean", "responseReceived"),
    ("primary_mode_tag_text", "primaryModeTag"),
    ("sensitivity_flag_text", "sensitivityFlag"),
    ("sub_mode_tag_text", "subModeTag"),
    ("external_link_text", "externalLink"),
    ("trigger_signals_text", "triggerSignals"),
    ("coaching_text_text", "coachingText"),
    ("estimated_minutes_number", "estimatedMinutes"),
    ("micro_commitment_text", "microCommitment"),
    ("session_custom_pathsession", "sessionId"),
    ("path_custom_path", "pathId"),
    ("achieved_at_date", "achievedAt"),
    ("event_date_date", "eventDate"),
    ("ai_reflection_text", "aiReflection"),
    ("mood_tag_text", "moodTag"),
    ("contact_email_text", "contactEmail"),
    ("description_text", "description"),
    ("features_text", "features"),
    ("content_text", "content"),
    ("reflection_text", "reflection"),
    ("preferences_text", "preferences"),
    ("notes_text", "notes"),
    ("name_text", "name"),
    ("title_text", "title"),
    ("sender_text", "sender"),
    ("sub_mode_text", "subMode"),
    ("price_number", "price"),
    ("index_number", "index"),
    ("q_text_text", "questionText"),
    ("mood_number", "mood"),
    ("date_date", "date"),
    ("is_free_boolean", "isFree"),
    ("is_admin_boolean", "isAdmin"),
    ("user_user", "userId"),
    ("tier_slug", "tierSlug"),
    # profile columns
    ("onboarding_completed_at", "onboardingCompletedAt"),
    ("onboarding_completed", "onboardingCompleted"),
    ("onboarding_data", "onboardingData"),
    ("reassessment_completed_at", "reassessmentCompletedAt"),
    ("reassessment_reflections", "reassessmentReflections"),
    ("reassessment_results", "reassessmentResults"),
    ("reassessment_data", "reassessmentData"),
    ("primary_pillar", "primaryPillar"),
    ("role_type", "roleType"),
    ("first_name", "firstName"),
    ("created_at", "createdAt"),
    ("updated_at", "updatedAt"),
    # UI view-model fields (not DB) — camelCase consistency
    ("preview_text", "previewText"),
    ("modified_date", "modifiedDate"),
    ("mode_badge_text", "modeBadgeText"),
    ("disclaimer_badge_text", "disclaimerBadgeText"),
]

SKIP_FILES = {
    "types.ts",  # regenerated separately
    "bubble-styles.css",
    "tokens.css",
}


def should_process(path: Path) -> bool:
    if path.name in SKIP_FILES:
        return False
    if path.suffix not in {".ts", ".tsx", ".sql"}:
        return False
    return True


def apply_replacements(content: str) -> str:
    for old, new in REPLACEMENTS:
        content = content.replace(old, new)
    return content


def main() -> None:
    changed = 0
    for base in TARGET_DIRS:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if not path.is_file() or not should_process(path):
                continue
            original = path.read_text(encoding="utf-8")
            updated = apply_replacements(original)
            if updated != original:
                path.write_text(updated, encoding="utf-8")
                changed += 1
                print(f"updated {path.relative_to(ROOT)}")
    print(f"Done. {changed} files updated.")


if __name__ == "__main__":
    main()
