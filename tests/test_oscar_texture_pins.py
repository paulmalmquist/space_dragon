"""Source texture reproducibility checks; no Blender or real asset files required."""
import hashlib
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from prepare_oscar_dragon import verify_texture_sources


class OscarTexturePinTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name) / 'relocated-textures'
        self.folder.mkdir()
        self.contents = {'BaseColor': b'original base-color bytes',
                         'Normal': b'original tangent-normal bytes'}
        maps = {}
        for channel, contents in self.contents.items():
            name = self.filename(channel)
            (self.folder / name).write_bytes(contents)
            # The receipt was created on Windows; relocation also works in Linux CI.
            maps[channel] = {'path': 'C:\\original-textures\\' + name,
                             'sha256': hashlib.sha256(contents).hexdigest()}
        self.receipt = {'materialRemaps': [{'sourceMaterial': 'CUERPO_1001', 'maps': maps}]}

    @staticmethod
    def filename(channel):
        return 'DRAGON_FINAL_BAJA_CUERPO_' + channel + '.1001.png'

    def verify(self):
        return verify_texture_sources(self.receipt, self.folder, ['CUERPO_1001'])

    def test_identical_relocated_maps_keep_recorded_missing_channel_fallbacks(self):
        result = self.verify()
        self.assertEqual(result, {
            (self.folder / self.filename(channel)).resolve(): hashlib.sha256(contents).hexdigest()
            for channel, contents in self.contents.items()
        })
        self.assertEqual(sorted(path.name for path in self.folder.iterdir()),
                         sorted(self.filename(channel) for channel in self.contents))
        for channel, contents in self.contents.items():
            self.assertEqual((self.folder / self.filename(channel)).read_bytes(), contents)

    def test_changed_map_is_rejected_without_rewriting_it(self):
        source = self.folder / self.filename('BaseColor')
        source.write_bytes(b'edited source image')
        with self.assertRaisesRegex(RuntimeError, 'hash differs from pinned import'):
            self.verify()
        self.assertEqual(source.read_bytes(), b'edited source image')

    def test_missing_pinned_map_cannot_silently_become_a_fallback(self):
        source = self.folder / self.filename('Normal')
        source.unlink()
        with self.assertRaisesRegex(RuntimeError, 'map/fallback changed since import'):
            self.verify()
        self.assertFalse(source.exists())

    def test_added_map_cannot_silently_replace_a_recorded_fallback(self):
        source = self.folder / self.filename('Metallic')
        source.write_bytes(b'new unapproved metallic image')
        with self.assertRaisesRegex(RuntimeError, 'map/fallback changed since import'):
            self.verify()
        self.assertEqual(source.read_bytes(), b'new unapproved metallic image')


if __name__ == '__main__':
    unittest.main()
