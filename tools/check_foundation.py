#!/usr/bin/env python3
"""Check repository guidance, not assistant behavior or game correctness.

Python 3.10+, standard library only. No network, subprocesses or external services.
The optional sync writes only registered Claude SKILL.md mirrors.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import tempfile
from urllib.parse import unquote, urlsplit

SKILLS = ("sd-build-feature", "sd-blender-asset", "sd-playtest")
DOCS = (
    "AGENTS.md", "CLAUDE.md", "docs/plans/CURRENT_MILESTONE.md",
    "docs/engineering/ARCHITECTURE.md", "docs/gameplay/INTERACTION_CONTRACTS.md",
    "docs/learning/LEARNING_RULES.md", "docs/engineering/QUALITY_GATES.md",
    "docs/templates/VERIFICATION_RECEIPT.md",
)
CASES = "tests/agent_policy_cases.json"
LINK = re.compile(r"\[[^\]\n]*\]\(([^)\n]+)\)")
FENCE = re.compile(r"^```[^\n]*\n.*?^```[^\n]*(?:\n|$)", re.M | re.S)


def guarded_path(root: Path, relative: str) -> Path:
    """Refuse absolute paths, traversal and symlinked managed paths."""
    root = root.resolve()
    rel = Path(relative)
    if rel.is_absolute() or ".." in rel.parts:
        raise ValueError(f"unsafe repository path: {relative}")
    path = root / rel
    for part in (path, *path.parents):
        if part == root:
            break
        if part.is_symlink():
            raise ValueError(f"symlink not allowed for managed path: {relative}")
    path.resolve().relative_to(root)
    return path


def skill_paths(name: str) -> tuple[str, str]:
    return (f".agents/skills/{name}/SKILL.md", f".claude/skills/{name}/SKILL.md")


def metadata_errors(text: str, name: str) -> list[str]:
    """Validate this project's deliberately limited, flat frontmatter format."""
    lines = text.splitlines()
    if not lines or lines[0] != "---" or "---" not in lines[1:]:
        return ["missing frontmatter"]
    end = lines.index("---", 1)
    fields: dict[str, str] = {}
    for line in lines[1:end]:
        key, sep, value = line.partition(":")
        if not sep or key not in {"name", "description"} or key in fields:
            return ["use one single-line name and description field only"]
        fields[key] = value.strip()
    errors = []
    if fields.get("name") != name:
        errors.append("name must match the registered skill directory")
    description = fields.get("description", "")
    if not description or len(description) > 1024 or description in {"|", ">"}:
        errors.append("description must be a nonempty single line, at most 1024 characters")
    if not "\n".join(lines[end + 1:]).strip():
        errors.append("skill instructions are empty")
    return errors


def link_errors(root: Path, relative: str, text: str) -> list[str]:
    """Check inline local link paths; not external URLs, anchors or all Markdown."""
    errors = []
    for match in LINK.finditer(FENCE.sub("", text)):
        raw = match.group(1).strip()
        if not raw:
            errors.append("empty local link target")
            continue
        raw = raw[1:raw.index(">")] if raw.startswith("<") and ">" in raw else raw.split()[0]
        parsed = urlsplit(raw)
        if parsed.scheme or parsed.netloc or not parsed.path:
            continue
        target = ((root / relative).parent / unquote(parsed.path)).resolve()
        try:
            target.relative_to(root.resolve())
        except ValueError:
            errors.append(f"link escapes repository: {raw}")
            continue
        if not target.exists():
            errors.append(f"missing local link target: {raw}")
    return errors


def case_errors(data: object, root: Path) -> list[str]:
    if not isinstance(data, dict) or data.get("schema_version") != 1 or data.get("evaluation_mode") != "manual":
        return ["policy cases require schema_version 1 and evaluation_mode manual"]
    cases = data.get("cases")
    if not isinstance(cases, list) or not cases:
        return ["policy cases must be a nonempty list"]
    errors, seen = [], set()
    for case in cases:
        if not isinstance(case, dict):
            errors.append("case must be an object")
            continue
        case_id = case.get("id")
        if not isinstance(case_id, str) or not case_id or case_id in seen:
            errors.append("case IDs must be nonempty and unique")
        else:
            seen.add(case_id)
        if not isinstance(case.get("prompt"), str) or not case["prompt"].strip():
            errors.append(f"{case_id}: missing prompt")
        if "expected_skill" not in case or case["expected_skill"] not in (*SKILLS, None):
            errors.append(f"{case_id}: invalid expected_skill")
        for key in ("must_do", "must_not_do", "references"):
            values = case.get(key)
            if not isinstance(values, list) or not values or not all(isinstance(v, str) and v.strip() for v in values):
                errors.append(f"{case_id}: {key} must contain nonempty strings")
                continue
            if key == "references":
                for value in values:
                    try:
                        if not guarded_path(root, value).is_file():
                            errors.append(f"{case_id}: missing reference {value}")
                    except ValueError as exc:
                        errors.append(f"{case_id}: {exc}")
    return errors


def sync_skills(root: Path) -> int:
    """Preflight all registered sources/destinations before writing any mirror."""
    planned = []
    for name in SKILLS:
        source_name, destination_name = skill_paths(name)
        source = guarded_path(root, source_name)
        destination = guarded_path(root, destination_name)
        content = source.read_bytes()
        errors = metadata_errors(content.decode("utf-8"), name)
        if errors:
            raise ValueError(f"{source_name}: {'; '.join(errors)}")
        if destination.exists() and not destination.is_file():
            raise ValueError(f"destination is not a file: {destination_name}")
        if not destination.exists() or destination.read_bytes() != content:
            planned.append((destination, content))
    for destination, content in planned:
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as handle:
                temporary = Path(handle.name)
                handle.write(content)
            os.replace(temporary, destination)
        finally:
            if temporary is not None and temporary.exists():
                temporary.unlink()
    return len(planned)


def check(root: Path) -> list[str]:
    root = root.resolve()
    errors = []
    documents = [*DOCS, *(p for name in SKILLS for p in skill_paths(name))]
    texts: dict[str, str] = {}
    for relative in documents:
        try:
            text = guarded_path(root, relative).read_text(encoding="utf-8")
            texts[relative] = text
            if not text.strip():
                errors.append(f"{relative}: empty document")
            errors.extend(f"{relative}: {e}" for e in link_errors(root, relative, text))
        except (OSError, UnicodeError, ValueError) as exc:
            errors.append(f"{relative}: {exc}")
    if texts.get("CLAUDE.md", "").strip() != "@AGENTS.md":
        errors.append("CLAUDE.md must contain only @AGENTS.md")
    if len(texts.get("AGENTS.md", "").splitlines()) > 100:
        errors.append("AGENTS.md exceeds the 100-line project limit")
    for name in SKILLS:
        source, destination = skill_paths(name)
        if source in texts:
            errors.extend(f"{source}: {e}" for e in metadata_errors(texts[source], name))
        if source in texts and destination in texts:
            if guarded_path(root, source).read_bytes() != guarded_path(root, destination).read_bytes():
                errors.append(f"skill mirror drift: {name}")
        for relative in (source, destination):
            folder = root / Path(relative).parent
            if folder.exists() and not folder.is_symlink():
                if any(p.name != "SKILL.md" for p in folder.iterdir()):
                    errors.append(f"{folder.relative_to(root)}: supporting files need sync-tool support first")
    try:
        data = json.loads(guarded_path(root, CASES).read_text(encoding="utf-8"))
        errors.extend(case_errors(data, root))
    except (OSError, UnicodeError, ValueError) as exc:
        errors.append(f"{CASES}: {exc}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sync-skills", action="store_true", help="regenerate the three registered Claude skill mirrors first")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    try:
        if args.sync_skills:
            print(f"Updated {sync_skills(root)} skill mirror(s).")
        errors = check(root)
    except (OSError, UnicodeError, ValueError) as exc:
        print(f"FAIL: {exc}")
        return 1
    if errors:
        for error in errors:
            print(f"FAIL: {error}")
        return 1
    print("PASS: foundation structure and skill mirrors. Gameplay and agent behavior are NOT TESTED by this command.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
