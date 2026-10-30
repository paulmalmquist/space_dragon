// Reversible staging of Act I's proposed contributions; this does not approve later lore.
export const FAMILY = [
  { id: 'paul', name: 'Paul', role: 'Powered armor', glyph: '⬡', color: '#b4c7d9',
    title: 'A little help with the heavy lifting.', prompt: 'Help Paul lift the fallen panel.',
    copy: 'The pod supplies five suits. Paul braces the panel so everyone can reach the equipment.', action: 'Lift the panel', result: 'The panel is clear. Everyone can reach the pod.' },
  { id: 'maria', name: 'Maria', role: 'Healing & protection', glyph: '✚', color: '#bc8ee9',
    title: 'Everyone stays together.', prompt: 'Help Maria restore the suits’ energy.',
    copy: 'Maria’s purple suit sends a gentle pulse through the group. The flickering equipment steadies.', action: 'Restore energy', result: 'The suits are steady. The family is ready to help.' },
  { id: 'luke', name: 'Luke', role: 'Climbing & tether', glyph: '⌁', color: '#b4c7d9',
    title: 'Luke can reach it.', prompt: 'Help Luke tether the high antenna.',
    copy: 'A fitting is out of reach. Luke aims his suit’s tether at the anchor and brings the antenna into place.', action: 'Tether the antenna', result: 'Luke’s tether holds the antenna in place.' },
  { id: 'luna', name: 'Luna', role: 'Slippery goo', glyph: '≈', color: '#ee92c6',
    title: 'A very slippery solution.', prompt: 'Help Luna free the stuck rail with goo.',
    copy: 'The lower rail is stuck. A little pink goo lets it slide open without anybody pulling harder.', action: 'Free the rail', result: 'The rail slides open. Luna has made a path.' },
  { id: 'lyla', name: 'Lyla', role: 'Scan & remember', glyph: '◇', color: '#b4c7d9',
    title: 'Keep the part we can hear.', prompt: 'Help Lyla find the pod’s signal.',
    copy: 'Lyla finds the same symbol that appeared on the computer. Her suit can preserve it for the family.', action: 'Find the signal', result: 'Lyla has found the signal. One scan will keep it safe.' },
] as const;
export type CharacterId = typeof FAMILY[number]['id'];
export type Step = 'computer' | 'backyard' | 'pod' | 'suits' | 'scan' | 'map';
export interface Checkpoint {
  version: 2;
  step: Step;
  demonstrated: number;
  scan: 'pending' | 'direct' | 'assisted';
  scanHelp: boolean;
}
export const initialCheckpoint = (): Checkpoint => ({ version: 2, step: 'computer', demonstrated: 0, scan: 'pending', scanHelp: false });
export type Action =
  | { type: 'advance'; from: Step }
  | { type: 'demonstrate'; character: CharacterId }
  | { type: 'skip-demonstrations' }
  | { type: 'hint' }
  | { type: 'scan'; assisted: boolean };

export function transition(state: Checkpoint, action: Action): Checkpoint {
  if (action.type === 'advance' && action.from === state.step) {
    const next = { computer: 'backyard', backyard: 'pod', pod: 'suits' } as const;
    if (state.step in next) return { ...state, step: next[state.step as keyof typeof next] };
  }
  if (action.type === 'demonstrate' && state.step === 'suits' && FAMILY[state.demonstrated]?.id === action.character) {
    const demonstrated = state.demonstrated + 1;
    return { ...state, demonstrated, step: demonstrated === FAMILY.length ? 'scan' : 'suits' };
  }
  if (action.type === 'skip-demonstrations' && state.step === 'suits') return { ...state, demonstrated: FAMILY.length, step: 'scan' };
  if (action.type === 'hint' && state.step === 'scan' && !state.scanHelp) return { ...state, scanHelp: true };
  if (action.type === 'scan' && state.step === 'scan') return {
    ...state, step: 'map', scanHelp: state.scanHelp || action.assisted,
    scan: state.scanHelp || action.assisted ? 'assisted' : 'direct',
  };
  return state;
}

// Deriving unique rewards from validated progress makes replay and repeated input idempotent.
export function rewards(state: Checkpoint): string[] {
  if (!['suits', 'scan', 'map'].includes(state.step)) return [];
  return [...FAMILY.map(member => `suit_${member.id}`), ...(state.step === 'map' ? ['archive_card_symbol'] : [])];
}

export function validateCheckpoint(value: unknown): Checkpoint | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.version !== 2 || typeof v.step !== 'string' || !['computer', 'backyard', 'pod', 'suits', 'scan', 'map'].includes(v.step) ||
      !Number.isInteger(v.demonstrated) || typeof v.demonstrated !== 'number' || typeof v.scanHelp !== 'boolean' ||
      typeof v.scan !== 'string' || !['pending', 'direct', 'assisted'].includes(v.scan)) return null;
  const early = ['computer', 'backyard', 'pod'].includes(v.step);
  if (early && (v.demonstrated !== 0 || v.scan !== 'pending' || v.scanHelp)) return null;
  if (v.step === 'suits' && (v.demonstrated < 0 || v.demonstrated >= FAMILY.length || v.scan !== 'pending' || v.scanHelp)) return null;
  if (['scan', 'map'].includes(v.step) && v.demonstrated !== FAMILY.length) return null;
  if (v.step === 'scan' && v.scan !== 'pending') return null;
  if (v.step === 'map' && (v.scan === 'pending' || (v.scan === 'assisted') !== v.scanHelp)) return null;
  return { version: 2, step: v.step as Step, demonstrated: v.demonstrated, scan: v.scan as Checkpoint['scan'], scanHelp: v.scanHelp };
}

export interface StoryCard { chapter: string; location: string; title: string; copy: string; action: string; prompt: string; }
export function storyCard(state: Checkpoint): StoryCard {
  if (state.step === 'suits') {
    const member = FAMILY[state.demonstrated]!;
    return { ...member, chapter: `04 / FIVE SUITS · ${state.demonstrated + 1} OF 5`, location: 'HOME / BACKYARD' };
  }
  return {
    computer: { chapter: '01 / THE SIGNAL', location: 'HOME / LIVING ROOM', title: 'That wasn’t on the screen a moment ago.',
      copy: 'Paul and Luke are at the computer. A broken transmission flickers into view. Then a bright streak passes the window.', action: 'Follow the signal →', prompt: 'Something landed in the backyard. Let’s go see, together.' },
    backyard: { chapter: '02 / THE ARRIVAL', location: 'HOME / BACKYARD', title: 'Something has landed.',
      copy: 'A strange pod rests in the yard. The same symbol glows on its shell. The family approaches together.', action: 'Investigate the pod →', prompt: 'The family is together. Investigate the glowing pod.' },
    pod: { chapter: '03 / FIRST CONTACT', location: 'HOME / BACKYARD', title: 'The message is only the beginning.',
      copy: 'The pod carries an unfinished dragon design and equipment for a rescue crew. Earth was in range. Whoever sent this did not choose our family.', action: 'Discover the suits →', prompt: 'Open the pod’s equipment. There is a suit for each of us.' },
    scan: { chapter: '05 / FIVE TOGETHER', location: 'HOME / BACKYARD', title: 'One signal. Five helping hands.',
      copy: 'The equipment is steady. Lyla can now save the symbol and the broken message. We still need the scattered parts to understand the whole SOS.', action: 'Scan the signal ◇', prompt: 'Lyla, scan the glowing diamond to save the signal.' },
    map: { chapter: '06 / A DIFFERENT KIND OF MAP', location: 'HOME / PLANNING STATION', title: 'Our first signal is close to home.',
      copy: 'Lyla’s archive holds the symbol. The next signal leads to a familiar preschool. First we recover the pieces on Earth. Then we can choose to answer the SOS.', action: 'First Contact complete ✓', prompt: 'The signal is saved. Our first expedition will be Space Blocks at the preschool.' },
  }[state.step];
}

// Briefing only: these proposed retrievals are not playable destinations yet.
export const TOWN_ROUTE = [
  ['Space Blocks', 'Preschool', 'Assembly'], ['Rooftop Stars', 'School', 'Navigation'],
  ['Heavy Haul', 'Warehouse store', 'Power'], ['The Passenger', 'Grocery', 'Life support'],
  ['Parking Lot Chase', 'Big-box store', 'Wing control'], ['Countdown', 'Rocket facility', 'Propulsion'],
] as const;
