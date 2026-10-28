#!/usr/bin/env python3
"""Verify the prepared Space Dragon photo inventory using only Python's standard library."""
from __future__ import annotations
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "assets/reference/family/manifest.json"

def main() -> int:
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        print(f"FAIL: cannot read manifest: {exc}", file=sys.stderr)
        return 1
    failures = []
    entries = manifest.get("photos", [])
    if len(entries) != manifest.get("photo_count") or len(entries) != 18:
        failures.append("Expected exactly 18 manifest entries")
    expected = set()
    for item in entries:
        relative = item["path"]
        path = (ROOT / relative).resolve()
        if not path.is_relative_to(ROOT):
            failures.append(f"Unsafe path: {relative}")
            continue
        expected.add(path)
        try:
            data = path.read_bytes()
        except OSError as exc:
            failures.append(f"{relative}: {exc}")
            continue
        sha256 = hashlib.sha256(data).hexdigest()
        blob_sha = hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()
        if len(data) != item["bytes"] or sha256 != item["sha256"] or blob_sha != item["git_blob_sha1"]:
            failures.append(f"Checksum or size mismatch: {relative}")
        else:
            print(f"PASS {item['reference_id']} {item['filename']} {len(data):,} bytes")
    actual = {p.resolve() for p in (ROOT / "assets/reference/family/photos").iterdir() if p.is_file()}
    if actual != expected:
        failures.append("Photo directory and manifest inventory differ")
    if failures:
        print("\n".join("FAIL: " + msg for msg in failures), file=sys.stderr)
        return 1
    print(f"\nVERIFIED: {len(entries)} reference images. Checksums, sizes and inventory match.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
