#!/usr/bin/env python3
"""Verify the locked Bladed Hoverboard source and generate its isolated candidate."""

import argparse
import hashlib
import json
import sqlite3
import tempfile
from pathlib import Path

import openpyxl

import export_original_pirate_bladed_hoverboard_source_mapping_candidate as candidate


LOCKS = {
    "identity": "e9f6c2f80ca38900ba998010188e425a280e40acaf0d54581943038290ab3a96",
    "tiers": "b6949e3d7cfc7036b07c09b6075b4c2b9d01032897d250d52fd78bb3ca88b9d0",
    "abilities": "a1b93b8ec827a3252ed2e1c85c56d676002812479b60ed9fde84a53684f7272a",
    "auras": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
    "toxic": "18dc21f072b373a9e8a030a9c5e399d124c40bb6e8c9a5b7aa285f36f629630e",
}


def _sha(value: object) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True,
                         separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def verify_source(db: Path) -> None:
    with db.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != candidate.SOURCE_DB_SHA256:
            raise ValueError("BLADED_HOVERBOARD_SOURCE_DB_SHA_MISMATCH")
    with sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True) as connection:
        row = connection.execute(
            "SELECT Data FROM cards WHERE Id=?", (candidate.SOURCE_UUID,)
        ).fetchone()
    if row is None:
        raise ValueError("BLADED_HOVERBOARD_SOURCE_UUID_MISSING")
    card = json.loads(row[0])
    identity = {key: card.get(key) for key in (
        "Id", "InternalName", "Type", "Size", "StartingTier", "Heroes", "Tags",
        "HiddenTags", "SpawningEligibility",
    )}
    values = {
        "identity": identity,
        "tiers": card.get("Tiers"),
        "abilities": card.get("Abilities"),
        "auras": card.get("Auras"),
        "toxic": (card.get("Enchantments") or {}).get("Toxic"),
    }
    for name, expected in LOCKS.items():
        if _sha(values[name]) != expected:
            raise ValueError("BLADED_HOVERBOARD_SOURCE_SUBTREE_MISMATCH:" + name)


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
            raise ValueError("BLADED_HOVERBOARD_EXISTING_WORKBOOK_MISMATCH")
    else:
        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.title = "SOURCE_MAPPING"
        sheet.append(candidate.HEADERS)
        for row in rows:
            sheet.append([row[key] for key in candidate.HEADERS])
        args.workbook.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(
                prefix=args.workbook.stem + ".", suffix=".xlsx",
                dir=args.workbook.parent, delete=False) as stream:
            temporary = Path(stream.name)
        workbook.save(temporary)
        workbook.close()
        candidate.workbook_rows(temporary)
        temporary.replace(args.workbook)
    candidate.export_csv(args.workbook, args.csv_dir)
    candidate.write_artifacts(args.workbook, args.csv_dir)
    print("PASS Bladed Hoverboard source verified; isolated mapping candidate generated")


if __name__ == "__main__":
    main()
