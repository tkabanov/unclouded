#!/usr/bin/env python3
"""Split a large seed SQL file into MCP-sized batches."""

from __future__ import annotations

import argparse
from pathlib import Path

MAX_BATCH_CHARS = 60_000


def split_sql(content: str, max_chars: int) -> list[str]:
    lines = content.splitlines()
    batches: list[str] = []
    current: list[str] = []
    current_len = 0

    for line in lines:
        line_len = len(line) + 1
        if current and current_len + line_len > max_chars:
            batches.append("\n".join(current))
            current = []
            current_len = 0
        current.append(line)
        current_len += line_len

    if current:
        batches.append("\n".join(current))

    return batches


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("--output-dir", default="tmp_seed_batches")
    parser.add_argument("--max-chars", type=int, default=MAX_BATCH_CHARS)
    args = parser.parse_args()

    content = Path(args.input).read_text(encoding="utf-8")
    batches = split_sql(content, args.max_chars)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    for index, batch in enumerate(batches, start=1):
        path = output_dir / f"batch_{index:02d}.sql"
        path.write_text(batch, encoding="utf-8")
        print(f"Wrote {path} ({len(batch)} chars)")


if __name__ == "__main__":
    main()
