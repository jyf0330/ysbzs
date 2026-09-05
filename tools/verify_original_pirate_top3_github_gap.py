#!/usr/bin/env python3
"""Verify the fail-closed GitHub evidence audit for Vanessa candidate rows."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ARTIFACT_CANONICAL_SHA256 = "c200e94e8139199fed309f95b87dbe2242c3d66b75482b9368138f2f1a7c2aab"
SCHEMA = "ysbzs.original-pirate-top3-github-gap.v1"
STATUS = "CANDIDATE_ONLY_PUBLIC_BACKEND_CONTRACT_INCOMPLETE"
EXPECTED_ROWS = [
    {"rankByListedCompletedRunCount": 1, "snapshotArrayIndex": 222,
     "completedRunCount": 58, "tenWinRunCount": 22},
    {"rankByListedCompletedRunCount": 2, "snapshotArrayIndex": 180,
     "completedRunCount": 48, "tenWinRunCount": 22},
    {"rankByListedCompletedRunCount": 3, "snapshotArrayIndex": 219,
     "completedRunCount": 39, "tenWinRunCount": 16},
]
EXPECTED_MISSING = [
    "ROW_BOUND_SKILLS",
    "RAW_GAME_CLIENT_VERSION",
    "ANALYZER_QUERY_AND_FILTERS",
    "EXACT_GROUPING_KEY",
    "ELIGIBLE_POPULATION_DENOMINATOR",
    "STABLE_ROW_IDENTITY_ACROSS_SNAPSHOTS",
]
EXPECTED_SOURCE_HASHES = {
    "tenWinBuildCorpus": "3035180f23c8363bb26950562e90f90438560dd9fe29c59066ae945475b48159",
    "runPayloadComposer": "b5aa7c73a5fc923659a51682ace682feb7a33e2574ef1607b6a2870b6b6c1170",
    "runPayloadV5": "f0a398b1ad090e6911c2700941a821eca69a75af7f9d98a291e6ba72cc90daa5",
}


def _decode_json(payload: bytes, label: str) -> object:
    def reject_duplicates(pairs: list[tuple[str, object]]) -> dict:
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"{label}_DUPLICATE_JSON_KEY:{key}")
            result[key] = value
        return result
    return json.loads(payload.decode("utf-8"), object_pairs_hook=reject_duplicates)


def _canonical_sha(value: object) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True,
                         separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def verify(artifact: Path) -> dict[str, object]:
    errors: list[str] = []
    try:
        document = _decode_json(artifact.read_bytes(), "TOP3_GITHUB_GAP")
        if not isinstance(document, dict):
            raise ValueError("TOP3_GITHUB_GAP_DOCUMENT_INVALID")
        if _canonical_sha(document) != ARTIFACT_CANONICAL_SHA256:
            errors.append("TOP3_GITHUB_GAP_CANONICAL_SHA256_MISMATCH")
        if document.get("schema") != SCHEMA:
            errors.append("TOP3_GITHUB_GAP_SCHEMA_MISMATCH")
        if document.get("acceptanceStatus") != STATUS:
            errors.append("TOP3_GITHUB_GAP_STATUS_MISMATCH")
        if document.get("candidateRows") != EXPECTED_ROWS:
            errors.append("TOP3_GITHUB_GAP_ROWS_MISMATCH")
        if document.get("missingAcceptanceEvidence") != EXPECTED_MISSING:
            errors.append("TOP3_GITHUB_GAP_MISSING_EVIDENCE_MISMATCH")
        evidence = document.get("immutableGithubEvidence", {})
        if evidence.get("commit") != "6a721f6a55214117adf9ac4cd0672a289f0949d7":
            errors.append("TOP3_GITHUB_GAP_COMMIT_MISMATCH")
        for name, expected_hash in EXPECTED_SOURCE_HASHES.items():
            section = evidence.get(name, {})
            if section.get("rawSha256") != expected_hash:
                errors.append("TOP3_GITHUB_GAP_SOURCE_HASH_MISMATCH:" + name)
        if any(document.get(field) is not False for field in (
                "candidateRowsAcceptedAsExactTop3", "battleLogsAllowed",
                "originalRulesAccepted")):
            errors.append("TOP3_GITHUB_GAP_FAIL_CLOSED_FLAGS_INVALID")
    except (OSError, UnicodeError, ValueError) as error:
        errors.append("TOP3_GITHUB_GAP_INPUT_UNREADABLE:" + str(error))
    return {
        "ok": not errors,
        "githubEvidenceLocked": not errors,
        "candidateRows": [222, 180, 219],
        "candidateRowsAcceptedAsExactTop3": False,
        "battleLogsAllowed": False,
        "originalRulesAccepted": False,
        "errors": errors,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact", type=Path, required=True)
    args = parser.parse_args()
    result = verify(args.artifact)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
