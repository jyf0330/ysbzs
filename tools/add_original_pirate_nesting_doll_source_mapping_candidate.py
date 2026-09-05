#!/usr/bin/env python3
"""Verify the locked Nesting Doll source and generate its isolated candidate."""

import argparse
import hashlib
import json
import sqlite3
import tempfile
from pathlib import Path

import openpyxl

import export_original_pirate_nesting_doll_source_mapping_candidate as candidate


LOCKS = {
    "identity": "069ca399b5572b01895bf061fbafab6c80f4ec77649b4c06cc347bfc2761aeab",
    "tiers": "32854418137f576a64e3d001d5f6b1547853fa5a0a30c00c220592cc48d434d0",
    "abilities": "19d8d29f9a0423c8e6cb11263c7211bc0303b9835bb7ea5f76c4e75471d58a2b",
    "auras": "55673c42d455f76b713cbaa05c60c6e30d05986f6da2cfe29ebb8879dfc576dc",
    "fiery": "f6f9866cf793e1db373a446e5f0d3c3ce4c3b0c493b972c5dfac3fc60246f938",
}


def _sha(value: object) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True,
                         separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def verify_source(db: Path) -> None:
    with db.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != candidate.SOURCE_DB_SHA256:
            raise ValueError("NESTING_DOLL_SOURCE_DB_SHA_MISMATCH")
    with sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True) as connection:
        row = connection.execute("SELECT Data FROM cards WHERE Id=?", (candidate.SOURCE_UUID,)).fetchone()
    if row is None:
        raise ValueError("NESTING_DOLL_SOURCE_UUID_MISSING")
    card = json.loads(row[0])
    identity = {key: card.get(key) for key in (
        "Id", "InternalName", "Type", "Size", "StartingTier", "Heroes", "Tags",
        "HiddenTags", "SpawningEligibility",
    )}
    values = {
        "identity": identity, "tiers": card.get("Tiers"),
        "abilities": card.get("Abilities"), "auras": card.get("Auras"),
        "fiery": (card.get("Enchantments") or {}).get("Fiery"),
    }
    for name, expected in LOCKS.items():
        if _sha(values[name]) != expected:
            raise ValueError("NESTING_DOLL_SOURCE_SUBTREE_MISMATCH:" + name)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--workbook", type=Path, default=candidate.WORKBOOK)
    parser.add_argument("--csv-dir", type=Path, default=candidate.CSV_DIR)
    args = parser.parse_args()
    verify_source(args.db)
    rows = candidate.expected_rows()
    if args.workbook.exists():
        if candidate.workbook_rows(args.workbook) != rows:
            raise ValueError("NESTING_DOLL_EXISTING_WORKBOOK_MISMATCH")
    else:
        workbook = openpyxl.Workbook(); sheet = workbook.active
        sheet.title = "SOURCE_MAPPING"; sheet.append(candidate.HEADERS)
        for row in rows: sheet.append([row[key] for key in candidate.HEADERS])
        args.workbook.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(prefix=args.workbook.stem + ".", suffix=".xlsx",
                                         dir=args.workbook.parent, delete=False) as stream:
            temporary = Path(stream.name)
        workbook.save(temporary); workbook.close()
        candidate.workbook_rows(temporary); temporary.replace(args.workbook)
    candidate.export_csv(args.workbook, args.csv_dir)
    candidate.write_artifacts(args.csv_dir)
    print("PASS Nesting Doll source verified; isolated mapping candidate generated")


if __name__ == "__main__":
    main()
