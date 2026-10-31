/** First Contact rules. This module has no renderer, DOM, timer, or storage dependency. */
export const SUIT_ORDER = ['paul', 'maria', 'luke', 'luna', 'lyla'] as const;
export type CharacterId = typeof SUIT_ORDER[number];
export const PHASES = ['living-room', 'signal', 'backyard', 'suits', 'scan', 'archive', 'map'] as const;
export type Phase = typeof PHASES[number];
export type HintLevel = 0 | 1 | 2 | 3;
export type CheckpointId = 'cp_a1_00_living_room' | 'cp_a1_01_backyard' | 'cp_a1_02_suits' | 'cp_a1_03_map';

export interface GameState {
  version: 2;
  phase: Phase;
  /** Stable character IDs represent suit ownership, independent of card text/art. */
  suits: CharacterId[];
  checkpointId: CheckpointId;
  hintLevel: HintLevel;
  flags: {
    signalSeen: boolean;
    backyardReached: boolean;
    coreAwake: boolean;
    archiveCardSymbol: boolean;
    mapRevealed: boolean;
    missionPreschoolAvailable: boolean;
  };
  /** Gameplay assistance only. This scan does not assess reading or record mastery. */
  scanAssisted: boolean;
}

export type StoryAction =
  | { type: 'next' | 'skip'; from: Phase; suit?: CharacterId }
  | { type: 'scan'; from: 'scan' }
  | { type: 'help'; from: Phase }
  | { type: 'replay' };

function checkpointFor(phase: Phase): CheckpointId {
  if (phase === 'archive') return 'cp_a1_02_suits';
  if (phase === 'map') return 'cp_a1_03_map';
  return phase === 'living-room' || phase === 'signal' ? 'cp_a1_00_living_room' : 'cp_a1_01_backyard';
}

export function createInitialState(): GameState {
  return {
    version: 2, phase: 'living-room', suits: [], checkpointId: 'cp_a1_00_living_room', hintLevel: 0,
    flags: { signalSeen: false, backyardReached: false, coreAwake: false, archiveCardSymbol: false, mapRevealed: false, missionPreschoolAvailable: false },
    scanAssisted: false,
  };
}

/** Returns the exact current intent, including a suit-card token that rejects stale events. */
export function nextAction(state: GameState): StoryAction {
  if (state.phase === 'map') return { type: 'replay' };
  if (state.phase === 'scan') return { type: 'scan', from: 'scan' };
  if (state.phase === 'suits') return { type: 'next', from: 'suits', suit: SUIT_ORDER[state.suits.length] };
  return { type: 'next', from: state.phase };
}

function enter(state: GameState, phase: Phase, suits = state.suits): GameState {
  return {
    ...state, phase, suits: [...suits], checkpointId: checkpointFor(phase), hintLevel: 0,
    flags: {
      ...state.flags,
      signalSeen: phase !== 'living-room',
      backyardReached: phase !== 'living-room' && phase !== 'signal',
      coreAwake: suits.length >= 4,
      mapRevealed: phase === 'map',
      missionPreschoolAvailable: phase === 'map',
    },
  };
}

function completeScan(state: GameState, skipped = false): GameState {
  const result = enter(state, 'archive');
  result.flags.archiveCardSymbol = true;
  result.scanAssisted = skipped || state.hintLevel > 0;
  return result;
}

/** Validates semantic intent before changing progress. Replays and stale rewards are no-ops. */
export function transition(state: GameState, action: StoryAction): GameState {
  if (action.type === 'replay' || action.from !== state.phase) return state;
  if (action.type === 'help') {
    if (!['signal', 'scan'].includes(state.phase) || state.hintLevel === 3) return state;
    return { ...state, hintLevel: (state.hintLevel + 1) as HintLevel };
  }
  if (action.type === 'scan') return state.phase === 'scan' ? completeScan(state) : state;
  switch (state.phase) {
    case 'living-room': return enter(state, 'signal');
    case 'signal': return enter(state, 'backyard');
    case 'backyard': return enter(state, 'suits');
    case 'suits': {
      const suit = SUIT_ORDER[state.suits.length];
      if (!suit || action.suit !== suit) return state;
      const suits = [...state.suits, suit];
      return enter(state, suits.length === SUIT_ORDER.length ? 'scan' : 'suits', suits);
    }
    case 'scan': return action.type === 'skip' ? completeScan(state, true) : state;
    case 'archive': return enter(state, 'map');
    case 'map': return state;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Strict progress invariants prevent a syntactically valid save from inventing rewards. */
export function isGameState(value: unknown): value is GameState {
  if (!record(value) || value.version !== 2 || typeof value.phase !== 'string' ||
      !PHASES.includes(value.phase as Phase) || !Array.isArray(value.suits) ||
      !Number.isInteger(value.hintLevel) || ![0, 1, 2, 3].includes(value.hintLevel as number) ||
      typeof value.scanAssisted !== 'boolean' || !record(value.flags)) return false;
  const phase = value.phase as Phase;
  const suits = value.suits;
  const flags = value.flags;
  if (suits.length > SUIT_ORDER.length || SUIT_ORDER.slice(0, suits.length).some((suit, index) => suits[index] !== suit)) return false;
  const suitCountValid = phase === 'suits' ? suits.length < 5 :
    ['scan', 'archive', 'map'].includes(phase) ? suits.length === 5 : suits.length === 0;
  if (!suitCountValid || value.checkpointId !== checkpointFor(phase)) return false;
  if (!['signal', 'scan'].includes(phase) && value.hintLevel !== 0) return false;
  const scanned = phase === 'archive' || phase === 'map';
  if (!scanned && value.scanAssisted) return false;
  const expected = {
    signalSeen: phase !== 'living-room',
    backyardReached: phase !== 'living-room' && phase !== 'signal',
    coreAwake: suits.length >= 4,
    archiveCardSymbol: scanned,
    mapRevealed: phase === 'map',
    missionPreschoolAvailable: phase === 'map',
  };
  return Object.entries(expected).every(([key, flag]) => flags[key] === flag);
}

/** Copy only the current schema; unknown input keys never enter authoritative game state. */
export function copyGameState(state: GameState): GameState {
  return {
    version: 2, phase: state.phase, suits: [...state.suits], checkpointId: state.checkpointId,
    hintLevel: state.hintLevel, flags: {
      signalSeen: state.flags.signalSeen, backyardReached: state.flags.backyardReached,
      coreAwake: state.flags.coreAwake, archiveCardSymbol: state.flags.archiveCardSymbol,
      mapRevealed: state.flags.mapRevealed, missionPreschoolAvailable: state.flags.missionPreschoolAvailable,
    }, scanAssisted: state.scanAssisted,
  };
}
