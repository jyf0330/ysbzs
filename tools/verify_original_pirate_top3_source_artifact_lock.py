#!/usr/bin/env python3
"""Verify the immutable byte boundary for the current top-three source candidates.

This is deliberately an artifact-integrity gate.  It does not promote candidate
data, resolve source gaps, or assert that original Bazaar rules are executable.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


CANDIDATE_DIRS = (
    "bladed_hoverboard_source_mapping",
    "burnacuda_source_mapping",
    "captains_quarters_source_gap",
    "dive_weights_source_mapping",
    "diving_helmet_source_mapping",
    "flagship_source_mapping",
    "nesting_doll_source_mapping",
    "pearl_source_mapping",
    "pistol_sword_source_mapping",
    "torpedo_source_mapping",
    "wetware_source_mapping",
)
WORKBOOK_STEMS = (
    "bladed_hoverboard",
    "burnacuda",
    "dive_weights",
    "diving_helmet",
    "flagship",
    "nesting_doll",
    "pearl",
    "pistol_sword",
    "torpedo",
    "wetware",
)
EXPECTED_FILE_COUNT = 63
EXPECTED_AGGREGATE_SHA256 = "86c7893b4dc7d2afa8b657c960a4f6be8eaf48c366cc1987a81f86aa71fd3960"


class VerificationError(RuntimeError):
    pass


def _assert_plain_file(root: Path, path: Path) -> None:
    try:
        relative = path.relative_to(root)
    except ValueError as exc:
        raise VerificationError("TOP3_ARTIFACT_PATH_OUTSIDE_ROOT") from exc
    cursor = root
    for part in relative.parts:
        cursor = cursor / part
        if cursor.is_symlink():
            raise VerificationError(f"TOP3_ARTIFACT_SYMLINK:{relative.as_posix()}")
    if not path.is_file():
        raise VerificationError(f"TOP3_ARTIFACT_NOT_FILE:{relative.as_posix()}")


def _collect_files(root: Path) -> list[Path]:
    files: list[Path] = []
    candidate_root = root / "data/candidates/original_pirate"
    for directory_name in CANDIDATE_DIRS:
        directory = candidate_root / directory_name
        if directory.is_symlink() or not directory.is_dir():
            raise VerificationError(f"TOP3_ARTIFACT_DIRECTORY_INVALID:{directory_name}")
        files.extend(path for path in directory.rglob("*") if path.is_file() or path.is_symlink())
    for stem in WORKBOOK_STEMS:
        files.append(root / "xlsx/candidates" / f"original_pirate_{stem}_source_mapping.xlsx")
    return sorted(files, key=lambda path: path.relative_to(root).as_posix())


def verify(root: Path) -> dict[str, object]:
    root = root.resolve()
    files = _collect_files(root)
    if len(files) != EXPECTED_FILE_COUNT:
        raise VerificationError(
            f"TOP3_ARTIFACT_FILE_COUNT:{len(files)}:{EXPECTED_FILE_COUNT}"
        )

    aggregate = hashlib.sha256()
    for path in files:
        _assert_plain_file(root, path)
        relative_bytes = path.relative_to(root).as_posix().encode("utf-8")
        payload = path.read_bytes()
        aggregate.update(len(relative_bytes).to_bytes(4, "big"))
        aggregate.update(relative_bytes)
        aggregate.update(len(payload).to_bytes(8, "big"))
        aggregate.update(payload)

    actual_digest = aggregate.hexdigest()
    if actual_digest != EXPECTED_AGGREGATE_SHA256:
        raise VerificationError(
            f"TOP3_ARTIFACT_AGGREGATE_SHA256:{actual_digest}:{EXPECTED_AGGREGATE_SHA256}"
        )

    return {
        "artifactLockVerified": True,
        "fileCount": len(files),
        "aggregateSha256": actual_digest,
        "scope": "candidate_source_artifact_integrity_only",
        "completeBuildsAccepted": False,
        "originalRulesAccepted": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        result = verify(args.root)
    except VerificationError as exc:
        print(str(exc))
        return 1
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
