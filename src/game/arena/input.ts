/**
 * Keyboard and controller input for Luke's Arena, reduced to what the rules understand.
 * Held values are sampled each frame; presses are counted so a quick tap is never lost
 * between two slow frames. Raw key names and button numbers stay in this file.
 */
export interface ArenaControls {
  forward: number; right: number;
  jump: boolean; power: boolean; action: boolean; pounce: boolean;
  /** Camera turn and tilt, -1 to 1. */
  lookX: number; lookY: number;
}
export interface ArenaPadSample extends ArenaControls { pause: boolean; }
export interface ArenaPresses { jump: number; action: number; pounce: number; }
type StandardPad = Pick<Gamepad, 'mapping' | 'axes' | 'buttons'>;

const DEAD_ZONE = 0.18;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
function stick(axes: readonly number[], xIndex: number, yIndex: number) {
  const x = Number.isFinite(axes[xIndex]) ? clamp(axes[xIndex], -1, 1) : 0;
  const y = Number.isFinite(axes[yIndex]) ? clamp(axes[yIndex], -1, 1) : 0;
  const magnitude = Math.min(1, Math.hypot(x, y));
  if (magnitude <= DEAD_ZONE) return { x: 0, y: 0 };
  const scale = (magnitude - DEAD_ZONE) / (1 - DEAD_ZONE) / Math.hypot(x, y);
  return { x: x * scale, y: y * scale };
}
const pressed = (pad: StandardPad, index: number) => (pad.buttons[index]?.value ?? 0) > 0.4;

/**
 * Standard-mapped controllers only; anything else returns null rather than guessing a layout.
 * Left stick or d-pad moves, right stick looks, A/Cross jumps, X/Square or B/Circle is the
 * one-button action, Y/Triangle pounces, either trigger or bumper is suit power.
 */
export function sampleArenaPad(pad: StandardPad): ArenaPadSample | null {
  if (pad.mapping !== 'standard') return null;
  const left = stick(pad.axes, 0, 1), right = stick(pad.axes, 2, 3);
  const dpadX = Number(pressed(pad, 15)) - Number(pressed(pad, 14));
  const dpadY = Number(pressed(pad, 12)) - Number(pressed(pad, 13));
  return {
    forward: clamp(-left.y + dpadY, -1, 1), right: clamp(left.x + dpadX, -1, 1),
    jump: pressed(pad, 0), action: pressed(pad, 2) || pressed(pad, 1), pounce: pressed(pad, 3),
    power: pressed(pad, 4) || pressed(pad, 5) || pressed(pad, 6) || pressed(pad, 7),
    lookX: right.x, lookY: right.y, pause: pressed(pad, 9),
  };
}

const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
const ACTION_KEYS = ['f', 'j', 'enter'];
const POUNCE_KEYS = ['g', 'k'];

export function createArenaInput(target: Window, hooks: { pause(): void; recenter(): void; help(): void }) {
  const held = new Set<string>();
  const presses: ArenaPresses = { jump: 0, action: 0, pounce: 0 };
  let padBefore = { jump: false, action: false, pounce: false, pause: false };
  let padConnected = false;
  const editing = (event: KeyboardEvent) => (event.target as HTMLElement | null)?.closest?.('input,textarea,select,[contenteditable="true"]');
  const onButton = (event: KeyboardEvent) => Boolean((event.target as HTMLElement | null)?.closest?.('button,a'));
  const keydown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || editing(event)) return;
    const key = event.key.toLowerCase();
    // Space and Enter belong to a focused button or link.
    if ((key === ' ' || key === 'enter') && onButton(event)) return;
    const known = MOVE_KEYS.includes(key) || ACTION_KEYS.includes(key) || POUNCE_KEYS.includes(key) || [' ', 'shift', 'q', 'e', 'r', 'escape', 'p', 'h', 'f1'].includes(key);
    if (!known) return;
    if (key !== 'shift') event.preventDefault();
    if (event.repeat) return;
    if (key === 'escape' || key === 'p') { hooks.pause(); return; }
    if (key === 'h' || key === 'f1') { hooks.help(); return; }
    if (key === 'r') { hooks.recenter(); return; }
    held.add(key);
    if (key === ' ') presses.jump++;
    if (ACTION_KEYS.includes(key)) presses.action++;
    if (POUNCE_KEYS.includes(key)) presses.pounce++;
  };
  const keyup = (event: KeyboardEvent) => { held.delete(event.key.toLowerCase()); };
  target.addEventListener('keydown', keydown);
  target.addEventListener('keyup', keyup);
  const has = (...keys: string[]) => keys.some(key => held.has(key));

  return {
    /** Held controls for this frame. When `active` is false everything reads as released. */
    sample(active: boolean): ArenaControls {
      let pad: ArenaPadSample | null = null;
      if (typeof navigator.getGamepads === 'function') {
        try { for (const candidate of navigator.getGamepads()) { if (candidate?.connected) { pad = sampleArenaPad(candidate); if (pad) break; } } } catch { /* The browser may deny access. */ }
      }
      padConnected = pad !== null;
      if (pad) {
        // Rising edges become presses, exactly like key taps.
        if (active) {
          if (pad.jump && !padBefore.jump) presses.jump++;
          if (pad.action && !padBefore.action) presses.action++;
          if (pad.pounce && !padBefore.pounce) presses.pounce++;
        }
        if (pad.pause && !padBefore.pause) hooks.pause();
        padBefore = { jump: pad.jump, action: pad.action, pounce: pad.pounce, pause: pad.pause };
      } else padBefore = { jump: false, action: false, pounce: false, pause: false };
      if (!active) return { forward: 0, right: 0, jump: false, power: false, action: false, pounce: false, lookX: 0, lookY: 0 };
      const forward = Number(has('w', 'arrowup')) - Number(has('s', 'arrowdown')), right = Number(has('d', 'arrowright')) - Number(has('a', 'arrowleft'));
      return {
        forward: clamp(forward + (pad?.forward ?? 0), -1, 1), right: clamp(right + (pad?.right ?? 0), -1, 1),
        jump: has(' ') || pad?.jump === true, power: has('shift') || pad?.power === true,
        action: has(...ACTION_KEYS) || pad?.action === true, pounce: has(...POUNCE_KEYS) || pad?.pounce === true,
        lookX: clamp(Number(has('e')) - Number(has('q')) + (pad?.lookX ?? 0), -1, 1), lookY: pad?.lookY ?? 0,
      };
    },
    /** Presses since the last call. */
    takePresses(): ArenaPresses { const taken = { ...presses }; presses.jump = presses.action = presses.pounce = 0; return taken; },
    release() { held.clear(); presses.jump = presses.action = presses.pounce = 0; },
    get controller() { return padConnected; },
    dispose() { target.removeEventListener('keydown', keydown); target.removeEventListener('keyup', keyup); },
  };
}
