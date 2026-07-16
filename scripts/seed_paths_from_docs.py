#!/usr/bin/env python3
"""Parse Uncloud360 path batch markdown docs and emit SQL for path / pathSession / pathQuestion."""

from __future__ import annotations

import argparse
import re
import uuid
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH_NAMESPACE = uuid.UUID("7c9e6679-7425-40de-944b-e07fc1f90ae7")

PILLAR_MAP = {
    "emotional_well-being": "emotional",
    "emotional well-being": "emotional",
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
    sessions: list[PathSessionRecord] = field(default_factory=list)

    @property
    def slug(self) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", self.name.lower()).strip("-")
        return slug

    @property
    def id(self) -> str:
        return str(uuid.uuid5(PATH_NAMESPACE, f"path-{self.number}"))

    def session_id(self, index: int) -> str:
        return str(uuid.uuid5(PATH_NAMESPACE, f"path-{self.number}-session-{index}"))

    def question_id(self, session_index: int, question_index: int) -> str:
        return str(
            uuid.uuid5(
                PATH_NAMESPACE,
                f"path-{self.number}-session-{session_index}-q-{question_index}",
            )
        )


PATH_HEADER_RE = re.compile(
    r"PATH\s+(\d+)\s+OF\s+\d+\s+·\s+(FREE|PRO|PREMIUM)\s+TIER\s+·\s+(\d+)\s+SESSIONS\s+(.+?)\s+\*([^*]+)\*",
    re.IGNORECASE,
)
FAQ_PATH_HEADER_RE = re.compile(
    r"PATH\s+(\d+)\s+OF\s+\d+\s+—\s+(FREE|PRO|PREMIUM)\s+TIER(?:\s+·\s+RECOVERY FLAG REQUIRED)?\s+(.+?)\s+\*([^*]+)\*",
    re.IGNORECASE,
)
TABLE_ROW_RE = re.compile(
    r"^\|\s*(?:\*\*)?(.+?)(?:\*\*)?\s*\|\s*(.+?)\s*\|\s*$",
    re.MULTILINE,
)
SESSION_ROW_RE = re.compile(
    r"^\|\s*S(\d+)\s*\|\s*(.+?)\s*\|\s*$",
    re.MULTILINE | re.IGNORECASE,
)
COACHING_RE = re.compile(
    r"\*\*PART 1 — COACHING TEXT.*?\*\*\s*(.+?)(?=\|\s*\|\s*\*\*PART 2|\Z)",
    re.DOTALL | re.IGNORECASE,
)
QUESTIONS_RE = re.compile(
    r"\*\*PART 2 — REFLECTION QUESTIONS.*?\*\*\s*(.+?)(?=\|\s*\|\s*\*\*PART 3|\Z)",
    re.DOTALL | re.IGNORECASE,
)
MICRO_RE = re.compile(
    r"\*\*PART 3 — MICRO-COMMITMENT.*?\*\*\s*(.+?)(?=\n\|\s*\n\||\Z)",
    re.DOTALL | re.IGNORECASE,
)
QUESTION_ITEM_RE = re.compile(r"Q\d+\s+(.+?)(?=Q\d+\s+|\Z)", re.DOTALL)


def clean_text(value: str) -> str:
    text = value.strip().rstrip("|").strip()
    text = text.replace("\\_", "_")
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"\s+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def trim_session_footer(text: str) -> str:
    trimmed = text.split("FOR THE DEVELOPER", 1)[0]
    trimmed = re.split(r"\n\|\s*\|\s*", trimmed, maxsplit=1)[0]
    return clean_text(trimmed.rstrip("|").strip())


def normalize_meta_key(key: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "_", key.strip().lower()).strip("_")
    if normalized.startswith("guidedpath_"):
        normalized = normalized.removeprefix("guidedpath_")
    return normalized


def map_pillar(raw: str) -> str:
    normalized = raw.strip().lower().replace("\\_", "_")
    return PILLAR_MAP.get(normalized, normalized.replace("-", "_"))


def normalize_classifications(value: str) -> str:
    text = clean_text(value).replace("\\[", "[").replace("\\]", "]")
    if text.startswith("[") and text.endswith("]"):
        items = re.findall(r"'([^']+)'", text)
        if items:
            return " · ".join(items)
    return text


def parse_meta_table(block: str) -> dict[str, str]:
    meta: dict[str, str] = {}
    for match in TABLE_ROW_RE.finditer(block):
        key = normalize_meta_key(match.group(1))
        value = clean_text(match.group(2))
        if key in {
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
        }:
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


def parse_path_block(block: str) -> PathRecord | None:
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
        name = clean_text(header.group(4))
        subtitle = clean_text(header.group(5))
    else:
        assert faq_header is not None
        number = int(faq_header.group(1))
        tier = faq_header.group(2).lower()
        session_count = 6
        name = clean_text(faq_header.group(3))
        subtitle = clean_text(faq_header.group(4))

    meta = parse_meta_table(block)

    pillar_raw = meta.get("pillar", "")
    pillar = map_pillar(pillar_raw) if pillar_raw else "emotional"

    flag_required = meta.get("flag_required", "None")
    trigger_signals = f"enrollment:onboarding; flag:{flag_required}"

    path = PathRecord(
        number=number,
        name=name,
        tier=meta.get("tier", tier),
        pillar=pillar,
        sub_mode=meta.get("sub_mode", ""),
        session_count=int(meta.get("session_count", session_count)),
        classifications=normalize_classifications(meta.get("classification_match", "")),
        flag_required=flag_required,
        subtitle=subtitle,
    )

    session_titles: dict[int, str] = {}
    for match in SESSION_ROW_RE.finditer(block):
        title = clean_text(match.group(2))
        if title.startswith("-") or title.startswith(":"):
            continue
        session_titles[int(match.group(1))] = title

    for index in range(1, session_count + 1):
        session = PathSessionRecord(index=index, title=session_titles.get(index, f"Session {index}"))

        session_blocks = re.split(rf"\|\s*S{index}\s*\|", block, maxsplit=1, flags=re.IGNORECASE)
        if len(session_blocks) < 2:
            path.sessions.append(session)
            continue

        tail = session_blocks[1]
        next_session = re.search(r"\|\s*S\d+\s*\|", tail)
        session_body = tail[: next_session.start()] if next_session else tail

        coaching = COACHING_RE.search(session_body)
        if coaching:
            session.coaching_text = clean_text(coaching.group(1))

        questions_block = QUESTIONS_RE.search(session_body)
        if questions_block:
            raw = questions_block.group(1)
            session.questions = [
                clean_text(item.group(1))
                for item in QUESTION_ITEM_RE.finditer(raw)
                if clean_text(item.group(1))
            ]

        micro = MICRO_RE.search(session_body)
        if micro:
            session.micro_commitment = trim_session_footer(micro.group(1))

        path.sessions.append(session)

    return path


def parse_docs(paths: list[Path]) -> list[PathRecord]:
    records: dict[int, PathRecord] = {}
    for doc in paths:
        text = doc.read_text(encoding="utf-8")
        for block in re.split(r"(?=PATH\s+\d+\s+OF\s+\d+)", text, flags=re.IGNORECASE):
            record = parse_path_block(block)
            if record:
                records[record.number] = record
    return [records[key] for key in sorted(records)]


def emit_sql(records: list[PathRecord], include_sessions: bool) -> str:
    lines: list[str] = [
        "-- Generated by scripts/seed_paths_from_docs.py",
        "BEGIN;",
        "",
    ]

    path_numbers = ", ".join(str(record.number) for record in records)
    lines.append(
        f"DELETE FROM public.\"pathQuestion\" WHERE \"sessionId\" IN ("
        f"SELECT id FROM public.\"pathSession\" WHERE \"pathId\" IN ("
        f"SELECT id FROM public.path WHERE id IN ({', '.join(sql_literal(record.id) for record in records)}))"
        f");"
    )
    lines.append(
        f"DELETE FROM public.\"pathSession\" WHERE \"pathId\" IN ("
        f"{', '.join(sql_literal(record.id) for record in records)});"
    )
    lines.append(
        f"DELETE FROM public.path WHERE id IN ({', '.join(sql_literal(record.id) for record in records)});"
    )
    lines.append("")

    for record in records:
        description = record.subtitle or record.name
        trigger_signals = f"enrollment:onboarding; flag:{record.flag_required}"

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
            ");"
        )

        if not include_sessions:
            continue

        for session in record.sessions:
            lines.append(
                "INSERT INTO public.\"pathSession\" ("
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
                    "INSERT INTO public.\"pathQuestion\" ("
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--docs",
        nargs="+",
        default=[
            str(ROOT / "docs/Uncloud360_Paths_Batch1.docx.md"),
            str(ROOT / "docs/Uncloud360_Paths_Batch2.docx.md"),
            str(ROOT / "docs/Uncloud360_Paths_Batch3.docx.md"),
        ],
    )
    parser.add_argument(
        "--output",
        default=str(ROOT / "supabase/migrations/20260713140000_seed_mvp_paths_batch_1_3.sql"),
    )
    parser.add_argument("--paths-only", action="store_true")
    args = parser.parse_args()

    records = parse_docs([Path(path) for path in args.docs])
    sql = emit_sql(records, include_sessions=not args.paths_only)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(sql, encoding="utf-8")
    print(f"Wrote {len(records)} paths to {output}")


if __name__ == "__main__":
    main()
