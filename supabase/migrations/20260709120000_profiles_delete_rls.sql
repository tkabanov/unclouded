-- SET-04: allow authenticated users to delete their own profile row (account deletion flow).
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);
