#!/usr/bin/env python3
"""Verify Canonical Q4 attaches by path name (not batch number)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_paths_from_docs import (  # noqa: E402
    apply_canonical_q4,
    default_doc_paths,
    load_canonical_q4_by_name,
    parse_docs,
)


def main() -> None:
    canon = load_canonical_q4_by_name()
    assert len(canon) == 55, len(canon)

    records = parse_docs(default_doc_paths())
    apply_canonical_q4(records)
    lib = [r for r in records if r.path_type != "success_plan"]

    mismatches: list[str] = []
    for r in lib:
        q = (
            r.sessions[-1].reassessment_reflection_question
            if r.sessions
            else r.reassessment_reflection_question
        )
        expected = canon.get(r.name)
        if r.name == "Clarity & Priority Reset":
            assert not r.sessions, "stub should have 0 sessions"
            continue
        if not expected:
            mismatches.append(f"no canon Q4 for {r.name!r}")
            continue
        if q != expected:
            mismatches.append(f"{r.name}: q4 mismatch")
            continue
        m = re.match(r"You completed the (.+?) path\.", q)
        assert m, q
        mentioned = m.group(1)
        ok = mentioned == r.name or (
            r.name == "The Optimization Protocol"
            and mentioned == "Optimization Protocol"
        )
        if not ok:
            mismatches.append(f"{r.name}: Q4 mentions {mentioned!r}")

    # Spot check previously swapped pair
    by_name = {r.name: r for r in lib}
    ert = by_name["Emotional Recovery Toolkit"].sessions[-1].reassessment_reflection_question
    sfs = by_name["Strategic Focus System"].sessions[-1].reassessment_reflection_question
    assert "Emotional Recovery Toolkit" in ert
    assert "Strategic Focus System" in sfs

    if mismatches:
        raise SystemExit("FAIL:\n" + "\n".join(mismatches))
    print(f"OK: {len(lib)} library paths; Q4 matched by name for authored paths")


if __name__ == "__main__":
    main()
