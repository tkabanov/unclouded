-- Recreate Bubble (drsam-99657) data model in Supabase
-- Generated from drsam-99657.bubble user_types

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS public.checkintag CASCADE;
DROP TABLE IF EXISTS public.chatmessage CASCADE;
DROP TABLE IF EXISTS public.pathuseranswer CASCADE;
DROP TABLE IF EXISTS public.pathquestion CASCADE;
DROP TABLE IF EXISTS public.pathenrollment1 CASCADE;
DROP TABLE IF EXISTS public.pathenrollment CASCADE;
DROP TABLE IF EXISTS public.pathsession CASCADE;
DROP TABLE IF EXISTS public.module CASCADE;
DROP TABLE IF EXISTS public.dailycheckin CASCADE;
DROP TABLE IF EXISTS public.uds_journalentry CASCADE;
DROP TABLE IF EXISTS public.uds_milestone CASCADE;
DROP TABLE IF EXISTS public.uds_relapseevent CASCADE;
DROP TABLE IF EXISTS public.chatconversation CASCADE;
DROP TABLE IF EXISTS public.guidedpath CASCADE;
DROP TABLE IF EXISTS public.path CASCADE;
DROP TABLE IF EXISTS public.resource CASCADE;
DROP TABLE IF EXISTS public.subscription_plan CASCADE;
DROP TABLE IF EXISTS public.workplace CASCADE;
DROP TABLE IF EXISTS public."user" CASCADE;
DROP TABLE IF EXISTS public.journal_entries CASCADE;

CREATE TABLE public.workplace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_text TEXT NULL,
  contact_email_text TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.subscription_plan (
  id TEXT PRIMARY KEY,
  name_text TEXT NULL,
  price_number NUMERIC NULL,
  features_text TEXT NULL,
  description_text TEXT NULL,
  tier_slug TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.guidedpath (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  steps_text TEXT NULL,
  title_text TEXT NULL,
  description_text TEXT NULL,
  sub_mode_tag_text TEXT NULL,
  primary_mode_tag_text TEXT NULL,
  sensitivity_flag_text TEXT NULL,
  tier_requirement_text TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.path (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_text TEXT NULL,
  sub_mode_text TEXT NULL,
  description_text TEXT NULL,
  tier_option_tier_os TEXT NULL,
  trigger_signals_text TEXT NULL,
  sessions_count_number NUMERIC NULL,
  pillar_option_customer_pillar_os TEXT NULL,
  ai_coaching_mode_option_ai_coaching_mode_os TEXT NULL,
  classification_list_list_option_classification_os TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pathsession (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_text TEXT NULL,
  index_number NUMERIC NULL,
  path_custom_path UUID NULL,
  coaching_text_text TEXT NULL,
  micro_commitment_text TEXT NULL,
  estimated_minutes_number NUMERIC NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pathsession ADD CONSTRAINT pathsession_path_custom_path_fkey FOREIGN KEY (path_custom_path) REFERENCES public.path(id) ON DELETE SET NULL;

CREATE TABLE public.pathquestion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  q_text_text TEXT NULL,
  index_number NUMERIC NULL,
  session_custom_pathsession UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pathquestion ADD CONSTRAINT pathquestion_session_custom_pathsession_fkey FOREIGN KEY (session_custom_pathsession) REFERENCES public.pathsession(id) ON DELETE SET NULL;

CREATE TABLE public.resource (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_text TEXT NULL,
  content_text TEXT NULL,
  is_free_boolean BOOLEAN NULL,
  sub_mode_tag_text TEXT NULL,
  external_link_text TEXT NULL,
  primary_mode_tag_text TEXT NULL,
  sensitivity_flag_text TEXT NULL,
  is_crisis_resource_boolean BOOLEAN NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public."user" (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name_text TEXT NULL,
  aq1_number NUMERIC NULL,
  aq2_number NUMERIC NULL,
  aq3_number NUMERIC NULL,
  aq4_number NUMERIC NULL,
  aq5_number NUMERIC NULL,
  goals_text TEXT NULL,
  pq1_number NUMERIC NULL,
  pq2_number NUMERIC NULL,
  pq3_number NUMERIC NULL,
  pq4_number NUMERIC NULL,
  pq5_number NUMERIC NULL,
  sq1_number NUMERIC NULL,
  sq2_number NUMERIC NULL,
  sq3_number NUMERIC NULL,
  sq4_number NUMERIC NULL,
  sq5_number NUMERIC NULL,
  sub_mode_text TEXT NULL,
  timezone_text TEXT NULL,
  last_name_text TEXT NULL,
  role_type_text TEXT NULL,
  first_name_text TEXT NULL,
  is_admin_boolean BOOLEAN NULL,
  preferences_text TEXT NULL,
  primary_mode_text TEXT NULL,
  streak_days_number NUMERIC NULL,
  health_none_boolean BOOLEAN NULL,
  primary_pillar_text TEXT NULL,
  substance_type_text TEXT NULL,
  tier_option_tier_os TEXT NULL,
  assessment_date_date TIMESTAMPTZ NULL,
  health_flag3_boolean BOOLEAN NULL,
  health_flag4_boolean BOOLEAN NULL,
  health_flag5_boolean BOOLEAN NULL,
  health_flag6_boolean BOOLEAN NULL,
  pressure_profile_text TEXT NULL,
  alignment_score_number NUMERIC NULL,
  stability_score_number NUMERIC NULL,
  subscription_tier_text TEXT NULL,
  check_in_frequency_text TEXT NULL,
  classification_type_text TEXT NULL,
  orientation_score_number NUMERIC NULL,
  performance_score_number NUMERIC NULL,
  sobriety_start_date_date TIMESTAMPTZ NULL,
  chronic_pain_flag_boolean BOOLEAN NULL,
  grief_mode_active_boolean BOOLEAN NULL,
  orientation_score1_number NUMERIC NULL,
  workplace_custom_workplace UUID NULL,
  behavioral_fingerprint_text TEXT NULL,
  notification_frequency_text TEXT NULL,
  onboarding_complete_boolean BOOLEAN NULL,
  daily_check_in_streak_number NUMERIC NULL,
  onboarding_completed_boolean BOOLEAN NULL,
  recovery_mode_active_boolean BOOLEAN NULL,
  hormonal_context_flag_boolean BOOLEAN NULL,
  streak_cancelation_wf_id_text TEXT NULL,
  modules_completed_count_number NUMERIC NULL,
  spiritual_framework_present_boolean BOOLEAN NULL,
  customer_role_option_customer_role_os TEXT NULL,
  aq1_option_customer_alignment_answer_os TEXT NULL,
  aq2_option_customer_alignment_answer_os TEXT NULL,
  aq3_option_customer_alignment_answer_os TEXT NULL,
  aq4_option_customer_alignment_answer_os TEXT NULL,
  aq5_option_customer_alignment_answer_os TEXT NULL,
  classification_option_classification_os TEXT NULL,
  sq1_option_customer_stability_answer_os TEXT NULL,
  sq2_option_customer_stability_answer_os TEXT NULL,
  sq3_option_customer_stability_answer_os TEXT NULL,
  sq4_option_customer_stability_answer_os TEXT NULL,
  sq5_option_customer_stability_answer_os TEXT NULL,
  customer_pillar_option_customer_pillar_os TEXT NULL,
  onboarding_step_option_onboarding_step_os TEXT NULL,
  oq1_option_customer_orientation_answer_os TEXT NULL,
  pq1_option_customer_performance_answer_os TEXT NULL,
  pq2_option_customer_performance_answer_os TEXT NULL,
  pq3_option_customer_performance_answer_os TEXT NULL,
  pq4_option_customer_performance_answer_os TEXT NULL,
  pq5_option_customer_performance_answer_os TEXT NULL,
  ai_confidence_level_option_ai_confidence_level_os TEXT NULL,
  ai_coaching_mode_list_list_option_ai_coaching_mode_os TEXT NULL,
  state_energy_level_option_customer_state_signal_question_os TEXT NULL,
  state_nervous_system_option_customer_state_signal_question_os TEXT NULL,
  load_signal_cognitive_option_customers_load_signal_question_os TEXT NULL,
  load_signal_financial_option_customers_load_signal_question_os TEXT NULL,
  load_signal_relational_option_customers_load_signal_question_os TEXT NULL,
  load_signal_environmental_option_customers_load_signal_question_os TEXT NULL,
  pressure_response_pattern_option_customer_pressure_response_question_os0 TEXT NULL,
  pressure_non_followthrough_reason_option_customer_pressure_response_question_os0 TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."user" ADD CONSTRAINT user_workplace_custom_workplace_fkey FOREIGN KEY (workplace_custom_workplace) REFERENCES public.workplace(id) ON DELETE SET NULL;

CREATE TABLE public.chatconversation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_user UUID NULL,
  title_text TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chatconversation ADD CONSTRAINT chatconversation_user_user_fkey FOREIGN KEY (user_user) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE TABLE public.chatmessage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_user UUID NULL,
  sender_text TEXT NULL,
  content_text TEXT NULL,
  is_from_user_boolean BOOLEAN NULL,
  responce_received_boolean BOOLEAN NULL,
  conversation_custom_chatconversation UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chatmessage ADD CONSTRAINT chatmessage_user_user_fkey FOREIGN KEY (user_user) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.chatmessage ADD CONSTRAINT chatmessage_conversation_custom_chatconversation_fkey FOREIGN KEY (conversation_custom_chatconversation) REFERENCES public.chatconversation(id) ON DELETE SET NULL;

CREATE TABLE public.dailycheckin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_date TIMESTAMPTZ NULL,
  user_user UUID NULL,
  mood_number NUMERIC NULL,
  reflection_text TEXT NULL,
  energy_stress_level_number NUMERIC NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dailycheckin ADD CONSTRAINT dailycheckin_user_user_fkey FOREIGN KEY (user_user) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE TABLE public.checkintag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_text TEXT NULL,
  check_in_custom_dailycheckin UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.checkintag ADD CONSTRAINT checkintag_check_in_custom_dailycheckin_fkey FOREIGN KEY (check_in_custom_dailycheckin) REFERENCES public.dailycheckin(id) ON DELETE SET NULL;

CREATE TABLE public.uds_journalentry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_user UUID NULL,
  title_text TEXT NULL,
  content_text TEXT NULL,
  mood_tag_text TEXT NULL,
  ai_reflection_text TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.uds_journalentry ADD CONSTRAINT uds_journalentry_user_user_fkey FOREIGN KEY (user_user) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE TABLE public.uds_milestone (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_user UUID NULL,
  title_text TEXT NULL,
  achieved_at_date TIMESTAMPTZ NULL,
  description_text TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.uds_milestone ADD CONSTRAINT uds_milestone_user_user_fkey FOREIGN KEY (user_user) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE TABLE public.uds_relapseevent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_user UUID NULL,
  notes_text TEXT NULL,
  event_date_date TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.uds_relapseevent ADD CONSTRAINT uds_relapseevent_user_user_fkey FOREIGN KEY (user_user) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE TABLE public.pathenrollment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_user UUID NULL,
  last_step_completed_text TEXT NULL,
  completion_percentage_number NUMERIC NULL,
  guided_path_custom_guidedpath UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pathenrollment ADD CONSTRAINT pathenrollment_user_user_fkey FOREIGN KEY (user_user) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.pathenrollment ADD CONSTRAINT pathenrollment_guided_path_custom_guidedpath_fkey FOREIGN KEY (guided_path_custom_guidedpath) REFERENCES public.guidedpath(id) ON DELETE SET NULL;

CREATE TABLE public.pathenrollment1 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_user UUID NULL,
  path_custom_path UUID NULL,
  completed_sessions_count_number NUMERIC NULL,
  is_m_commitment_in_focus_boolean BOOLEAN NULL,
  current_session_custom_pathsession UUID NULL,
  status_option_path_enrollment_status TEXT NULL,
  focused_m_commitment_custom_pathsession UUID NULL,
  completed_micro_commitment_session_list_list_custom_pathsession JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pathenrollment1 ADD CONSTRAINT pathenrollment1_user_user_fkey FOREIGN KEY (user_user) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.pathenrollment1 ADD CONSTRAINT pathenrollment1_path_custom_path_fkey FOREIGN KEY (path_custom_path) REFERENCES public.path(id) ON DELETE SET NULL;
ALTER TABLE public.pathenrollment1 ADD CONSTRAINT pathenrollment1_current_session_custom_pathsession_fkey FOREIGN KEY (current_session_custom_pathsession) REFERENCES public.pathsession(id) ON DELETE SET NULL;
ALTER TABLE public.pathenrollment1 ADD CONSTRAINT pathenrollment1_focused_m_commitment_custom_pathsession_fkey FOREIGN KEY (focused_m_commitment_custom_pathsession) REFERENCES public.pathsession(id) ON DELETE SET NULL;

CREATE TABLE public.pathuseranswer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_user UUID NULL,
  a_text_text TEXT NULL,
  path_custom_path UUID NULL,
  question_custom_pathquestion UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pathuseranswer ADD CONSTRAINT pathuseranswer_user_user_fkey FOREIGN KEY (user_user) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.pathuseranswer ADD CONSTRAINT pathuseranswer_path_custom_path_fkey FOREIGN KEY (path_custom_path) REFERENCES public.path(id) ON DELETE SET NULL;
ALTER TABLE public.pathuseranswer ADD CONSTRAINT pathuseranswer_question_custom_pathquestion_fkey FOREIGN KEY (question_custom_pathquestion) REFERENCES public.pathquestion(id) ON DELETE SET NULL;

CREATE TABLE public.module (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_user UUID NULL,
  streak_days_number NUMERIC NULL,
  organization_id_text TEXT NULL,
  session_count_number NUMERIC NULL,
  last_checkin_date_date TIMESTAMPTZ NULL,
  insight_flags_list_text JSONB NULL,
  chronic_pain_flag_boolean BOOLEAN NULL,
  micro_commitment_due_date TIMESTAMPTZ NULL,
  micro_commitment_active_text TEXT NULL,
  hormonal_context_flag_boolean BOOLEAN NULL,
  identity_role_fusion_score_number NUMERIC NULL,
  significant_events_12mo_list_text JSONB NULL,
  spiritual_framework_present_boolean BOOLEAN NULL,
  pressure_reach_option_pressure_reach TEXT NULL,
  belonging_level_option_belonging_level TEXT NULL,
  purpose_clarity_option_purpose_clarity TEXT NULL,
  grief_load_level_option_grief_load_level TEXT NULL,
  body_relationship_option_body_relationship TEXT NULL,
  conflict_pattern_option_conflict_pattern_os TEXT NULL,
  prior_support_type_option_prior_support_type TEXT NULL,
  attachment_signal_option_attachment_signal_os TEXT NULL,
  perception_gap_flag_option_perception_gap_flag TEXT NULL,
  sleep_quality_signal_option_sleep_quality_signal TEXT NULL,
  hormonal_context_type_option_hormonal_context_type TEXT NULL,
  intimacy_safety_level_option_intimacy_safety_level TEXT NULL,
  financial_agency_level_option_financial_agency_level TEXT NULL,
  financial_anxiety_level_option_financial_anxiety_level TEXT NULL,
  trauma_activation_level_option_trauma_activation_level TEXT NULL,
  substance_pattern_signal_option_substance_pattern_signal TEXT NULL,
  support_seeking_capacity_option_support_seeking_capacity TEXT NULL,
  identity_narrative_type_option_identity_narrative_type_os TEXT NULL,
  identity_pressure_origin_option_identity_pressure_origin_os TEXT NULL,
  spiritual_framework_present_option_spiritual_framework_type TEXT NULL,
  financial_stability_signal_option_financial_stability_signal TEXT NULL,
  identity_self_worth_source_option_identity_self_worth_source_os TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.module ADD CONSTRAINT module_user_user_fkey FOREIGN KEY (user_user) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Legacy journal_entries table (privacy export + preview fallbacks)
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  mood TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bubble user fields surfaced on profiles for the React app
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin_boolean BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_check_in_streak_number NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_days_number NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_confidence_level_option_ai_confidence_level_os TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS classification_option_classification_os TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS customer_role_option_customer_role_os TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier_option_tier_os TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_frequency_text TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS check_in_frequency_text TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences_text TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS behavioral_fingerprint_text TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pressure_profile_text TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS alignment_score_number NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS orientation_score_number NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS performance_score_number NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stability_score_number NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workplace_custom_workplace UUID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_workplace_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_workplace_fkey
  FOREIGN KEY (workplace_custom_workplace) REFERENCES public.workplace(id) ON DELETE SET NULL;


CREATE OR REPLACE FUNCTION public.bubble_user_owns_row(owner UUID)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT auth.uid() IS NOT NULL AND auth.uid() = owner;
$$;

ALTER TABLE public.workplace ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workplace TO authenticated;
GRANT ALL ON public.workplace TO service_role;
ALTER TABLE public.subscription_plan ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plan TO authenticated;
GRANT ALL ON public.subscription_plan TO service_role;
ALTER TABLE public.guidedpath ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guidedpath TO authenticated;
GRANT ALL ON public.guidedpath TO service_role;
ALTER TABLE public.path ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.path TO authenticated;
GRANT ALL ON public.path TO service_role;
ALTER TABLE public.pathsession ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pathsession TO authenticated;
GRANT ALL ON public.pathsession TO service_role;
ALTER TABLE public.pathquestion ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pathquestion TO authenticated;
GRANT ALL ON public.pathquestion TO service_role;
ALTER TABLE public.resource ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource TO authenticated;
GRANT ALL ON public.resource TO service_role;
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user" TO authenticated;
GRANT ALL ON public."user" TO service_role;
ALTER TABLE public.chatconversation ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatconversation TO authenticated;
GRANT ALL ON public.chatconversation TO service_role;
ALTER TABLE public.chatmessage ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatmessage TO authenticated;
GRANT ALL ON public.chatmessage TO service_role;
ALTER TABLE public.dailycheckin ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dailycheckin TO authenticated;
GRANT ALL ON public.dailycheckin TO service_role;
ALTER TABLE public.checkintag ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkintag TO authenticated;
GRANT ALL ON public.checkintag TO service_role;
ALTER TABLE public.uds_journalentry ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uds_journalentry TO authenticated;
GRANT ALL ON public.uds_journalentry TO service_role;
ALTER TABLE public.uds_milestone ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uds_milestone TO authenticated;
GRANT ALL ON public.uds_milestone TO service_role;
ALTER TABLE public.uds_relapseevent ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uds_relapseevent TO authenticated;
GRANT ALL ON public.uds_relapseevent TO service_role;
ALTER TABLE public.pathenrollment ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pathenrollment TO authenticated;
GRANT ALL ON public.pathenrollment TO service_role;
ALTER TABLE public.pathenrollment1 ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pathenrollment1 TO authenticated;
GRANT ALL ON public.pathenrollment1 TO service_role;
ALTER TABLE public.pathuseranswer ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pathuseranswer TO authenticated;
GRANT ALL ON public.pathuseranswer TO service_role;
ALTER TABLE public.module ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module TO authenticated;
GRANT ALL ON public.module TO service_role;

CREATE POLICY "Owner manages chatconversation" ON public.chatconversation FOR ALL TO authenticated USING (public.bubble_user_owns_row(user_user)) WITH CHECK (public.bubble_user_owns_row(user_user));
CREATE POLICY "Owner manages chatmessage" ON public.chatmessage FOR ALL TO authenticated USING (public.bubble_user_owns_row(user_user)) WITH CHECK (public.bubble_user_owns_row(user_user));
CREATE POLICY "Owner manages dailycheckin" ON public.dailycheckin FOR ALL TO authenticated USING (public.bubble_user_owns_row(user_user)) WITH CHECK (public.bubble_user_owns_row(user_user));
CREATE POLICY "Owner manages uds_journalentry" ON public.uds_journalentry FOR ALL TO authenticated USING (public.bubble_user_owns_row(user_user)) WITH CHECK (public.bubble_user_owns_row(user_user));
CREATE POLICY "Owner manages uds_milestone" ON public.uds_milestone FOR ALL TO authenticated USING (public.bubble_user_owns_row(user_user)) WITH CHECK (public.bubble_user_owns_row(user_user));
CREATE POLICY "Owner manages uds_relapseevent" ON public.uds_relapseevent FOR ALL TO authenticated USING (public.bubble_user_owns_row(user_user)) WITH CHECK (public.bubble_user_owns_row(user_user));
CREATE POLICY "Owner manages pathenrollment1" ON public.pathenrollment1 FOR ALL TO authenticated USING (public.bubble_user_owns_row(user_user)) WITH CHECK (public.bubble_user_owns_row(user_user));
CREATE POLICY "Owner manages pathenrollment" ON public.pathenrollment FOR ALL TO authenticated USING (public.bubble_user_owns_row(user_user)) WITH CHECK (public.bubble_user_owns_row(user_user));
CREATE POLICY "Owner manages pathuseranswer" ON public.pathuseranswer FOR ALL TO authenticated USING (public.bubble_user_owns_row(user_user)) WITH CHECK (public.bubble_user_owns_row(user_user));
CREATE POLICY "Owner manages module" ON public.module FOR ALL TO authenticated USING (public.bubble_user_owns_row(user_user)) WITH CHECK (public.bubble_user_owns_row(user_user));
CREATE POLICY "Owner manages checkintag" ON public.checkintag FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated read path" ON public.path FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read pathsession" ON public.pathsession FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read pathquestion" ON public.pathquestion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read resource" ON public.resource FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read guidedpath" ON public.guidedpath FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read subscription_plan" ON public.subscription_plan FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read workplace" ON public.workplace FOR SELECT TO authenticated USING (true);
CREATE POLICY "Settings admins write path" ON public.path FOR ALL TO authenticated USING (public.is_settings_admin()) WITH CHECK (public.is_settings_admin());
CREATE POLICY "Settings admins write resource" ON public.resource FOR ALL TO authenticated USING (public.is_settings_admin()) WITH CHECK (public.is_settings_admin());
CREATE POLICY "Settings admins write subscription_plan" ON public.subscription_plan FOR ALL TO authenticated USING (public.is_settings_admin()) WITH CHECK (public.is_settings_admin());
CREATE POLICY "Settings admins write workplace" ON public.workplace FOR ALL TO authenticated USING (public.is_settings_admin()) WITH CHECK (public.is_settings_admin());
CREATE POLICY "Settings admins write pathsession" ON public.pathsession FOR ALL TO authenticated USING (public.is_settings_admin()) WITH CHECK (public.is_settings_admin());
CREATE POLICY "Settings admins write pathquestion" ON public.pathquestion FOR ALL TO authenticated USING (public.is_settings_admin()) WITH CHECK (public.is_settings_admin());
CREATE POLICY "Settings admins write guidedpath" ON public.guidedpath FOR ALL TO authenticated USING (public.is_settings_admin()) WITH CHECK (public.is_settings_admin());
CREATE POLICY "Users manage own user row" ON public."user" FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journal_entries" ON public.journal_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user_bubble()
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


DROP TRIGGER IF EXISTS update_workplace_updated_at ON public.workplace;
CREATE TRIGGER update_workplace_updated_at BEFORE UPDATE ON public.workplace
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_subscription_plan_updated_at ON public.subscription_plan;
CREATE TRIGGER update_subscription_plan_updated_at BEFORE UPDATE ON public.subscription_plan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_guidedpath_updated_at ON public.guidedpath;
CREATE TRIGGER update_guidedpath_updated_at BEFORE UPDATE ON public.guidedpath
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_path_updated_at ON public.path;
CREATE TRIGGER update_path_updated_at BEFORE UPDATE ON public.path
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_pathsession_updated_at ON public.pathsession;
CREATE TRIGGER update_pathsession_updated_at BEFORE UPDATE ON public.pathsession
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_pathquestion_updated_at ON public.pathquestion;
CREATE TRIGGER update_pathquestion_updated_at BEFORE UPDATE ON public.pathquestion
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_resource_updated_at ON public.resource;
CREATE TRIGGER update_resource_updated_at BEFORE UPDATE ON public.resource
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_user_updated_at ON public."user";
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON public."user"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_chatconversation_updated_at ON public.chatconversation;
CREATE TRIGGER update_chatconversation_updated_at BEFORE UPDATE ON public.chatconversation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_chatmessage_updated_at ON public.chatmessage;
CREATE TRIGGER update_chatmessage_updated_at BEFORE UPDATE ON public.chatmessage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_dailycheckin_updated_at ON public.dailycheckin;
CREATE TRIGGER update_dailycheckin_updated_at BEFORE UPDATE ON public.dailycheckin
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_checkintag_updated_at ON public.checkintag;
CREATE TRIGGER update_checkintag_updated_at BEFORE UPDATE ON public.checkintag
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_uds_journalentry_updated_at ON public.uds_journalentry;
CREATE TRIGGER update_uds_journalentry_updated_at BEFORE UPDATE ON public.uds_journalentry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_uds_milestone_updated_at ON public.uds_milestone;
CREATE TRIGGER update_uds_milestone_updated_at BEFORE UPDATE ON public.uds_milestone
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_uds_relapseevent_updated_at ON public.uds_relapseevent;
CREATE TRIGGER update_uds_relapseevent_updated_at BEFORE UPDATE ON public.uds_relapseevent
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_pathenrollment_updated_at ON public.pathenrollment;
CREATE TRIGGER update_pathenrollment_updated_at BEFORE UPDATE ON public.pathenrollment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_pathenrollment1_updated_at ON public.pathenrollment1;
CREATE TRIGGER update_pathenrollment1_updated_at BEFORE UPDATE ON public.pathenrollment1
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_pathuseranswer_updated_at ON public.pathuseranswer;
CREATE TRIGGER update_pathuseranswer_updated_at BEFORE UPDATE ON public.pathuseranswer
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS update_module_updated_at ON public.module;
CREATE TRIGGER update_module_updated_at BEFORE UPDATE ON public.module
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_chatmessage_conversation ON public.chatmessage (conversation_custom_chatconversation);
CREATE INDEX IF NOT EXISTS idx_chatmessage_user ON public.chatmessage (user_user);
CREATE INDEX IF NOT EXISTS idx_chatconversation_user ON public.chatconversation (user_user);
CREATE INDEX IF NOT EXISTS idx_dailycheckin_user_date ON public.dailycheckin (user_user, date_date DESC);
CREATE INDEX IF NOT EXISTS idx_uds_journalentry_user ON public.uds_journalentry (user_user, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pathenrollment1_user ON public.pathenrollment1 (user_user);
CREATE INDEX IF NOT EXISTS idx_pathsession_path ON public.pathsession (path_custom_path);
CREATE INDEX IF NOT EXISTS idx_pathquestion_session ON public.pathquestion (session_custom_pathsession);

INSERT INTO public.subscription_plan (id, name_text, price_number, description_text, features_text, tier_slug)
VALUES
  ('free', 'Free', 0, 'Everything you need to get started with AI coaching.',
   E'AI coaching chat (limited)\nDaily check-ins & journal\nFree guided paths\nCrisis resources always available', 'free'),
  ('pro', 'Pro', 29, 'Deeper coaching, richer insights, and your 90-day reassessment.',
   E'Unlimited AI coaching chat\nAll guided paths & resources\nAI journal reflections\n90-day reassessment to track progress\nAdvanced insights & milestones\nPriority support', 'pro'),
  ('premium', 'Premium', 0, '1:1 human coaching with the Proven Under Pressure team, matched to your PuP 360 data.',
   E'Everything in Pro\n1:1 sessions with the Proven Under Pressure coaching team\nLed & certified by Dr. Sam\nCoach matched to your PuP 360 data\nPersonalized between-session support', 'premium')
ON CONFLICT (id) DO NOTHING;
