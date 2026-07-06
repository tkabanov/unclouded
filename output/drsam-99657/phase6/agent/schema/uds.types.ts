// generated scaffold: deterministic baseline
export interface UdsChat {
  id: string;
}

export interface UdsChatconversation {
  id: string;
  title_text: string | null;
  user_user: string | null;
}

export interface UdsChatmessage {
  id: string;
  content_text: string | null;
  conversation_custom_chatconversation: string | null;
  is_from_user_boolean: string | null;
  responce_received_boolean: string | null;
  sender_text: string | null;
  user_user: string | null;
}

export interface UdsCheckintag {
  id: string;
  check_in_custom_dailycheckin: string | null;
  tag_text: string | null;
}

export interface UdsDailycheckin {
  id: string;
  date_date: string | null;
  energy_stress_level_number: string | null;
  mood_number: string | null;
  reflection_text: string | null;
  user_user: string | null;
}

export interface UdsGuidedpath {
  id: string;
  description_text: string | null;
  primary_mode_tag_text: string | null;
  sensitivity_flag_text: string | null;
  steps_text: string | null;
  sub_mode_tag_text: string | null;
  tier_requirement_text: string | null;
  title_text: string | null;
}

export interface UdsJournalentry {
  id: string;
  ai_reflection_text: string | null;
  content_text: string | null;
  mood_tag_text: string | null;
  title_text: string | null;
  user_user: string | null;
}

export interface UdsMilestone {
  id: string;
  achieved_at_date: string | null;
  description_text: string | null;
  title_text: string | null;
  user_user: string | null;
}

export interface UdsModule {
  id: string;
  attachment_signal_option_attachment_signal_os: string | null;
  belonging_level_option_belonging_level: string | null;
  body_relationship_option_body_relationship: string | null;
  chronic_pain_flag_boolean: string | null;
  conflict_pattern_option_conflict_pattern_os: string | null;
  financial_agency_level_option_financial_agency_level: string | null;
  financial_anxiety_level_option_financial_anxiety_level: string | null;
  financial_stability_signal_option_financial_stability_signal: string | null;
  grief_load_level_option_grief_load_level: string | null;
  hormonal_context_flag_boolean: string | null;
  hormonal_context_type_option_hormonal_context_type: string | null;
  identity_narrative_type_option_identity_narrative_type_os: string | null;
  identity_pressure_origin_option_identity_pressure_origin_os: string | null;
  identity_role_fusion_score_number: string | null;
  identity_self_worth_source_option_identity_self_worth_source_os: string | null;
  insight_flags_list_text: string | null;
  intimacy_safety_level_option_intimacy_safety_level: string | null;
  last_checkin_date_date: string | null;
  micro_commitment_active_text: string | null;
  micro_commitment_due_date: string | null;
  organization_id_text: string | null;
  perception_gap_flag_option_perception_gap_flag: string | null;
  pressure_reach_option_pressure_reach: string | null;
  prior_support_type_option_prior_support_type: string | null;
  purpose_clarity_option_purpose_clarity: string | null;
  session_count_number: string | null;
  significant_events_12mo_list_text: string | null;
  sleep_quality_signal_option_sleep_quality_signal: string | null;
  spiritual_framework_present_boolean: string | null;
  spiritual_framework_present_option_spiritual_framework_type: string | null;
  streak_days_number: string | null;
  substance_pattern_signal_option_substance_pattern_signal: string | null;
  support_seeking_capacity_option_support_seeking_capacity: string | null;
  trauma_activation_level_option_trauma_activation_level: string | null;
  user_user: string | null;
}

export interface UdsPath {
  id: string;
  ai_coaching_mode_option_ai_coaching_mode_os: string | null;
  classification_list_list_option_classification_os: string | null;
  description_text: string | null;
  name_text: string | null;
  pillar_option_customer_pillar_os: string | null;
  sessions_count_number: string | null;
  sub_mode_text: string | null;
  tier_option_tier_os: string | null;
  trigger_signals_text: string | null;
}

export interface UdsPathenrollment {
  id: string;
  completion_percentage_number: string | null;
  guided_path_custom_guidedpath: string | null;
  last_step_completed_text: string | null;
  user_user: string | null;
}

export interface UdsPathenrollment1 {
  id: string;
  completed_micro_commitment_session_list_list_custom_pathsession: string | null;
  completed_sessions_count_number: string | null;
  current_session_custom_pathsession: string | null;
  focused_m_commitment_custom_pathsession: string | null;
  is_m_commitment_in_focus_boolean: string | null;
  path_custom_path: string | null;
  status_option_path_enrollment_status: string | null;
  user_user: string | null;
}

export interface UdsPathquestion {
  id: string;
  index_number: string | null;
  q_text_text: string | null;
  session_custom_pathsession: string | null;
}

export interface UdsPathsession {
  id: string;
  coaching_text_text: string | null;
  estimated_minutes_number: string | null;
  index_number: string | null;
  micro_commitment_text: string | null;
  path_custom_path: string | null;
  title_text: string | null;
}

export interface UdsPathuseranswer {
  id: string;
  a_text_text: string | null;
  path_custom_path: string | null;
  question_custom_pathquestion: string | null;
  user_user: string | null;
}

export interface UdsRelapseevent {
  id: string;
  event_date_date: string | null;
  notes_text: string | null;
  user_user: string | null;
}

export interface UdsResource {
  id: string;
  content_text: string | null;
  external_link_text: string | null;
  is_crisis_resource_boolean: string | null;
  is_free_boolean: string | null;
  primary_mode_tag_text: string | null;
  sensitivity_flag_text: string | null;
  sub_mode_tag_text: string | null;
  title_text: string | null;
}

export interface UdsSubscriptionplan {
  id: string;
  description_text: string | null;
  features_text: string | null;
  name_text: string | null;
  price_number: string | null;
}

export interface UdsUser {
  id: string;
  ai_coaching_mode_list_list_option_ai_coaching_mode_os: string | null;
  ai_confidence_level_option_ai_confidence_level_os: string | null;
  alignment_score_number: string | null;
  aq1_number: string | null;
  aq1_option_customer_alignment_answer_os: string | null;
  aq2_number: string | null;
  aq2_option_customer_alignment_answer_os: string | null;
  aq3_number: string | null;
  aq3_option_customer_alignment_answer_os: string | null;
  aq4_number: string | null;
  aq4_option_customer_alignment_answer_os: string | null;
  aq5_number: string | null;
  aq5_option_customer_alignment_answer_os: string | null;
  assessment_date_date: string | null;
  behavioral_fingerprint_text: string | null;
  check_in_frequency_text: string | null;
  chronic_pain_flag_boolean: string | null;
  classification_option_classification_os: string | null;
  classification_type_text: string | null;
  customer_pillar_option_customer_pillar_os: string | null;
  customer_role_option_customer_role_os: string | null;
  daily_check_in_streak_number: string | null;
  first_name_text: string | null;
  goals_text: string | null;
  grief_mode_active_boolean: string | null;
  health_flag3_boolean: string | null;
  health_flag4_boolean: string | null;
  health_flag5_boolean: string | null;
  health_flag6_boolean: string | null;
  health_none_boolean: string | null;
  hormonal_context_flag_boolean: string | null;
  is_admin_boolean: string | null;
  last_name_text: string | null;
  load_signal_cognitive_option_customers_load_signal_question_os: string | null;
  load_signal_environmental_option_customers_load_signal_question_os: string | null;
  load_signal_financial_option_customers_load_signal_question_os: string | null;
  load_signal_relational_option_customers_load_signal_question_os: string | null;
  modules_completed_count_number: string | null;
  name_text: string | null;
  notification_frequency_text: string | null;
  onboarding_complete_boolean: string | null;
  onboarding_completed_boolean: string | null;
  onboarding_step_option_onboarding_step_os: string | null;
  oq1_option_customer_orientation_answer_os: string | null;
  orientation_score_number: string | null;
  orientation_score1_number: string | null;
  performance_score_number: string | null;
  pq1_number: string | null;
  pq1_option_customer_performance_answer_os: string | null;
  pq2_number: string | null;
  pq2_option_customer_performance_answer_os: string | null;
  pq3_number: string | null;
  pq3_option_customer_performance_answer_os: string | null;
  pq4_number: string | null;
  pq4_option_customer_performance_answer_os: string | null;
  pq5_number: string | null;
  pq5_option_customer_performance_answer_os: string | null;
  preferences_text: string | null;
  pressure_non_followthrough_reason_option_customer_pressure_response_question_os0: string | null;
  pressure_profile_text: string | null;
  pressure_response_pattern_option_customer_pressure_response_question_os0: string | null;
  primary_mode_text: string | null;
  primary_pillar_text: string | null;
  recovery_mode_active_boolean: string | null;
  role_type_text: string | null;
  sobriety_start_date_date: string | null;
  spiritual_framework_present_boolean: string | null;
  sq1_number: string | null;
  sq1_option_customer_stability_answer_os: string | null;
  sq2_number: string | null;
  sq2_option_customer_stability_answer_os: string | null;
  sq3_number: string | null;
  sq3_option_customer_stability_answer_os: string | null;
  sq4_number: string | null;
  sq4_option_customer_stability_answer_os: string | null;
  sq5_number: string | null;
  sq5_option_customer_stability_answer_os: string | null;
  stability_score_number: string | null;
  state_energy_level_option_customer_state_signal_question_os: string | null;
  state_nervous_system_option_customer_state_signal_question_os: string | null;
  streak_cancelation_wf_id_text: string | null;
  streak_days_number: string | null;
  sub_mode_text: string | null;
  subscription_tier_text: string | null;
  substance_type_text: string | null;
  tier_option_tier_os: string | null;
  timezone_text: string | null;
  workplace_custom_workplace: string | null;
}

export interface UdsWorkplace {
  id: string;
  contact_email_text: string | null;
  name_text: string | null;
}

