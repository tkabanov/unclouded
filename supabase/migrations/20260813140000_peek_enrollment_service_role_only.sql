-- Rate-limit public enrollment peek via edge function only (service_role).
-- Direct anon/authenticated RPC bypassed the edge attempt window.

REVOKE ALL ON FUNCTION public.peek_workplace_enrollment_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.peek_workplace_enrollment_code(text) FROM anon;
REVOKE ALL ON FUNCTION public.peek_workplace_enrollment_code(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.peek_workplace_enrollment_code(text) TO service_role;
