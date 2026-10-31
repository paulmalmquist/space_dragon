"""Refuse to replace generated artifacts that no longer match their receipt."""
import hashlib
import json
from pathlib import Path


def assert_generated_output(path, receipt_path, hash_key):
    """Allow a fresh output or a byte-identical previously generated output.

    Missing or malformed provenance is not permission to overwrite a file.
    This guard performs no writes, including when it rejects an output.
    """
    path, receipt_path = Path(path), Path(receipt_path)
    if not path.exists():
        return
    message = (f"Refusing to overwrite {path}: it is modified or lacks a matching "
               f"generation receipt ({receipt_path}, {hash_key}). Preserve the file "
               "and choose new versioned source/output paths for this generator; "
               "do not replace the receipt to bypass this check.")
    try:
        receipt = json.loads(receipt_path.read_text(encoding='utf-8'))
        expected = receipt[hash_key]
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise RuntimeError(message) from error
    if not isinstance(expected, str) or expected.lower() != actual:
        raise RuntimeError(message)
