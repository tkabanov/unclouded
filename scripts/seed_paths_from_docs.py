#!/usr/bin/env python3
"""Parse Uncloud360 path batch markdown docs and emit SQL for path / pathSession / pathQuestion.

Supports:
- MVP batches (paths 4–18) and Phase 2 batches (19–54) under docs/new_paths_content/
- Success Plan paths (path_type:success_plan)
- reassessment_reflection_question on the final session
- Safe upsert (no DELETE FROM path — preserves pathEnrollment FKs)
"""

from __future__ import annotations

import argparse
import re
import uuid
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH_NAMESPACE = uuid.UUID("7c9e6679-7425-40de-944b-e07fc1f90ae7")
NEW_PATHS_DIR = ROOT / "docs" / "new_paths_content"

# Path 9 — Understanding Your Emotional Patterns (preserve Identity Lens gate)
IDENTITY_MODULE_PATH_NUMBER = 9

PILLAR_MAP = {
    "emotional_well-being": "emotional",
    "emotional well-being": "emotional",
    "emotional wellbeing": "emotional",
    "professional": "professional",
    "health_and_wellness": "health",
    "health and wellness": "health",
}


@dataclass
class PathSessionRecord:
    index: int
    title: str
    coaching_text: str = ""
    questions: list[str] = field(default_factory=list)
    micro_commitment: str = ""
    reassessment_reflection_question: str = ""


@dataclass
class PathRecord:
    number: int
    name: str
    tier: str
    pillar: str
    sub_mode: str
    session_count: int
    classifications: str
    flag_required: str
    subtitle: str = ""
    enrollment_onboarding: bool = False
    path_type: str = ""  # "" | "success_plan"
    reassessment_reflection_question: str = ""
    sessions: list[PathSessionRecord] = field(default_factory=list)

    @property
    def slug(self) -> str:
        return re.sub(r"[^a-z0-9]+", "-", self.name.lower()).strip("-")

    @property
    def id_key(self) -> str:
        if self.path_type == "success_plan":
            return f"path-success-{self.slug}"
        return f"path-{self.number}"

    @property
    def id(self) -> str:
        return str(uuid.uuid5(PATH_NAMESPACE, self.id_key))

    def session_id(self, index: int) -> str:
        return str(uuid.uuid5(PATH_NAMESPACE, f"{self.id_key}-session-{index}"))

    def question_id(self, session_index: int, question_index: int) -> str:
        return str(
            uuid.uuid5(
                PATH_NAMESPACE,
                f"{self.id_key}-session-{session_index}-q-{question_index}",
            )
        )

    def build_trigger_signals(self) -> str:
        parts: list[str] = []
        if self.path_type == "success_plan":
            parts.append("path_type:success_plan")
        if self.enrollment_onboarding:
            parts.append("enrollment:onboarding")
        parts.append(f"flag:{self.flag_required}")
        if self.number == IDENTITY_MODULE_PATH_NUMBER and self.path_type != "success_plan":
            parts.append("prerequisite:module:identity")
        return "; ".join(parts)


# Phase 2 / new MVP: **PATH N OF M · TIER · N SESSIONS** then **Name** on next lines
PATH_HEADER_RE = re.compile(
    r"\*\*PATH\s+(\d+)\s+OF\s+\d+\s+[·\-—]\s+(FREE|PRO|PREMIUM)\s+TIER\s+[·\-—]\s+(\d+)\s+SESSIONS\*\*",
    re.IGNORECASE,
)
# Legacy FAQ inline header
FAQ_PATH_HEADER_RE = re.compile(
    r"PATH\s+(\d+)\s+OF\s+\d+\s+—\s+(FREE|PRO|PREMIUM)\s+TIER(?:\s+·\s+RECOVERY FLAG REQUIRED)?\s+(.+?)\s+\*([^*]+)\*",
    re.IGNORECASE,
)
SUCCESS_PLAN_HEADER_RE = re.compile(
    r"\*\*SUCCESS PLAN\s*[·\-—]\s*(\d+)\s+SESSIONS\*\*",
    re.IGNORECASE,
)
NAME_AFTER_HEADER_RE = re.compile(r"\*\*([^*]+)\*\*")
SUBTITLE_RE = re.compile(r"^_([^_]+)_", re.MULTILINE)

TABLE_ROW_RE = re.compile(
    r"^\|\s*(?:\*\*)?(.+?)(?:\*\*)?\s*\|\s*(.+?)\s*\|\s*$",
    re.MULTILINE,
)
# MVP table session titles: | **S1** | **Title** |
SESSION_TABLE_ROW_RE = re.compile(
    r"^\|\s*(?:\*\*)?S(\d+)(?:\*\*)?\s*\|\s*(?:\*\*)?(.+?)(?:\*\*)?\s*\|\s*$",
    re.MULTILINE | re.IGNORECASE,
)
# Phase 2 / Success: **S1 | Title** or **BRIDGE SESSION | Title**
SESSION_BOLD_RE = re.compile(
    r"^\*\*S(\d+)\s*\|\s*(.+?)\*\*\s*$",
    re.MULTILINE | re.IGNORECASE,
)
BRIDGE_SESSION_RE = re.compile(
    r"^\*\*BRIDGE SESSION\s*\|\s*(.+?)\*\*\s*$",
    re.MULTILINE | re.IGNORECASE,
)

QUESTION_ITEM_RE = re.compile(r"Q\d+\s+(.+?)(?=Q\d+\s+|\Z)", re.DOTALL)
PART_SPLIT_RE = re.compile(
    r"\*\*PART\s*([123])\s*[—\-]\s*(COACHING TEXT|REFLECTION QUESTIONS|MICRO-COMMITMENT)[^*]*\*\*",
    re.IGNORECASE,
)

META_KEYS = {
    "tier",
    "pillar",
    "sub_mode",
    "session_count",
    "classification_match",
    "flag_required",
    "flag",
    "is_mvp",
    "enrollment_trigger",
    "ai_mode",
    "reassessment_reflection_question",
    "path_type",
}


def clean_text(value: str) -> str:
    text = value.strip().rstrip("|").strip()
    text = text.replace("\\_", "_")
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    # Drop markdown table separator lines (avoid catastrophic dash backtracking)
    text = re.sub(r"^[|\s:\-]{3,}$", "", text, flags=re.MULTILINE)
    text = text.replace("|", " ")
    # Unwrap whole-line italic paragraphs from MVP cells: _paragraph_
    lines: list[str] = []
    for line in text.split("\n"):
        stripped = line.strip()
        if len(stripped) >= 2 and stripped.startswith("_") and stripped.endswith("_"):
            stripped = stripped[1:-1]
        lines.append(stripped)
    text = "\n".join(lines)
    text = text.replace("**", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def trim_session_footer(text: str) -> str:
    trimmed = text.split("FOR THE DEVELOPER", 1)[0]
    return clean_text(trimmed)


def normalize_meta_key(key: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "_", key.strip().lower()).strip("_")
    if normalized.startswith("guidedpath_"):
        normalized = normalized.removeprefix("guidedpath_")
    return normalized


def map_pillar(raw: str) -> str:
    normalized = raw.strip().lower().replace("\\_", "_")
    mapped = PILLAR_MAP.get(normalized)
    if mapped:
        return mapped
    # Subtitle-style "Emotional Wellbeing" without underscores
    compact = re.sub(r"[\s_]+", " ", normalized).strip()
    return PILLAR_MAP.get(compact, normalized.replace("-", "_").replace(" ", "_"))


def normalize_classifications(value: str) -> str:
    text = clean_text(value).replace("\\[", "[").replace("\\]", "]")
    if text.startswith("[") and text.endswith("]"):
        items = re.findall(r"'([^']+)'", text)
        if items:
            return " · ".join(items)
    return text


def normalize_tier(raw: str, *, path_type: str = "") -> str:
    # OVR-038: Success Plans are not free self-select; catalog badge uses pro.
    if path_type == "success_plan":
        return "pro"
    text = raw.strip().lower()
    if "premium" in text:
        return "premium"
    if "pro" in text:
        return "pro"
    if "free" in text or "all tiers" in text or "available to all" in text:
        return "free"
    return text if text in {"free", "pro", "premium"} else "free"


def enrollment_is_auto(enrollment_trigger: str) -> bool:
    text = enrollment_trigger.lower()
    return "auto-enroll" in text or "auto enrolled" in text or "auto-enrolled" in text


def parse_meta_table(block: str) -> dict[str, str]:
    meta: dict[str, str] = {}
    for match in TABLE_ROW_RE.finditer(block):
        key = normalize_meta_key(match.group(1))
        value = clean_text(match.group(2))
        if key not in META_KEYS:
            continue
        if key == "flag" and "flag_required" not in meta:
            meta["flag_required"] = value
        else:
            meta[key] = value
    return meta


def sql_literal(value: str | None) -> str:
    if value is None:
        return "NULL"
    escaped = value.replace("'", "''").replace("\r\n", "\n").replace("\r", "\n")
    escaped = re.sub(r"\s*\n\s*", " ", escaped).strip()
    return "'" + escaped + "'"


def extract_name_and_subtitle(block: str, header_end: int) -> tuple[str, str]:
    after = block[header_end:]
    # Skip blank / table noise; first **Name** after header
    name_match = NAME_AFTER_HEADER_RE.search(after)
    name = clean_text(name_match.group(1)) if name_match else "Untitled Path"
    subtitle = ""
    search_from = name_match.end() if name_match else 0
    sub = SUBTITLE_RE.search(after[search_from : search_from + 400])
    if sub:
        subtitle = clean_text(sub.group(1))
    return name, subtitle


def collect_session_titles(block: str, session_count: int) -> dict[int, str]:
    titles: dict[int, str] = {}
    for match in SESSION_TABLE_ROW_RE.finditer(block):
        title = clean_text(match.group(2))
        if title.startswith("-") or title.startswith(":"):
            continue
        titles[int(match.group(1))] = title
    for match in SESSION_BOLD_RE.finditer(block):
        titles[int(match.group(1))] = clean_text(match.group(2))
    bridge = BRIDGE_SESSION_RE.search(block)
    if bridge and session_count >= 1:
        # Bridge is the last session when present
        titles[session_count] = clean_text(bridge.group(1))
    return titles


def split_session_body(block: str, index: int, session_count: int) -> str:
    """Return the markdown body for session index (1-based)."""
    # Prefer bold Phase-2 markers, then table markers
    patterns = [
        rf"\*\*S{index}\s*\|",
        rf"\|\s*(?:\*\*)?S{index}(?:\*\*)?\s*\|",
    ]
    if index == session_count:
        patterns.append(r"\*\*BRIDGE SESSION\s*\|")

    start = -1
    for pattern in patterns:
        match = re.search(pattern, block, flags=re.IGNORECASE)
        if match:
            start = match.end()
            break
    if start < 0:
        return ""

    tail = block[start:]
    # Cut at next session / path / success plan
    next_re = re.compile(
        r"\*\*S\d+\s*\||\|\s*(?:\*\*)?S\d+(?:\*\*)?\s*\||\*\*BRIDGE SESSION\s*\||"
        r"\*\*PATH\s+\d+|\*\*SUCCESS PLAN",
        re.IGNORECASE,
    )
    next_match = next_re.search(tail)
    # Skip if next match is at position 0 (shouldn't happen)
    if next_match and next_match.start() > 0:
        return tail[: next_match.start()]
    return tail


def extract_part_bodies(session_body: str) -> dict[int, str]:
    """Split session body into PART 1/2/3 without catastrophic backtracking."""
    matches = list(PART_SPLIT_RE.finditer(session_body))
    bodies: dict[int, str] = {}
    for i, match in enumerate(matches):
        part_num = int(match.group(1))
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(session_body)
        chunk = session_body[start:end]
        cut = re.search(
            r"\n\*\*S\d+|\n\*\*BRIDGE|\n\*\*PATH|\n\*\*SUCCESS|\nFOR THE DEVELOPER",
            chunk,
            flags=re.IGNORECASE,
        )
        if cut:
            chunk = chunk[: cut.start()]
        bodies[part_num] = chunk
    return bodies


def fill_session_content(session: PathSessionRecord, session_body: str) -> None:
    if not session_body:
        return

    parts = extract_part_bodies(session_body)
    if 1 in parts:
        session.coaching_text = clean_text(parts[1])
    if 2 in parts:
        raw = parts[2]
        session.questions = [
            clean_text(item.group(1))
            for item in QUESTION_ITEM_RE.finditer(raw)
            if clean_text(item.group(1))
        ]
    if 3 in parts:
        session.micro_commitment = trim_session_footer(parts[3])


def parse_numbered_path_block(block: str) -> PathRecord | None:
    header = PATH_HEADER_RE.search(block)
    faq_header = None
    if not header:
        faq_header = FAQ_PATH_HEADER_RE.search(block)
        if not faq_header:
            return None

    if header:
        number = int(header.group(1))
        tier = header.group(2).lower()
        session_count = int(header.group(3))
        name, subtitle = extract_name_and_subtitle(block, header.end())
    else:
        assert faq_header is not None
        number = int(faq_header.group(1))
        tier = faq_header.group(2).lower()
        session_count = 6
        name = clean_text(faq_header.group(3))
        subtitle = clean_text(faq_header.group(4))

    meta = parse_meta_table(block)
    pillar_raw = meta.get("pillar", "")
    if not pillar_raw and subtitle:
        # Infer pillar from first segment of italic subtitle
        first = subtitle.split("·")[0].strip()
        pillar_raw = first
    pillar = map_pillar(pillar_raw) if pillar_raw else "emotional"

    flag_required = meta.get("flag_required", "None")
    enrollment_trigger = meta.get("enrollment_trigger", "")
    # MVP docs historically auto-enroll; Phase 2 only when meta says so
    is_mvp = "true" in meta.get("is_mvp", "").lower() or number <= 18
    if enrollment_trigger:
        enrollment_onboarding = enrollment_is_auto(enrollment_trigger)
    else:
        enrollment_onboarding = is_mvp

    path = PathRecord(
        number=number,
        name=name,
        tier=normalize_tier(meta.get("tier", tier)),
        pillar=pillar,
        sub_mode=meta.get("sub_mode", ""),
        session_count=int(
            re.search(r"\d+", meta.get("session_count", str(session_count))).group(0)  # type: ignore[union-attr]
            if meta.get("session_count")
            else session_count
        ),
        classifications=normalize_classifications(meta.get("classification_match", "")),
        flag_required=flag_required,
        subtitle=subtitle,
        enrollment_onboarding=enrollment_onboarding,
        reassessment_reflection_question=meta.get("reassessment_reflection_question", ""),
    )

    titles = collect_session_titles(block, path.session_count)
    for index in range(1, path.session_count + 1):
        session = PathSessionRecord(
            index=index,
            title=titles.get(index, f"Session {index}"),
        )
        fill_session_content(session, split_session_body(block, index, path.session_count))
        path.sessions.append(session)

    finalize_sessions(path)
    return path


def session_has_content(session: PathSessionRecord) -> bool:
    return bool(session.coaching_text or session.questions or session.micro_commitment)


def load_canonical_q4_by_name() -> dict[str, str]:
    """Path-Specific Reassessment Questions from Canonical Path Library (PL-REA authority).

    Keyed by Canonical path **name** (not Canonical #). Batch PATH N numbering
    differs from Canonical status-table numbering (OVR-037); matching by number
    previously swapped ~25 Q4 texts onto the wrong paths.
    """
    canonical = NEW_PATHS_DIR / "Uncloud360_Canonical_Path_Library.md"
    if not canonical.exists():
        return {}
    row_re = re.compile(
        r"\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|$"
    )
    out: dict[str, str] = {}
    for line in canonical.read_text(encoding="utf-8").splitlines():
        m = row_re.match(line.strip())
        if not m:
            continue
        n = int(m.group(1))
        name = m.group(2).strip()
        q = m.group(3).strip()
        if 1 <= n <= 55 and q.startswith("You completed"):
            out[name] = q
    return out


def apply_canonical_q4(records: list[PathRecord]) -> None:
    """Prefer Canonical Q4 over batch-doc / missing meta (avoids stale or NULL seeds)."""
    canonical = load_canonical_q4_by_name()
    if not canonical:
        return
    for record in records:
        if record.path_type == "success_plan":
            continue
        q4 = canonical.get(record.name)
        if not q4:
            continue
        record.reassessment_reflection_question = q4
        if record.sessions:
            record.sessions[-1].reassessment_reflection_question = q4


def finalize_sessions(path: PathRecord) -> None:
    """Drop trailing empty sessions when docs over-declare session_count; attach Q4 to last."""
    while path.sessions and not session_has_content(path.sessions[-1]):
        # Keep a titled-but-empty session only if an earlier empty gap isn't trailing
        if path.sessions[-1].title.startswith("Session "):
            path.sessions.pop()
        else:
            break
    # Re-index and sync count
    for i, session in enumerate(path.sessions, start=1):
        session.index = i
    path.session_count = len(path.sessions)
    if path.sessions and path.reassessment_reflection_question:
        path.sessions[-1].reassessment_reflection_question = path.reassessment_reflection_question


def parse_success_plan_block(block: str, synthetic_number: int) -> PathRecord | None:
    header = SUCCESS_PLAN_HEADER_RE.search(block)
    if not header:
        return None

    session_count = int(header.group(1))
    name, subtitle = extract_name_and_subtitle(block, header.end())
    meta = parse_meta_table(block)

    if meta.get("session_count"):
        m = re.search(r"\d+", meta["session_count"])
        if m:
            session_count = int(m.group(0))

    path = PathRecord(
        number=synthetic_number,
        name=name,
        tier=normalize_tier(meta.get("tier", "free"), path_type="success_plan"),
        pillar=map_pillar(meta.get("pillar", "professional")),
        sub_mode=meta.get("sub_mode", "success_plan"),
        session_count=session_count,
        classifications=normalize_classifications(
            meta.get("classification_match", "All classifications")
        ),
        flag_required=meta.get("flag_required", "None"),
        subtitle=subtitle or "Success Plan",
        enrollment_onboarding=False,
        path_type="success_plan",
        reassessment_reflection_question=meta.get("reassessment_reflection_question", ""),
    )

    titles = collect_session_titles(block, path.session_count)
    for index in range(1, path.session_count + 1):
        session = PathSessionRecord(
            index=index,
            title=titles.get(index, f"Session {index}"),
        )
        fill_session_content(session, split_session_body(block, index, path.session_count))
        path.sessions.append(session)

    finalize_sessions(path)
    return path


def default_doc_paths() -> list[Path]:
    patterns = [
        "Uncloud360_Paths_Batch1*.md",
        "Uncloud360_Paths_Batch2*.md",
        "Uncloud360_Paths_Batch3*.md",
        "Uncloud360_Paths_Batch4.md",
        "Uncloud360_Paths_Batch5.md",
        "Uncloud360_Paths_Batch6.md",
        "Uncloud360_Paths_Batch7.md",
        "Uncloud360_Paths_Batch8.md",
        "Uncloud360_Paths_Batch9.md",
        "Uncloud360_Paths_Final_Batch*.md",
        "Uncloud360_Success_Plan_Paths.md",
    ]
    found: list[Path] = []
    for pattern in patterns:
        matches = sorted(NEW_PATHS_DIR.glob(pattern))
        found.extend(matches)
    return found


# Canonical #22 — not authored in batch files (OVR-037 numbering uses path-55 key).
CLARITY_PRIORITY_RESET = PathRecord(
    number=55,
    name="Clarity & Priority Reset",
    tier="pro",
    pillar="professional",
    sub_mode="general_professional",
    session_count=0,
    classifications="Performance Stagnation · Building Momentum",
    flag_required="None — catalog stub; Phase 2 content TO WRITE",
    subtitle="Professional  ·  Goal excavation and priority architecture  ·  Content TO WRITE",
    enrollment_onboarding=False,
)


def parse_docs(paths: list[Path]) -> list[PathRecord]:
    numbered: dict[int, PathRecord] = {}
    success: list[PathRecord] = []
    success_counter = 1000

    for doc in paths:
        text = doc.read_text(encoding="utf-8")
        # Numbered paths
        for block in re.split(r"(?=\*\*PATH\s+\d+\s+OF\s+\d+)", text, flags=re.IGNORECASE):
            record = parse_numbered_path_block(block)
            if record:
                numbered[record.number] = record
        # Success plans
        for block in re.split(r"(?=\*\*SUCCESS PLAN)", text, flags=re.IGNORECASE):
            record = parse_success_plan_block(block, success_counter)
            if record:
                success.append(record)
                success_counter += 1

    # Catalog stub for Canonical path missing from authored batches.
    if 55 not in numbered:
        numbered[55] = CLARITY_PRIORITY_RESET

    return [numbered[key] for key in sorted(numbered)] + success


def emit_sql(records: list[PathRecord], include_sessions: bool) -> str:
    lines: list[str] = [
        "-- Generated by scripts/seed_paths_from_docs.py",
        "-- Safe upsert: deletes sessions/questions only; upserts path rows (preserves enrollments).",
        "BEGIN;",
        "",
    ]

    path_ids = [sql_literal(record.id) for record in records]
    ids_csv = ", ".join(path_ids)

    lines.append(
        f'DELETE FROM public."pathQuestion" WHERE "sessionId" IN ('
        f'SELECT id FROM public."pathSession" WHERE "pathId" IN ({ids_csv}));'
    )
    lines.append(f'DELETE FROM public."pathSession" WHERE "pathId" IN ({ids_csv});')
    lines.append("")

    for record in records:
        description = record.subtitle or record.name
        trigger_signals = record.build_trigger_signals()

        lines.append(
            "INSERT INTO public.path ("
            'id, name, description, tier, pillar, "subMode", "sessionsCount", '
            'classifications, "triggerSignals"'
            ") VALUES ("
            f"{sql_literal(record.id)}, "
            f"{sql_literal(record.name)}, "
            f"{sql_literal(description)}, "
            f"{sql_literal(record.tier)}, "
            f"{sql_literal(record.pillar)}, "
            f"{sql_literal(record.sub_mode)}, "
            f"{record.session_count}, "
            f"{sql_literal(record.classifications)}, "
            f"{sql_literal(trigger_signals)}"
            ") ON CONFLICT (id) DO UPDATE SET "
            "name = EXCLUDED.name, "
            "description = EXCLUDED.description, "
            "tier = EXCLUDED.tier, "
            "pillar = EXCLUDED.pillar, "
            '"subMode" = EXCLUDED."subMode", '
            '"sessionsCount" = EXCLUDED."sessionsCount", '
            "classifications = EXCLUDED.classifications, "
            '"triggerSignals" = EXCLUDED."triggerSignals";'
        )

        if not include_sessions:
            continue

        for session in record.sessions:
            has_q4 = bool(session.reassessment_reflection_question)
            if has_q4:
                lines.append(
                    'INSERT INTO public."pathSession" ('
                    'id, "pathId", index, title, "coachingText", "microCommitment", '
                    '"reassessmentReflectionQuestion"'
                    ") VALUES ("
                    f"{sql_literal(record.session_id(session.index))}, "
                    f"{sql_literal(record.id)}, "
                    f"{session.index}, "
                    f"{sql_literal(session.title)}, "
                    f"{sql_literal(session.coaching_text or None)}, "
                    f"{sql_literal(session.micro_commitment or None)}, "
                    f"{sql_literal(session.reassessment_reflection_question)}"
                    ");"
                )
            else:
                lines.append(
                    'INSERT INTO public."pathSession" ('
                    'id, "pathId", index, title, "coachingText", "microCommitment"'
                    ") VALUES ("
                    f"{sql_literal(record.session_id(session.index))}, "
                    f"{sql_literal(record.id)}, "
                    f"{session.index}, "
                    f"{sql_literal(session.title)}, "
                    f"{sql_literal(session.coaching_text or None)}, "
                    f"{sql_literal(session.micro_commitment or None)}"
                    ");"
                )
            for q_index, question in enumerate(session.questions, start=1):
                lines.append(
                    'INSERT INTO public."pathQuestion" ('
                    'id, "sessionId", index, "questionText"'
                    ") VALUES ("
                    f"{sql_literal(record.question_id(session.index, q_index))}, "
                    f"{sql_literal(record.session_id(session.index))}, "
                    f"{q_index}, "
                    f"{sql_literal(question)}"
                    ");"
                )
        lines.append("")

    lines.extend(["COMMIT;", ""])
    return "\n".join(lines)


def validate_records(records: list[PathRecord]) -> list[str]:
    warnings: list[str] = []
    for record in records:
        if len(record.sessions) != record.session_count:
            warnings.append(
                f"{record.name}: expected {record.session_count} sessions, "
                f"got {len(record.sessions)}"
            )
        empty_coaching = sum(1 for s in record.sessions if not s.coaching_text)
        if empty_coaching:
            warnings.append(f"{record.name}: {empty_coaching} session(s) missing coaching text")
        empty_q = sum(1 for s in record.sessions if not s.questions)
        if empty_q:
            warnings.append(f"{record.name}: {empty_q} session(s) missing questions")
        if record.path_type != "success_plan":
            if record.sessions and not record.sessions[-1].reassessment_reflection_question:
                warnings.append(f"{record.name}: missing reassessment Q4 on final session")
    return warnings


def print_summary(records: list[PathRecord]) -> None:
    numbered = [r for r in records if r.path_type != "success_plan"]
    success = [r for r in records if r.path_type == "success_plan"]
    sessions = sum(len(r.sessions) for r in records)
    questions = sum(len(s.questions) for r in records for s in r.sessions)
    premium = [r.name for r in records if r.tier == "premium"]
    print(f"Parsed {len(numbered)} library paths + {len(success)} success plans")
    print(f"  sessions={sessions} questions={questions}")
    print(f"  numbers: {[r.number for r in numbered]}")
    print(f"  premium ({len(premium)}): {premium}")
    for r in success:
        print(f"  success: {r.name} ({r.session_count} sessions, tier={r.tier})")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--docs",
        nargs="+",
        default=None,
        help="Markdown docs to parse (default: docs/new_paths_content batches)",
    )
    parser.add_argument(
        "--output",
        default=str(
            ROOT
            / "supabase"
            / "migrations"
            / "20260804160000_seed_paths_library_from_new_docs.sql"
        ),
    )
    parser.add_argument("--paths-only", action="store_true")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and validate only; do not write SQL",
    )
    args = parser.parse_args()

    doc_paths = [Path(p) for p in args.docs] if args.docs else default_doc_paths()
    if not doc_paths:
        raise SystemExit(f"No docs found under {NEW_PATHS_DIR}")

    print("Docs:")
    for doc in doc_paths:
        print(f"  {doc}")

    records = parse_docs(doc_paths)
    apply_canonical_q4(records)
    print_summary(records)
    warnings = validate_records(records)
    for warning in warnings:
        print(f"WARN: {warning}")

    if args.dry_run:
        print("Dry-run complete (no SQL written).")
        return

    sql = emit_sql(records, include_sessions=not args.paths_only)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(sql, encoding="utf-8")
    print(f"Wrote {len(records)} paths to {output} ({len(sql)} chars)")


if __name__ == "__main__":
    main()
