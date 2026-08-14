-- Durable edge rate limits (shared across isolates). In-memory Maps reset / diverge
-- per Deno isolate, so public peek smoke never saw 429 on multi-isolate Edge.

CREATE TABLE IF NOT EXISTS public."edgeRateLimitBucket" (
  "bucketKey" TEXT PRIMARY KEY,
  "windowStart" TIMESTAMPTZ NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT edge_rate_limit_attempt_nonneg CHECK ("attemptCount" >= 0)
);

ALTER TABLE public."edgeRateLimitBucket" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."edgeRateLimitBucket" FROM PUBLIC;
REVOKE ALL ON TABLE public."edgeRateLimitBucket" FROM anon;
REVOKE ALL ON TABLE public."edgeRateLimitBucket" FROM authenticated;
GRANT ALL ON TABLE public."edgeRateLimitBucket" TO service_role;

CREATE OR REPLACE FUNCTION public.consume_edge_rate_limit(
  p_bucket TEXT,
  p_max_attempts INTEGER DEFAULT 12,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_row public."edgeRateLimitBucket"%ROWTYPE;
BEGIN
  IF p_bucket IS NULL OR length(trim(p_bucket)) = 0 THEN
    RETURN false;
  END IF;
  IF p_max_attempts IS NULL OR p_max_attempts < 1 THEN
    RETURN false;
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  LOOP
    SELECT * INTO v_row
    FROM public."edgeRateLimitBucket"
    WHERE "bucketKey" = p_bucket
    FOR UPDATE;

    IF NOT FOUND THEN
      BEGIN
        INSERT INTO public."edgeRateLimitBucket" ("bucketKey", "windowStart", "attemptCount")
        VALUES (p_bucket, v_now, 1);
        RETURN true;
      EXCEPTION
        WHEN unique_violation THEN
          -- Concurrent first insert; retry with lock.
          CONTINUE;
      END;
    END IF;

    IF v_row."windowStart" + make_interval(secs => p_window_seconds) <= v_now THEN
      UPDATE public."edgeRateLimitBucket"
      SET "windowStart" = v_now, "attemptCount" = 1
      WHERE "bucketKey" = p_bucket;
      RETURN true;
    END IF;

    IF v_row."attemptCount" >= p_max_attempts THEN
      RETURN false;
    END IF;

    UPDATE public."edgeRateLimitBucket"
    SET "attemptCount" = "attemptCount" + 1
    WHERE "bucketKey" = p_bucket;
    RETURN true;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_edge_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_edge_rate_limit(TEXT, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.consume_edge_rate_limit(TEXT, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_edge_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION public.consume_edge_rate_limit(TEXT, INTEGER, INTEGER) IS
  'Atomically consume one attempt in a sliding fixed window; returns false when limited. service_role only.';
