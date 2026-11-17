import './style.css';
import { createArenaView } from './arena-view';
import { ARENA, ARENA_EVENT, ARENA_LAYOUT, ROBOT_PROFILES, STAR_MAX, actionFor, createArena, emptyProgress, sidekickFor, stepArena } from './arena';
import type { ActionKind, ArenaState } from './arena';
import { LUKE_ARENA, PICKUPS } from './arena-world';
import type { TrialId } from './arena-world';
import { loadArena, resetArena, saveArena } from './arena-save';
import { createArenaInput } from './input';
import { createHeroAudio } from '../hero/hero-audio';
import { createHero, selectAnchor, settleHero, travelDirection } from '../traversal/hero';
import { MAX_FRAME_SECONDS, TRAVERSAL_STEP, TUNING } from '../traversal/tuning';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const ICON: Record<TrialId | ActionKind, string> = {
  course: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 34 24 24l10 10M14 24l10-10 10 10" /></svg>',
  ring: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="11" y="16" width="26" height="21" rx="5"/><path d="M24 16V8"/><circle cx="19" cy="26" r="2.4" class="fill"/><circle cx="29" cy="26" r="2.4" class="fill"/></svg>',
  stealth: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 24q17-17 34 0-17 17-34 0Z"/><circle cx="24" cy="24" r="4" class="fill"/><path d="M11 38 37 10"/></svg>',
  none: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="12" stroke-dasharray="4 6"/></svg>',
  snare: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 38 28 18"/><circle cx="33" cy="14" r="7"/></svg>',
  pounce: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 34Q22 2 38 30"/><path d="m30 28 8 3 2-9"/></svg>',
  quiet: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 34Q22 2 38 30"/><path d="m30 28 8 3 2-9"/><path d="M10 12h6M13 9v6" /></svg>',
};
/** The sidekick button: what it would do now, or why it would do nothing. */
type BuddyHint = 'oop' | 'stun' | 'wait' | 'rest' | 'none';
const BUDDY_ICON: Record<BuddyHint, string> = {
  // A small figure thrown up from cupped hands.
  oop: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 30V8M15 17l9-9 9 9"/><path d="M9 34q15 12 30 0"/></svg>',
  // A star: dizzy.
  stun: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m24 7 5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z"/></svg>',
  // An eye: keeping watch at the gate.
  wait: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 24q17-17 34 0-17 17-34 0Z"/><circle cx="24" cy="24" r="4" class="fill"/></svg>',
  rest: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="13"/><path d="M24 15v9l6 4"/></svg>',
  none: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="15" r="6"/><path d="M11 40q0-14 13-14t13 14"/></svg>',
};
const BUDDY_LABEL: Record<BuddyHint, string> = { oop: 'Throw me!', stun: 'Stun', wait: 'On watch', rest: 'Resting', none: 'Dad' };
const TRIAL_NAME: Record<TrialId, string> = { course: 'Ability course', ring: 'Battle ring', stealth: 'Stealth yard' };
const stars = (id: string, label: string) => `<span class="star-row" id="${id}" role="img" aria-label="${label}">${'<i>★</i>'.repeat(STAR_MAX)}</span>`;

document.querySelector('#app')!.innerHTML = `<div class="arena-shell" id="shell">
  <canvas id="arena-canvas" aria-label="Luke's Arena: a training yard with an ability course, a battle ring and a stealth yard" tabindex="0"></canvas>
  <div class="arena-vignette" id="vignette" aria-hidden="true"></div>
  <header class="arena-top">
    <a class="arena-brand" href="${import.meta.env.BASE_URL}">✧ SPACE DRAGON</a>
    <div class="arena-title"><h1>Luke's Arena</h1><p id="place">TRAINING YARD</p></div>
    <span class="spacer"></span>
    <div class="arena-total" id="total" role="img" aria-label="0 of 9 stars">
      ${(['course', 'ring', 'stealth'] as const).map(trial => `<span class="total-group trial-${trial}">${ICON[trial]}${stars(`total-${trial}`, `${TRIAL_NAME[trial]}: 0 of 3 stars`)}</span>`).join('')}
    </div>
    <button class="arena-button" id="help" aria-label="How to play">?</button>
    <button class="arena-button" id="pause">Ⅱ Pause</button>
  </header>
  <section class="arena-trial" id="trial" hidden aria-live="off">
    <span class="trial-icon" id="trial-icon"></span>
    ${stars('trial-stars', 'Stars still possible this try')}
    <span class="trial-meter" id="trial-meter"></span>
    <span class="trial-clock" id="trial-clock"></span>
  </section>
  <p class="arena-status" id="status" role="status" aria-live="polite"></p>
  <div class="arena-toast" id="toast" hidden></div>
  <div class="arena-bottom">
    <div class="energy" id="energy" role="img" aria-label="Suit energy 4 of 4">${'<i></i>'.repeat(ARENA.energyMax)}</div>
    <div class="ability" id="ability-action" data-kind="none"><kbd>F</kbd><span class="ability-icon" id="action-icon">${ICON.none}</span><em id="action-label">Action</em><b class="cooldown" id="action-cooldown"></b></div>
    <div class="ability" id="ability-pounce"><kbd>G</kbd><span class="ability-icon">${ICON.pounce}</span><em>Pounce</em><b class="cooldown" id="pounce-cooldown"></b></div>
    <div class="ability buddy" id="ability-sidekick" data-hint="none"><kbd>T</kbd><span class="ability-icon" id="sidekick-icon">${BUDDY_ICON.none}</span><em id="sidekick-label">Dad</em><b class="cooldown" id="sidekick-cooldown"></b></div>
  </div>
  <div class="arena-controls" id="controls">WASD · MOVE &nbsp; SPACE · JUMP &nbsp; SHIFT · SPRINT / SWING &nbsp; F · ACTION &nbsp; G · POUNCE &nbsp; T · DAD &nbsp; Q / E OR DRAG · LOOK &nbsp; ESC · PAUSE</div>
  <div class="arena-overlay" id="welcome"><div class="arena-card">
    <div class="eyebrow">ABILITY LAB / 03</div>
    <h2>Luke's Arena</h2>
    <p>Three places to try what the suit can do. Nobody gets hurt and nothing can be lost: robots power down, and Luke only ever gets bonked.</p>
    <ul class="trial-list">
      <li class="trial-course">${ICON.course}<span><strong>Course</strong> Walk into a lit wall to climb it. Zip, squeeze and hop to five sparks.</span></li>
      <li class="trial-ring">${ICON.ring}<span><strong>Ring</strong> Three waves of robots. One button does it: <kbd>F</kbd>. Step aside when the floor turns red.</span></li>
      <li class="trial-stealth">${ICON.stealth}<span><strong>Yard</strong> Reach the vault without being seen. Stay behind them, behind crates, or up high.</span></li>
      <li class="trial-buddy">${BUDDY_ICON.oop}<span><strong>Dad</strong> He follows you. Stand in his ring and press <kbd>T</kbd>: he throws you, and you dive on the robots. Anywhere else, <kbd>T</kbd> makes him stun one.</span></li>
    </ul>
    <label class="option"><input type="checkbox" id="sound" checked> Sound</label>
    <label class="option"><input type="checkbox" id="motion"> Reduce motion</label>
    <button class="primary" id="begin" disabled>Loading the yard…</button>
    <p class="arena-stamp" id="save-status"></p>
  </div></div>
  <div class="arena-overlay" id="paused" hidden><div class="arena-card">
    <div class="eyebrow">TAKE YOUR TIME</div>
    <h2>Paused.</h2>
    <p id="pause-notice">Stars are saved on this device as they are earned.</p>
    <button class="primary" id="resume">Carry on →</button>
    <button class="arena-button" id="reset">Clear my stars…</button>
    <a class="arena-button" href="${import.meta.env.BASE_URL}">Back to the house</a>
  </div></div>
  <div id="arena-error" class="arena-error" role="alert" hidden></div>
</div>`;

async function launch() {
  const canvas = $<HTMLCanvasElement>('arena-canvas');
  const view = createArenaView(canvas);
  const audio = createHeroAudio();
  const loaded = loadArena();
  let canSave = loaded.canSave;
  let state: ArenaState = createArena(ARENA_LAYOUT, loaded.progress);
  let previous = state;
  let accumulator = 0;
  let begun = false;
  let paused = true;
  let disposed = false;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now();
  let toastUntil = 0;
  let pending = { jump: 0, action: 0, pounce: 0, sidekick: 0 };
  let candidateId: string | null = null;
  let hudKey = '';
  let resetArmed = 0;
  let drag: { id: number; x: number; y: number } | undefined;
  let robotModes = state.robots.map(robot => robot.mode);
  let buddyFull = 0;
  const frames: number[] = [];
  $<HTMLInputElement>('motion').checked = reducedMotion;
  $('save-status').textContent = loaded.notice;

  const toast = (message: string, kind = '') => {
    const element = $('toast');
    element.textContent = message; element.dataset.kind = kind; element.hidden = false;
    toastUntil = performance.now() + 2600;
  };
  function persist() {
    const message = canSave ? saveArena(state.progress) : loaded.notice;
    $('save-status').textContent = message;
    $('pause-notice').textContent = message || 'Stars are saved on this device as they are earned.';
    return message;
  }
  function setPaused(value: boolean) {
    if (!begun) return;
    paused = value; accumulator = 0; input.release(); pending = { jump: 0, action: 0, pounce: 0, sidekick: 0 }; drag = undefined;
    // Returning must not continue a run or a press the player is no longer holding.
    state = { ...state, hero: settleHero(state.hero), actionHeld: false, pounceHeld: false, sidekickHeld: false }; previous = state;
    $('paused').hidden = !value;
    $('pause').textContent = value ? '▶ Carry on' : 'Ⅱ Pause';
    audio.setPaused(value);
    resetArmed = 0; $('reset').textContent = 'Clear my stars…';
    if (value) $('resume').focus(); else canvas.focus({ preventScroll: true });
  }
  const input = createArenaInput(window, {
    pause: () => setPaused(!paused),
    recenter: () => view.follow.recenter(state.hero),
    help: () => toast('Walk into lit walls to climb. F does the right thing to the ringed robot. Purple ring: it cannot see you. Stand in the ring around Dad and press T: he throws you.', 'help'),
  });

  $('begin').onclick = () => {
    begun = true; reducedMotion = $<HTMLInputElement>('motion').checked;
    audio.setEnabled($<HTMLInputElement>('sound').checked);
    $('welcome').hidden = true;
    setPaused(false);
  };
  $('pause').onclick = () => setPaused(!paused);
  $('resume').onclick = () => setPaused(false);
  $('help').onclick = () => { toast('Walk into lit walls to climb. F does the right thing to the ringed robot. Purple ring: it cannot see you. Stand in the ring around Dad and press T: he throws you.', 'help'); canvas.focus({ preventScroll: true }); };
  $('reset').onclick = () => {
    // Two presses within a few seconds: a child's stars are not cleared by one stray click.
    if (performance.now() > resetArmed) { resetArmed = performance.now() + 4000; $('reset').textContent = 'Press again to clear every star'; return; }
    resetArmed = 0; $('reset').textContent = 'Clear my stars…';
    const message = resetArena();
    $('pause-notice').textContent = message; $('save-status').textContent = message;
    if (message.includes('cleared')) { canSave = true; state = createArena(ARENA_LAYOUT, emptyProgress()); previous = state; view.follow.recenter(state.hero); hudKey = ''; }
  };
  $<HTMLInputElement>('motion').onchange = event => { reducedMotion = (event.target as HTMLInputElement).checked; };
  $<HTMLInputElement>('sound').onchange = event => audio.setEnabled((event.target as HTMLInputElement).checked);

  const pointerDown = (event: PointerEvent) => {
    if (!begun || paused || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId); canvas.focus({ preventScroll: true });
  };
  const pointerMove = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId || paused) return;
    view.follow.rotate((event.clientX - drag.x) * 0.007, (event.clientY - drag.y) * 0.005);
    drag.x = event.clientX; drag.y = event.clientY;
  };
  const pointerUp = (event: PointerEvent) => {
    if (drag?.id !== event.pointerId) return;
    drag = undefined;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  const onBlur = () => { if (begun && !paused) setPaused(true); else input.release(); };
  const onVisibility = () => { if (document.hidden) onBlur(); };
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', view.resize);

  /** Sounds, messages and saving for everything that happened in one rendered frame. */
  function react(events: number, heroEvents: number, dt: number) {
    audio.update(state.hero, heroEvents, dt);
    if (events & ARENA_EVENT.snare) { audio.tone(820, 1650, 0.08, 0.07, 'triangle'); audio.hiss(0.07, 0.05, 5200, 2); }
    if (events & ARENA_EVENT.pounce) { audio.hiss(0.24, 0.07, 1500, 0.5, 'highpass'); audio.tone(260, 520, 0.18, 0.05); }
    if (events & ARENA_EVENT.impact) { audio.tone(140, 50, 0.16, 0.15); audio.hiss(0.1, 0.06, 500); }
    // Robots power down with a sad boop.
    if (events & ARENA_EVENT.resolve) { audio.tone(520, 180, 0.32, 0.09, 'triangle'); audio.tone(180, 120, 0.25, 0.05, 'sine', 0.3); }
    if (events & ARENA_EVENT.hit) { audio.tone(210, 90, 0.2, 0.13, 'triangle'); audio.hiss(0.12, 0.07, 700); }
    if (events & ARENA_EVENT.spotted) { audio.tone(1180, 1220, 0.07, 0.05, 'square'); audio.tone(1480, 1520, 0.09, 0.05, 'square', 0.1); }
    if (events & ARENA_EVENT.wave) { audio.tone(440, 444, 0.12, 0.06, 'triangle'); audio.tone(660, 664, 0.16, 0.06, 'triangle', 0.12); }
    if (events & ARENA_EVENT.caught) audio.tone(880, 220, 0.5, 0.08);
    if (events & (ARENA_EVENT.release | ARENA_EVENT.revive)) audio.tone(300, 620, 0.24, 0.06, 'triangle');
    // The throw goes up, the moment shimmers, the dive comes down; a stun is a bell.
    if (events & ARENA_EVENT.toss) { audio.tone(180, 760, 0.42, 0.09, 'triangle'); audio.hiss(0.3, 0.07, 900, 0.7, 'highpass'); toast('Rocket Toss!', 'toss'); }
    if (events & ARENA_EVENT.hang) { audio.tone(1320, 1340, 0.5, 0.035, 'sine'); audio.tone(1980, 1990, 0.5, 0.02, 'sine', 0.05); }
    if (events & ARENA_EVENT.dive) { audio.tone(900, 160, 0.3, 0.09, 'sawtooth'); audio.hiss(0.26, 0.07, 2400, 0.6, 'highpass'); }
    if (events & ARENA_EVENT.stun) { audio.tone(660, 640, 0.5, 0.09, 'sine'); audio.tone(1320, 1300, 0.35, 0.04, 'sine', 0.02); }
    if (events & ARENA_EVENT.zip) audio.hiss(0.18, 0.05, 1800, 1.2, 'bandpass');
    if (events & ARENA_EVENT.pickup) audio.chime(false);
    if (events & ARENA_EVENT.trial) audio.chime(true);
    if (events & ARENA_EVENT.bonk) { audio.tone(420, 110, 0.5, 0.1, 'triangle'); toast('Bonked! Shake it off.', 'bonk'); }
    if (events & ARENA_EVENT.caught) toast('Caught in the light. Back to hiding: try another way.', 'caught');
    if (events & ARENA_EVENT.quiet) toast('Quiet takedown', 'quiet');
    if (events & ARENA_EVENT.wave) toast(`Wave ${state.wave}`, 'wave');
    if (events & ARENA_EVENT.trial && !(events & ARENA_EVENT.star)) toast('Done! Try for another star.', 'trial');
    if (events & ARENA_EVENT.star) toast('★ New star!', 'star');
    // A robot starting its wind-up is heard as well as seen.
    state.robots.forEach((robot, index) => {
      if (robot.mode === 'windup' && robotModes[index] !== 'windup') audio.tone(200, 640, ROBOT_PROFILES[robot.kind].windup * 0.95, 0.035, 'triangle');
      robotModes[index] = robot.mode;
    });
    if (events & (ARENA_EVENT.star | ARENA_EVENT.pickup | ARENA_EVENT.quiet | ARENA_EVENT.trial | ARENA_EVENT.wave)) {
      const message = persist();
      if (events & ARENA_EVENT.star && !message.includes('saved')) toast(message, 'help');
    }
  }

  const setStars = (id: string, earned: number, possible = earned) => {
    $(id).querySelectorAll('i').forEach((element, index) => { element.className = index < earned ? 'earned' : index < possible ? 'possible' : ''; });
  };
  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
  function hud() {
    const { progress } = state;
    const aimed = state.targetId ? state.robots.find(robot => robot.id === state.targetId) : undefined;
    const kind = actionFor(ARENA_LAYOUT, state, aimed);
    const yard = state.robots.filter((_robot, index) => ARENA_LAYOUT.robots[index].trial === 'stealth');
    const watched = yard.some(robot => robot.mode === 'alert' || robot.awareness >= 1) ? 'seen' : yard.some(robot => robot.awareness >= ARENA.unaware || robot.mode === 'curious' || robot.mode === 'search') ? 'looking' : 'hidden';
    const buddy = state.sidekick;
    const ask = sidekickFor(ARENA_LAYOUT, state);
    const hint: BuddyHint = ask !== 'none' ? ask : buddy.mode === 'wait' ? 'wait' : buddy.cooldown > 0 ? 'rest' : 'none';
    // The cooldown shade empties from whatever it was last set to.
    if (buddy.cooldown > buddyFull || buddy.cooldown <= 0) buddyFull = buddy.cooldown;
    const lapStars = state.lapTime <= ARENA.courseGold ? 3 : state.lapTime <= ARENA.courseSilver ? 2 : 1;
    const ringStars = state.ringBonks > 0 ? 1 : state.ringHits > 0 ? 2 : 3;
    const yardStars = !state.seen ? 3 : state.catches === 0 ? 2 : 1;
    const key = [state.trial, state.energy, state.bonk > 0, state.held > 0, kind, state.wave, state.waveTimer > 0, state.lap.join(), Math.floor(state.lapTime * 10), state.lapRest > 0,
      progress.courseStars, progress.ringStars, progress.stealthStars, progress.course.length, ringStars, yardStars, watched, state.vaultTaken, state.catches,
      Math.ceil(state.snareCooldown * 10), Math.ceil(state.pounceCooldown * 10), state.robots.filter(robot => robot.mode !== 'dormant' && robot.mode !== 'resolved').length, input.controller,
      hint, Math.ceil(buddy.cooldown * 10), state.oop].join('|');
    if (performance.now() > toastUntil) $('toast').hidden = true;
    if (key === hudKey) return;
    hudKey = key;
    const total = progress.courseStars + progress.ringStars + progress.stealthStars;
    $('total').setAttribute('aria-label', `${total} of ${STAR_MAX * 3} stars`);
    setStars('total-course', progress.courseStars); setStars('total-ring', progress.ringStars); setStars('total-stealth', progress.stealthStars);
    $('shell').dataset.trial = state.trial; $('shell').dataset.watched = state.trial === 'stealth' ? watched : '';
    $('vignette').className = `arena-vignette${state.held > 0 ? ' is-held' : state.bonk > 0 ? ' is-bonked' : state.oop === 'hang' ? ' is-slow' : state.trial === 'stealth' && watched === 'seen' ? ' is-seen' : ''}`;
    $('energy').setAttribute('aria-label', `Suit energy ${state.energy} of ${ARENA.energyMax}`);
    $('energy').querySelectorAll('i').forEach((element, index) => element.classList.toggle('spent', index >= state.energy));
    const action = $('ability-action');
    if (action.dataset.kind !== kind) {
      action.dataset.kind = kind; $('action-icon').innerHTML = ICON[kind];
      $('action-label').textContent = kind === 'quiet' ? 'Quiet pounce' : kind === 'pounce' ? 'Pounce' : kind === 'snare' ? 'Snare' : 'Action';
    }
    $('action-cooldown').style.height = `${Math.min(100, Math.max(state.snareCooldown / ARENA.snareCooldown, kind === 'none' && aimed ? state.pounceCooldown / ARENA.pounceCooldown : 0) * 100)}%`;
    $('pounce-cooldown').style.height = `${Math.min(100, state.pounceCooldown / ARENA.pounceCooldown * 100)}%`;
    const chip = $('ability-sidekick');
    chip.hidden = !buddy.present;
    if (chip.dataset.hint !== hint) { chip.dataset.hint = hint; $('sidekick-icon').innerHTML = BUDDY_ICON[hint]; $('sidekick-label').textContent = BUDDY_LABEL[hint]; }
    $('sidekick-cooldown').style.height = `${buddyFull > 0 ? Math.min(100, buddy.cooldown / buddyFull * 100) : 0}%`;
    $('controls').textContent = input.controller
      ? 'LEFT STICK · MOVE   A · JUMP   TRIGGER · SPRINT / SWING   X · ACTION   Y · POUNCE   B · DAD   RIGHT STICK · LOOK   START · PAUSE'
      : 'WASD · MOVE   SPACE · JUMP   SHIFT · SPRINT / SWING   F · ACTION   G · POUNCE   T · DAD   Q / E OR DRAG · LOOK   ESC · PAUSE';
    const panel = $('trial');
    panel.hidden = state.trial === '';
    $('place').textContent = state.trial ? TRIAL_NAME[state.trial].toUpperCase() : 'TRAINING YARD';
    let status = 'Step over a glowing line to start a trial. Step back out to stop.';
    if (state.trial === 'course') {
      const sparks = PICKUPS.filter(pickup => pickup.trial === 'course');
      $('trial-icon').innerHTML = ICON.course;
      setStars('trial-stars', progress.courseStars, state.lap.length ? lapStars : 3);
      $('trial-meter').innerHTML = sparks.map(spark => `<i class="gem${state.lap.includes(spark.id) ? ' got' : ''}"></i>`).join('');
      $('trial-clock').textContent = state.lap.length ? clock(state.lapTime) : progress.courseBest ? `best ${clock(progress.courseBest)}` : '';
      status = state.lapRest > 0 ? 'Lap done. Step away and the sparks come back.' : state.lap.length ? `${state.lap.length} of ${sparks.length} sparks. Keep going.` : 'Walk into a lit wall to climb it. Collect the five sparks.';
    } else if (state.trial === 'ring') {
      $('trial-icon').innerHTML = ICON.ring;
      const finished = state.wave > ARENA_LAYOUT.waves;
      setStars('trial-stars', progress.ringStars, finished ? progress.ringStars : ringStars);
      $('trial-meter').innerHTML = Array.from({ length: ARENA_LAYOUT.waves }, (_unused, index) => `<i class="wave${index + 1 < state.wave ? ' got' : index + 1 === state.wave ? ' now' : ''}"></i>`).join('');
      $('trial-clock').textContent = '';
      status = finished ? 'Ring cleared. Step out and back in to go again.' : state.waveTimer > 0 ? 'Get ready…' : `Wave ${state.wave} of ${ARENA_LAYOUT.waves}. Press F at the ringed robot. Step aside when the floor turns red.`;
    } else if (state.trial === 'stealth') {
      $('trial-icon').innerHTML = ICON.stealth;
      setStars('trial-stars', progress.stealthStars, state.vaultTaken ? progress.stealthStars : yardStars);
      $('trial-meter').innerHTML = `<i class="eye ${watched}"></i>`;
      $('trial-clock').textContent = '';
      status = state.vaultTaken ? 'Vault reached. Step out and back in to try for more stars.' : state.held > 0 ? 'Caught in the light.'
        : watched === 'seen' ? 'Spotted! Break the line of sight.' : watched === 'looking' ? 'Something is looking your way…' : 'Hidden. Stay behind them, behind crates, or up high.';
    }
    if (state.oop === 'hang') status = 'Up high! Press F to dive, or just wait.';
    if (state.bonk > 0) status = 'Bonked! Back up in a moment.';
    // A live region announces whenever its text node is replaced, so only touch it when the words change.
    if ($('status').textContent !== status) $('status').textContent = status;
  }

  // Draw one frame before the Start button wakes, so the yard is on screen when play begins.
  const frame = () => ({ state, previous, alpha: accumulator / TRAVERSAL_STEP, events: 0, heroEvents: 0, candidateId });
  view.follow.recenter(state.hero);
  view.update(frame(), 0, reducedMotion, true);
  view.render();
  await view.scene.whenReadyAsync().catch(error => { view.dispose(); throw error; });
  view.render();
  hud();
  canvas.dataset.ready = 'true';
  $<HTMLButtonElement>('begin').disabled = false;
  $('begin').textContent = 'Start →';
  $('begin').focus();

  const debug = {
    snapshot: () => ({
      begun, paused, reducedMotion, canSave, saveNotice: $('save-status').textContent,
      state: {
        trial: state.trial, wave: state.wave, waveTimer: state.waveTimer, energy: state.energy, bonk: state.bonk, held: state.held, seen: state.seen, catches: state.catches,
        vaultTaken: state.vaultTaken, hideId: state.hideId, targetId: state.targetId, targetQuiet: state.targetQuiet, pounceId: state.pounceId, snareId: state.snareId,
        lap: [...state.lap], lapTime: state.lapTime, ringHits: state.ringHits, progress: { ...state.progress, course: [...state.progress.course] },
        hero: { x: state.hero.x, y: state.hero.y, z: state.hero.z, yaw: state.hero.yaw, mode: state.hero.mode, climbId: state.hero.climbId, tetherId: state.hero.tetherId, groundId: state.hero.groundId },
        robots: state.robots.map(robot => ({ id: robot.id, mode: robot.mode, timer: robot.timer, sparks: robot.sparks, awareness: robot.awareness, hold: robot.hold, stunned: robot.stunned, x: robot.x, y: robot.y, z: robot.z, yaw: robot.yaw })),
        sidekick: { ...state.sidekick }, oop: state.oop, diveIds: [...state.diveIds],
      },
      action: actionFor(ARENA_LAYOUT, state, state.robots.find(robot => robot.id === state.targetId)),
      sidekick: sidekickFor(ARENA_LAYOUT, state),
      view: view.snapshot(), audio: audio.snapshot(),
      meanFrameMs: frames.length ? frames.reduce((sum, value) => sum + value, 0) / frames.length : 0,
    }),
    ...(import.meta.env.DEV ? {
      scene: view.scene,
      /** Development review and tests only: stand Luke somewhere, and the sidekick too if asked. Never used by play or saves. */
      place: (pose: { x: number; z: number; yaw: number; y?: number }, cameraYaw?: number, sidekick?: { x: number; z: number }) => {
        state = { ...state, hero: createHero(LUKE_ARENA, pose), pounceId: '', held: 0, bonk: 0, oop: '', diveIds: [] };
        if (sidekick) state = { ...state, sidekick: { ...state.sidekick, x: sidekick.x, z: sidekick.z, mode: 'follow', timer: 0, cooldown: 0, stuck: 0, aimId: '' } };
        previous = state; accumulator = 0;
        view.follow.recenter(state.hero);
        if (cameraYaw !== undefined) view.follow.rotate(cameraYaw - view.follow.yaw);
        view.update(frame(), 0, reducedMotion, true);
      },
    } : {}),
  };
  Object.assign(window, { __LUKE_ARENA__: debug });

  view.engine.runRenderLoop(() => {
    if (disposed) return;
    const now = performance.now();
    const rawDt = (now - last) / 1000; last = now;
    if (rawDt > 0 && rawDt < 1) { frames.push(rawDt * 1000); if (frames.length > 600) frames.shift(); }
    const dt = Math.min(MAX_FRAME_SECONDS, Math.max(0, rawDt));
    const active = begun && !paused;
    const controls = input.sample(active);
    const taken = input.takePresses();
    let events = 0, heroEvents = 0;
    if (active) {
      pending.jump = Math.min(2, pending.jump + taken.jump); pending.action = Math.min(2, pending.action + taken.action); pending.pounce = Math.min(2, pending.pounce + taken.pounce); pending.sidekick = Math.min(2, pending.sidekick + taken.sidekick);
      if (controls.lookX || controls.lookY) view.follow.rotate(controls.lookX * 2.4 * dt, controls.lookY * 1.3 * dt);
      accumulator += dt;
      while (accumulator >= TRAVERSAL_STEP) {
        const yaw = view.follow.yaw;
        const moveX = Math.sin(yaw) * controls.forward + Math.cos(yaw) * controls.right;
        const moveZ = Math.cos(yaw) * controls.forward - Math.sin(yaw) * controls.right;
        // A latched press reaches the rules as a real edge: released for one step if still held, then pressed.
        let jump = controls.jump, action = controls.action, pounce = controls.pounce, sidekick = controls.sidekick;
        if (pending.jump) { if (state.hero.jumpHeld) jump = false; else { jump = true; pending.jump--; } }
        if (pending.action) { if (state.actionHeld) action = false; else { action = true; pending.action--; } }
        if (pending.pounce) { if (state.pounceHeld) pounce = false; else { pounce = true; pending.pounce--; } }
        if (pending.sidekick) { if (state.sidekickHeld) sidekick = false; else { sidekick = true; pending.sidekick--; } }
        // Aim where the stick points, or where the camera looks when standing still.
        const steering = Math.hypot(moveX, moveZ) > 0.2;
        previous = state;
        state = stepArena(state, { moveX, moveZ, jump, power: controls.power, action, pounce, sidekick, aimX: steering ? moveX : Math.sin(yaw), aimZ: steering ? moveZ : Math.cos(yaw) });
        events |= state.events; heroEvents |= state.hero.events;
        accumulator -= TRAVERSAL_STEP;
      }
      // Offer a tether target while airborne, or on the ground while sprinting on suit power.
      const hero = state.hero;
      const aiming = !state.pounceId && !state.oop && (hero.mode === 'air' || (hero.mode === 'ground' && controls.power && Math.hypot(hero.vx, hero.vz) > 3));
      if (aiming) {
        const dir = travelDirection(hero, hero.vx, hero.vz);
        const probe = hero.mode === 'ground' ? { ...hero, y: hero.y + 1.2 } : hero;
        candidateId = selectAnchor(LUKE_ARENA, probe, dir.x, dir.z, hero.lastAnchorAge < TUNING.tetherForget ? hero.lastAnchorId : '')?.id ?? null;
      } else candidateId = null;
      react(events, heroEvents, dt);
    } else accumulator = 0;
    view.update({ ...frame(), events, heroEvents }, dt, reducedMotion);
    view.render();
    hud();
  });
  window.addEventListener('pagehide', () => {
    if (begun && canSave) saveArena(state.progress);
    disposed = true; input.dispose(); audio.dispose(); view.dispose();
    window.removeEventListener('blur', onBlur); window.removeEventListener('resize', view.resize);
    document.removeEventListener('visibilitychange', onVisibility);
  }, { once: true });
}
void launch().catch(error => {
  $('arena-error').hidden = false;
  $('arena-error').textContent = `The arena could not load: ${error instanceof Error ? error.message : 'graphics unavailable'}. Reload to try again.`;
  console.error(error);
});
