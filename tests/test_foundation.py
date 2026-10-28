"""Negative/positive tests of the foundation checker, not LLM behavior evals."""
from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest

from tools import check_foundation as foundation


class FoundationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for path in foundation.DOCS:
            self.put(path, "# Fixture\n")
        self.put("CLAUDE.md", "@AGENTS.md\n")
        for name in foundation.SKILLS:
            text = f"---\nname: {name}\ndescription: Use for this fixture.\n---\n\n# Steps\nInspect and verify.\n"
            for path in foundation.skill_paths(name):
                self.put(path, text)
        self.data = {"schema_version": 1, "evaluation_mode": "manual", "cases": [{
            "id": "test_case", "prompt": "A synthetic request.", "expected_skill": "sd-build-feature",
            "must_do": ["Preserve canon."], "must_not_do": ["Invent results."], "references": ["AGENTS.md"]
        }]}
        self.save_cases()

    def put(self, path, text):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8", newline="\n")

    def save_cases(self):
        self.put(foundation.CASES, json.dumps(self.data))

    def assert_error(self, text):
        self.assertTrue(any(text in error for error in foundation.check(self.root)), foundation.check(self.root))

    def test_valid_foundation(self):
        self.assertEqual(foundation.check(self.root), [])

    def test_missing_document_fails(self):
        (self.root / foundation.DOCS[2]).unlink()
        self.assert_error(foundation.DOCS[2])

    def test_claude_must_import_shared_rules(self):
        self.put("CLAUDE.md", "# Separate policy\n")
        self.assert_error("only @AGENTS.md")

    def test_root_rules_stay_small(self):
        self.put("AGENTS.md", "line\n" * 101)
        self.assert_error("100-line")

    def test_mirror_drift_fails(self):
        self.put(foundation.skill_paths(foundation.SKILLS[0])[1], "changed\n")
        self.assert_error("mirror drift")

    def test_wrong_skill_name_fails(self):
        source, _ = foundation.skill_paths(foundation.SKILLS[0])
        text = (self.root / source).read_text().replace("name: sd-build-feature", "name: wrong")
        self.put(source, text)
        self.assert_error("name must match")

    def test_empty_description_fails(self):
        self.assertTrue(foundation.metadata_errors("---\nname: sd-playtest\ndescription:\n---\nSteps\n", "sd-playtest"))

    def test_empty_body_fails(self):
        self.assertTrue(foundation.metadata_errors("---\nname: sd-playtest\ndescription: Test\n---\n", "sd-playtest"))

    def test_missing_link_fails(self):
        self.put("AGENTS.md", "[Missing](missing.md)\n")
        self.assert_error("missing local link")

    def test_whitespace_only_link_fails_cleanly(self):
        self.put("AGENTS.md", "[Empty]( )\n")
        self.assert_error("empty local link target")

    def test_external_and_fragment_links_are_not_fetched(self):
        self.put("AGENTS.md", "[External](https://example.invalid/test) [Heading](#local)\n")
        self.assertEqual(foundation.check(self.root), [])

    def test_escape_link_fails(self):
        self.put("AGENTS.md", "[Escape](../../outside.md)\n")
        self.assert_error("escapes repository")

    def test_fenced_example_is_not_a_real_link(self):
        self.put("AGENTS.md", "```md\n[Example](not-real.md)\n```\n")
        self.assertEqual(foundation.check(self.root), [])

    def test_duplicate_case_ids_fail(self):
        self.data["cases"].append(dict(self.data["cases"][0]))
        self.save_cases()
        self.assert_error("unique")

    def test_unknown_case_skill_fails(self):
        self.data["cases"][0]["expected_skill"] = "unknown"
        self.save_cases()
        self.assert_error("invalid expected_skill")

    def test_empty_behavior_rubric_fails(self):
        self.data["cases"][0]["must_not_do"] = []
        self.save_cases()
        self.assert_error("must_not_do")

    def test_missing_case_reference_fails(self):
        self.data["cases"][0]["references"] = ["missing.md"]
        self.save_cases()
        self.assert_error("missing reference")

    def test_sync_is_idempotent_and_preserves_unrelated_skills(self):
        _, target = foundation.skill_paths(foundation.SKILLS[0])
        self.put(target, "old\n")
        self.put(".claude/skills/unrelated/SKILL.md", "user-owned\n")
        self.assertEqual(foundation.sync_skills(self.root), 1)
        self.assertEqual(foundation.sync_skills(self.root), 0)
        self.assertEqual((self.root / ".claude/skills/unrelated/SKILL.md").read_text(), "user-owned\n")
        self.assertEqual(foundation.check(self.root), [])

    def test_sync_preflights_before_writing(self):
        _, target = foundation.skill_paths(foundation.SKILLS[0])
        self.put(target, "keep-until-valid\n")
        (self.root / foundation.skill_paths(foundation.SKILLS[-1])[0]).unlink()
        with self.assertRaises(OSError):
            foundation.sync_skills(self.root)
        self.assertEqual((self.root / target).read_text(), "keep-until-valid\n")

    def test_sync_rejects_symlink_destination(self):
        _, target = foundation.skill_paths(foundation.SKILLS[0])
        destination = self.root / target
        destination.unlink()
        outside = self.root / "user-file.md"
        outside.write_text("untouched\n")
        try:
            destination.symlink_to(outside)
        except OSError:
            self.skipTest("symlinks unavailable on this test host")
        with self.assertRaises(ValueError):
            foundation.sync_skills(self.root)
        self.assertEqual(outside.read_text(), "untouched\n")

    def test_unsupported_supporting_file_fails(self):
        self.put(".agents/skills/sd-playtest/extra.md", "not mirrored\n")
        self.assert_error("supporting files")

    def test_malformed_case_json_fails(self):
        self.put(foundation.CASES, "{not json")
        self.assert_error(foundation.CASES)


if __name__ == "__main__":
    unittest.main()
