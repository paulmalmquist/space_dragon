# Interaction contracts

**Status:** implementation rules for authorized features; not a claim that these systems exist. Current story authority is [Act I](../story/ACT_I_BUILD_THE_DRAGON.md) and the [campaign structure](../story/CAMPAIGN_STRUCTURE.md). The [October 30 campaign/party decision](../decisions/2026-10-30-campaign-and-mission-party.md) governs mission parties.

## Common interaction lifecycle

A detectable target offers one clear action. Validate prerequisites, accept a semantic action, update game state once, present feedback, and create a checkpoint at the documented boundary. Repeated taps during feedback must not repeat rewards or queue an unbounded action backlog. Cancel, skip, retry and interruption behavior must be defined for each interaction.

| Interaction | Required behavior |
| --- | --- |
| Component recovery | Award the stable component ID once; leaving/re-entering and reloading preserve it. |
| Installation at home | Require the recovered component; install once; a replayed cinematic never consumes or awards it again. |
| Ability use | Validate the current state and show an understandable result; opening the menu, or any later approved avatar swap, cannot bypass cooldown/state guards. |
| Learning checkpoint | Give help and an assisted completion path. Required progress never depends on independent correctness. |
| Race | Clearly signal start/finish; recover from leaving the route. Steering assistance is independent of learning level. |
| Combat | Use readable warnings and forgiving recovery; disable, capture or retreat rather than graphic family injury. |
| Scene transition | Define checkpoint, load failure recovery and input ownership; no duplicate listeners or hidden active controls. |
| Pause/resume | Stop relevant simulation/timers, release held inputs and restore control without unintended movement. |

## Cinematics are not the database

A skip must resolve to the same intended story state as normal completion. A replay presents a past event without creating fresh rewards. An interrupted cinematic resumes or restarts safely from an explicit checkpoint. Define the checkpoint boundary before implementing the animation.

## Avatar, learner and party

The active learner determines educational scaffolding. The selected avatar determines suit presentation and available abilities. Action assistance controls steering, timing and defensive help. These are independent settings; neither avatar swaps nor family turns should overwrite another child's observations.

**CONFIRMED mission-party direction (October 30, 2026):** a mission has **at most three active family members**. The five-person family cast remains intact; it is not a five-person simultaneous mission requirement.

- Exactly one active member is the directly controlled **leader**.
- One designated **sidekick** acts mostly autonomously and has a **sidekick action button** for the player's request.
- **PROPOSED interpretation:** an optional third active member provides autonomous support. The third member's behavior, any separate action button and character swapping remain OPEN; none is confirmed by the party cap.
- Design each mission for an available, compatible party of up to three suits. Required traversal, learning, combat and recovery must work with that party; an unavailable family member or a requirement to activate all five suits cannot block progress.
- The exact sidekick binding, action selection, cooldowns and AI behavior remain **OPEN**. Any older control table or companion-behavior example is a proposal subject to these constraints.

Reserve stable party IDs and keep leader, designated sidekick and optional support distinct from learner and assistance settings. This direction supersedes older four-companion/whole-family mission assumptions and constrains the bookmarked Line Leader idea; it does not implement companion navigation, split parties or multiplayer. Automatic companions are local agents, not network players. Follower failures need a recover/regroup option rather than a permanent mission lock.

The dragon retains **one pilot** and no crew-role minigames, crew action buttons or backend dependency. Active flight missions also respect the mission-party cap; passengers/cinematics are not an undocumented way to add active family participants beyond three. How the nonactive family is staged during travel remains OPEN; the five-person cast is preserved.

## Child-facing feedback

Use one immediate instruction, a visible objective, optional repeated audio and clear success feedback. Never make reading simultaneous with fast steering necessary for progress. Color is not the only cue. Recovery should not erase earned parts or shame a child. No sibling rankings, purchases, chat or timers attached to required learning locks.

**Owner exception — SD-041:** [live spelling flight](../decisions/2026-10-30-live-spelling-flight.md) explicitly keeps the Dogfight Lab's word prompt concurrent with flight, enemy attacks and dodging. Do not restore automatic pause/autopilot or spelling immunity there. This scoped direction supersedes the general simultaneous-reading guidance for that mechanic; it does not alter other learning interactions, normal pause or wrong-key/help safeguards.

**Dogfight evasion — SD-043:** [the owner direction](../decisions/2026-10-30-dogfight-evasion.md) adds readable hostile tracking/lock/fire warnings and heavier fire. Steady motion gives enemies a stronger firing solution; actual heading/velocity changes spoil it. Accepted Q/E rolls spend finite evasion energy and break enemy locks, while B + steer spends from the same pool for a physical braking hard turn. Resources, targeting and damage belong to game state, not visual effects; no maneuver deletes airborne shots or grants immunity. Boost/health are separate pools. Reject insufficient energy visibly, accept fresh presses rather than repeat spam, freeze timers during normal pause, and restore only the encounter on retry. The later SD-086 spacecraft contract below supersedes fresh-press-only B for the current Oscar profile; Q/E retain fresh-press guards. Preserve live spelling and the existing save boundaries; [the receipt](../reports/2026-10-30-dogfight-evasion.md) owns historical verification.

**Cockpit presentation — SD-044:** [relative radar and layered sound](../decisions/2026-10-30-dogfight-cockpit.md) observe the existing encounter state. Radar projects living bogeys into the dragon flight plane with bearing, elevation and explicit range limits; it cannot alter targeting/damage. Keep the chase view and live letter prompts unobstructed. Sound stays opt-in, bounded and cleaned up through pause/mute/retry/return. [The receipt](../reports/2026-10-30-dogfight-cockpit.md) owns actual technical evidence and human visual/audio limitations.

**Enemy standoff — SD-051:** [the owner steering](../decisions/2026-10-30-dogfight-enemy-standoff.md) replaces pursuit/flyby movement with steadier player-relative targets and gentle drift. It supersedes only the movement presentation from SD-043; hostile tracking/fire, health/damage, charging, finite rolls/evasion and save boundaries remain. [The combined receipt](../reports/2026-10-30-mechanical-dragon-integration.md) owns the new logic/browser evidence and human difficulty limitations.

**Asteroids and mechanical loss — SD-053:** [detailed solid asteroids/crash feedback](../decisions/2026-10-30-asteroids-mechanical-crash.md) adds collision/graze/fatal-loss outcomes to the isolated lab. Collision state and once-per-contact damage guards belong to logic, not a debris callback. Fatal damage/crash starts a bounded mechanical destruction sequence before recovery; normal pause freezes its clock and retry restores only the encounter at a safe spawn. Graphic effects concern the machine; they do not establish family injury/death lore or change any campaign/learning/save record. [The new receipt](../reports/2026-10-30-asteroids-crash-breath.md) owns actual collider, effect, input/recovery and performance evidence.

**Charged windup/roar/beam — SD-054:** [the Space-bar direction](../decisions/2026-10-30-charged-breath-windup-roar.md) refines the existing word-charge/target-lock action. Keep fresh-press and once-per-charge/impact guards, with flight, enemy fire, dodging and normal damage active throughout windup/beam. Normal pause freezes attack time; crash/reset/interruption must not leave a hidden later impact or duplicate a charge/reward. Visual/audio callbacks observe the authoritative attack timeline. Retain the mechanical muzzle, one-target capacity, opt-in bounded local sound, reduced motion and existing saves; timing/appearance and human intensity review remain separate.

**Oscar spacecraft controls and weapons — SD-086 continuation:** the [November 1 direction](../decisions/2026-11-01-dragon-shaped-spacecraft.md) is CONFIRMED; `oscar-spacecraft-v002` is IMPLEMENTED / VERIFIED for the named 103 Unity tests, build and both 11-case Chrome suites in the [receipt](../reports/2026-11-01-dragon-spacecraft-pass.md), with separate AI image review and human review still open. Hold B to brake and make a sharper evasive turn with live steering, paying an initial evasion cost plus continuous drain. Release/exhaustion stops the maneuver; exhaustion prevents recharge/retrigger until release. Pause/focus loss cancels held intent without a refund and requires release before rearming. Q/E remain finite, fresh-press rolls with a continuous eased rotation; neither maneuver grants immunity. Stable spacecraft wings/head and visible propulsion replace organic flapping for this profile while original clips/assets remain recoverable. Left mouse fires two instantaneous lasers from the named wing attachments: resolve the nearest target or blocking scenery on each ray in the firing update, within range and the existing volley cadence/damage budget. Both queries use the pre-volley world; visual pulse lifetime cannot defer or duplicate hits. Richer Space windup/beam effects remain observers of SD-054's guarded timeline. Keep aiming/mouse mode, right-mouse zoom, live spelling/dodging, reduced motion, pause/reset and save boundaries.

## Current Dogfight combat increment — SD-090

The [November 1 combat decision](../decisions/2026-11-01-dogfight-combat-upgrades.md) supplies these scoped lab overrides. All eight stages and independent bank are **IMPLEMENTED / final player verification IN-PROGRESS**; setup and **265/265 Unity EditMode tests pass**, while Web build and actual Chrome backend evidence remain pending; [the receipt](../reports/2026-11-01-dogfight-combat-upgrades.md) owns subsequent evidence. Earlier verified SD-086 behavior remains the comparison baseline, not verification of the new rules.

- An accepted perfect roll refunds its evasion cost and makes only the stable hostile projectile IDs predicted to intersect the 3.3 m player sphere within 0.4 seconds harmless to the player. Other shots remain dangerous. This narrowly supersedes SD-043/SD-086's no-immunity wording; normal rolls and their lock breaking remain. The flare is automatic cosmetic feedback, not another control. Reduced motion omits slowdown/freeze while preserving outcomes at equal simulation time; pause/focus clears transient timing.
- Four lab roles and sequential waves introduce specific counters. A guided missile destroys a Racer; an accepted roll removes a Grappler latch; first charged breath breaks a Gunship shield without hull damage, after which attacks can damage it. Every wave has an F1-assisted breath path. Destruction, salvage, automatic claw rewards and scenery rewards are guarded once. T requests the lab-only wingman and is reserved from words; it does not add a campaign crew role. Breath can hold three distinct targets, with at most one impact per target per attack.
- Repair remains optional-code independent: normal duration, costs and hit interruption still apply when the code is ignored. Numbers/Sums/Off controls only the bonus prompt; completion halves remaining time once per repair, wrong/repeated keys do not advance or punish, and the system-selection press cannot also fill the first digit. Resources commit only on normal successful repair completion. Flight/damage stay live; this is a narrow calm-learning exception with no learner record or mastery claim.
- The first hull failure offers a separate five-second **SONG** recovery. Completion restores 30 hull, breaks hostile locks and provides two seconds of protection; F1 marks assistance. Timeout or a second hull failure uses the existing disabled flow. This timed live-encounter recovery is scoped to the lab, does not mutate breath progress and creates no campaign death/recovery lore. Normal pause freezes its clock; restart resets its one-use guard.
- The owner-confirmed independent tilt uses right mouse + Q/E with the separate `EnableIndependentBank` switch. It changes visual bank only; steering, heading, travel and resources are unaffected. Release smoothly returns to automatic steering bank, right mouse still zooms, and Q/E alone retain full rolls. New bank input cannot disrupt an active roll. T remains the only new key.

These exceptions do not change other learning interactions, campaign state, family injury rules or the original Three.js lab. Tests must still establish assisted wave completion, all-switches-off baseline comparison and repeated input/target loss/pause/focus/restart safety. Difficulty/fun, comfort, sound and sustained performance require separate evidence.

## Minimum behavior tests when implemented

**Unity Dogfight controller extension — SD-089:** the [later owner request and mapping](../decisions/2026-11-01-unity-dogfight-playstation-input.md) put PlayStation bindings in the current pass while preserving keyboard/mouse completion. The implemented mapping has software coverage in the combined 265/265 passing EditMode run; final v002 browser verification remains pending. Route both through the same authoritative actions. Menu/repair context consumes controller buttons before combat; Share/Create + D-pad Up selects propulsion repair without also assisting breath, and L2 + bumpers banks without triggering rolls. Pause/focus/device loss clears held intent and requires neutral/release rearming. D-pad Up help applies only to the active breath/SONG prompt and records assistance; optional repair-code digit entry is not required for ordinary repairs. Physical DualShock 4/DualSense USB/Bluetooth, control feel and haptics remain NOT TESTED; no rumble is promised. Simulated input cannot close those gates.

- Recover, reload, and return: inventory and checkpoint agree.
- Double-trigger a pickup or replay a cutscene: exactly one award.
- Skip and interrupt installation: no missing or duplicated component.
- Use all hints: story advances; learning observation records assistance.
- If avatar switching is later approved: learner-local ID and observations remain unchanged.
- A mission uses no more than three active family members, with one controlled leader, one designated sidekick and optional autonomous support.
- Sidekick requests cannot activate an absent member or grant the optional support member an unconfirmed extra control; missing suits never create an unavoidable mission gate.
- Lose focus, pause and resume: no stuck input or surprise time penalty.
- Fail a scene load or fall out of bounds: return/retry is available.

These are acceptance scenarios. Party/sidekick behavior is not implemented or verified by this document. Avatar-switch checks apply only if that OPEN feature is later selected; they do not approve it. Other scenarios are not verified until executed against the corresponding runtime behavior.


## Town Drive Lab — SD-046

Drive checkpoints must be crossed in route order and direction; repeated/reversed triggers cannot add another visit or completion reward. Reload places the car at the saved road pose with zero velocity. R and two-second stuck recovery return to that checkpoint; no damage/game-over state is introduced. Pause, blur and hidden-page transitions zero movement and clear held keyboard input; controller movement requires neutral before rearming. Assist is an action setting, independent of learning/avatars. The lab grants no story inventory or mastery. [Decision](../decisions/2026-10-30-town-drive-lab.md); [evidence](../reports/2026-10-30-town-drive-lab.md).
