/** Browser-standard controller input shared by PlayStation, Xbox and other mapped pads.
 *  Gameplay receives semantic actions; raw button numbers stay in this adapter.
 */
export interface CameraInput {
  panX: number;
  panY: number;
  lookX: number;
  lookY: number;
  zoom: number;
}

export type ControllerStatus = 'waiting' | 'connected' | 'unmapped' | 'unavailable';
export type ControllerKind = 'playstation' | 'xbox' | 'generic';

export interface ControllerConnection {
  status: ControllerStatus;
  kind: ControllerKind;
  message: string;
}

type StandardPad = Pick<Gamepad, 'id' | 'mapping' | 'axes' | 'buttons'>;
export interface ControllerSample {
  camera: CameraInput;
  advance: boolean;
}

const DEAD_ZONE = 0.18;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stick(axes: readonly number[], xIndex: number, yIndex: number) {
  const x = Number.isFinite(axes[xIndex]) ? clamp(axes[xIndex], -1, 1) : 0;
  const y = Number.isFinite(axes[yIndex]) ? clamp(axes[yIndex], -1, 1) : 0;
  const magnitude = Math.min(1, Math.hypot(x, y));
  if (magnitude <= DEAD_ZONE) return { x: 0, y: 0 };
  const scale = (magnitude - DEAD_ZONE) / (1 - DEAD_ZONE) / Math.hypot(x, y);
  return { x: x * scale, y: y * scale };
}

function button(pad: StandardPad, index: number) {
  const state = pad.buttons[index];
  return state ? clamp(state.value, 0, 1) : 0;
}

/** Return null rather than guessing the button layout of a non-standard device. */
export function sampleStandardController(pad: StandardPad): ControllerSample | null {
  if (pad.mapping !== 'standard') return null;
  const left = stick(pad.axes, 0, 1);
  const right = stick(pad.axes, 2, 3);
  const dpadX = Number(button(pad, 15) > 0.5) - Number(button(pad, 14) > 0.5);
  const dpadY = Number(button(pad, 13) > 0.5) - Number(button(pad, 12) > 0.5);
  return {
    camera: {
      panX: clamp(left.x + dpadX, -1, 1),
      panY: clamp(left.y + dpadY, -1, 1),
      lookX: right.x,
      lookY: right.y,
      zoom: clamp(button(pad, 7) - button(pad, 6), -1, 1),
    },
    advance: button(pad, 0) > 0.5, // Cross on PlayStation, A on Xbox.
  };
}

export function controllerKind(id: string): ControllerKind {
  if (/dualsense|dualshock|playstation|wireless controller|sony|054c/i.test(id)) return 'playstation';
  if (/xbox|xinput|045e/i.test(id)) return 'xbox';
  return 'generic';
}

function connectedMessage(kind: ControllerKind) {
  const action = kind === 'playstation' ? '✕' : kind === 'xbox' ? 'A' : 'Primary button';
  return `Controller connected · ${action} continue · Left stick pan · Right stick look · L2/R2 zoom`;
}

export function createControllerInput(options: {
  onAdvance: () => void;
  onCamera: (input: CameraInput, deltaSeconds: number) => void;
  onStatus: (connection: ControllerConnection) => void;
  isActive?: () => boolean;
}) {
  let activeIndex: number | null = null;
  let lastPressed = false;
  let lastTime: number | undefined;
  let animationFrame = 0;
  let disposed = false;
  let needsNeutral = true;
  let connection: ControllerConnection = {
    status: 'waiting', kind: 'generic',
    message: 'Plug in a PlayStation controller, then press ✕ to connect.',
  };

  const publish = (next: ControllerConnection) => {
    if (next.status !== connection.status || next.kind !== connection.kind || next.message !== connection.message) {
      connection = next;
      options.onStatus(next);
    }
  };
  options.onStatus(connection);

  const tick = (now: number) => {
    if (disposed) return;
    const deltaSeconds = lastTime === undefined ? 0 : clamp((now - lastTime) / 1000, 0, 0.05);
    lastTime = now;

    if (typeof navigator.getGamepads !== 'function') {
      activeIndex = null;
      lastPressed = false;
      publish({ status: 'unavailable', kind: 'generic', message: 'This browser cannot read controllers. Keyboard and mouse still work.' });
    } else {
      let pads: (Gamepad | null)[] = [];
      try { pads = Array.from(navigator.getGamepads()); } catch { /* Browser may deny access. */ }
      let pad = activeIndex === null ? null : pads[activeIndex];
      if (!pad?.connected || pad.mapping !== 'standard') {
        pad = pads.find(candidate => candidate?.connected && candidate.mapping === 'standard') ?? null;
      }
      if (pad?.connected) {
        const kind = controllerKind(pad.id);
        if (activeIndex !== pad.index) { lastPressed = false; needsNeutral = true; }
        activeIndex = pad.index;
        publish({ status: 'connected', kind, message: connectedMessage(kind) });
        const sample = sampleStandardController(pad);
        const pressed = sample?.advance ?? false;
        const active = !document.hidden && (options.isActive?.() ?? true);
        const neutral = !pressed && sample && Object.values(sample.camera).every(value => value === 0);
        if (!active) needsNeutral = true;
        if (active && neutral) needsNeutral = false;
        // Never synthesize repeated actions or resume held movement after a
        // pause, dialog, disconnect or mode change. Release to re-arm.
        if (active && !needsNeutral) {
          if (pressed && !lastPressed) options.onAdvance();
          if (sample) options.onCamera(sample.camera, deltaSeconds);
        }
        lastPressed = pressed;
      } else {
        activeIndex = null;
        lastPressed = false;
        const anyPad = pads.some(candidate => candidate?.connected);
        publish(anyPad
          ? { status: 'unmapped', kind: 'generic', message: 'Controller detected, but this browser has no standard mapping. Use keyboard/mouse.' }
          : { status: 'waiting', kind: 'generic', message: 'Plug in a PlayStation controller, then press ✕ to connect.' });
      }
    }
    animationFrame = window.requestAnimationFrame(tick);
  };
  animationFrame = window.requestAnimationFrame(tick);

  return {
    snapshot: () => ({ ...connection, armed: !needsNeutral, advanceHeld: lastPressed }),
    reset() { needsNeutral = true; },
    dispose() { disposed = true; window.cancelAnimationFrame(animationFrame); },
  };
}

/** Town Drive Lab uses the same standard adapter and retains analog trigger values. */
export interface DriveControllerSample {
  throttle: number; brake: number; steer: number; handbrake: boolean;
  reset: boolean; camera: boolean; pause: boolean;
}
export function sampleDriveController(pad: StandardPad): DriveControllerSample | null {
  if (pad.mapping !== 'standard') return null;
  return {
    throttle: button(pad, 7), brake: button(pad, 6), steer: stick(pad.axes, 0, 1).x,
    handbrake: button(pad, 0) > 0.5, reset: button(pad, 3) > 0.5,
    camera: button(pad, 5) > 0.5, pause: button(pad, 9) > 0.5,
  };
}
