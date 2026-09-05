#!/usr/bin/env python3
"""Verify Captain's Quarters' locked dangling Ability reference fail-closed."""

import argparse
import hashlib
import json
import sqlite3
from pathlib import Path


SOURCE_DB_SHA256 = "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9"
SOURCE_UUID = "8908d2d1-1a7e-4f97-8ecb-6834e96b1eab"
LOCKS = {
    "identity": "1b940aa1ec3d942e7175c963933f662f866dfbb6f669e4a49a012f1e839f3268",
    "tiers": "a5130471300f692715ca637b3454261ff6fffc49a658567d339e13a2083ce989",
    "abilities": "d8f6a00fca6f3cbe4a0aae37e6579bd1010e430f3cdbcc06e1d7143c7e6f33a7",
    "auras": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
    "enchantments": "4cab81d26c53a16cabfee5c912d38708dc0129ccaa8b96b9577acaae9d696700",
}


def _canonical_sha(value: object) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True,
                         separators=(",", ":")).encode()
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


def expected_artifact() -> dict:
    return {
        "schema": "ysbzs.original-pirate-source-gap.v1",
        "sourceDbSha256": SOURCE_DB_SHA256,
        "sourceObjectUuid": SOURCE_UUID,
        "sourceInternalName": "Captain's Quarters",
        "identity": {
            "type": "Item", "size": "Large", "startingTier": "Silver",
            "heroes": ["Vanessa"], "tags": ["Aquatic", "Property"],
            "hiddenTags": ["Haste", "DamageReference", "AmmoReference"],
            "spawningEligibility": "Always",
        },
        "tierAbilityReferences": {
            "silver": ["0", "1", "2", "3"],
            "gold": ["0", "1", "2", "3"],
            "diamond": ["0", "1", "2", "3"],
        },
        "sourceAbilityDirectoryObserved": ["0", "1", "2"],
        "missingAbilityIds": ["3"],
        "knownAbilitySummaries": [
            {"abilityId": "0", "priority": "Medium", "trigger": "TTriggerOnCardFired",
             "action": "TActionCardHaste", "target": "SelfHand Vehicle-or-Tool with active clock",
             "silverGoldDiamondValues": [1000, 2000, 3000]},
            {"abilityId": "1", "priority": "Low", "trigger": "TTriggerOnCardFired",
             "action": "TActionCardReload", "target": "SelfHand AmmoMax>0",
             "silverGoldDiamondValues": [1, 2, 3]},
            {"abilityId": "2", "priority": "High", "trigger": "TTriggerOnCardFired",
             "action": "TActionCardModifyAttribute DamageAmount UntilEndOfCombat",
             "target": "SelfHand Weapon", "silverGoldDiamondValues": [20, 30, 40]},
        ],
        "sourceGapStatus": "BLOCKED_SOURCE_REFERENCE_MISSING",
        "formalPromotionAllowed": False,
        "originalRulesAccepted": False,
        "requiredResolution": (
            "Obtain a version-bound source in which every tier AbilityId resolves, then "
            "re-lock and inspect Ability 3 before any executable mapping or battle log."
        ),
        "nonInference": [
            "Ability 3 is not assumed to be removed, inert, duplicated, or equivalent to a tooltip.",
            "Known Abilities 0/1/2 do not make the item complete.",
            "Directory order does not prove runtime execution order.",
        ],
    }


def verify(db: Path, artifact: Path) -> dict:
    errors = []
    try:
        with db.open("rb") as stream:
            if hashlib.file_digest(stream, "sha256").hexdigest() != SOURCE_DB_SHA256:
                errors.append("CAPTAINS_QUARTERS_SOURCE_DB_SHA_MISMATCH")
        with sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True) as connection:
            row = connection.execute("SELECT Data FROM cards WHERE Id=?", (SOURCE_UUID,)).fetchone()
        if row is None:
            errors.append("CAPTAINS_QUARTERS_SOURCE_UUID_MISSING")
            card = {}
        else:
            source_payload = row[0] if isinstance(row[0], bytes) else row[0].encode("utf-8")
            card = _decode_json(source_payload, "SOURCE_CARD")
        identity = {key: card.get(key) for key in (
            "Id", "InternalName", "Type", "Size", "StartingTier", "Heroes", "Tags",
            "HiddenTags", "SpawningEligibility",
        )}
        sections = {
            "identity": identity, "tiers": card.get("Tiers"),
            "abilities": card.get("Abilities"), "auras": card.get("Auras"),
            "enchantments": card.get("Enchantments"),
        }
        for name, expected in LOCKS.items():
            if _canonical_sha(sections[name]) != expected:
                errors.append("CAPTAINS_QUARTERS_SOURCE_SUBTREE_MISMATCH:" + name)
        tiers = card.get("Tiers") if isinstance(card.get("Tiers"), dict) else {}
        abilities = card.get("Abilities") if isinstance(card.get("Abilities"), dict) else {}
        referenced = {value for tier in tiers.values() if isinstance(tier, dict)
                      for value in tier.get("AbilityIds", [])}
        missing = sorted(referenced - set(abilities))
        if missing != ["3"]:
            errors.append("CAPTAINS_QUARTERS_DANGLING_ABILITY_SET_MISMATCH")
        actual_artifact = _decode_json(artifact.read_bytes(), "GAP_ARTIFACT")
        if actual_artifact != expected_artifact():
            errors.append("CAPTAINS_QUARTERS_GAP_ARTIFACT_MISMATCH")
    except (OSError, ValueError, sqlite3.Error) as error:
        errors.append("CAPTAINS_QUARTERS_INPUT_UNREADABLE:" + str(error))
    return {
        "ok": not errors,
        "sourceGapVerified": not errors,
        "sourceGapStatus": "BLOCKED_SOURCE_REFERENCE_MISSING",
        "formalPromotionAllowed": False,
        "originalRulesAccepted": False,
        "errors": errors,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--artifact", type=Path, required=True)
    args = parser.parse_args()
    result = verify(args.db, args.artifact)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
