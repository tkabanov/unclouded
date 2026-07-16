/**
 * Recover path/session links after seed re-runs that DELETE paths/sessions
 * (FK ON DELETE SET NULL nulls pathEnrollment.pathId and pathResponse.sessionId).
 */

-- Relink pathResponse rows by matching question text to the re-seeded catalog.
UPDATE public."pathResponse" pr
SET
  "sessionId" = pq."sessionId",
  "questionId" = pq.id
FROM public."pathQuestion" pq
WHERE pr."sessionId" IS NULL
  AND pr."questionText" IS NOT NULL
  AND LEFT(pr."questionText", 80) = LEFT(pq."questionText", 80);

-- Relink orphan enrollments from their pathResponse → pathSession → path chain.
UPDATE public."pathEnrollment" pe
SET
  "pathId" = recovered."pathId",
  "updatedAt" = NOW()
FROM (
  SELECT
    pr."userId",
    (ARRAY_AGG(ps."pathId" ORDER BY pr."createdAt" DESC))[1] AS "pathId"
  FROM public."pathResponse" pr
  JOIN public."pathSession" ps ON ps.id = pr."sessionId"
  WHERE pr."sessionId" IS NOT NULL
    AND ps."pathId" IS NOT NULL
  GROUP BY pr."userId"
) recovered
WHERE pe."userId" = recovered."userId"
  AND pe."pathId" IS NULL
  AND pe.status = 'active';

-- Restore currentSessionId to the next incomplete session when it was nulled.
UPDATE public."pathEnrollment" pe
SET
  "currentSessionId" = (
    SELECT ps.id
    FROM public."pathSession" ps
    WHERE ps."pathId" = pe."pathId"
    ORDER BY ps.index ASC
    OFFSET GREATEST(COALESCE(pe."completedSessionsCount", 0)::int, 0)
    LIMIT 1
  ),
  "updatedAt" = NOW()
WHERE pe."pathId" IS NOT NULL
  AND pe."currentSessionId" IS NULL
  AND pe.status IN ('active', 'paused');
