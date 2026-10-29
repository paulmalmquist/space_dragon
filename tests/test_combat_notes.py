"""Integrity checks and negative tests for the notebook, NOT combat tests."""
from __future__ import annotations

import copy
import json
from pathlib import Path
import tempfile
import unittest

from tools.check_combat_notes import check, validate

ROOT = Path(__file__).resolve().parents[1]


class CombatNotebookTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.note = self.root / "docs/combat/CB-001-example.md"
        self.note.parent.mkdir(parents=True)
        self.note.write_text("# CB-001\nCB-001-T01\n", encoding="utf-8")
        self.data = {
            "schema_version": 1, "scope": "combat-specifications-only",
            "notes": [{"id": "CB-001", "path": "docs/combat/CB-001-example.md",
                       "authority": "PROPOSED", "maturity": "SPECIFIED",
                       "test_ids": ["CB-001-T01"]}],
            "cases": [{"id": "CB-001-T01", "note_id": "CB-001", "kind": "logic",
                       "given": "A defined input.", "when": "An action occurs.",
                       "then": ["One outcome occurs."], "status": "NOT_TESTED", "evidence": []}],
        }

    def errors(self):
        return validate(self.data, self.root)

    def test_repository_registry_integrity_only(self):
        self.assertEqual(check(ROOT), [])

    def test_valid_minimal_specification(self):
        self.assertEqual(self.errors(), [])

    def test_malformed_top_level(self):
        for value in (None, [], {}, {"schema_version": True}, {"schema_version": 2}):
            with self.subTest(value=value):
                self.assertTrue(validate(value, self.root))

    def test_duplicate_note(self):
        self.data["notes"].append(copy.deepcopy(self.data["notes"][0]))
        self.assertTrue(self.errors())

    def test_duplicate_case(self):
        self.data["cases"].append(copy.deepcopy(self.data["cases"][0]))
        self.assertTrue(self.errors())

    def test_orphan_case(self):
        self.data["cases"][0]["note_id"] = "CB-999"
        self.assertTrue(self.errors())

    def test_missing_case_in_note_text(self):
        self.note.write_text("# CB-001\n", encoding="utf-8")
        self.assertTrue(self.errors())

    def test_missing_note_file(self):
        self.note.unlink()
        self.assertTrue(self.errors())

    def test_unsafe_paths(self):
        for path in ("../outside.md", "/tmp/x.md", "C:\\outside.md", "docs/combat/../x.md"):
            with self.subTest(path=path):
                self.data["notes"][0]["path"] = path
                self.assertTrue(self.errors())

    def test_symlink_note(self):
        target = self.root / "target.md"
        target.write_text("CB-001 CB-001-T01", encoding="utf-8")
        self.note.unlink()
        try:
            self.note.symlink_to(target)
        except OSError as exc:
            self.skipTest(f"Host cannot create symlinks: {exc}")
        self.assertTrue(self.errors())

    def test_bidirectional_mapping(self):
        self.data["notes"][0]["test_ids"].append("CB-001-T02")
        self.assertTrue(self.errors())

    def test_empty_expectation(self):
        self.data["cases"][0]["then"] = []
        self.assertTrue(self.errors())

    def test_invalid_field_types_do_not_crash(self):
        for collection, field in (("cases", "id"), ("cases", "note_id"), ("cases", "kind"),
                                  ("cases", "status"), ("notes", "id"), ("notes", "maturity")):
            with self.subTest(collection=collection, field=field):
                data = copy.deepcopy(self.data)
                data[collection][0][field] = []
                self.assertTrue(validate(data, self.root))

    def test_result_without_evidence_rejected(self):
        for status in ("PASS", "FAIL", "BLOCKED"):
            with self.subTest(status=status):
                self.data["cases"][0]["status"] = status
                self.assertTrue(self.errors())

    def test_not_tested_with_evidence_rejected(self):
        self.data["cases"][0]["evidence"] = [{"observed": "No real run."}]
        self.assertTrue(self.errors())

    def test_result_evidence_needs_receipt_build_and_observation(self):
        case = self.data["cases"][0]
        case["status"] = "PASS"
        case["evidence"] = [{"receipt": "docs/reports/missing.md", "build": "fixture", "observed": "Synthetic fixture only."}]
        self.assertTrue(self.errors())
        receipt = self.root / "docs/reports/missing.md"
        receipt.parent.mkdir(parents=True)
        receipt.write_text("Synthetic checker fixture; no game executed.", encoding="utf-8")
        self.assertEqual(self.errors(), [])  # Structure only, not a gameplay pass.
        case["evidence"][0]["build"] = ""
        self.assertTrue(self.errors())

    def test_promoted_note_needs_receipt(self):
        self.data["notes"][0]["maturity"] = "VERIFIED"
        self.assertTrue(self.errors())

    def test_bad_json_reports_failure(self):
        registry = self.root / "tests/combat_cases.json"
        registry.parent.mkdir(parents=True)
        registry.write_text("{broken", encoding="utf-8")
        self.assertTrue(check(self.root))

    def test_valid_json_round_trip(self):
        registry = self.root / "tests/combat_cases.json"
        registry.parent.mkdir(parents=True)
        registry.write_text(json.dumps(self.data), encoding="utf-8")
        self.assertEqual(check(self.root), [])


if __name__ == "__main__":
    unittest.main()
