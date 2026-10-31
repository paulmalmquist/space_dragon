import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { assistedTarget } from '../systems/combat.js';
import { radarContacts, RADAR_RANGE } from '../systems/radar.js';
const $ = id => document.getElementById(id);
const svgElement = (name, attributes = {}) => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
};
export class HUD {
  constructor(squad) {
    this.hitTime = 0; this.damageTime = 0; this.messageTime = 0;
    this.markers = squad.drones.map(d => {
      const el = document.createElement('div'); el.className = 'target-marker';
      el.dataset.targetId = String(d.id);
      el.innerHTML = '<div class="target-bracket"></div><span class="name"></span><span class="enemy-threat"></span><div class="target-health"><i></i></div><span class="range"></span>';
      el.querySelector('.name').textContent = d.name; $('markers').appendChild(el);
      return { el, health: el.querySelector('i'), range: el.querySelector('.range') };
    });
    this.radarNodes = new Map(); this.radarSnapshot = [];
    for (const drone of squad.drones) {
      const group = svgElement('g', { class: 'radar-contact', 'data-radar-id': drone.id });
      const glyph = svgElement('circle', { class: 'radar-glyph', r: 3.5 });
      const edge = svgElement('path', { class: 'radar-edge', d: 'M 0 -6 L 4 3 L 0 1 L -4 3 Z' });
      const label = svgElement('text', { class: 'radar-label', x: 7, y: 2 });
      const altitude = svgElement('text', { class: 'radar-altitude', x: 7, y: 12 });
      const title = svgElement('title');
      label.textContent = String(drone.id + 1).padStart(2, '0');
      group.append(title, glyph, edge, label, altitude); $('radar-contacts').appendChild(group);
      this.radarNodes.set(drone.id, { group, glyph, edge, label, altitude, title });
    }
  }
  hit(disabled) { this.hitTime = disabled ? .5 : .18; $('hit-marker').style.color = disabled ? '#ffb36a' : '#fff1d7'; }
  hurt() { this.damageTime = .5; }
  message(text) { $('combat-message').textContent = text; this.messageTime = 3; }
  reset() { this.hitTime = 0; this.damageTime = 0; this.messageTime = 0; $('combat-message').textContent = ''; this.showOverlay('playing'); }
  showOverlay(state, stats = {}) {
    $('overlay').hidden = ['playing', 'crashing'].includes(state); $('resume').hidden = !['paused', 'ready'].includes(state);
    $('resume').innerHTML = state === 'ready' ? 'LAUNCH FLIGHT <span>↗</span>' : 'RESUME FLIGHT <span>↗</span>';
    if (['playing', 'crashing'].includes(state)) return;
    const t = {
      ready: ['FLIGHT LAB READY', 'Ready to<br/><em>fly?</em>', 'Keep moving: steady flight lets enemies lock on. Q/E rolls shake their lock (40 evasion); B + steer makes a hard break turn (25). Match letters while dodging, then aim until LOCKED and press Space. M switches mouse fly / aim. Left click fires plasma. Enter launches.'],
      paused: ['FLIGHT SUSPENDED', 'Catch your<br/><em>breath.</em>', 'The encounter is paused. Your wings are waiting. Press Enter or resume to continue.'],
      victory: ['PRACTICE COMPLETE / 03 OF 03', 'Clear<br/><em>skies.</em>', 'Three drones disabled. Try another flight, or head back to the Earth story.'],
      recovery: ['SPACECRAFT LOST', 'Regroup.<br/><em>Rebuild. Retry.</em>', 'The dragon’s hull failed. Retry the practice encounter with a restored spacecraft. Your Earth story checkpoint is unchanged.']
    }[state];
    $('overlay-kicker').textContent = t[0]; $('overlay-title').innerHTML = t[1]; $('overlay-description').textContent = t[2];
    $('restart').hidden = state === 'ready';
    $('restart').textContent = state === 'paused' ? 'RESTART ENCOUNTER ↺' : 'FLY AGAIN ↗';
    $('restart').className = state === 'paused' ? 'secondary' : 'primary';
    $('result-stats').textContent = ['paused', 'ready'].includes(state) ? '' : `FLIGHT ${formatTime(stats.elapsed || 0)}  /  ${stats.disabled || 0} DRONES DISABLED  /  ${stats.accuracy || 0}% ACCURACY`;
  }
  update(dt, game) {
    const { flight, squad, camera, elapsed, energy, state, aim, reducedMotion } = game;
    const power = game.power.snapshot();
    const windingUp = power.burst?.stage === 'windup';
    this.updatePower(game, power);
    this.updateThreat(game);
    this.updateRadar(game, power);
    this.hitTime = Math.max(0, this.hitTime - dt); this.damageTime = Math.max(0, this.damageTime - dt); this.messageTime = Math.max(0, this.messageTime - dt);
    $('hit-marker').style.opacity = this.hitTime > 0 ? 1 : 0;
    $('damage-flash').style.opacity = reducedMotion ? 0 : Math.min(.65, this.damageTime * 1.4);
    if (!this.messageTime) $('combat-message').textContent = '';
    $('energy-value').textContent = Math.ceil(energy); $('energy-fill').style.width = `${energy}%`;
    $('energy-fill').style.filter = energy < 30 ? 'hue-rotate(80deg)' : '';
    $('energy-warning').textContent = state === 'crashing' ? 'HULL BREACH / REACTOR FAILURE' : game.asteroidWarning ? `ASTEROID AHEAD / ${Math.round(game.asteroidWarning.clearance)} M / STEER CLEAR` : energy < 30 ? 'LOW HULL / EVADE INCOMING FIRE' : 'FLIGHT SYSTEMS NOMINAL';
    $('boost-fill').style.width = `${flight.boost / CONFIG.boost.capacity * 100}%`;
    $('boost-status').textContent = flight.boosting ? 'ENGAGED' : flight.boost > CONFIG.boost.capacity - .05 ? 'READY' : flight.boostLocked ? 'RECHARGING' : `${Math.round(flight.boost / CONFIG.boost.capacity * 100)}%`;
    const evasion = Math.max(0, flight.evasionEnergy / flight.evasionMax * 100);
    $('evasion-fill').style.width = `${evasion}%`;
    $('evasion-status').textContent = evasion < 25 ? `LOW · ${Math.floor(evasion)}%` : `${Math.floor(evasion)}%`;
    $('evasion-fill').dataset.low = String(evasion < 40);
    const failed = ['crashing', 'recovery'].includes(state);
    $('speed-value').textContent = failed ? '—' : Math.round(flight.speed);
    $('speed-mode').textContent = failed ? 'HULL FAILURE' : flight.breakActive ? 'BREAK TURN' : flight.boosting ? 'BOOST ENGAGED' : 'CRUISING';
    document.body.classList.toggle('boosting', flight.boosting && !reducedMotion);
    $('flight-time').textContent = formatTime(elapsed); $('enemy-count').textContent = squad.alive.length;
    [...$('enemy-pips').children].forEach((p, i) => p.classList.toggle('disabled', squad.drones[i].dead));
    $('guide').style.opacity = elapsed < 20 && state === 'playing' ? 1 : 0;
    $('notice').style.opacity = elapsed < 6 && state === 'playing' ? Math.min(1, 6 - elapsed) : 0;
    const target = assistedTarget(flight, squad.drones, aim.direction);
    const reticlePoint = aim.point.clone().project(camera);
    const rx = (reticlePoint.x * .5 + .5) * innerWidth, ry = (-reticlePoint.y * .5 + .5) * innerHeight;
    for (const id of ['reticle', 'hit-marker']) { $(id).style.left = `${rx}px`; $(id).style.top = `${ry}px`; }
    $('reticle').classList.toggle('lock', power.lockedIds.length > 0);
    $('reticle').classList.toggle('acquiring', power.candidateId !== null && power.lockProgress > 0);
    $('lock-ring').style.setProperty('--lock-fill', `${power.lockProgress * 360}deg`);
    $('lock-ring').hidden = !power.lockProgress || power.phase !== 'ready';
    $('aim-label').textContent = failed ? 'SPACECRAFT LOST' : power.phase === 'charging' ? 'FINISH THE POWER WORD' : power.phase === 'burst' ? windingUp ? 'REACTOR WIND-UP · KEEP DODGING' : 'FIRE BEAM' : power.lockedIds.length ? 'LOCKED · SPACE' : power.candidateId !== null ? `LOCKING ${Math.round(power.lockProgress * 100)}%` : target ? 'PLASMA AIM ASSIST · HOLD TO LOCK' : 'HOLD ON A SHIP TO LOCK';
    const heading = flight.forward.clone().multiplyScalar(450).add(flight.position).project(camera);
    $('flight-axis').style.left = `${(heading.x * .5 + .5) * innerWidth}px`;
    $('flight-axis').style.top = `${(-heading.y * .5 + .5) * innerHeight}px`;
    const maneuverCooldown = Math.max(flight.rollCooldown, flight.breakCooldown || 0);
    $('roll-status').textContent = flight.rollActive ? `ROLLING ${flight.rollDirection < 0 ? 'LEFT' : 'RIGHT'} · SHAKING LOCKS` : flight.breakActive ? `HARD BREAK ${flight.breakDirection < 0 ? 'LEFT' : 'RIGHT'}` : maneuverCooldown > 0 ? `EVASION READY IN ${maneuverCooldown.toFixed(1)}s` : flight.evasionEnergy < 25 ? 'EVASION RECHARGING · KEEP TURNING' : flight.evasionEnergy < 40 ? 'B + STEER · BREAK TURN READY · ROLL RECHARGING' : 'Q / E ROLL · 40   /   B + STEER BREAK · 25';
    $('roll-status').dataset.active = String(flight.rollActive || flight.breakActive);
    document.body.dataset.evasionEnergy = String(Math.floor(evasion));
    document.body.dataset.breakActive = String(flight.breakActive);
    $('flight-cursor').hidden = game.mouseMode !== 'flight' || !game.mouse.active || state !== 'playing';
    document.body.dataset.zooming = String(game.zooming);
    $('game').dataset.firing = String(state === 'playing' && (game.mouse.fire || power.phase === 'burst'));
    const nearest = squad.alive.sort((a, b) => a.position.distanceToSquared(flight.position) - b.position.distanceToSquared(flight.position))[0];
    $('target-readout').style.opacity = nearest ? 1 : 0;
    if (nearest) { $('target-name').textContent = nearest.name; $('target-state').textContent = `${{ attack: 'RANGE HOLD', pass: 'FLYBY', reposition: 'REPOSITIONING' }[nearest.phase]} / ${Math.round(nearest.position.distanceTo(flight.position))} M`; }
    let overlapsReadout = false;
    squad.drones.forEach((d, i) => {
      const { el, health, range } = this.markers[i]; el.style.display = d.dead ? 'none' : '';
      if (d.dead) return;
      const projected = d.position.clone().project(camera);
      const cameraLocal = d.position.clone().sub(camera.position).applyQuaternion(camera.quaternion.clone().invert());
      const visible = cameraLocal.z < 0 && Math.abs(projected.x) < .87 && Math.abs(projected.y) < .73;
      let x, y;
      if (visible) { x = (projected.x * .5 + .5) * innerWidth; y = (-projected.y * .5 + .5) * innerHeight; }
      else {
        let dx = cameraLocal.x, dy = -cameraLocal.y;
        if (Math.abs(dx) + Math.abs(dy) < .001) { dx = d.id % 2 ? 1 : -1; dy = .2; }
        const halfW = innerWidth * .5 - 55, halfH = innerHeight * .5 - 125;
        const scale = 1 / Math.max(Math.abs(dx) / halfW, Math.abs(dy) / Math.max(50, halfH));
        x = innerWidth * .5 + dx * scale; y = innerHeight * .5 + dy * scale;
        el.style.setProperty('--angle', `${Math.atan2(dy, dx) + Math.PI / 2}rad`);
      }
      if (x > innerWidth - 280 && y > innerHeight - 350 && y < innerHeight - 200) overlapsReadout = true;
      el.style.left = `${x}px`; el.style.top = `${y}px`; el.classList.toggle('offscreen', !visible); el.classList.toggle('assisted', target === d);
      const locked = power.lockedIds.includes(d.id), acquiring = power.candidateId === d.id && power.lockProgress > 0;
      el.classList.toggle('hard-locked', locked); el.classList.toggle('locking', acquiring);
      el.dataset.locked = String(locked); el.dataset.lockProgress = String(acquiring ? power.lockProgress : 0);
      el.querySelector('.name').textContent = `${d.name}${locked ? ' · LOCKED' : acquiring ? ' · LOCKING' : ''}`;
      const threat = game.threat?.threats.find(candidate => candidate.id === d.id);
      el.querySelector('.enemy-threat').textContent = threat?.firing ? '▲ FIRING AT YOU' : threat?.locked ? '△ TARGETING YOU' : '';
      el.classList.toggle('enemy-locked', Boolean(threat?.locked || threat?.firing));
      health.style.width = `${d.health / CONFIG.enemy.health * 100}%`; range.textContent = `${Math.round(d.position.distanceTo(flight.position))} M`;
    });
    $('target-readout').style.opacity = nearest && !overlapsReadout ? 1 : 0;
  }
  updateThreat(game) {
    const threat = game.threat || { tracking: 0, locked: 0, firing: 0, progress: 0, threats: [] };
    const level = threat.firing ? 'incoming' : threat.locked ? 'locked' : threat.tracking ? 'tracking' : 'clear';
    const panel = $('threat-warning'); panel.hidden = game.state !== 'playing' || level === 'clear'; panel.dataset.level = level;
    document.body.dataset.threatLevel = level;
    const source = [...threat.threats].sort((a, b) => Number(b.firing) - Number(a.firing) || Number(b.locked) - Number(a.locked) || b.progress - a.progress)[0];
    let bearing = '';
    if (source) {
      const local = new THREE.Vector3(...source.position).sub(game.camera.position).applyQuaternion(game.camera.quaternion.clone().invert());
      bearing = local.z > 0 ? 'BEHIND' : Math.abs(local.x) > Math.abs(local.y) ? local.x < 0 ? 'LEFT' : 'RIGHT' : local.y > 0 ? 'ABOVE' : 'BELOW';
      if (Math.abs(local.x) + Math.abs(local.y) < 1) bearing = local.z > 0 ? 'BEHIND' : 'AHEAD';
      $('threat-direction').style.transform = `rotate(${Math.atan2(local.x, local.y)}rad)`;
    }
    const title = { clear: 'SKIES CLEAR', tracking: 'ENEMY TRACKING', locked: 'ENEMY TARGET LOCK', incoming: 'INCOMING FIRE' }[level];
    $('threat-title').textContent = `${title}${bearing ? ` · ${bearing}` : ''}`;
    $('threat-advice').textContent = level === 'incoming' ? 'BREAK AWAY · B + steer / Q or E roll' : level === 'locked' ? 'Q / E shakes locks · Keep moving after the roll' : 'Change direction · Steady flight makes you easier to hit';
    $('threat-progress').style.width = `${Math.max(0, Math.min(1, threat.progress)) * 100}%`;
  }
  updateRadar(game, power) {
    const contacts = radarContacts(game.flight, game.squad.drones, {
      lockedIds: power.lockedIds, threats: game.threat?.threats || [],
    });
    this.radarSnapshot = contacts;
    const alive = new Set(contacts.map(contact => contact.id));
    for (const [id, node] of this.radarNodes) node.group.style.display = alive.has(id) ? '' : 'none';
    for (const contact of contacts) {
      const { group, glyph, edge, label, altitude, title } = this.radarNodes.get(contact.id);
      group.setAttribute('transform', `translate(${(contact.x * 80).toFixed(3)} ${(contact.y * 80).toFixed(3)})`);
      group.dataset.x = contact.x.toFixed(6); group.dataset.y = contact.y.toFixed(6);
      group.dataset.outOfRange = String(contact.outOfRange);
      group.classList.toggle('out-of-range', contact.outOfRange);
      group.classList.toggle('locked', contact.locked);
      group.classList.toggle('hostile-lock', contact.hostileLocked);
      group.classList.toggle('firing', contact.firing);
      glyph.style.display = contact.outOfRange && contact.hasBearing ? 'none' : '';
      edge.style.display = contact.outOfRange && contact.hasBearing ? '' : 'none';
      edge.setAttribute('transform', `rotate(${contact.bearing * 180 / Math.PI})`);
      for (const text of [label, altitude]) {
        text.setAttribute('x', contact.x > .6 ? '-7' : '7');
        text.setAttribute('text-anchor', contact.x > .6 ? 'end' : 'start');
      }
      altitude.textContent = contact.elevation ? contact.elevation > 0 ? '+' : '−' : '';
      const height = contact.elevation ? `${Math.round(Math.abs(contact.altitudeMeters))} meters ${contact.elevation > 0 ? 'above' : 'below'}` : 'level';
      title.textContent = `${contact.name}: ${Math.round(contact.distance)} meters, ${height}${contact.outOfRange ? ', beyond sensor range' : ''}${contact.locked ? ', breath locked' : ''}${contact.firing ? ', firing at you' : contact.hostileLocked ? ', targeting you' : ''}`;
      group.setAttribute('aria-label', title.textContent);
    }
    $('radar-count').textContent = String(contacts.length).padStart(2, '0');
    $('radar-range').textContent = `${(RADAR_RANGE / 1000).toFixed(1)} KM`;
    $('radar-scope').dataset.contacts = String(contacts.length);
    $('radar-summary').textContent = `${contacts.length} bogeys. Forward is up; plus/minus shows relative altitude. Rim arrows indicate contacts beyond ${RADAR_RANGE} meters.`;
  }
  updatePower(game, power) {
    const panel = $('word-power'); panel.hidden = game.state !== 'playing'; panel.dataset.phase = power.phase;
    document.body.dataset.powerPhase = power.phase; document.body.dataset.wordIndex = String(power.index);
    document.body.dataset.breathStage = power.burst?.stage || 'idle';
    document.body.dataset.crashStage = game.crash?.snapshot().stage || 'idle';
    document.body.dataset.lockedCount = String(power.lockedIds.length);
    document.body.dataset.breathFired = String(power.burstsFired);
    document.body.dataset.breathImpacts = String(power.burstsResolved);
    document.body.dataset.spellHeld = 'false';
    const signature = `${power.word}:${power.index}`;
    if (signature !== this.wordSignature) {
      this.wordSignature = signature;
      $('word-slots').innerHTML = [...power.word].map((letter, index) => `<span class="${index < power.index ? 'complete' : ''}">${index < power.index ? letter : '_'}</span>`).join('');
      $('word-slots').setAttribute('aria-label', `Word progress: ${[...power.word].map((letter, index) => index < power.index ? letter : 'blank').join(' ')}`);
    }
    $('power-kicker').textContent = power.phase === 'charging' ? `POWER WORD · ${power.capacity} TARGET${power.capacity === 1 ? '' : 'S'}` : power.phase === 'burst' ? power.burst?.stage === 'windup' ? 'REACTOR WIND-UP' : 'FIRE BEAM · TRACKING' : 'BREATH CHARGED';
    $('letter-prompt').hidden = power.phase !== 'charging';
    $('power-letter').textContent = power.expectedLetter || '';
    $('charge-help').hidden = power.phase !== 'charging';
    $('charge-help').disabled = game.state !== 'playing';
    const names = power.lockedIds.map(id => game.squad.drones.find(drone => drone.id === id)?.name).filter(Boolean);
    const status = power.phase === 'charging' ? `Press ${power.expectedLetter}. Keep flying and dodge incoming fire.` : power.phase === 'burst' ? power.burst?.stage === 'windup' ? 'Winding up! Keep flying and dodging.' : 'Fire beam! Tracking the locked ship.' : names.length ? `${names.join(', ')} LOCKED · PRESS SPACE` : power.candidateId !== null ? 'Keep the reticle on the ship while the ring fills.' : 'Hold the reticle over a ship to lock it.';
    if ($('power-status').textContent !== status) $('power-status').textContent = status;
    $('lock-help').textContent = power.phase === 'charging' ? 'No wrong-key penalty. F1 charges it together.' : power.phase === 'burst' ? 'Your next power word follows this blast.' : `M: mouse ${game.mouseMode === 'flight' ? 'fly → aim' : 'aim → fly'} · Right click zooms · ${power.assisted ? 'Charged together' : power.word}`;
  }
}
export function formatTime(time) { return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`; }
