# Readable threats and finite evasion — SD-043

Date: October 30, 2026. Authority: **CONFIRMED owner direction**, captured verbatim in [the inbox](../../ideas/INBOX.md). Work/evidence: [evasion receipt](../reports/2026-10-30-dogfight-evasion.md).

**Later movement steering — SD-051:** [steadier enemy standoff](2026-10-30-dogfight-enemy-standoff.md) supersedes the pursuit/flyby movement presentation from this implementation. Motion-dependent hostile tracking, telegraphed incoming fire, damage and finite evasion rules remain; the historical receipt below is not evidence for the later AI refinement.

The owner wants a still closer dragon camera, stronger warnings when enemies target the dragon, barrel rolls that shake target locks while spending finite energy, another plausible dodge, and heavier incoming fire that rewards movement. This refines the encounter-only Dogfight Lab; it does not authorize campaign rewards, multiplayer, a backend, final assets or deployment.

## Local implementation choices

- Q/E retain their corkscrew rolls. Starting an accepted roll spends 40 from a separate 100-point evasion pool, breaks enemy firing solutions and briefly delays reacquisition. Existing projectiles keep flying and can still collide; a roll grants no damage immunity.
- B + steer performs a hard break turn: a short banked turn with braking that changes the dragon's actual heading and velocity. It spends 25 from the same evasion pool. It spoils prediction through movement rather than erasing shots or granting immunity. With no steer direction, the current bank/default left supplies the direction.
- Evasion regenerates after an inactivity delay. Boost retains its existing independent pool, and wing energy remains encounter health. Insufficient evasion rejects a maneuver with visible feedback; ordinary steering remains available. Holding a key does not repeatedly trigger maneuvers.
- Enemy tracking follows actual motion. A steady course gives drones a better firing solution; changes in heading and velocity weaken prediction and acquisition. Merely holding contradictory keys does not count as evasion. A sustained new steady course becomes predictable again.
- A visible warning displays ENEMY TRACKING, ENEMY TARGET LOCK or INCOMING FIRE as appropriate. It includes a direction cue and a tracking meter, distinct from the player's green breath-lock indication. Unsettled shots can follow the tracking windup before a firm lock is acquired; a firm lock gives a tighter firing solution. Short synthesized cues follow warning escalation only when sound is enabled. Reduced motion retains readable steady warnings.
- Shorter attack cycles and bursts increase pressure, with a visible windup before fire. Tuning is reversible and requires human difficulty/control review. Camera framing moves closer while preserving a stable horizon.

Flight, enemies, projectiles, targeting and damage remain active during word prompts under [SD-041](2026-10-30-live-spelling-flight.md). B joins the reserved flight keys and cannot be demanded as a spelling letter. F1/help, ordinary pause, interruption cleanup, retry and the existing single-target breath behavior remain. Pause stops simulation timers and recharge; retries restore the encounter only. Campaign saves and learning records are outside this lab.

## Superseded guidance and acceptance

This replaces SD-037's unlimited roll availability and SD-042's prior camera distance in the local lab. It does not change earlier story, asset provenance or publication boundaries. Costs, regeneration, tracking thresholds, burst timing and the B binding are agent implementation choices, not newly approved story canon.

Verify resource depletion/rejection/recharge/reset, physical break trajectory, steady-versus-maneuvered tracking, roll lock breaking without projectile deletion/immunity, stronger telegraphed fire, actual controls and warning UI, pause/focus/retry and retained word-lock/save boundaries. The receipt separates executed technical checks from human difficulty, visual and device-performance review.
