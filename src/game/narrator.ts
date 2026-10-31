/** Browser/OS placeholder narrator. No recordings, microphone, or family voices. */
export function createNarrator(onStatus: (message: string) => void) {
  const supported = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  let enabled = false;
  let current: SpeechSynthesisUtterance | undefined;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  const ready = () => onStatus(!enabled ? 'Sound off · H to hear the prompt' : supported ? 'Placeholder computer narrator' : 'Speech unavailable · captions and adult help available');
  const stop = () => {
    clearTimeout(watchdog);
    current = undefined;
    if (supported) { try { window.speechSynthesis.cancel(); } catch { /* a missing speech service must not stop play */ } }
  };
  const say = (text: string) => {
    stop();
    if (!enabled || !supported) { ready(); return; }
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const english = voices.filter(voice => voice.lang.startsWith('en'));
      utterance.voice = english.find(voice => voice.localService) ?? english[0] ?? voices.find(voice => voice.default) ?? null;
      utterance.lang = utterance.voice?.lang ?? 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      current = utterance;
      utterance.onstart = () => { clearTimeout(watchdog); if (current === utterance) onStatus('Speaking · placeholder computer narrator'); };
      utterance.onend = () => { if (current === utterance) { current = undefined; ready(); } };
      utterance.onerror = event => {
        if (current === utterance && event.error !== 'canceled' && event.error !== 'interrupted') {
          clearTimeout(watchdog);
          current = undefined;
          onStatus('Speech could not play · H to retry, or ask an adult to read along');
        }
      };
      onStatus('Starting the computer narrator…');
      watchdog = setTimeout(() => {
        if (current === utterance) onStatus('If you cannot hear it, press H or ask an adult to read along');
      }, 4000);
      window.speechSynthesis.speak(utterance);
    } catch { onStatus('Speech unavailable · captions and adult help available'); }
  };
  ready();
  return {
    say, stop,
    setEnabled(value: boolean) { enabled = value; if (!value) stop(); ready(); },
    isEnabled: () => enabled,
    isSupported: () => supported,
    isSpeaking: () => { try { return supported && enabled && window.speechSynthesis.speaking; } catch { return false; } },
    dispose() { stop(); },
  };
}
