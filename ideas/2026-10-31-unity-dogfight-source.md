Upgrade the Space Dragon dogfight prototype with tactical damage, limited repairs, rechargeable lock-on missiles, and sharper dragon detailing.

Preserve the existing engine, flight controls, and working gameplay. Implement these changes in the playable encounter.

DRAGON DAMAGE AND WARNING SYSTEM

Give the dragon three damageable systems:
- Hull: overall survival.
- Wings/thrusters: flight performance.
- Weapons: missile recharge and targeting.

Damage should create readable consequences without making the dragon uncontrollable. Damaged propulsion modestly reduces boost performance; damaged weapons slow recharge. Preserve responsive steering.

Show localized sparks, damaged armor scales, and intermittent smoke appropriate to severity.

Use escalating warnings:
- Caution: brief amber indicator and a single warning tone.
- Critical system damage: red system indicator and a spaced repeating alarm.
- Incoming locked missile: distinct directional warning and urgent pulse.
- Hull failure imminent: unmistakable emergency warning.

Prioritize the most urgent alarm. Do not stack continuous sounds or repeat voice lines constantly. Let players identify the problem at a glance.

LIMITED FIELD REPAIRS

Replace unlimited healing with a limited repair system.

Starting tuning:
- Maximum three field repairs per encounter.
- Each repair consumes one salvage part.
- Start with one salvage part; carry up to three.
- Each activation repairs one selected system by a meaningful amount.
- Repairing never restores a destroyed dragon.

Hold the repair button to open a compact system selector, then choose the damaged system. Show the repair amount, required salvage, and remaining repair activations before committing.

Repairs take approximately four seconds. Luke/family maintenance drones visibly patch the selected area with recovered material.

The dragon can maneuver during repairs, but cannot boost or fire missiles. Taking a substantial hit interrupts the repair. Consume the part and repair activation only when the repair completes.

Show progress clearly and restore the damaged system’s performance when finished. Repaired scales retain visible patchwork so the battle leaves a mark.

SALVAGE FROM DESTROYED BOGEYS

Destroyed enemy craft can leave recoverable repair components.

Use a predictable prototype rule: each destroyed bogey drops one salvage component. Only a small number of components may remain active; clean up older debris safely.

Mark salvage with a restrained icon and distance indicator. Collect it by flying within a forgiving pickup radius; no precision collision required.

Salvage should inherit some initial wreck velocity, then drift slowly enough to retrieve. Separate collectible components visually from dangerous wreckage.

When inventory is full, leave the component available and show “Salvage full.” Recovering salvage replenishes parts but NEVER resets the three-repair encounter limit.

Create a tactical choice: pursue another enemy or break away to retrieve a component and repair.

RECHARGEABLE LOCK-ON MISSILES

Replace the current ammo system with infrequent, valuable homing missiles.

Starting tuning:
- Two missile charges.
- Each spent charge takes 15 seconds to regenerate.
- Regenerate charges sequentially.
- Approximately 1.5 seconds of sustained tracking to establish a lock.

Locking requires a valid enemy within range and inside the targeting cone, with unobstructed line of sight. Brief tracking interruptions have a small grace period; sustained loss breaks the lock.

Show three clear targeting states:
Acquiring → Locked → Recharging.

Use distinct lock-acquisition and lock-confirmation sounds. Fire only on deliberate player input after lock confirmation. Never consume a charge on an invalid launch.

Missiles turn convincingly with limited steering capability. They must not teleport, pass through scenery, or guarantee a hit against every evasive maneuver.

Display two compact charge indicators and recharge progress. Damaged weapons increase recharge time, with the cause clearly indicated.

Avoid missile spam. Make a confirmed launch feel powerful through animation, launch audio, exhaust, and readable impact effects.

DRAGON VISUAL REFINEMENT

Make the dragon’s silhouette and individual armor scales more defined.

- Clearly distinguish head, jaw, neck, chest, wings, limbs, and tail.
- Build overlapping armor scales with visible thickness and believable joint spacing.
- Use larger protective plates across the chest and shoulders, smaller articulated scales around moving joints.
- Preserve the established dragon colors and identity.
- Add restrained edge wear, roughness variation, recessed seams, and subtle living energy beneath the armor.
- Keep wing edges and facial features readable from the gameplay camera.
- Make damaged, patched, and intact scales visually distinguishable.

Use actual silhouette geometry for major scales and surface detail for smaller ones. Maintain appropriate LODs and avoid excessive draw calls.

GAMEPLAY PRESENTATION

Keep the HUD concise:
Hull status, damaged system indicators, missile charges/recharge,
salvage inventory, and repairs remaining.

Introduce each mechanic through a brief contextual prompt during play. Avoid long tutorial panels.

VALIDATION

Demonstrate:
1. Lock onto a bogey and launch a missile.
2. Destroy it and retrieve its salvage.
3. Take localized damage and receive the correct warning.
4. Break away and complete a repair.
5. Have another repair interrupted without losing its resources.
6. Exhaust the three-repair limit; additional salvage must not bypass it.
7. Spend both missiles and visibly regenerate charges.
8. Restart the encounter with all resources and systems reset correctly.

Expose tuning values in the editor. Report which behaviors were tested and identify any remaining placeholders.
