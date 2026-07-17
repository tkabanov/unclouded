-- TEMP §12: gate one seeded path on Identity Lens module completion.
UPDATE public.path
SET "triggerSignals" = "triggerSignals" || '; prerequisite:module:identity'
WHERE id = 'f1b841e9-a4bf-51d9-b598-0514d6668d0d';
