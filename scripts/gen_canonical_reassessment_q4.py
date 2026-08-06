#!/usr/bin/env python3
"""Generate name-keyed Canonical Q4 fix migration (PL-REA-003)."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = ROOT / "docs/new_paths_content/Uncloud360_Canonical_Path_Library.md"
OUT = ROOT / "supabase/migrations/20260806120000_fix_canonical_reassessment_q4_by_name.sql"

ROW_RE = re.compile(r"\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|$")


def load_canonical_q4_by_name() -> list[tuple[int, str, str]]:
    rows: list[tuple[int, str, str]] = []
    for line in CANONICAL.read_text(encoding="utf-8").splitlines():
        m = ROW_RE.match(line.strip())
        if not m:
            continue
        n = int(m.group(1))
        name = m.group(2).strip()
        q = m.group(3).strip()
        if 1 <= n <= 55 and q.startswith("You completed"):
            rows.append((n, name, q))
    return rows


def main() -> None:
    rows = load_canonical_q4_by_name()
    if len(rows) != 55:
        raise SystemExit(f"Expected 55 Q4 rows, got {len(rows)}")

    lines = [
        "-- PL-REA-003: rewrite final-session reassessmentReflectionQuestion by path.name.",
        "--",
        "-- Bug in 20260805120000_seed_canonical_reassessment_q4.sql (+ partial fix",
        "-- 20260805130000): updates used uuid5(path-{Canonical#}), but runtime path ids",
        "-- follow batch PATH N numbering (OVR-037). Result: many name-swapped Q4 texts.",
        "--",
        "-- Authority: docs/new_paths_content/Uncloud360_Canonical_Path_Library.md",
        "-- § Path-Specific Reassessment Questions — matched by Canonical path name.",
        "-- Stub «Clarity & Priority Reset» has 0 sessions; UPDATE is a no-op (expected).",
        "",
        "BEGIN;",
        "",
    ]

    for n, name, q in rows:
        q_sql = q.replace("'", "''")
        name_sql = name.replace("'", "''")
        lines.append(f"-- Canonical #{n}: {name}")
        lines.append('UPDATE public."pathSession" ps')
        lines.append(f"SET \"reassessmentReflectionQuestion\" = '{q_sql}'")
        lines.append("FROM public.path p")
        lines.append("WHERE p.id = ps.\"pathId\"")
        lines.append(f"  AND p.name = '{name_sql}'")
        lines.append("  AND COALESCE(p.\"subMode\", '') <> 'success_plan'")
        lines.append("  AND ps.index = (")
        lines.append(
            "    SELECT MAX(s.index) FROM public.\"pathSession\" s "
            "WHERE s.\"pathId\" = p.id"
        )
        lines.append("  );")
        lines.append("")

    lines.extend(["COMMIT;", ""])
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT} ({len(rows)} updates by name)")


if __name__ == "__main__":
    main()
