import { sampleDriveController } from '../gamepad.ts';
import type { DriveControllerSample } from '../gamepad.ts';
import { EMPTY_DRIVE_INPUT } from './simulation.ts';
import type { DriveInput } from './simulation.ts';

export interface DriveCallbacks { pause(): void; reset(): void; camera(): void; map(): void; tuning(): void; }
const HELD = new Set(['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown', 'KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight', 'Space']);
const ACTIONS: Record<string, keyof DriveCallbacks> = { Escape: 'pause', KeyR: 'reset', KeyC: 'camera', KeyM: 'map', F2: 'tuning' };
export function createDriveInput(target: Window, callbacks: DriveCallbacks) {
  const keys = new Set<string>();
  let neutralRequired = false;
  let previous: DriveControllerSample | null = null;
  const release = () => { keys.clear(); neutralRequired = true; previous = null; };
  const keydown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.target instanceof HTMLElement && event.target.matches('input,textarea,select,[contenteditable=true]') && !['Escape', 'F2'].includes(event.code)) return;
    if (!HELD.has(event.code) && !(event.code in ACTIONS)) return;
    event.preventDefault();
    if (HELD.has(event.code)) { if (!event.repeat) keys.add(event.code); }
    else if (!event.repeat) callbacks[ACTIONS[event.code]]();
  };
  const keyup = (event: KeyboardEvent) => keys.delete(event.code);
  const blur = () => { release(); };
  const visibility = () => { if (target.document.hidden) release(); };
  target.addEventListener('keydown', keydown);
  target.addEventListener('keyup', keyup);
  target.addEventListener('blur', blur);
  target.document.addEventListener('visibilitychange', visibility);
  const pressed = (...codes: string[]) => codes.some(code => keys.has(code));
  return {
    release,
    /** Call even while paused so a newly pressed Options button can resume. */
    sample(active = true): DriveInput {
      let pad: DriveControllerSample | null = null;
      try {
        const connected = Array.from(target.navigator.getGamepads?.() ?? []).find(candidate => candidate?.connected && candidate.mapping === 'standard');
        if (connected) pad = sampleDriveController(connected);
      } catch { /* Keyboard remains available if controller access is denied. */ }
      if (pad) {
        const neutral = pad.throttle === 0 && pad.brake === 0 && pad.steer === 0 && !pad.handbrake && !pad.reset && !pad.camera && !pad.pause;
        if (neutral) neutralRequired = false;
        // Actions use rising edges, including after pause. Movement requires all controls released.
        if (!neutralRequired) {
          if (pad.pause && !previous?.pause) callbacks.pause();
          if (active && pad.reset && !previous?.reset) callbacks.reset();
          if (active && pad.camera && !previous?.camera) callbacks.camera();
        }
      } else { neutralRequired = false; }
      previous = pad;
      if (!active || target.document.hidden) return { ...EMPTY_DRIVE_INPUT };
      const usable = !neutralRequired ? pad : null;
      return {
        throttle: Math.max(Number(pressed('KeyW', 'ArrowUp')), usable?.throttle ?? 0),
        brake: Math.max(Number(pressed('KeyS', 'ArrowDown')), usable?.brake ?? 0),
        steer: pressed('KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight')
          ? Number(pressed('KeyD', 'ArrowRight')) - Number(pressed('KeyA', 'ArrowLeft')) : usable?.steer ?? 0,
        handbrake: pressed('Space') || (usable?.handbrake ?? false),
      };
    },
    dispose() {
      release(); target.removeEventListener('keydown', keydown); target.removeEventListener('keyup', keyup);
      target.removeEventListener('blur', blur); target.document.removeEventListener('visibilitychange', visibility);
    },
  };
}
