"""Smoke-check generated paths library migration (no DB required)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from seed_paths_from_docs import (  # noqa: E402
    apply_canonical_q4,
    default_doc_paths,
    parse_docs,
    validate_records,
)

MIGRATION = ROOT / "supabase" / "migrations" / "20260804160000_seed_paths_library_from_new_docs.sql"


def main() -> None:
    records = parse_docs(default_doc_paths())
    apply_canonical_q4(records)
    warnings = validate_records(records)
    assert not warnings, warnings

    numbered = [r for r in records if r.path_type != "success_plan"]
    success = [r for r in records if r.path_type == "success_plan"]
    assert len(numbered) == 52, len(numbered)
    assert [r.number for r in numbered] == list(range(4, 56))
    assert len(success) == 7, len(success)

    premium = [r for r in numbered if r.tier == "premium"]
    assert {r.name for r in premium} == {
        "Sleep Mastery",
        "High Performance Sustainability",
        "The Optimization Protocol",
        "Deep Identity Work",
    }

    path9 = next(r for r in numbered if r.number == 9)
    assert "prerequisite:module:identity" in path9.build_trigger_signals()
    assert path9.enrollment_onboarding is True

    path19 = next(r for r in numbered if r.number == 19)
    assert path19.enrollment_onboarding is True  # meta says auto-enroll for Capacity Erosion
    assert path19.sessions[-1].reassessment_reflection_question

    path51 = next(r for r in numbered if r.name == "Sleep Mastery")
    assert path51.tier == "premium"
    assert path51.enrollment_onboarding is False

    for plan in success:
        assert plan.tier == "pro"
        assert "path_type:success_plan" in plan.build_trigger_signals()
        assert plan.enrollment_onboarding is False
        assert plan.session_count == 5
        assert plan.sessions[-1].reassessment_reflection_question

    # Batch/doc footers must not leak into micro-commitments (last session of each batch).
    leak = re.compile(
        r"(BATCH\s+\d+\s+COMPLETE|Batch\s+\d+\s+Complete|ALL\s+\d+\s+MVP\s+PATHS\s+COMPLETE|"
        r"The\s+Uncloud360\s+Path\s+Library\s+is\s+Complete|Phase\s+2\s+Path\s+Content|"
        r"MVP\s+Path\s+Content\s+Batch|Success\s+Plan\s+Paths\s*[·.\-]\s*Confidential|"
        r"FOR\s+THE\s+DEVELOPER)",
        re.IGNORECASE,
    )
    for record in records:
        for session in record.sessions:
            assert not leak.search(session.micro_commitment or ""), (
                f"{record.name} S{session.index}: footer in microCommitment"
            )

    sql = MIGRATION.read_text(encoding="utf-8")
    assert "BATCH 1 COMPLETE" not in sql
    assert "Phase 2 Path Content - Batch" not in sql
    assert "ALL 18 MVP PATHS COMPLETE" not in sql
    assert "The Uncloud360 Path Library is Complete" not in sql
    for line in sql.splitlines():
        if 'INSERT INTO public."pathSession"' in line:
            assert "BATCH" not in line or "COMPLETE" not in line
            assert "Phase 2 Path Content" not in line
            assert "Proven Under Pressure" not in line
            assert "Path Library is Complete" not in line
    assert "DELETE FROM public.path " not in sql and not re.search(
        r"DELETE FROM public\.path\b", sql
    )
    assert "Unsent Letter" not in sql
    assert sql.count("ON CONFLICT (id)") == 59
    assert sql.count("path_type:success_plan") == 7
    assert sql.count("prerequisite:module:identity") == 1
    assert sql.count("'premium'") == 4

    # Stable UUID continuity for MVP path 4
    assert "a80a9cba-2938-57e8-9530-54c41c19551e" in sql
    assert "f1b841e9-a4bf-51d9-b598-0514d6668d0d" in sql

    sessions = sum(len(r.sessions) for r in records)
    questions = sum(len(s.questions) for r in records for s in r.sessions)
    print(
        f"OK: {len(numbered)} library + {len(success)} success; "
        f"{sessions} sessions; {questions} questions; migration {MIGRATION.stat().st_size} bytes"
    )


if __name__ == "__main__":
    main()
