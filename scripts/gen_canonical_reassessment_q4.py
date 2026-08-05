#!/usr/bin/env python3
"""Generate migration to seed Canonical Path Library reassessment Q4 texts."""

from __future__ import annotations

import re
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NS = uuid.UUID("7c9e6679-7425-40de-944b-e07fc1f90ae7")
CANONICAL = ROOT / "docs" / "new_paths_content" / "Uncloud360_Canonical_Path_Library.md"
OUT = ROOT / "supabase" / "migrations" / "20260805120000_seed_canonical_reassessment_q4.sql"

ROW_RE = re.compile(
    r"\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|$"
)


def main() -> None:
    rows: list[tuple[int, str, str]] = []
    for line in CANONICAL.read_text(encoding="utf-8").splitlines():
        m = ROW_RE.match(line.strip())
        if not m:
            continue
        n = int(m.group(1))
        name = m.group(2).strip()
        q = m.group(3).strip()
        if n < 1 or n > 55:
            continue
        if not q.startswith("You completed"):
            continue
        rows.append((n, name, q))

    if len(rows) != 55:
        raise SystemExit(f"Expected 55 Q4 rows, got {len(rows)}")

    lines: list[str] = [
        "-- PL-REA-001: overwrite final-session reassessmentReflectionQuestion",
        "-- with Canonical Path Library Q4.",
        "-- Authority: docs/new_paths_content/Uncloud360_Canonical_Path_Library.md",
        "-- § Path-Specific Reassessment Questions",
        "-- Fixes stale July seed copy (paths 1–3+) and NULL after Aug 4 reseed",
        "-- (e.g. #14 Foundations of a Balanced Life, #18 Leading Under Pressure).",
        "",
        "BEGIN;",
        "",
    ]

    for n, name, q in rows:
        path_id = str(uuid.uuid5(NS, f"path-{n}"))
        q_sql = q.replace("'", "''")
        lines.append(f"-- #{n} {name}")
        lines.append('UPDATE public."pathSession" ps')
        lines.append(f"SET \"reassessmentReflectionQuestion\" = '{q_sql}'")
        lines.append(f"WHERE ps.\"pathId\" = '{path_id}'")
        lines.append("  AND ps.index = (")
        lines.append(
            f"    SELECT MAX(s.index) FROM public.\"pathSession\" s "
            f"WHERE s.\"pathId\" = '{path_id}'"
        )
        lines.append("  );")
        lines.append("")

    lines.extend(["COMMIT;", ""])
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT} ({len(rows)} updates)")
    for n, name, q in rows:
        if n in (1, 14, 18):
            print(f"  #{n}: {q}")


if __name__ == "__main__":
    main()
