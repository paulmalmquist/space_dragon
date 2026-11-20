# Owner source — SD-090

Tracking correction only: the Oscar worktree's earlier SD-088 label is a historical alias for SD-090; the original attachment below is unchanged. [Collision crosswalk](../docs/decisions/2026-11-01-combat-controller-identifiers.md).

Captured November 1, 2026 (America/New_York). CONFIRMED local implementation request; work state tracked separately.

Additional owner wording:

> we also need to be able to not just turn left but angle left

Attachment, verbatim:

You're working in the Space Dragon repo. Add the combat upgrades below to the Unity Dogfight encounter. I'm the owner, and this prompt authorizes this work. I want it to be more fun without being more complicated.

## 1. Start here
Read these before editing:
- AGENTS.md
- docs/engineering/UNITY_DOGFIGHT.md
- docs/engineering/UNITY_DOGFIGHT_HANDOFF.md
- docs/combat/CB-004-dragon.md
- docs/decisions/2026-10-30-dogfight-evasion.md (SD-043)
- docs/decisions/2026-10-30-live-spelling-flight.md (SD-041)
- docs/decisions/2026-10-30-dogfight-enemy-standoff.md (SD-051)

Code lives in unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/. The main files are FlightState, EnemyPilot, TacticalState, BreathState, HomingMissile, DogfightEncounter, DogfightHud and DogfightTuning.

Before editing:
- Check git status and re-read the remote head. Preserve any uncommitted work.
- Work on a new branch, feat/dogfight-combat-upgrades.
- Confirm no other Unity Editor or build is using this project. Only one can run at a time.
- Record this request in ideas/INBOX.md and the ledger under the next unused SD number. Keep the authority and work-state labels separate.

## 2. Rules for every feature
- Add at most one new button across this whole job (T, Stage 4). Everything else reuses existing input.
- Add no new meters, currencies, scores or combo counters. Rewards use what already exists: evasion energy, boost energy, hull and missile charges.
- Every enemy must be explainable in five words and have one obvious answer.
- Every threat must be readable by shape and sound, never color alone.
- Keep authoritative rules in plain, testable state classes. HUD, animation, effects and audio only observe state.
- All numbers go in DogfightTuning and are starting guesses. Setup preserves the existing tuning asset, so confirm that new fields get their intended values.
- Give each stage an enable flag in DogfightTuning, on by default, so I can switch it off to compare.
- Pause, focus loss and Restart must correctly stop and fully reset every new timer, state and effect.
- Reduced motion removes slow motion, freeze-frames and shake. Game outcomes must stay the same.
- Sound stays opt-in. Use the existing cues and tones.
- Update the in-game help and the controls table in UNITY_DOGFIGHT.md.
- Use labeled placeholder art and effects. Don't change the dragon asset, rig or asteroid colliders.

## 3. Build in this order, one commit per stage

### Stage 1: Perfect roll
Today any roll breaks locks and spends 40 evasion, and timing earns nothing. Keep normal rolls exactly as they are.
- A roll is perfect if it starts when an enemy bolt or hostile seeker missile is on course to hit within 0.4 s. Predict this with a swept check against the 3.3 m player sphere.
- Rewards: refund the roll's full evasion cost, play 0.35 s of slow motion at 40% speed with a whoosh and red afterimage, and release a cosmetic flare burst.
- The threats that triggered it miss. Those specific projectiles can't hurt the dragon, and a missile overshoots. All other projectiles can still hit. This is a narrow exception to SD-043's no-immunity rule, so record it as a decision.
- Rolling with no threat near, or too early, is just a normal roll.
- The flare burst is automatic and replaces the separate flare button drafted in the starting kit. Don't add a flare button.
- Apply slow motion through the encounter's own time step if practical, and make sure it can't get stuck on through pause or focus loss.

### Stage 2: Enemies that need different tools
There is currently one enemy behavior and a fixed spawn of 3. Add an EnemyRole. Fighter must keep today's numbers and pass today's tests.

| Role | Rule | Answer |
|---|---|---|
| Fighter | Current standoff and bursts | Plasma |
| Racer | Fast strafing, low health, plasma aim assist reduced | A guided missile destroys it |
| Grappler | Closes in and latches on: 30% less speed, no boost | Roll shakes it off and stuns it for 2 s |
| Gunship | Slow, with a front shield that blocks plasma and missiles and shows "SHIELDED" | Word-charged breath breaks the shield, then anything can hurt it |

- Replace the fixed spawn with a short data-driven wave list: (1) 3 Fighters, (2) 2 Fighters + Grappler, (3) Fighter + 2 Racers, (4) Gunship + 2 Fighters.
- Show the wave number as a brief message, not a new panel. Victory still means all enemies are disabled, and flight stays active for salvage.
- Give each role a distinct silhouette and sound.
- Every wave must be winnable using F1 assisted charging. Add a deterministic test for this.
- These role names are placeholders. Check the current story docs for conflicts, but don't change canon.

### Stage 3: Claw finisher
- A non-shielded enemy under 25% health shows a pulsing "wounded" shape cue.
- While boosting, passing within 30 m of it inside a 40° cone off the nose triggers the finisher automatically. No new button.
- The enemy is disabled, followed by a 150 ms freeze-frame, a heavy impact sound, a shockwave, full boost energy and +15 evasion.
- It still drops exactly one salvage item.
- Enemy colliders are already removed, so this is a distance check that adds no collision damage.
- Use a placeholder lunge or jaw pose that doesn't depend on a specific rig. Don't let it take over flight control.

### Stage 4: Wingman attack call
- Add one lab-only wingman with a lightweight placeholder model flying loosely in formation. It can't be destroyed and has no crew role.
- T sends it on a 4 s strafing run at your locked target, or at the nearest enemy if nothing is locked. Cooldown is 20 s, shown as a small icon. It deals modest damage and can't finish a shielded Gunship.
- When tracking on you rises sharply, it calls "On your tail!" with text and a tone. Limit how often this repeats.
- Add T to BreathState's ReservedLetters. Check the word bank still validates.
- Campaign unlock timing is out of scope.

### Stage 5: Rocks as weapons
- A hostile missile that blows up on scenery near you gets a big explosion, a "ROCK SHOT!" callout and +15 evasion.
- Mark 3-5 asteroids as gas pockets, using a distinct shape cue, vents and a hiss. Any weapon detonates them, damaging enemies within 120 m and you within 40 m. Each detonates once per encounter and resets on Restart.

### Stage 6: Multi-target breath
BreathState already accepts a target capacity.
- Lab capacity is 3. After a word charge, sweep the reticle across ships to add locks, with visible tick marks.
- Space fires one beam or sequence with exactly one impact per locked target.
- Holding Space, target loss and destroyed targets must all be safe. Keep the existing word-to-lock-to-blast rules otherwise.
- Don't add campaign upgrades.

### Stage 7: Repair code
Hold Tab plus 1/2/3 stays exactly as it is. Add an optional speed bonus.
- Once a repair starts, show a 3-step code, one pulsing digit at a time, entered with the number keys.
- Finishing it halves the remaining repair time. Ignoring it means a normal repair. Wrong keys do nothing, with no penalty or deadline.
- Add a pause-menu option: Numbers (default), Sums (single-digit answer, sums within 5) or Off.
- Flying, damage and repair interruption stay live. Store no learner records and make no mastery claim.
- I authorize this as a scoped exception to the calm-learning rule, like SD-041. Record it as a decision that applies only to this optional bonus.

### Stage 8: Comeback
- The first time hull reaches zero in an encounter, the dragon tumbles for 5 s instead of being disabled. Show "SONG" using the same one-letter-at-a-time prompt as the word charge, but separate from breath-charge state.
- Success restores 30 hull, gives 2 s of protection and breaks all enemy locks. F1 can complete it, marked as assisted.
- If time runs out, or on a second hull failure, run the existing disabled flow. Restart resets it.
- Use the word SONG. Words can't use reserved flight keys, and WAKE would.

## 4. Verify
Add EditMode tests for each new rule, including failure cases, reset behavior and repeated input. Don't weaken existing tests. Extend RequestSnapshot and QaFixture as needed so browser checks can tell fixture setups from natural flight.

Run, and record separately:
- npm run unity:dogfight:prepare
- node tools/unity/prepare-heroic-dragon.mjs
- node tools/unity/prepare-dogfight-audio-v002.mjs
- npm run unity:dogfight:setup
- npm run unity:dogfight:test
- npm run unity:dogfight:build
- npm run unity:dogfight, then npm run unity:dogfight:verify on both WebGPU and WebGL2

Also check the current handoff for any later required intake step, and run the repo's foundation checks. Write a receipt in docs/reports/ from docs/templates/VERIFICATION_RECEIPT.md. Mark difficulty, fun, comfort, sound and sustained performance as NOT TESTED unless a person actually checked them. Keep failures in the receipt.

Update UNITY_DOGFIGHT.md, CB-004, STATUS, the roadmap and the ledger where their state changed. Open a PR. Don't merge or deploy.

## 5. Scope and when to stop
Out of scope: campaign saves or rewards, story canon changes, multiplayer or backend, new dependencies, purchases, publishing, and changes to the Three.js lab.

Stop and ask me only about a canon change, a purchase, or another active Unity Editor. Otherwise make the call and keep going. If a stage is blocked, leave its flag off, record why, and continue with the next stage.

## 6. Done means
- [ ] All eight stages work, or any blocked stage is off and explained.
- [ ] With all flags off, the encounter plays as it did before this work.
- [ ] Only one new button was added, and it's in the help.
- [ ] Every wave can be won with assisted charging.
- [ ] Pause, focus loss and Restart leave no stuck state.
- [ ] Tests, the player build and both browser backends pass, or failures are reported honestly.

Your final message covers: how to launch it, a 30-second "try this first" list, the flag names, what passed, what's NOT TESTED, and the PR link. Keep it short.

The real test is mine: I want to immediately play again, and the kids get what each enemy needs without being told.

Owner clarification, November 1: “Tilt/bank left independently”.
