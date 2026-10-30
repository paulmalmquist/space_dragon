// Opt-in device speech only. Do not use remote voices or imitate family members.
export function createNarration(report: (message: string) => void) {
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : undefined;
  let generation = 0;
  function stop() { generation++; synth?.cancel(); }
  function speak(prompt: string) {
    stop();
    const voice = synth?.getVoices().find(item => item.localService && item.lang === 'en-US')
      ?? synth?.getVoices().find(item => item.localService && item.lang.startsWith('en'));
    if (!synth || !voice || !('SpeechSynthesisUtterance' in window)) {
      report('Device voice is unavailable. The instruction is shown above; Help together can finish the scan.');
      return;
    }
    const token = generation;
    const utterance = new SpeechSynthesisUtterance(prompt);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.9;
    utterance.onend = () => { if (token === generation) report('Instruction finished. Hear it again whenever you like.'); };
    utterance.onerror = () => { if (token === generation) report('Device voice could not play. The instruction stays on screen.'); };
    report('Reading the instruction…');
    try { synth.speak(utterance); } catch { report('Device voice could not play. The instruction stays on screen.'); }
  }
  return { speak, stop };
}
