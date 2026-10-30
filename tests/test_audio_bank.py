import json
import pathlib
import unittest
import wave

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = ROOT / "assets" / "game" / "audio" / "starter"


class AudioBankTest(unittest.TestCase):
    def test_manifest_and_wav_headers(self):
        manifest = json.loads((BASE / "manifest.json").read_text(encoding="utf-8"))
        tracks = manifest["tracks"]
        self.assertEqual(len(tracks), 16)
        self.assertEqual(len({t["event_id"] for t in tracks}), len(tracks))
        for track in tracks:
            audio = BASE / track["file"]
            self.assertTrue(audio.is_file(), track["id"])
            with wave.open(str(audio), "rb") as wav:
                self.assertEqual(wav.getnchannels(), 1)
                self.assertEqual(wav.getframerate(), 32000)
                self.assertEqual(wav.getsampwidth(), 2)
                self.assertEqual(wav.getcomptype(), "NONE")
                self.assertEqual(wav.getnframes(), round(track["duration_seconds"] * 32000))
                data = wav.readframes(wav.getnframes())
                self.assertTrue(any(data), "Unexpected silent asset: " + track["id"])

    def test_generated_assets_not_registered_as_external_audio(self):
        manifest = json.loads((BASE / "manifest.json").read_text(encoding="utf-8"))
        self.assertFalse(manifest["third_party_samples_used"])
        self.assertTrue(all(t["rights"] == "original_procedural" for t in manifest["tracks"]))


if __name__ == "__main__":
    unittest.main()
