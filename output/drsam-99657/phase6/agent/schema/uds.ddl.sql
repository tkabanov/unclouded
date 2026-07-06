-- generated scaffold: deterministic baseline
CREATE TABLE IF NOT EXISTS "uds_chat" (
  "id" text PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "uds_chatconversation" (
  "id" text PRIMARY KEY
, "title_text" text
, "user_user" text
);

CREATE TABLE IF NOT EXISTS "uds_chatmessage" (
  "id" text PRIMARY KEY
, "content_text" text
, "conversation_custom_chatconversation" text
, "is_from_user_boolean" text
, "responce_received_boolean" text
, "sender_text" text
, "user_user" text
);

CREATE TABLE IF NOT EXISTS "uds_checkintag" (
  "id" text PRIMARY KEY
, "check_in_custom_dailycheckin" text
, "tag_text" text
);

CREATE TABLE IF NOT EXISTS "uds_dailycheckin" (
  "id" text PRIMARY KEY
, "date_date" text
, "energy_stress_level_number" text
, "mood_number" text
, "reflection_text" text
, "user_user" text
);

CREATE TABLE IF NOT EXISTS "uds_guidedpath" (
  "id" text PRIMARY KEY
, "description_text" text
, "primary_mode_tag_text" text
, "sensitivity_flag_text" text
, "steps_text" text
, "sub_mode_tag_text" text
, "tier_requirement_text" text
, "title_text" text
);

CREATE TABLE IF NOT EXISTS "uds_journalentry" (
  "id" text PRIMARY KEY
, "ai_reflection_text" text
, "content_text" text
, "mood_tag_text" text
, "title_text" text
, "user_user" text
);

CREATE TABLE IF NOT EXISTS "uds_milestone" (
  "id" text PRIMARY KEY
, "achieved_at_date" text
, "description_text" text
, "title_text" text
, "user_user" text
);

CREATE TABLE IF NOT EXISTS "uds_module" (
  "id" text PRIMARY KEY
, "attachment_signal_option_attachment_signal_os" text
, "belonging_level_option_belonging_level" text
, "body_relationship_option_body_relationship" text
, "chronic_pain_flag_boolean" text
, "conflict_pattern_option_conflict_pattern_os" text
, "financial_agency_level_option_financial_agency_level" text
, "financial_anxiety_level_option_financial_anxiety_level" text
, "financial_stability_signal_option_financial_stability_signal" text
, "grief_load_level_option_grief_load_level" text
, "hormonal_context_flag_boolean" text
, "hormonal_context_type_option_hormonal_context_type" text
, "identity_narrative_type_option_identity_narrative_type_os" text
, "identity_pressure_origin_option_identity_pressure_origin_os" text
, "identity_role_fusion_score_number" text
, "identity_self_worth_source_option_identity_self_worth_source_os" text
, "insight_flags_list_text" text
, "intimacy_safety_level_option_intimacy_safety_level" text
, "last_checkin_date_date" text
, "micro_commitment_active_text" text
, "micro_commitment_due_date" text
, "organization_id_text" text
, "perception_gap_flag_option_perception_gap_flag" text
, "pressure_reach_option_pressure_reach" text
, "prior_support_type_option_prior_support_type" text
, "purpose_clarity_option_purpose_clarity" text
, "session_count_number" text
, "significant_events_12mo_list_text" text
, "sleep_quality_signal_option_sleep_quality_signal" text
, "spiritual_framework_present_boolean" text
, "spiritual_framework_present_option_spiritual_framework_type" text
, "streak_days_number" text
, "substance_pattern_signal_option_substance_pattern_signal" text
, "support_seeking_capacity_option_support_seeking_capacity" text
, "trauma_activation_level_option_trauma_activation_level" text
, "user_user" text
);

CREATE TABLE IF NOT EXISTS "uds_path" (
  "id" text PRIMARY KEY
, "ai_coaching_mode_option_ai_coaching_mode_os" text
, "classification_list_list_option_classification_os" text
, "description_text" text
, "name_text" text
, "pillar_option_customer_pillar_os" text
, "sessions_count_number" text
, "sub_mode_text" text
, "tier_option_tier_os" text
, "trigger_signals_text" text
);

CREATE TABLE IF NOT EXISTS "uds_pathenrollment" (
  "id" text PRIMARY KEY
, "completion_percentage_number" text
, "guided_path_custom_guidedpath" text
, "last_step_completed_text" text
, "user_user" text
);

CREATE TABLE IF NOT EXISTS "uds_pathenrollment1" (
  "id" text PRIMARY KEY
, "completed_micro_commitment_session_list_list_custom_pathsession" text
, "completed_sessions_count_number" text
, "current_session_custom_pathsession" text
, "focused_m_commitment_custom_pathsession" text
, "is_m_commitment_in_focus_boolean" text
, "path_custom_path" text
, "status_option_path_enrollment_status" text
, "user_user" text
);

CREATE TABLE IF NOT EXISTS "uds_pathquestion" (
  "id" text PRIMARY KEY
, "index_number" text
, "q_text_text" text
, "session_custom_pathsession" text
);

CREATE TABLE IF NOT EXISTS "uds_pathsession" (
  "id" text PRIMARY KEY
, "coaching_text_text" text
, "estimated_minutes_number" text
, "index_number" text
, "micro_commitment_text" text
, "path_custom_path" text
, "title_text" text
);

CREATE TABLE IF NOT EXISTS "uds_pathuseranswer" (
  "id" text PRIMARY KEY
, "a_text_text" text
, "path_custom_path" text
, "question_custom_pathquestion" text
, "user_user" text
);

CREATE TABLE IF NOT EXISTS "uds_relapseevent" (
  "id" text PRIMARY KEY
, "event_date_date" text
, "notes_text" text
, "user_user" text
);

CREATE TABLE IF NOT EXISTS "uds_resource" (
  "id" text PRIMARY KEY
, "content_text" text
, "external_link_text" text
, "is_crisis_resource_boolean" text
, "is_free_boolean" text
, "primary_mode_tag_text" text
, "sensitivity_flag_text" text
, "sub_mode_tag_text" text
, "title_text" text
);

CREATE TABLE IF NOT EXISTS "uds_subscriptionplan" (
  "id" text PRIMARY KEY
, "description_text" text
, "features_text" text
, "name_text" text
, "price_number" text
);

CREATE TABLE IF NOT EXISTS "uds_user" (
  "id" text PRIMARY KEY
, "ai_coaching_mode_list_list_option_ai_coaching_mode_os" text
, "ai_confidence_level_option_ai_confidence_level_os" text
, "alignment_score_number" text
, "aq1_number" text
, "aq1_option_customer_alignment_answer_os" text
, "aq2_number" text
, "aq2_option_customer_alignment_answer_os" text
, "aq3_number" text
, "aq3_option_customer_alignment_answer_os" text
, "aq4_number" text
, "aq4_option_customer_alignment_answer_os" text
, "aq5_number" text
, "aq5_option_customer_alignment_answer_os" text
, "assessment_date_date" text
, "behavioral_fingerprint_text" text
, "check_in_frequency_text" text
, "chronic_pain_flag_boolean" text
, "classification_option_classification_os" text
, "classification_type_text" text
, "customer_pillar_option_customer_pillar_os" text
, "customer_role_option_customer_role_os" text
, "daily_check_in_streak_number" text
, "first_name_text" text
, "goals_text" text
, "grief_mode_active_boolean" text
, "health_flag3_boolean" text
, "health_flag4_boolean" text
, "health_flag5_boolean" text
, "health_flag6_boolean" text
, "health_none_boolean" text
, "hormonal_context_flag_boolean" text
, "is_admin_boolean" text
, "last_name_text" text
, "load_signal_cognitive_option_customers_load_signal_question_os" text
, "load_signal_environmental_option_customers_load_signal_question_os" text
, "load_signal_financial_option_customers_load_signal_question_os" text
, "load_signal_relational_option_customers_load_signal_question_os" text
, "modules_completed_count_number" text
, "name_text" text
, "notification_frequency_text" text
, "onboarding_complete_boolean" text
, "onboarding_completed_boolean" text
, "onboarding_step_option_onboarding_step_os" text
, "oq1_option_customer_orientation_answer_os" text
, "orientation_score_number" text
, "orientation_score1_number" text
, "performance_score_number" text
, "pq1_number" text
, "pq1_option_customer_performance_answer_os" text
, "pq2_number" text
, "pq2_option_customer_performance_answer_os" text
, "pq3_number" text
, "pq3_option_customer_performance_answer_os" text
, "pq4_number" text
, "pq4_option_customer_performance_answer_os" text
, "pq5_number" text
, "pq5_option_customer_performance_answer_os" text
, "preferences_text" text
, "pressure_non_followthrough_reason_option_customer_pressure_response_question_os0" text
, "pressure_profile_text" text
, "pressure_response_pattern_option_customer_pressure_response_question_os0" text
, "primary_mode_text" text
, "primary_pillar_text" text
, "recovery_mode_active_boolean" text
, "role_type_text" text
, "sobriety_start_date_date" text
, "spiritual_framework_present_boolean" text
, "sq1_number" text
, "sq1_option_customer_stability_answer_os" text
, "sq2_number" text
, "sq2_option_customer_stability_answer_os" text
, "sq3_number" text
, "sq3_option_customer_stability_answer_os" text
, "sq4_number" text
, "sq4_option_customer_stability_answer_os" text
, "sq5_number" text
, "sq5_option_customer_stability_answer_os" text
, "stability_score_number" text
, "state_energy_level_option_customer_state_signal_question_os" text
, "state_nervous_system_option_customer_state_signal_question_os" text
, "streak_cancelation_wf_id_text" text
, "streak_days_number" text
, "sub_mode_text" text
, "subscription_tier_text" text
, "substance_type_text" text
, "tier_option_tier_os" text
, "timezone_text" text
, "workplace_custom_workplace" text
);

CREATE TABLE IF NOT EXISTS "uds_workplace" (
  "id" text PRIMARY KEY
, "contact_email_text" text
, "name_text" text
);

