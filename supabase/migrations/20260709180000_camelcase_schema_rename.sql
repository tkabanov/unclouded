-- Rename Bubble artifact table/column names to camelCase.
-- Drops and recreates RLS policies and helper functions.

DROP POLICY IF EXISTS "Owner selects chatconversation" ON public.chatconversation;
DROP POLICY IF EXISTS "Owner inserts chatconversation" ON public.chatconversation;
DROP POLICY IF EXISTS "Owner updates chatconversation" ON public.chatconversation;
DROP POLICY IF EXISTS "Owner deletes chatconversation" ON public.chatconversation;
DROP POLICY IF EXISTS "Owner manages chatconversation" ON public.chatconversation;
DROP POLICY IF EXISTS "Owner selects chatmessage" ON public.chatmessage;
DROP POLICY IF EXISTS "Owner inserts chatmessage" ON public.chatmessage;
DROP POLICY IF EXISTS "Owner updates chatmessage" ON public.chatmessage;
DROP POLICY IF EXISTS "Owner deletes chatmessage" ON public.chatmessage;
DROP POLICY IF EXISTS "Owner manages chatmessage" ON public.chatmessage;
DROP POLICY IF EXISTS "Owner selects dailycheckin" ON public.dailycheckin;
DROP POLICY IF EXISTS "Owner inserts dailycheckin" ON public.dailycheckin;
DROP POLICY IF EXISTS "Owner updates dailycheckin" ON public.dailycheckin;
DROP POLICY IF EXISTS "Owner deletes dailycheckin" ON public.dailycheckin;
DROP POLICY IF EXISTS "Owner manages dailycheckin" ON public.dailycheckin;
DROP POLICY IF EXISTS "Owner selects path" ON public.path;
DROP POLICY IF EXISTS "Owner inserts path" ON public.path;
DROP POLICY IF EXISTS "Owner updates path" ON public.path;
DROP POLICY IF EXISTS "Owner deletes path" ON public.path;
DROP POLICY IF EXISTS "Owner manages path" ON public.path;
DROP POLICY IF EXISTS "Owner selects pathenrollment1" ON public.pathenrollment1;
DROP POLICY IF EXISTS "Owner inserts pathenrollment1" ON public.pathenrollment1;
DROP POLICY IF EXISTS "Owner updates pathenrollment1" ON public.pathenrollment1;
DROP POLICY IF EXISTS "Owner deletes pathenrollment1" ON public.pathenrollment1;
DROP POLICY IF EXISTS "Owner manages pathenrollment1" ON public.pathenrollment1;
DROP POLICY IF EXISTS "Owner selects pathquestion" ON public.pathquestion;
DROP POLICY IF EXISTS "Owner inserts pathquestion" ON public.pathquestion;
DROP POLICY IF EXISTS "Owner updates pathquestion" ON public.pathquestion;
DROP POLICY IF EXISTS "Owner deletes pathquestion" ON public.pathquestion;
DROP POLICY IF EXISTS "Owner manages pathquestion" ON public.pathquestion;
DROP POLICY IF EXISTS "Owner selects pathsession" ON public.pathsession;
DROP POLICY IF EXISTS "Owner inserts pathsession" ON public.pathsession;
DROP POLICY IF EXISTS "Owner updates pathsession" ON public.pathsession;
DROP POLICY IF EXISTS "Owner deletes pathsession" ON public.pathsession;
DROP POLICY IF EXISTS "Owner manages pathsession" ON public.pathsession;
DROP POLICY IF EXISTS "Owner selects profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owner inserts profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owner updates profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owner deletes profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owner manages profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owner selects resource" ON public.resource;
DROP POLICY IF EXISTS "Owner inserts resource" ON public.resource;
DROP POLICY IF EXISTS "Owner updates resource" ON public.resource;
DROP POLICY IF EXISTS "Owner deletes resource" ON public.resource;
DROP POLICY IF EXISTS "Owner manages resource" ON public.resource;
DROP POLICY IF EXISTS "Owner selects subscription_plan" ON public.subscription_plan;
DROP POLICY IF EXISTS "Owner inserts subscription_plan" ON public.subscription_plan;
DROP POLICY IF EXISTS "Owner updates subscription_plan" ON public.subscription_plan;
DROP POLICY IF EXISTS "Owner deletes subscription_plan" ON public.subscription_plan;
DROP POLICY IF EXISTS "Owner manages subscription_plan" ON public.subscription_plan;
DROP POLICY IF EXISTS "Owner selects uds_journalentry" ON public.uds_journalentry;
DROP POLICY IF EXISTS "Owner inserts uds_journalentry" ON public.uds_journalentry;
DROP POLICY IF EXISTS "Owner updates uds_journalentry" ON public.uds_journalentry;
DROP POLICY IF EXISTS "Owner deletes uds_journalentry" ON public.uds_journalentry;
DROP POLICY IF EXISTS "Owner manages uds_journalentry" ON public.uds_journalentry;
DROP POLICY IF EXISTS "Owner selects uds_milestone" ON public.uds_milestone;
DROP POLICY IF EXISTS "Owner inserts uds_milestone" ON public.uds_milestone;
DROP POLICY IF EXISTS "Owner updates uds_milestone" ON public.uds_milestone;
DROP POLICY IF EXISTS "Owner deletes uds_milestone" ON public.uds_milestone;
DROP POLICY IF EXISTS "Owner manages uds_milestone" ON public.uds_milestone;
DROP POLICY IF EXISTS "Owner selects uds_relapseevent" ON public.uds_relapseevent;
DROP POLICY IF EXISTS "Owner inserts uds_relapseevent" ON public.uds_relapseevent;
DROP POLICY IF EXISTS "Owner updates uds_relapseevent" ON public.uds_relapseevent;
DROP POLICY IF EXISTS "Owner deletes uds_relapseevent" ON public.uds_relapseevent;
DROP POLICY IF EXISTS "Owner manages uds_relapseevent" ON public.uds_relapseevent;
DROP POLICY IF EXISTS "Owner selects workplace" ON public.workplace;
DROP POLICY IF EXISTS "Owner inserts workplace" ON public.workplace;
DROP POLICY IF EXISTS "Owner updates workplace" ON public.workplace;
DROP POLICY IF EXISTS "Owner deletes workplace" ON public.workplace;
DROP POLICY IF EXISTS "Owner manages workplace" ON public.workplace;
DROP POLICY IF EXISTS "Enrolled user selects pathsession" ON public.pathsession;
DROP POLICY IF EXISTS "Enrolled user selects pathsession" ON public.pathquestion;
DROP POLICY IF EXISTS "Enrolled user selects pathsession" ON public.subscription_plan;
DROP POLICY IF EXISTS "Enrolled user selects pathsession" ON public.profiles;
DROP POLICY IF EXISTS "Settings admin inserts pathsession" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admin inserts pathsession" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admin inserts pathsession" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admin inserts pathsession" ON public.profiles;
DROP POLICY IF EXISTS "Settings admin updates pathsession" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admin updates pathsession" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admin updates pathsession" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admin updates pathsession" ON public.profiles;
DROP POLICY IF EXISTS "Settings admin deletes pathsession" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admin deletes pathsession" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admin deletes pathsession" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admin deletes pathsession" ON public.profiles;
DROP POLICY IF EXISTS "Enrolled user selects pathquestion" ON public.pathsession;
DROP POLICY IF EXISTS "Enrolled user selects pathquestion" ON public.pathquestion;
DROP POLICY IF EXISTS "Enrolled user selects pathquestion" ON public.subscription_plan;
DROP POLICY IF EXISTS "Enrolled user selects pathquestion" ON public.profiles;
DROP POLICY IF EXISTS "Settings admin inserts pathquestion" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admin inserts pathquestion" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admin inserts pathquestion" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admin inserts pathquestion" ON public.profiles;
DROP POLICY IF EXISTS "Settings admin updates pathquestion" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admin updates pathquestion" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admin updates pathquestion" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admin updates pathquestion" ON public.profiles;
DROP POLICY IF EXISTS "Settings admin deletes pathquestion" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admin deletes pathquestion" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admin deletes pathquestion" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admin deletes pathquestion" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated selects subscription_plan" ON public.pathsession;
DROP POLICY IF EXISTS "Authenticated selects subscription_plan" ON public.pathquestion;
DROP POLICY IF EXISTS "Authenticated selects subscription_plan" ON public.subscription_plan;
DROP POLICY IF EXISTS "Authenticated selects subscription_plan" ON public.profiles;
DROP POLICY IF EXISTS "Settings admin inserts subscription_plan" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admin inserts subscription_plan" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admin inserts subscription_plan" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admin inserts subscription_plan" ON public.profiles;
DROP POLICY IF EXISTS "Settings admin updates subscription_plan" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admin updates subscription_plan" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admin updates subscription_plan" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admin updates subscription_plan" ON public.profiles;
DROP POLICY IF EXISTS "Settings admin deletes subscription_plan" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admin deletes subscription_plan" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admin deletes subscription_plan" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admin deletes subscription_plan" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated read pathsession" ON public.pathsession;
DROP POLICY IF EXISTS "Authenticated read pathsession" ON public.pathquestion;
DROP POLICY IF EXISTS "Authenticated read pathsession" ON public.subscription_plan;
DROP POLICY IF EXISTS "Authenticated read pathsession" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated read pathquestion" ON public.pathsession;
DROP POLICY IF EXISTS "Authenticated read pathquestion" ON public.pathquestion;
DROP POLICY IF EXISTS "Authenticated read pathquestion" ON public.subscription_plan;
DROP POLICY IF EXISTS "Authenticated read pathquestion" ON public.profiles;
DROP POLICY IF EXISTS "Settings admins write pathsession" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admins write pathsession" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admins write pathsession" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admins write pathsession" ON public.profiles;
DROP POLICY IF EXISTS "Settings admins write pathquestion" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admins write pathquestion" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admins write pathquestion" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admins write pathquestion" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated read subscription_plan" ON public.pathsession;
DROP POLICY IF EXISTS "Authenticated read subscription_plan" ON public.pathquestion;
DROP POLICY IF EXISTS "Authenticated read subscription_plan" ON public.subscription_plan;
DROP POLICY IF EXISTS "Authenticated read subscription_plan" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read subscription plans" ON public.pathsession;
DROP POLICY IF EXISTS "Authenticated users can read subscription plans" ON public.pathquestion;
DROP POLICY IF EXISTS "Authenticated users can read subscription plans" ON public.subscription_plan;
DROP POLICY IF EXISTS "Authenticated users can read subscription plans" ON public.profiles;
DROP POLICY IF EXISTS "Settings admins write subscription_plan" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admins write subscription_plan" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admins write subscription_plan" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admins write subscription_plan" ON public.profiles;
DROP POLICY IF EXISTS "Settings admins can insert subscription plans" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admins can insert subscription plans" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admins can insert subscription plans" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admins can insert subscription plans" ON public.profiles;
DROP POLICY IF EXISTS "Settings admins can update subscription plans" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admins can update subscription plans" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admins can update subscription plans" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admins can update subscription plans" ON public.profiles;
DROP POLICY IF EXISTS "Settings admins can delete subscription plans" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admins can delete subscription plans" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admins can delete subscription plans" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admins can delete subscription plans" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert subscription plans" ON public.pathsession;
DROP POLICY IF EXISTS "Authenticated users can insert subscription plans" ON public.pathquestion;
DROP POLICY IF EXISTS "Authenticated users can insert subscription plans" ON public.subscription_plan;
DROP POLICY IF EXISTS "Authenticated users can insert subscription plans" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update subscription plans" ON public.pathsession;
DROP POLICY IF EXISTS "Authenticated users can update subscription plans" ON public.pathquestion;
DROP POLICY IF EXISTS "Authenticated users can update subscription plans" ON public.subscription_plan;
DROP POLICY IF EXISTS "Authenticated users can update subscription plans" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can delete subscription plans" ON public.pathsession;
DROP POLICY IF EXISTS "Authenticated users can delete subscription plans" ON public.pathquestion;
DROP POLICY IF EXISTS "Authenticated users can delete subscription plans" ON public.subscription_plan;
DROP POLICY IF EXISTS "Authenticated users can delete subscription plans" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.pathsession;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.pathquestion;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.subscription_plan;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.pathsession;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.pathquestion;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.subscription_plan;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.pathsession;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.pathquestion;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.subscription_plan;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.pathsession;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.pathquestion;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.subscription_plan;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owner selects profile" ON public.pathsession;
DROP POLICY IF EXISTS "Owner selects profile" ON public.pathquestion;
DROP POLICY IF EXISTS "Owner selects profile" ON public.subscription_plan;
DROP POLICY IF EXISTS "Owner selects profile" ON public.profiles;
DROP POLICY IF EXISTS "Owner inserts profile" ON public.pathsession;
DROP POLICY IF EXISTS "Owner inserts profile" ON public.pathquestion;
DROP POLICY IF EXISTS "Owner inserts profile" ON public.subscription_plan;
DROP POLICY IF EXISTS "Owner inserts profile" ON public.profiles;
DROP POLICY IF EXISTS "Owner updates profile" ON public.pathsession;
DROP POLICY IF EXISTS "Owner updates profile" ON public.pathquestion;
DROP POLICY IF EXISTS "Owner updates profile" ON public.subscription_plan;
DROP POLICY IF EXISTS "Owner updates profile" ON public.profiles;
DROP POLICY IF EXISTS "Owner deletes profile" ON public.pathsession;
DROP POLICY IF EXISTS "Owner deletes profile" ON public.pathquestion;
DROP POLICY IF EXISTS "Owner deletes profile" ON public.subscription_plan;
DROP POLICY IF EXISTS "Owner deletes profile" ON public.profiles;

DROP FUNCTION IF EXISTS public.bubble_user_owns_chatconversation(UUID);
DROP FUNCTION IF EXISTS public.user_can_access_pathsession(UUID);
DROP FUNCTION IF EXISTS public.user_can_access_pathquestion(UUID);

-- columns: chatconversation
ALTER TABLE public.chatconversation RENAME COLUMN created_at TO "createdAt";
ALTER TABLE public.chatconversation RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE public.chatconversation RENAME COLUMN title_text TO "title";
ALTER TABLE public.chatconversation RENAME COLUMN user_user TO "userId";

-- columns: chatmessage
ALTER TABLE public.chatmessage RENAME COLUMN created_at TO "createdAt";
ALTER TABLE public.chatmessage RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE public.chatmessage RENAME COLUMN content_text TO "content";
ALTER TABLE public.chatmessage RENAME COLUMN conversation_custom_chatconversation TO "conversationId";
ALTER TABLE public.chatmessage RENAME COLUMN is_from_user_boolean TO "isFromUser";
ALTER TABLE public.chatmessage RENAME COLUMN responce_received_boolean TO "responseReceived";
ALTER TABLE public.chatmessage RENAME COLUMN sender_text TO "sender";
ALTER TABLE public.chatmessage RENAME COLUMN user_user TO "userId";

-- columns: dailycheckin
ALTER TABLE public.dailycheckin RENAME COLUMN created_at TO "createdAt";
ALTER TABLE public.dailycheckin RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE public.dailycheckin RENAME COLUMN date_date TO "date";
ALTER TABLE public.dailycheckin RENAME COLUMN energy_stress_level_number TO "energyStressLevel";
ALTER TABLE public.dailycheckin RENAME COLUMN mood_number TO "mood";
ALTER TABLE public.dailycheckin RENAME COLUMN reflection_text TO "reflection";
ALTER TABLE public.dailycheckin RENAME COLUMN user_user TO "userId";

-- columns: path
ALTER TABLE public.path RENAME COLUMN created_at TO "createdAt";
ALTER TABLE public.path RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE public.path RENAME COLUMN ai_coaching_mode_option_ai_coaching_mode_os TO "aiCoachingMode";
ALTER TABLE public.path RENAME COLUMN classification_list_list_option_classification_os TO "classifications";
ALTER TABLE public.path RENAME COLUMN description_text TO "description";
ALTER TABLE public.path RENAME COLUMN name_text TO "name";
ALTER TABLE public.path RENAME COLUMN pillar_option_customer_pillar_os TO "pillar";
ALTER TABLE public.path RENAME COLUMN sessions_count_number TO "sessionsCount";
ALTER TABLE public.path RENAME COLUMN sub_mode_text TO "subMode";
ALTER TABLE public.path RENAME COLUMN tier_option_tier_os TO "tier";
ALTER TABLE public.path RENAME COLUMN trigger_signals_text TO "triggerSignals";

-- columns: pathenrollment1
ALTER TABLE public.pathenrollment1 RENAME COLUMN created_at TO "createdAt";
ALTER TABLE public.pathenrollment1 RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE public.pathenrollment1 RENAME COLUMN completed_micro_commitment_session_list_list_custom_pathsession TO "completedMicroCommitmentSessionIds";
ALTER TABLE public.pathenrollment1 RENAME COLUMN completed_sessions_count_number TO "completedSessionsCount";
ALTER TABLE public.pathenrollment1 RENAME COLUMN current_session_custom_pathsession TO "currentSessionId";
ALTER TABLE public.pathenrollment1 RENAME COLUMN focused_m_commitment_custom_pathsession TO "focusedMicroCommitmentSessionId";
ALTER TABLE public.pathenrollment1 RENAME COLUMN is_m_commitment_in_focus_boolean TO "isMicroCommitmentInFocus";
ALTER TABLE public.pathenrollment1 RENAME COLUMN path_custom_path TO "pathId";
ALTER TABLE public.pathenrollment1 RENAME COLUMN status_option_path_enrollment_status TO "status";
ALTER TABLE public.pathenrollment1 RENAME COLUMN user_user TO "userId";

-- columns: pathquestion
ALTER TABLE public.pathquestion RENAME COLUMN created_at TO "createdAt";
ALTER TABLE public.pathquestion RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE public.pathquestion RENAME COLUMN index_number TO "index";
ALTER TABLE public.pathquestion RENAME COLUMN q_text_text TO "questionText";
ALTER TABLE public.pathquestion RENAME COLUMN session_custom_pathsession TO "sessionId";

-- columns: pathsession
ALTER TABLE public.pathsession RENAME COLUMN created_at TO "createdAt";
ALTER TABLE public.pathsession RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE public.pathsession RENAME COLUMN coaching_text_text TO "coachingText";
ALTER TABLE public.pathsession RENAME COLUMN estimated_minutes_number TO "estimatedMinutes";
ALTER TABLE public.pathsession RENAME COLUMN index_number TO "index";
ALTER TABLE public.pathsession RENAME COLUMN micro_commitment_text TO "microCommitment";
ALTER TABLE public.pathsession RENAME COLUMN path_custom_path TO "pathId";
ALTER TABLE public.pathsession RENAME COLUMN title_text TO "title";

-- columns: profiles
ALTER TABLE public.profiles RENAME COLUMN created_at TO "createdAt";
ALTER TABLE public.profiles RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE public.profiles RENAME COLUMN ai_confidence_level_option_ai_confidence_level_os TO "aiConfidenceLevel";
ALTER TABLE public.profiles RENAME COLUMN alignment_score_number TO "alignmentScore";
ALTER TABLE public.profiles RENAME COLUMN behavioral_fingerprint_text TO "behavioralFingerprint";
ALTER TABLE public.profiles RENAME COLUMN check_in_frequency_text TO "checkInFrequency";
ALTER TABLE public.profiles RENAME COLUMN classification_option_classification_os TO "classification";
ALTER TABLE public.profiles RENAME COLUMN customer_role_option_customer_role_os TO "customerRole";
ALTER TABLE public.profiles RENAME COLUMN daily_check_in_streak_number TO "dailyCheckInStreak";
ALTER TABLE public.profiles RENAME COLUMN first_name TO "firstName";
ALTER TABLE public.profiles RENAME COLUMN is_admin_boolean TO "isAdmin";
ALTER TABLE public.profiles RENAME COLUMN notification_frequency_text TO "notificationFrequency";
ALTER TABLE public.profiles RENAME COLUMN onboarding_completed TO "onboardingCompleted";
ALTER TABLE public.profiles RENAME COLUMN onboarding_completed_at TO "onboardingCompletedAt";
ALTER TABLE public.profiles RENAME COLUMN onboarding_data TO "onboardingData";
ALTER TABLE public.profiles RENAME COLUMN orientation_score_number TO "orientationScore";
ALTER TABLE public.profiles RENAME COLUMN performance_score_number TO "performanceScore";
ALTER TABLE public.profiles RENAME COLUMN preferences_text TO "preferences";
ALTER TABLE public.profiles RENAME COLUMN pressure_profile_text TO "pressureProfile";
ALTER TABLE public.profiles RENAME COLUMN primary_pillar TO "primaryPillar";
ALTER TABLE public.profiles RENAME COLUMN reassessment_completed_at TO "reassessmentCompletedAt";
ALTER TABLE public.profiles RENAME COLUMN reassessment_data TO "reassessmentData";
ALTER TABLE public.profiles RENAME COLUMN reassessment_reflections TO "reassessmentReflections";
ALTER TABLE public.profiles RENAME COLUMN reassessment_results TO "reassessmentResults";
ALTER TABLE public.profiles RENAME COLUMN role_type TO "roleType";
ALTER TABLE public.profiles RENAME COLUMN stability_score_number TO "stabilityScore";
ALTER TABLE public.profiles RENAME COLUMN streak_days_number TO "streakDays";
ALTER TABLE public.profiles RENAME COLUMN tier_option_tier_os TO "tier";
ALTER TABLE public.profiles RENAME COLUMN workplace_custom_workplace TO "workplaceId";

-- columns: resource
ALTER TABLE public.resource RENAME COLUMN created_at TO "createdAt";
ALTER TABLE public.resource RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE public.resource RENAME COLUMN content_text TO "content";
ALTER TABLE public.resource RENAME COLUMN external_link_text TO "externalLink";
ALTER TABLE public.resource RENAME COLUMN is_crisis_resource_boolean TO "isCrisisResource";
ALTER TABLE public.resource RENAME COLUMN is_free_boolean TO "isFree";
ALTER TABLE public.resource RENAME COLUMN primary_mode_tag_text TO "primaryModeTag";
ALTER TABLE public.resource RENAME COLUMN sensitivity_flag_text TO "sensitivityFlag";
ALTER TABLE public.resource RENAME COLUMN sub_mode_tag_text TO "subModeTag";
ALTER TABLE public.resource RENAME COLUMN title_text TO "title";

-- columns: subscription_plan
ALTER TABLE public.subscription_plan RENAME COLUMN created_at TO "createdAt";
ALTER TABLE public.subscription_plan RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE public.subscription_plan RENAME COLUMN description_text TO "description";
ALTER TABLE public.subscription_plan RENAME COLUMN features_text TO "features";
ALTER TABLE public.subscription_plan RENAME COLUMN name_text TO "name";
ALTER TABLE public.subscription_plan RENAME COLUMN price_number TO "price";
ALTER TABLE public.subscription_plan RENAME COLUMN tier_slug TO "tierSlug";

-- columns: uds_journalentry
ALTER TABLE public.uds_journalentry RENAME COLUMN created_at TO "createdAt";
ALTER TABLE public.uds_journalentry RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE public.uds_journalentry RENAME COLUMN ai_reflection_text TO "aiReflection";
ALTER TABLE public.uds_journalentry RENAME COLUMN content_text TO "content";
ALTER TABLE public.uds_journalentry RENAME COLUMN mood_tag_text TO "moodTag";
ALTER TABLE public.uds_journalentry RENAME COLUMN title_text TO "title";
ALTER TABLE public.uds_journalentry RENAME COLUMN user_user TO "userId";

-- columns: uds_milestone
ALTER TABLE public.uds_milestone RENAME COLUMN created_at TO "createdAt";
ALTER TABLE public.uds_milestone RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE public.uds_milestone RENAME COLUMN achieved_at_date TO "achievedAt";
ALTER TABLE public.uds_milestone RENAME COLUMN description_text TO "description";
ALTER TABLE public.uds_milestone RENAME COLUMN title_text TO "title";
ALTER TABLE public.uds_milestone RENAME COLUMN user_user TO "userId";

-- columns: uds_relapseevent
ALTER TABLE public.uds_relapseevent RENAME COLUMN created_at TO "createdAt";
ALTER TABLE public.uds_relapseevent RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE public.uds_relapseevent RENAME COLUMN event_date_date TO "eventDate";
ALTER TABLE public.uds_relapseevent RENAME COLUMN notes_text TO "notes";
ALTER TABLE public.uds_relapseevent RENAME COLUMN user_user TO "userId";

-- columns: workplace
ALTER TABLE public.workplace RENAME COLUMN created_at TO "createdAt";
ALTER TABLE public.workplace RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE public.workplace RENAME COLUMN contact_email_text TO "contactEmail";
ALTER TABLE public.workplace RENAME COLUMN name_text TO "name";

-- table renames
ALTER TABLE public.chatconversation RENAME TO "chatConversation";
ALTER TABLE public.chatmessage RENAME TO "chatMessage";
ALTER TABLE public.dailycheckin RENAME TO "dailyCheckin";
ALTER TABLE public.pathenrollment1 RENAME TO "pathEnrollment";
ALTER TABLE public.pathquestion RENAME TO "pathQuestion";
ALTER TABLE public.pathsession RENAME TO "pathSession";
ALTER TABLE public.subscription_plan RENAME TO "subscriptionPlan";
ALTER TABLE public.uds_journalentry RENAME TO "journalEntry";
ALTER TABLE public.uds_milestone RENAME TO "milestone";
ALTER TABLE public.uds_relapseevent RENAME TO "relapseEvent";

CREATE OR REPLACE FUNCTION public.userOwnsRow(owner UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT auth.uid() IS NOT NULL AND owner IS NOT NULL AND auth.uid() = owner; $$;
GRANT EXECUTE ON FUNCTION public.userOwnsRow(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.userOwnsChatConversation(conversation_id UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."chatConversation" c
    WHERE c.id = conversation_id AND public.userOwnsRow(c."userId")
  );
$$;
GRANT EXECUTE ON FUNCTION public.userOwnsChatConversation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.userCanAccessPathSession(session_id UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_settings_admin() OR EXISTS (
    SELECT 1 FROM public."pathSession" ps
    JOIN public."pathEnrollment" pe ON pe."pathId" = ps."pathId"
    WHERE ps.id = session_id AND public.userOwnsRow(pe."userId")
  );
$$;
GRANT EXECUTE ON FUNCTION public.userCanAccessPathSession(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.userCanAccessPathQuestion(question_id UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_settings_admin() OR EXISTS (
    SELECT 1 FROM public."pathQuestion" pq
    JOIN public."pathSession" ps ON ps.id = pq."sessionId"
    JOIN public."pathEnrollment" pe ON pe."pathId" = ps."pathId"
    WHERE pq.id = question_id AND public.userOwnsRow(pe."userId")
  );
$$;
GRANT EXECUTE ON FUNCTION public.userCanAccessPathQuestion(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.bubble_user_owns_row(UUID);

CREATE POLICY "Owner selects chatConversation" ON public."chatConversation" FOR SELECT TO authenticated USING (public.userOwnsRow("userId"));
CREATE POLICY "Owner inserts chatConversation" ON public."chatConversation" FOR INSERT TO authenticated WITH CHECK (public.userOwnsRow("userId"));
CREATE POLICY "Owner updates chatConversation" ON public."chatConversation" FOR UPDATE TO authenticated USING (public.userOwnsRow("userId")) WITH CHECK (public.userOwnsRow("userId"));
CREATE POLICY "Owner deletes chatConversation" ON public."chatConversation" FOR DELETE TO authenticated USING (public.userOwnsRow("userId"));
CREATE POLICY "Owner selects dailyCheckin" ON public."dailyCheckin" FOR SELECT TO authenticated USING (public.userOwnsRow("userId"));
CREATE POLICY "Owner inserts dailyCheckin" ON public."dailyCheckin" FOR INSERT TO authenticated WITH CHECK (public.userOwnsRow("userId"));
CREATE POLICY "Owner updates dailyCheckin" ON public."dailyCheckin" FOR UPDATE TO authenticated USING (public.userOwnsRow("userId")) WITH CHECK (public.userOwnsRow("userId"));
CREATE POLICY "Owner deletes dailyCheckin" ON public."dailyCheckin" FOR DELETE TO authenticated USING (public.userOwnsRow("userId"));
CREATE POLICY "Owner selects pathEnrollment" ON public."pathEnrollment" FOR SELECT TO authenticated USING (public.userOwnsRow("userId"));
CREATE POLICY "Owner inserts pathEnrollment" ON public."pathEnrollment" FOR INSERT TO authenticated WITH CHECK (public.userOwnsRow("userId"));
CREATE POLICY "Owner updates pathEnrollment" ON public."pathEnrollment" FOR UPDATE TO authenticated USING (public.userOwnsRow("userId")) WITH CHECK (public.userOwnsRow("userId"));
CREATE POLICY "Owner deletes pathEnrollment" ON public."pathEnrollment" FOR DELETE TO authenticated USING (public.userOwnsRow("userId"));
CREATE POLICY "Owner selects journalEntry" ON public."journalEntry" FOR SELECT TO authenticated USING (public.userOwnsRow("userId"));
CREATE POLICY "Owner inserts journalEntry" ON public."journalEntry" FOR INSERT TO authenticated WITH CHECK (public.userOwnsRow("userId"));
CREATE POLICY "Owner updates journalEntry" ON public."journalEntry" FOR UPDATE TO authenticated USING (public.userOwnsRow("userId")) WITH CHECK (public.userOwnsRow("userId"));
CREATE POLICY "Owner deletes journalEntry" ON public."journalEntry" FOR DELETE TO authenticated USING (public.userOwnsRow("userId"));
CREATE POLICY "Owner selects milestone" ON public."milestone" FOR SELECT TO authenticated USING (public.userOwnsRow("userId"));
CREATE POLICY "Owner inserts milestone" ON public."milestone" FOR INSERT TO authenticated WITH CHECK (public.userOwnsRow("userId"));
CREATE POLICY "Owner updates milestone" ON public."milestone" FOR UPDATE TO authenticated USING (public.userOwnsRow("userId")) WITH CHECK (public.userOwnsRow("userId"));
CREATE POLICY "Owner deletes milestone" ON public."milestone" FOR DELETE TO authenticated USING (public.userOwnsRow("userId"));
CREATE POLICY "Owner selects relapseEvent" ON public."relapseEvent" FOR SELECT TO authenticated USING (public.userOwnsRow("userId"));
CREATE POLICY "Owner inserts relapseEvent" ON public."relapseEvent" FOR INSERT TO authenticated WITH CHECK (public.userOwnsRow("userId"));
CREATE POLICY "Owner updates relapseEvent" ON public."relapseEvent" FOR UPDATE TO authenticated USING (public.userOwnsRow("userId")) WITH CHECK (public.userOwnsRow("userId"));
CREATE POLICY "Owner deletes relapseEvent" ON public."relapseEvent" FOR DELETE TO authenticated USING (public.userOwnsRow("userId"));

CREATE POLICY "Owner selects chatMessage" ON public."chatMessage" FOR SELECT TO authenticated USING (public.userOwnsRow("userId") AND ("conversationId" IS NULL OR public.userOwnsChatConversation("conversationId")));
CREATE POLICY "Owner inserts chatMessage" ON public."chatMessage" FOR INSERT TO authenticated WITH CHECK (public.userOwnsRow("userId") AND ("conversationId" IS NULL OR public.userOwnsChatConversation("conversationId")));
CREATE POLICY "Owner updates chatMessage" ON public."chatMessage" FOR UPDATE TO authenticated USING (public.userOwnsRow("userId") AND ("conversationId" IS NULL OR public.userOwnsChatConversation("conversationId"))) WITH CHECK (public.userOwnsRow("userId") AND ("conversationId" IS NULL OR public.userOwnsChatConversation("conversationId")));
CREATE POLICY "Owner deletes chatMessage" ON public."chatMessage" FOR DELETE TO authenticated USING (public.userOwnsRow("userId") AND ("conversationId" IS NULL OR public.userOwnsChatConversation("conversationId")));

CREATE POLICY "Enrolled user selects pathSession" ON public."pathSession" FOR SELECT TO authenticated USING (public.userCanAccessPathSession(id));
CREATE POLICY "Settings admin inserts pathSession" ON public."pathSession" FOR INSERT TO authenticated WITH CHECK (public.is_settings_admin());
CREATE POLICY "Settings admin updates pathSession" ON public."pathSession" FOR UPDATE TO authenticated USING (public.is_settings_admin()) WITH CHECK (public.is_settings_admin());
CREATE POLICY "Settings admin deletes pathSession" ON public."pathSession" FOR DELETE TO authenticated USING (public.is_settings_admin());

CREATE POLICY "Enrolled user selects pathQuestion" ON public."pathQuestion" FOR SELECT TO authenticated USING (public.userCanAccessPathQuestion(id));
CREATE POLICY "Settings admin inserts pathQuestion" ON public."pathQuestion" FOR INSERT TO authenticated WITH CHECK (public.is_settings_admin());
CREATE POLICY "Settings admin updates pathQuestion" ON public."pathQuestion" FOR UPDATE TO authenticated USING (public.is_settings_admin()) WITH CHECK (public.is_settings_admin());
CREATE POLICY "Settings admin deletes pathQuestion" ON public."pathQuestion" FOR DELETE TO authenticated USING (public.is_settings_admin());

CREATE POLICY "Authenticated selects subscriptionPlan" ON public."subscriptionPlan" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Settings admin inserts subscriptionPlan" ON public."subscriptionPlan" FOR INSERT TO authenticated WITH CHECK (public.is_settings_admin());
CREATE POLICY "Settings admin updates subscriptionPlan" ON public."subscriptionPlan" FOR UPDATE TO authenticated USING (public.is_settings_admin()) WITH CHECK (public.is_settings_admin());
CREATE POLICY "Settings admin deletes subscriptionPlan" ON public."subscriptionPlan" FOR DELETE TO authenticated USING (public.is_settings_admin());

CREATE POLICY "Owner selects profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Owner inserts profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Owner updates profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Owner deletes profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Recreate helpers that reference renamed profile columns
CREATE OR REPLACE FUNCTION public.is_settings_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND "roleType" = 'admin'
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE "roleType" = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, "firstName")
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Settings admins can insert workplaces" ON public.workplace;
DROP POLICY IF EXISTS "Settings admins can update workplaces" ON public.workplace;
DROP POLICY IF EXISTS "Settings admins can delete workplaces" ON public.workplace;

CREATE POLICY "Settings admins can insert workplaces"
  ON public.workplace FOR INSERT TO authenticated
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admins can update workplaces"
  ON public.workplace FOR UPDATE TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admins can delete workplaces"
  ON public.workplace FOR DELETE TO authenticated
  USING (public.is_settings_admin());
