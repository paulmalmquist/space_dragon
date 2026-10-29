#!/usr/bin/env python3
"""Validate combat specifications and evidence references, never gameplay.

Python 3.10+, standard library only. Does not run a game, network call or service.
A referenced receipt is not independently verified by this structural checker.
"""
from __future__ import annotations

import json
from pathlib import Path
import re

REGISTRY = "tests/combat_cases.json"
KINDS = {"logic", "integration", "playtest", "device"}
MATURITY = {"DRAFT", "SPECIFIED", "PROTOTYPED", "VERIFIED", "PLAYTESTED", "ACCEPTED"}


def text(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def local_file(root: Path, value: object, pattern: str) -> Path | None:
    """Allow only named files in fixed repository folders, with no symlinks."""
    if not isinstance(value, str) or not re.fullmatch(pattern, value):
        return None
    path = root / value
    if any(p.is_symlink() for p in (path, *path.parents) if p != root.parent):
        return None
    return path if path.is_file() else None


def validate(data: object, root: Path) -> list[str]:
    root = root.resolve()
    if not isinstance(data, dict) or type(data.get("schema_version")) is not int or data["schema_version"] != 1:
        return ["schema_version must be integer 1"]
    if data.get("scope") != "combat-specifications-only":
        return ["scope must be combat-specifications-only"]
    notes, cases = data.get("notes"), data.get("cases")
    if not isinstance(notes, list) or not notes or not isinstance(cases, list) or not cases:
        return ["notes and cases must be nonempty lists"]
    errors: list[str] = []
    known: dict[str, dict] = {}
    bodies: dict[str, str] = {}
    for note in notes:
        if not isinstance(note, dict):
            errors.append("note must be an object")
            continue
        nid = note.get("id")
        if not isinstance(nid, str) or not re.fullmatch(r"CB-\d{3}", nid) or nid in known:
            errors.append("note IDs must be valid and unique")
            continue
        known[nid] = note
        if note.get("authority") not in ("PROPOSED", "CONFIRMED", "BOOKMARKED", "OPEN"):
            errors.append(f"{nid}: invalid authority")
        if not isinstance(note.get("maturity"), str) or note["maturity"] not in MATURITY:
            errors.append(f"{nid}: invalid maturity")
        elif note["maturity"] not in {"DRAFT", "SPECIFIED"}:
            if local_file(root, note.get("receipt"), r"docs/reports/[A-Za-z0-9_.-]+\.md") is None:
                errors.append(f"{nid}: promoted maturity requires a local receipt")
        path = local_file(root, note.get("path"), rf"docs/combat/{nid}-[a-z0-9-]+\.md")
        if path is None:
            errors.append(f"{nid}: note path is unsafe or missing")
        else:
            try:
                bodies[nid] = path.read_text(encoding="utf-8")
                if nid not in bodies[nid] or not bodies[nid].strip():
                    errors.append(f"{nid}: note is empty or missing its ID")
            except (OSError, UnicodeError) as exc:
                errors.append(f"{nid}: unreadable note: {exc}")
        ids = note.get("test_ids")
        if not isinstance(ids, list) or not ids or not all(text(i) for i in ids):
            errors.append(f"{nid}: test_ids must be nonempty strings")
        elif len(ids) != len(set(ids)):
            errors.append(f"{nid}: duplicate test_ids")
    seen: set[str] = set()
    actual = {nid: set() for nid in known}
    for case in cases:
        if not isinstance(case, dict):
            errors.append("case must be an object")
            continue
        cid, nid = case.get("id"), case.get("note_id")
        if not isinstance(cid, str) or not re.fullmatch(r"CB-\d{3}-T\d{2}", cid) or cid in seen:
            errors.append("case IDs must be valid and unique")
            continue
        seen.add(cid)
        if not isinstance(nid, str) or nid not in known or not cid.startswith(nid + "-T"):
            errors.append(f"{cid}: unknown or mismatched note_id")
        else:
            actual[nid].add(cid)
            if cid not in bodies.get(nid, ""):
                errors.append(f"{cid}: missing from note text")
        if not isinstance(case.get("kind"), str) or case["kind"] not in KINDS:
            errors.append(f"{cid}: invalid kind")
        if not text(case.get("given")) or not text(case.get("when")):
            errors.append(f"{cid}: given and when must be nonempty")
        expected = case.get("then")
        if not isinstance(expected, list) or not expected or not all(text(v) for v in expected):
            errors.append(f"{cid}: then must contain observable expectations")
        status, evidence = case.get("status"), case.get("evidence")
        if status not in ("NOT_TESTED", "PASS", "FAIL", "BLOCKED"):
            errors.append(f"{cid}: invalid status")
        if not isinstance(evidence, list):
            errors.append(f"{cid}: evidence must be a list")
        elif status == "NOT_TESTED":
            if evidence:
                errors.append(f"{cid}: NOT_TESTED cannot carry execution evidence")
        elif status in ("PASS", "FAIL", "BLOCKED"):
            if not evidence:
                errors.append(f"{cid}: recorded result requires evidence")
            for entry in evidence:
                if not isinstance(entry, dict):
                    errors.append(f"{cid}: evidence must be an object")
                    continue
                receipt = local_file(root, entry.get("receipt"), r"docs/reports/[A-Za-z0-9_.-]+\.md")
                if receipt is None or not text(entry.get("build")) or not text(entry.get("observed")):
                    errors.append(f"{cid}: evidence needs a local receipt, build identifier and observation")
    for nid, note in known.items():
        ids = note.get("test_ids")
        if isinstance(ids, list) and all(text(i) for i in ids) and set(ids) != actual[nid]:
            errors.append(f"{nid}: note/case mapping is not bidirectional")
    return errors


def check(root: Path) -> list[str]:
    try:
        return validate(json.loads((root / REGISTRY).read_text(encoding="utf-8")), root)
    except (OSError, UnicodeError, ValueError) as exc:
        return [f"cannot read registry: {exc}"]


if __name__ == "__main__":
    problems = check(Path(__file__).resolve().parents[1])
    for problem in problems:
        print(f"FAIL: {problem}")
    if not problems:
        print("PASS: combat specification integrity only. Gameplay is NOT EXECUTED by this check; receipts are not independently verified.")
    raise SystemExit(bool(problems))
