import type { CharacterId, GameState } from './state';

export const SUIT_CARDS: Record<CharacterId, { name: string; role: string; color: string; icon: string; narration: string }> = {
  paul: { name: 'Paul', role: 'Powered armor', color: '#dca768', icon: '⬡', narration: 'Paul lifts the fallen fence. The pod gives him powered armor. He can help move heavy things. Everybody stays together.' },
  maria: { name: 'Maria', role: 'Purple healer', color: '#b99ce9', icon: '✚', narration: 'Maria protects the family. Her purple healer suit appears. Mama, you are purple! The family is safe.' },
  luke: { name: 'Luke', role: 'Iron Spider inspired suit', color: '#dca58b', icon: '✳', narration: 'Luke sees more lights falling toward town. His suit unfolds extra mechanical arms. I have extra arms! More parts are out there.' },
  luna: { name: 'Luna', role: 'Pink slippery goo', color: '#f4a1c4', icon: '◕', narration: 'Luna splashes into the puddle. Her pink suit makes slippery goo. The pod wakes up with a hum. Luna says, Again!' },
  lyla: { name: 'Lyla', role: 'Information and discoveries', color: '#c1d1df', icon: '◇', narration: 'Lyla looks at the flickering picture. Her suit can scan and store discoveries. Let us help Lyla look closer.' },
};

export function storyContent(state: GameState) {
  switch (state.phase) {
    case 'living-room': return { chapter: '01 / LAUNCH NIGHT', location: 'HOME · LIVING ROOM', title: 'Count down together.',
      caption: 'The family watches a fictional rocket launch at the computer. Ten… nine… something interrupts the stream.',
      prompt: 'Everybody is together at the computer. A rocket is getting ready to launch. Press Space or Enter to watch what happens.', action: 'Watch the launch', icon: '▶' };
    case 'signal': return { chapter: '02 / THE SIGNAL', location: 'HOME · LIVING ROOM', title: 'Something landed outside!',
      caption: 'A broken transmission. A strange symbol. Then a bright streak and a soft whump from the backyard.',
      prompt: 'Something landed in the backyard. Let us go see, together! Press Space or Enter.', action: 'Go see together', icon: '➜' };
    case 'backyard': return { chapter: '03 / THE ARRIVAL', location: 'HOME · BACKYARD', title: 'Stay close, everyone.',
      caption: 'A little pod glows under a fallen fence panel. Nobody is hurt. The same symbol shines on its shell.',
      prompt: 'Everybody stay together. A glowing pod is in the yard. Press Space or Enter to meet the five suits.', action: 'Meet the suits', icon: '✦' };
    case 'suits': {
      const id = (['paul', 'maria', 'luke', 'luna', 'lyla'] as const)[state.suits.length];
      const card = SUIT_CARDS[id];
      return { chapter: `04 / FIVE SUITS · ${state.suits.length + 1} OF 5`, location: 'HOME · BACKYARD', title: `${card.name}'s suit`,
        caption: card.role, prompt: `${card.narration} Press Space or Enter to continue.`, action: state.suits.length === 4 ? 'Help Lyla scan' : 'Meet the next suit', icon: card.icon };
    }
    case 'scan': return { chapter: '05 / FIVE TOGETHER', location: 'THE POD · LYLA’S SCAN', title: 'Find the shimmer.',
      caption: 'The Core is trying to show its own stored dragon design. Use the arrows to point at the shimmering diamond, then scan.',
      prompt: 'The Core is trying to show us something. Lyla, can you scan it? Use the arrows to point at the shimmering diamond. Press Space or Enter to scan. You can press F1 for help.', action: 'Scan together', icon: '◇' };
    case 'archive': return { chapter: '06 / THE FIRST DISCOVERY', location: 'FAMILY ARCHIVE · SYMBOL', title: 'A picture worth keeping.',
      caption: 'Lyla stores the symbol. The Core steadies its incomplete dragon design. It needs parts from around town.',
      prompt: 'Ding! Lyla saved the symbol. The dragon picture was already inside the Core. We did not invent it. Parts are scattered around our town. Press Space or Enter to see the map.', action: 'See our town', icon: '⌁' };
    case 'map': return { chapter: '07 / A DIFFERENT KIND OF MAP', location: 'HOME · PLANNING STATION', title: 'That’s our town.',
      caption: 'The closest signal is at a fictional preschool. Space Blocks is the next adventure. First Contact is complete.',
      prompt: 'That is our town! The nearest signal is at the preschool. The family will go together. You reached the end of First Contact. We will explore Space Blocks next.', action: 'Hear our next adventure', icon: '⌖' };
  }
}

export function hintPrompt(state: GameState): string {
  if (!state.hintLevel) return storyContent(state).prompt;
  if (state.phase === 'signal') return [
    '', 'Look for the glowing door. Press Space or Enter to go outside.',
    'Maria says, stay close, everyone. We can go together. Press Space or Enter.',
    'Let us do it together. The family takes hands. Press Space or Enter once and we will walk out together.',
  ][state.hintLevel];
  return [
    '', 'Look for the pulsing diamond. Use the arrows to point at it, then press Space or Enter.',
    'Lyla points to the shimmer. Ooh, look, look! Find the diamond. You can press F1 again for more help.',
    'Let us do it together. Everybody points at the diamond. Press Space or Enter once and Lyla will scan it for us.',
  ][state.hintLevel];
}
