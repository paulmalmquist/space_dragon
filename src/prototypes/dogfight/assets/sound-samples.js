// Edited local Sonniss recordings. Provenance: assets/source/audio/sonniss-gdc-2026/.
export const SAMPLE_FILES = Object.freeze({
  roar: 'dragon-roar-v001.wav', breath: 'fire-breath-v001.wav',
  disable: 'machine-blast-v001.wav', hurt: 'metal-impact-v001.wav', boost: 'jet-surge-v001.wav',
});
export const SAMPLE_CUES = Object.freeze({
  roar: { id: 'roar', duration: .8, gain: .48 },
  breath: { id: 'breath', duration: 1.15, gain: .48 },
  disable: { id: 'disable', duration: 1.7, gain: .48 },
  crash: { id: 'disable', duration: 1.7, gain: .55 },
  hurt: { id: 'hurt', duration: .48, gain: .4 },
  boost: { id: 'boost', duration: .7, gain: .38 },
  acceleration: { id: 'boost', duration: .7, gain: .24 },
});
export async function loadSoundSample(context, filename, signal) {
  const base = import.meta.env?.BASE_URL || '/space-dragon/';
  const response = await fetch(`${base}assets/audio/sonniss-gdc-2026/${filename}`, { signal });
  if (!response.ok) throw new Error(`Sound asset HTTP ${response.status}`);
  return context.decodeAudioData(await response.arrayBuffer());
}
