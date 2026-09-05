#!/usr/bin/env python3
"""Verify Captain's Quarters' two-source v5 gap and historical v2 boundary."""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
from pathlib import Path


SOURCE_UUID = "8908d2d1-1a7e-4f97-8ecb-6834e96b1eab"
ARTIFACT_CANONICAL_SHA256 = "013f6eec78caf00942304f983593746e56c22f152dea79ec343b1bd542e4308e"
SOURCES = (
    {
        "label": "current-prod-cache",
        "dbSha256": "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9",
        "cardPayloadSha256": "90eeb9887879a55f8f3275848fe97b68130ea784d9c6e03e551c957788263c0b",
        "locks": {
            "identity": "1b940aa1ec3d942e7175c963933f662f866dfbb6f669e4a49a012f1e839f3268",
            "tiers": "a5130471300f692715ca637b3454261ff6fffc49a658567d339e13a2083ce989",
            "abilities": "d8f6a00fca6f3cbe4a0aae37e6579bd1010e430f3cdbcc06e1d7143c7e6f33a7",
            "auras": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
            "enchantments": "4cab81d26c53a16cabfee5c912d38708dc0129ccaa8b96b9577acaae9d696700",
        },
        "ability2Priority": "High",
    },
    {
        "label": "archived-independent-cache",
        "dbSha256": "2b9c6b3765c72a21a5ebfb7336c13251d09017b87c0e599671b14299800ba092",
        "cardPayloadSha256": "5eebc0bbdf0efc43cf2b395e4fc0c49b993b5674e1808b65c43a5e6075f24b82",
        "locks": {
            "identity": "b607eb8965af2c99c9e94f862692eabd3bd2256e474a5bbc1e981de83a09fb73",
            "tiers": "a5130471300f692715ca637b3454261ff6fffc49a658567d339e13a2083ce989",
            "abilities": "e6212a560fe9680b878610644530823d37ba84bba12b401bd736d4b137084837",
            "auras": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
            "enchantments": "4644dba09229fcd81d4f2f8f35127b9e11078d12ccefeaae020ed9e830f3ac76",
        },
        "ability2Priority": "Low",
    },
)


def _canonical_sha(value: object) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True,
                         separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _decode_json(payload: bytes, label: str) -> object:
    def reject_duplicates(pairs: list[tuple[str, object]]) -> dict:
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"{label}_DUPLICATE_JSON_KEY:{key}")
            result[key] = value
        return result
    return json.loads(payload.decode("utf-8"), object_pairs_hook=reject_duplicates)


def _verify_source(db: Path, expected: dict, errors: list[str]) -> None:
    label = expected["label"]
    with db.open("rb") as stream:
        db_sha256 = hashlib.file_digest(stream, "sha256").hexdigest()
    if db_sha256 != expected["dbSha256"]:
        errors.append("CAPTAINS_QUARTERS_SOURCE_DB_SHA_MISMATCH:" + label)
        return
    with sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True) as connection:
        row = connection.execute("SELECT Data FROM cards WHERE Id=?", (SOURCE_UUID,)).fetchone()
    if row is None:
        errors.append("CAPTAINS_QUARTERS_SOURCE_UUID_MISSING:" + label)
        return
    source_payload = row[0] if isinstance(row[0], bytes) else row[0].encode("utf-8")
    if hashlib.sha256(source_payload).hexdigest() != expected["cardPayloadSha256"]:
        errors.append("CAPTAINS_QUARTERS_CARD_PAYLOAD_SHA_MISMATCH:" + label)
    card = _decode_json(source_payload, "SOURCE_CARD_" + label)
    identity = {key: card.get(key) for key in (
        "Id", "InternalName", "Type", "Size", "StartingTier", "Heroes", "Tags",
        "HiddenTags", "SpawningEligibility",
    )}
    sections = {
        "identity": identity,
        "tiers": card.get("Tiers"),
        "abilities": card.get("Abilities"),
        "auras": card.get("Auras"),
        "enchantments": card.get("Enchantments"),
    }
    for name, expected_hash in expected["locks"].items():
        if _canonical_sha(sections[name]) != expected_hash:
            errors.append(f"CAPTAINS_QUARTERS_SOURCE_SUBTREE_MISMATCH:{label}:{name}")
    tiers = card.get("Tiers") if isinstance(card.get("Tiers"), dict) else {}
    abilities = card.get("Abilities") if isinstance(card.get("Abilities"), dict) else {}
    referenced = {value for tier in tiers.values() if isinstance(tier, dict)
                  for value in tier.get("AbilityIds", [])}
    if card.get("Version") != "5.0.0":
        errors.append("CAPTAINS_QUARTERS_CARD_VERSION_MISMATCH:" + label)
    if sorted(referenced - set(abilities)) != ["3"]:
        errors.append("CAPTAINS_QUARTERS_DANGLING_ABILITY_SET_MISMATCH:" + label)
    ability2 = abilities.get("2", {}) if isinstance(abilities.get("2"), dict) else {}
    if ability2.get("Priority") != expected["ability2Priority"]:
        errors.append("CAPTAINS_QUARTERS_ABILITY2_PRIORITY_MISMATCH:" + label)


def verify(current_db: Path, artifact: Path, archived_db: Path | None = None) -> dict:
    errors: list[str] = []
    try:
        if archived_db is None:
            errors.append("CAPTAINS_QUARTERS_ARCHIVED_SOURCE_REQUIRED")
        else:
            _verify_source(current_db, SOURCES[0], errors)
            _verify_source(archived_db, SOURCES[1], errors)
        document = _decode_json(artifact.read_bytes(), "GAP_ARTIFACT")
        if _canonical_sha(document) != ARTIFACT_CANONICAL_SHA256:
            errors.append("CAPTAINS_QUARTERS_GAP_ARTIFACT_MISMATCH")
        if not isinstance(document, dict) or document.get("schema") != "ysbzs.original-pirate-source-gap.v2":
            errors.append("CAPTAINS_QUARTERS_GAP_SCHEMA_MISMATCH")
        if any(document.get(field) is not False for field in (
                "formalPromotionAllowed", "battleLogsAllowed", "originalRulesAccepted")):
            errors.append("CAPTAINS_QUARTERS_FAIL_CLOSED_FLAGS_INVALID")
        old = document.get("fixedGithubHistoricalPredecessor", {})
        if (old.get("commit") != "f309056f7d7f6783702933a20b9b5d6e0e1d3a2f"
                or old.get("cardVersion") != "2.0.0"
                or old.get("ability3CanonicalSha256")
                != "20f98c7f5dde46dae1c6166327d636d686264a7a50d83b3310c5ba52d7d1b7b4"):
            errors.append("CAPTAINS_QUARTERS_HISTORICAL_EVIDENCE_MISMATCH")
    except (OSError, UnicodeError, ValueError, sqlite3.Error) as error:
        errors.append("CAPTAINS_QUARTERS_INPUT_UNREADABLE:" + str(error))
    return {
        "ok": not errors,
        "v5IndependentSourcesVerified": 2 if not errors else 0,
        "historicalV2PredecessorLocked": not errors,
        "sourceGapStatus": "BLOCKED_SOURCE_REFERENCE_MISSING",
        "formalPromotionAllowed": False,
        "battleLogsAllowed": False,
        "originalRulesAccepted": False,
        "errors": errors,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--current-db", type=Path, required=True)
    parser.add_argument("--archived-db", type=Path, required=True)
    parser.add_argument("--artifact", type=Path, required=True)
    args = parser.parse_args()
    result = verify(args.current_db, args.artifact, args.archived_db)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
