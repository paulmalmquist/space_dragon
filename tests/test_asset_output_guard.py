import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from asset_output_guard import assert_generated_output


class AssetOutputGuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name) / 'candidate.blend'
        self.receipt = Path(self.temp.name) / 'receipt.json'

    def record(self, data=b'generated source'):
        self.output.write_bytes(data)
        self.receipt.write_text(json.dumps({'sourceSha256': hashlib.sha256(data).hexdigest()}))

    def test_fresh_output_needs_no_receipt_and_creates_nothing(self):
        assert_generated_output(self.output, self.receipt, 'sourceSha256')
        self.assertFalse(self.output.exists())
        self.assertFalse(self.receipt.exists())

    def test_identical_generated_source_can_be_regenerated(self):
        self.record()
        assert_generated_output(self.output, self.receipt, 'sourceSha256')

    def test_owner_edit_is_rejected_without_changing_either_file(self):
        self.record()
        self.output.write_bytes(b'owner added a new wing plate')
        before = self.receipt.read_bytes()
        with self.assertRaisesRegex(RuntimeError, 'choose new versioned'):
            assert_generated_output(self.output, self.receipt, 'sourceSha256')
        self.assertEqual(self.output.read_bytes(), b'owner added a new wing plate')
        self.assertEqual(self.receipt.read_bytes(), before)

    def test_existing_output_requires_valid_matching_provenance(self):
        self.output.write_bytes(b'irreplaceable edit')
        for contents in [None, '{broken', '{}', '[]', '{"sourceSha256": null}', '{"sourceSha256": "wrong"}']:
            with self.subTest(contents=contents):
                if contents is not None:
                    self.receipt.write_text(contents)
                with self.assertRaisesRegex(RuntimeError, 'Refusing to overwrite'):
                    assert_generated_output(self.output, self.receipt, 'sourceSha256')
                self.assertEqual(self.output.read_bytes(), b'irreplaceable edit')


if __name__ == '__main__':
    unittest.main()
