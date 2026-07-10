-- Owner-scoped RLS for user data tables.
-- Tables with user_user use bubble_user_owns_row(auth.uid() = user_user).
-- pathsession/pathquestion: readable when the user is enrolled in the parent path.
-- subscription_plan: shared product catalog (SELECT for all authenticated; writes admin-only).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bubble_user_owns_row(owner UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND owner IS NOT NULL AND auth.uid() = owner;
$$;

GRANT EXECUTE ON FUNCTION public.bubble_user_owns_row(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.bubble_user_owns_chatconversation(conversation_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chatconversation c
    WHERE c.id = conversation_id
      AND public.bubble_user_owns_row(c.user_user)
  );
$$;

GRANT EXECUTE ON FUNCTION public.bubble_user_owns_chatconversation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.user_can_access_pathsession(session_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_settings_admin()
  OR EXISTS (
    SELECT 1
    FROM public.pathsession ps
    JOIN public.pathenrollment1 pe ON pe.path_custom_path = ps.path_custom_path
    WHERE ps.id = session_id
      AND public.bubble_user_owns_row(pe.user_user)
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_pathsession(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.user_can_access_pathquestion(question_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_settings_admin()
  OR EXISTS (
    SELECT 1
    FROM public.pathquestion pq
    JOIN public.pathsession ps ON ps.id = pq.session_custom_pathsession
    JOIN public.pathenrollment1 pe ON pe.path_custom_path = ps.path_custom_path
    WHERE pq.id = question_id
      AND public.bubble_user_owns_row(pe.user_user)
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_pathquestion(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Drop legacy / conflicting policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Owner manages chatconversation" ON public.chatconversation;
DROP POLICY IF EXISTS "Owner manages chatmessage" ON public.chatmessage;
DROP POLICY IF EXISTS "Owner manages dailycheckin" ON public.dailycheckin;
DROP POLICY IF EXISTS "Owner manages uds_journalentry" ON public.uds_journalentry;
DROP POLICY IF EXISTS "Owner manages uds_milestone" ON public.uds_milestone;
DROP POLICY IF EXISTS "Owner manages uds_relapseevent" ON public.uds_relapseevent;
DROP POLICY IF EXISTS "Owner manages pathenrollment1" ON public.pathenrollment1;

DROP POLICY IF EXISTS "Authenticated read pathsession" ON public.pathsession;
DROP POLICY IF EXISTS "Authenticated read pathquestion" ON public.pathquestion;
DROP POLICY IF EXISTS "Settings admins write pathsession" ON public.pathsession;
DROP POLICY IF EXISTS "Settings admins write pathquestion" ON public.pathquestion;

DROP POLICY IF EXISTS "Authenticated read subscription_plan" ON public.subscription_plan;
DROP POLICY IF EXISTS "Authenticated users can read subscription plans" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admins write subscription_plan" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admins can insert subscription plans" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admins can update subscription plans" ON public.subscription_plan;
DROP POLICY IF EXISTS "Settings admins can delete subscription plans" ON public.subscription_plan;
DROP POLICY IF EXISTS "Authenticated users can insert subscription plans" ON public.subscription_plan;
DROP POLICY IF EXISTS "Authenticated users can update subscription plans" ON public.subscription_plan;
DROP POLICY IF EXISTS "Authenticated users can delete subscription plans" ON public.subscription_plan;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- ---------------------------------------------------------------------------
-- Macro: owner CRUD on user_user tables
-- ---------------------------------------------------------------------------

-- chatconversation
CREATE POLICY "Owner selects chatconversation"
  ON public.chatconversation FOR SELECT TO authenticated
  USING (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner inserts chatconversation"
  ON public.chatconversation FOR INSERT TO authenticated
  WITH CHECK (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner updates chatconversation"
  ON public.chatconversation FOR UPDATE TO authenticated
  USING (public.bubble_user_owns_row(user_user))
  WITH CHECK (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner deletes chatconversation"
  ON public.chatconversation FOR DELETE TO authenticated
  USING (public.bubble_user_owns_row(user_user));

-- chatmessage (must belong to owner and their conversation)
CREATE POLICY "Owner selects chatmessage"
  ON public.chatmessage FOR SELECT TO authenticated
  USING (
    public.bubble_user_owns_row(user_user)
    AND (
      conversation_custom_chatconversation IS NULL
      OR public.bubble_user_owns_chatconversation(conversation_custom_chatconversation)
    )
  );

CREATE POLICY "Owner inserts chatmessage"
  ON public.chatmessage FOR INSERT TO authenticated
  WITH CHECK (
    public.bubble_user_owns_row(user_user)
    AND (
      conversation_custom_chatconversation IS NULL
      OR public.bubble_user_owns_chatconversation(conversation_custom_chatconversation)
    )
  );

CREATE POLICY "Owner updates chatmessage"
  ON public.chatmessage FOR UPDATE TO authenticated
  USING (
    public.bubble_user_owns_row(user_user)
    AND (
      conversation_custom_chatconversation IS NULL
      OR public.bubble_user_owns_chatconversation(conversation_custom_chatconversation)
    )
  )
  WITH CHECK (
    public.bubble_user_owns_row(user_user)
    AND (
      conversation_custom_chatconversation IS NULL
      OR public.bubble_user_owns_chatconversation(conversation_custom_chatconversation)
    )
  );

CREATE POLICY "Owner deletes chatmessage"
  ON public.chatmessage FOR DELETE TO authenticated
  USING (
    public.bubble_user_owns_row(user_user)
    AND (
      conversation_custom_chatconversation IS NULL
      OR public.bubble_user_owns_chatconversation(conversation_custom_chatconversation)
    )
  );

-- dailycheckin
CREATE POLICY "Owner selects dailycheckin"
  ON public.dailycheckin FOR SELECT TO authenticated
  USING (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner inserts dailycheckin"
  ON public.dailycheckin FOR INSERT TO authenticated
  WITH CHECK (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner updates dailycheckin"
  ON public.dailycheckin FOR UPDATE TO authenticated
  USING (public.bubble_user_owns_row(user_user))
  WITH CHECK (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner deletes dailycheckin"
  ON public.dailycheckin FOR DELETE TO authenticated
  USING (public.bubble_user_owns_row(user_user));

-- pathenrollment1
CREATE POLICY "Owner selects pathenrollment1"
  ON public.pathenrollment1 FOR SELECT TO authenticated
  USING (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner inserts pathenrollment1"
  ON public.pathenrollment1 FOR INSERT TO authenticated
  WITH CHECK (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner updates pathenrollment1"
  ON public.pathenrollment1 FOR UPDATE TO authenticated
  USING (public.bubble_user_owns_row(user_user))
  WITH CHECK (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner deletes pathenrollment1"
  ON public.pathenrollment1 FOR DELETE TO authenticated
  USING (public.bubble_user_owns_row(user_user));

-- uds_journalentry
CREATE POLICY "Owner selects uds_journalentry"
  ON public.uds_journalentry FOR SELECT TO authenticated
  USING (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner inserts uds_journalentry"
  ON public.uds_journalentry FOR INSERT TO authenticated
  WITH CHECK (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner updates uds_journalentry"
  ON public.uds_journalentry FOR UPDATE TO authenticated
  USING (public.bubble_user_owns_row(user_user))
  WITH CHECK (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner deletes uds_journalentry"
  ON public.uds_journalentry FOR DELETE TO authenticated
  USING (public.bubble_user_owns_row(user_user));

-- uds_milestone
CREATE POLICY "Owner selects uds_milestone"
  ON public.uds_milestone FOR SELECT TO authenticated
  USING (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner inserts uds_milestone"
  ON public.uds_milestone FOR INSERT TO authenticated
  WITH CHECK (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner updates uds_milestone"
  ON public.uds_milestone FOR UPDATE TO authenticated
  USING (public.bubble_user_owns_row(user_user))
  WITH CHECK (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner deletes uds_milestone"
  ON public.uds_milestone FOR DELETE TO authenticated
  USING (public.bubble_user_owns_row(user_user));

-- uds_relapseevent
CREATE POLICY "Owner selects uds_relapseevent"
  ON public.uds_relapseevent FOR SELECT TO authenticated
  USING (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner inserts uds_relapseevent"
  ON public.uds_relapseevent FOR INSERT TO authenticated
  WITH CHECK (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner updates uds_relapseevent"
  ON public.uds_relapseevent FOR UPDATE TO authenticated
  USING (public.bubble_user_owns_row(user_user))
  WITH CHECK (public.bubble_user_owns_row(user_user));

CREATE POLICY "Owner deletes uds_relapseevent"
  ON public.uds_relapseevent FOR DELETE TO authenticated
  USING (public.bubble_user_owns_row(user_user));

-- profiles (id = auth user)
CREATE POLICY "Owner selects profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Owner inserts profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Owner updates profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Owner deletes profile"
  ON public.profiles FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- pathsession / pathquestion (enrolled path access; admins manage content)
CREATE POLICY "Enrolled user selects pathsession"
  ON public.pathsession FOR SELECT TO authenticated
  USING (public.user_can_access_pathsession(id));

CREATE POLICY "Settings admin inserts pathsession"
  ON public.pathsession FOR INSERT TO authenticated
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admin updates pathsession"
  ON public.pathsession FOR UPDATE TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admin deletes pathsession"
  ON public.pathsession FOR DELETE TO authenticated
  USING (public.is_settings_admin());

CREATE POLICY "Enrolled user selects pathquestion"
  ON public.pathquestion FOR SELECT TO authenticated
  USING (public.user_can_access_pathquestion(id));

CREATE POLICY "Settings admin inserts pathquestion"
  ON public.pathquestion FOR INSERT TO authenticated
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admin updates pathquestion"
  ON public.pathquestion FOR UPDATE TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admin deletes pathquestion"
  ON public.pathquestion FOR DELETE TO authenticated
  USING (public.is_settings_admin());

-- subscription_plan: shared catalog (not per-user rows)
CREATE POLICY "Authenticated selects subscription_plan"
  ON public.subscription_plan FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Settings admin inserts subscription_plan"
  ON public.subscription_plan FOR INSERT TO authenticated
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admin updates subscription_plan"
  ON public.subscription_plan FOR UPDATE TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admin deletes subscription_plan"
  ON public.subscription_plan FOR DELETE TO authenticated
  USING (public.is_settings_admin());
