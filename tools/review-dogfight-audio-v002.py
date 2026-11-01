"""Offline audition/peak stress check for the proposed Unity Dogfight v002 mix.

This is a deterministic Python approximation of DogfightAudio, NOT a recording
of Unity playback. Unity import, browser audio and listener review remain open.
"""
import importlib.util
import json
import math
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "artifacts/audio/dogfight-v002"
RATE = 48000
spec = importlib.util.spec_from_file_location("cue_preparation", ROOT / "tools/prepare-dogfight-audio-v002.py")
preparation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preparation)


def read_cue(name):
    path = ROOT / f"assets/game/local/audio/dogfight-v002/{name}-v002.wav"
    with wave.open(str(path), "rb") as handle:
        assert handle.getframerate() == RATE and handle.getnchannels() == 2 and handle.getsampwidth() == 2
        return np.frombuffer(handle.readframes(handle.getnframes()), dtype="<i2").reshape(-1, 2) / 32768.0


def weapon(recording, missile):
    duration = .48 if missile else .27
    result = np.zeros(round(duration * RATE))
    phase = 0
    seed = 51911
    filtered = 0
    for i in range(len(result)):
        t = i / RATE
        p = t / duration
        frequency = (78 + (38 - 78) * p) if missile else (112 + (48 - 112) * p)
        phase += 2 * math.pi * frequency / RATE
        seed = (seed * 1664525 + 1013904223) % (2**32)
        noise = seed / 4294967296 * 2 - 1
        filtered += (noise - filtered) * .12
        index = min(len(recording) - 1, int(t * RATE * (.9 if missile else 1.2)))
        sample = float(np.mean(recording[index]))
        body = (math.sin(phase) * .32 + math.sin(phase * 1.98) * .10) * math.exp(-t * (7 if missile else 15))
        ignition = (noise - filtered) * .12 * math.exp(-t * 65) + filtered * .20 * math.exp(-t * 9)
        envelope = min(1, t / .0025) * min(1, (duration - t) / .05)
        result[i] = (body + ignition + sample * .9) * envelope
    result *= .62 / max(.001, float(np.max(np.abs(result))))
    return np.column_stack((result, result))


def hull_alarm():
    # The runtime creates this at 24 kHz; linear interpolation here approximates
    # resampling for this review. It is not Unity's device resampler.
    rate = 24000
    duration = .55
    result = np.zeros(round(duration * rate))
    phase = 0
    for i in range(len(result)):
        t = i / rate
        p = t / duration
        phase += 2 * math.pi * (260 + (620 - 260) * p) / rate
        envelope = min(1, t / .008) * min(1, (duration - t) / .035)
        pulse = (p * 3) % 1
        envelope *= min(1, pulse / .07) * min(1, (.74 - pulse) / .08) if pulse < .74 else 0
        result[i] = (math.sin(phase) * .75 + math.sin(phase * 2) * .15) * envelope * .65
    upsampled = np.interp(np.arange(len(result) * 2) / 2, np.arange(len(result)), result)
    return np.column_stack((upsampled, upsampled))


def stress_mix(cues, plasma, launch, warnings):
    # Simulate bounded voice replacement and gains on 60 Hz frames. Event
    # positions are intentionally dense; this does not claim game event parity.
    frame_samples = RATE // 60
    length = 6 * RATE
    result = np.zeros((length, 2))
    voices = [None] * 6
    next_voice = 0
    events = [(float(t), plasma, .68) for t in np.arange(0, 4.9, .11)]
    events += [(t, cues["machine-blast"], 1) for t in (.6, 2.7, 4.3)]
    events += [(t, cues["metal-impact"], .8) for t in (.9, 2.2, 3.4)]
    events += [(t, launch, .9) for t in (.4, 4.6)]
    events.sort(key=lambda event: event[0])
    event_index = 0
    engine_gain = 0
    roar_gain = 1
    roar_start = round(1.1 * RATE)
    beam_start = round(1.9 * RATE)
    alarm_clip = hull_alarm()
    max_voices = 0
    largest_bound = 0
    smallest_mix_scale = 1
    warning_frames = 0
    for begin in range(0, length, frame_samples):
        count = min(frame_samples, length - begin)
        now = begin / RATE
        for index, voice in enumerate(voices):
            if voice is not None and begin - voice[1] >= len(voice[0]):
                voices[index] = None
        while event_index < len(events) and events[event_index][0] <= now:
            _, clip, gain = events[event_index]
            chosen = next_voice
            for offset in range(6):
                candidate = (next_voice + offset) % 6
                if voices[candidate] is None:
                    chosen = candidate
                    break
            next_voice = (chosen + 1) % 6
            voices[chosen] = (clip, begin, gain)
            event_index += 1
        active_roar = 0 <= begin - roar_start < len(cues["dragon-roar"])
        active_beam = 0 <= begin - beam_start < len(cues["fire-breath"])
        engine_gain = min(.43, engine_gain + 1.6 / 60) if now < 5 else max(0, engine_gain - 2.5 / 60)
        if active_beam:
            roar_gain = max(.23, roar_gain - 2.8 / 60)
        alarm_position = int(((now - 3) % .78) * RATE)
        active_alarm = warnings and 3 <= now < 5.8 and alarm_position < len(alarm_clip)
        warning = .8 * .62 if active_alarm else 0
        warning_frames += int(active_alarm)
        background = .7 if active_roar or active_beam else 1
        layers = [(voice[0], begin - voice[1], voice[2] * background) for voice in voices if voice is not None]
        if engine_gain > .001:
            indices = np.arange(begin, begin + count) % len(cues["jet-surge"])
            layers.append((cues["jet-surge"][indices], 0, engine_gain * background))
        if active_roar:
            layers.append((cues["dragon-roar"], begin - roar_start, roar_gain))
        if active_beam:
            layers.append((cues["fire-breath"], begin - beam_start, 1))
        total_gain = sum(layer[2] for layer in layers)
        effect_gain = .8 * .85 * (.45 if active_alarm else 1)
        budget = max(0, (.90 - warning * .8) / .8)
        scale = min(1, budget / max(.0001, total_gain * effect_gain))
        effect_gain *= scale
        smallest_mix_scale = min(smallest_mix_scale, scale)
        largest_bound = max(largest_bound, (total_gain * effect_gain + warning) * .8)
        max_voices = max(max_voices, len(layers) + int(active_alarm))
        for clip, position, gain in layers:
            portion = clip[position:position + count]
            result[begin:begin + len(portion)] += portion * gain * effect_gain
        if active_alarm:
            portion = alarm_clip[alarm_position:alarm_position + count]
            result[begin:begin + len(portion)] += portion * warning
    assert max_voices <= 10
    assert largest_bound <= .900001
    return result, dict(maximum_active_voices=max_voices, coherent_peak_bound=largest_bound,
                       minimum_effect_mix_scale=smallest_mix_scale, alarm_active_frames=warning_frames)


def main():
    cues = {name: read_cue(name) for name in ("dragon-roar", "fire-breath", "machine-blast", "metal-impact", "jet-surge")}
    plasma = weapon(cues["machine-blast"], False)
    launch = weapon(cues["jet-surge"], True)
    clips = {"weapon-plasma-v002": (plasma, {}), "weapon-launch-v002": (launch, {})}
    clips["combat-stress-v002"] = stress_mix(cues, plasma, launch, False)
    clips["combat-warning-stress-v002"] = stress_mix(cues, plasma, launch, True)
    report = dict(scope="Offline deterministic approximation; NOT captured Unity playback; NOT human audition",
                  runtime_source="unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/DogfightAudio.cs",
                  limitations=["Python float arithmetic and interpolation differ from Unity",
                               "60 Hz gain updates, full boost pitch 1.0 rather than Unity's 1.02",
                               "No device/browser latency, mixer resampling, actual speaker response or perceived masking measured"], files=[])
    outputs = {}
    for name, (data, extra) in clips.items():
        body = preparation.wav_bytes(data)
        metrics = preparation.measure(data, body)
        assert metrics["clipped_samples"] == 0
        assert float(metrics["true_peak_dbtp"]) < -1
        outputs[REVIEW / (name + ".wav")] = body
        report["files"].append(dict(file=name + ".wav", bytes=len(body), sha256=preparation.sha(body), **metrics, **extra))
    outputs[REVIEW / "offline-mix-measurements.json"] = (json.dumps(report, indent=2) + "\n").encode()
    rows = "\n".join(f'<article><h2>{name}</h2><audio controls preload="none" src="{name}.wav"></audio></article>' for name in ["cue-audition-v002", *clips])
    html = f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>Space Dragon audio v002 review</title>
<style>body{{background:#15121e;color:#eee;font:18px system-ui;max-width:900px;margin:40px auto;padding:20px}}article{{border-top:1px solid #635779;padding:15px 0}}h2{{font-size:20px}}audio{{width:100%}}a{{color:#d6bdff}}</style>
<h1>Space Dragon sound candidate v002</h1><p>Start at a comfortable volume. These are local licensed derivatives and offline mix previews. This page does not establish Unity playback or listener approval.</p>
<p>First reel: roar, beam, explosion, metal hit, then boost. The two stress previews use the same crowded sequence; the final preview adds a hull alarm at 3 seconds and ducks effects.</p>
{rows}<p><a href="offline-mix-measurements.json">Offline measurements</a> · <a href="measurements.json">Cue provenance and measurements</a></p></html>'''
    outputs[REVIEW / "index.html"] = html.encode()
    for path, body in outputs.items():
        if path.exists() and path.read_bytes() != body:
            raise RuntimeError("Existing review differs; use a new review revision: " + str(path))
    for path, body in outputs.items():
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("xb") as handle:
                handle.write(body)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
