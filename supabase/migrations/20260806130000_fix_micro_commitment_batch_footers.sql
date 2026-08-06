-- Strip batch/document colophons that were accidentally parsed into
-- pathSession.microCommitment (last session of each authored batch).
-- Safe to re-run: only rows matching known footer patterns are updated.

UPDATE public."pathSession"
SET "microCommitment" = trim(both FROM regexp_replace(
  "microCommitment",
  E'\\s*(BATCH\\s+\\d+\\s+COMPLETE|Batch\\s+\\d+\\s+Complete|ALL\\s+\\d+\\s+MVP\\s+PATHS\\s+COMPLETE|The\\s+Uncloud360\\s+Path\\s+Library\\s+is\\s+Complete|Uncloud360\\S*\\s*[·.\\-].*|Proven Under Pressure[^\\n]*Confidential)\\s*$',
  '',
  'i'
))
WHERE "microCommitment" IS NOT NULL
  AND "microCommitment" ~*
    '(BATCH[[:space:]]+[0-9]+[[:space:]]+COMPLETE|Batch[[:space:]]+[0-9]+[[:space:]]+Complete|ALL[[:space:]]+[0-9]+[[:space:]]+MVP[[:space:]]+PATHS[[:space:]]+COMPLETE|The[[:space:]]+Uncloud360[[:space:]]+Path[[:space:]]+Library[[:space:]]+is[[:space:]]+Complete|Phase[[:space:]]+2[[:space:]]+Path[[:space:]]+Content|MVP[[:space:]]+Path[[:space:]]+Content[[:space:]]+Batch|Success[[:space:]]+Plan[[:space:]]+Paths|Proven Under Pressure)';
