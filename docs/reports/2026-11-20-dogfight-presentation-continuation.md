# Verification receipt — continuing the Dogfight line (SD-095)

Work ran from November 20 to November 22, 2026, in a cloud container. **Nothing in this receipt was run in Unity.**

## Scope

- **Task and authorization:** the owner's November 20 request to continue the Dogfight polish that Codex left, recorded in [the inbox](../../ideas/INBOX.md) as SD-095. [Decision](../decisions/2026-11-20-dogfight-feel-and-clarity-pass.md). [How the two open lines were joined](../decisions/2026-11-20-dogfight-and-traversal-integration.md).
- **Base:** `main` at `5b86dda`. Branch `claude/blissful-fermi-3ir80u`, [PR #37](https://github.com/paulmalmquist/space_dragon/pull/37), draft.
- **Commits:** `2a7c378` joins PR #35 (tip `a30a162`) and PR #36 (tip `fcfebfa`, renumbered in `81c63a6`). `c494bdc` adds the two engine-free checks. `5d61101` adds the feel and clarity pass. Later commits on the branch hold corrections from review and these records.
- **Changed paths:** `unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/` (six new files, six changed), `Tests/EditMode/Dogfight/` (six new test files), `Editor/Dogfight/DogfightProject.cs` (the build identifier only), `tools/unity/dogfight-statetest/`, `tools/unity/dogfight-compile/`, `package.json`, `.github/workflows/foundation.yml`, and the records named below.
- **Environment:** Ubuntu 24.04 container, 4 CPUs, no GPU. .NET SDK 8.0.134, Node 22.23.5, Python 3.13.18. **No Unity Editor, no Blender, no shader compiler, no PowerShell.** Git LFS content pulled (239 files).

## Checks

| Check or exact command | Result | Evidence and limitation |
| --- | --- | --- |
| `npm run unity:dogfight:statetest` | PASS | **269 of 269** on the final code. 187 are the Dogfight line's own state tests, unchanged. Four cover the moved swept-sphere test. 78 are new: impact camera, kill sequence, hit confirmation, label layout and HUD mode. The Unity math types come from a hand-written stand-in, not from Unity. |
| `npm run unity:dogfight:compile` | PASS | 0 errors, 0 warnings. Whole Dogfight runtime (one file left out) and 36 of 39 EditMode test files, against public UnityEngine 2021.3 reference assemblies. **Compiles only; runs nothing.** Does not prove a Unity 6 import. |
| The existing state tests on the Dogfight line's unchanged sources | PASS | Run before any source was edited: 183 of 183 across 18 test classes. A nineteenth, the wing laser query, joined after the change described below. These tests passed in Unity on the Lenovo on November 1, so their passing here is the evidence that the stand-in agrees with Unity for what they cover. |
| `npm run unity:playground:coretest` | PASS | 31 of 31, traversal and arena rules. Unchanged code; run to check the joined tree. |
| `npm run unity:traversal:parity` | PASS | No failures; largest difference 7.2e-16. |
| `npm run unity:playground:compile` | PASS | 0 errors. |
| `npm run test:unit` | PASS | 333 of 333. **First run: 326 of 333.** Seven tests read model files that were Git LFS pointers in the fresh checkout. They passed after `git lfs pull`, with no code change. |
| `npm run build` (typecheck and production build) | PASS | Browser labs only. |
| `python3 tools/check_foundation.py`, the Python unit tests, `python3 tools/verify_family_references.py` | PASS | 51 Python tests; 18 reference images. Records and structure only. |
| Hosted CI on `c494bdc` | PASS | 16 of 16 check runs, including the new `unity-csharp` job and the Earth, Arena, Town Drive, Dogfight and production browser suites. Software-rendered Chromium; it does not run Unity. |
| Hosted CI on the feature commit | See the pull request | Not finished when this receipt was written. |
| Unity Editor setup, `npm run unity:dogfight:test`, Web build, `npm run unity:dogfight:verify` on WebGPU and WebGL2 | NOT TESTED | No Editor here. |
| The seven new `KillSequenceVisualTests` and two new `EnemyRoleVisualTests` | NOT TESTED | They build real scene objects and need the Editor. Compiled only. |
| The joined tree (Dogfight plus Playground and Arena) importing in Unity 6000.6.7f1 | NOT TESTED | Never opened. |
| All switches off equals `combat-upgrades-v002` | NOT TESTED | Argued line by line from the code; the 11-case baseline browser run would prove it. |
| Browser suites on this machine | NOT TESTED | Left to hosted CI. |
| Anyone playing it; how it looks, feels or sounds; comfort of the shake for children; frame rate; a physical controller | NOT TESTED | |

## What went wrong along the way

- **The Unity reference assemblies cannot execute.** A probe called 38 math functions from `UnityEngine.CoreModule.dll` under plain .NET; every one failed to load. That is why the state runner carries its own small math stand-in.
- **One class could not join the state runner.** `WingLaserQuery` called a helper on the scene component. The swept-sphere test moved to `CombatGeometry`; the encounter forwards to it. Behaviour is unchanged and the laser tests now run here.
- **One new test was wrong, not the rule.** A tumble test sampled the wreck one step early. The test was corrected.
- **A new hook would have broken an existing Unity test.** `WingmanAttackIntegrationTests` drives one encounter method on a host that was never started, and detonates a gas pocket. The first version of the gas hook would have thrown there. Every new hook now does nothing until the encounter has started. **That test has not been run since**, because it needs Unity.
- **Planned checks that did not happen.** A usage limit stopped three of seven background readers and a three-part design critique before they reported. The design went ahead on the four reader reports that did arrive and on the author's own reading of the code.

## Independent review of the feature commit

Two reviewers read commit `5d61101` without running it, one for Unity runtime behaviour and one for rules, resets and compatibility. Neither could run anything either.

**Found sound, by reading:** no rule reads a shaken camera; every unpaused path re-applies the camera; all four switches off is equal to the earlier code line for line; the two existing tests that drive an encounter that was never started are unaffected; neither browser verifier has an assertion whose outcome changes with the new defaults; pause, focus loss and Restart clear the new state.

**Found and fixed in the commit that follows this one:**

| Finding | What was done |
| --- | --- |
| On leaving play or unloading the scene, one unguarded line in the kill visual could throw, and the encounter's existing cleanup after it would then be skipped. Conditional on the order Unity destroys objects in, which cannot be known from the code. | The line is guarded, the visual rebuilds if its objects are gone, and the new cleanup now runs last, after the old. |
| A Racer, Grappler or Gunship lost its role silhouette the instant it was disabled, so the wreck tumbled as a bare drone. | A wreck keeps its silhouette and drops only its shield and stun cues. Two Unity tests added. |
| The impact count in the QA snapshot survived Restart. | Restart now clears it. State test added. |
| The kill-sequence count in the snapshot also counted gas rings. | Counted separately: `killSequencesStarted` and `gasRingsStarted`. |
| With reduced motion, a gas pocket's ring was drawn at 30 percent of the real blast reach. | It is still, but at full reach. A kill's ring stays small. State test changed to say so. |
| The clearer HUD ended 3.2 seconds after the ship went down, so the hidden prompts came back under the closing overlay. | The mode now lasts until Restart. |
| The new presentation calls ran before a kill was counted and its salvage dropped. Nothing was found that makes them fail, but none of them has ever run. | The count and the drop now happen first, so a presentation fault cannot change a result. |
| Two values that act like tuning were constants in code. | The reduced-motion ring fraction and the aim radius are now in `DogfightTuning`. |

**Not changed:** the pool of six blast slots and the label box sizes stay as constants, like the HUD layout numbers already in the code.

The fixes were checked the same way as the rest: 269 state tests and a clean compile. **They have not been run in Unity either.**

## Review and release

- **Implemented outcome:** as described in the [decision](../decisions/2026-11-20-dogfight-feel-and-clarity-pass.md) and the [guide](../engineering/UNITY_DOGFIGHT.md).
- **Human review:** NOT REVIEWED. Nobody has seen or played any of it.
- **Merge to `main`:** done on November 22 on the owner's instruction, "Can you push all work to main". `main` moved from `5b86dda` to `ea1fc65` as a fast-forward. PR #35, PR #36 and PR #37 closed as merged. This replaces the November 1 review-only instruction on PR #35.
- **Publication or deployment approval:** NOT GRANTED. The repository has no deployment step and none was run.
- **Rollback:** turn off any of `EnableImpactCamera`, `EnableKillSequence`, `EnableHitConfirm`, `EnableHudClarity` in `Generated/DogfightTuning.asset`. All four off is the earlier encounter. Commit `a30a162` (the branch `feat/dogfight-combat-upgrades`) still holds the verified `combat-upgrades-v002` sources, and `main` before this work is `5b86dda`.

## First run on the Lenovo

One Editor at a time on this project. From the repository root:

```powershell
git switch main
git pull
git lfs pull
npm run unity:dogfight:statetest
$env:SPACE_DRAGON_DOGFIGHT_ASSET = 'oscar-v001'
$env:SPACE_DRAGON_DOGFIGHT_TEXTURES = 'bc7'
npm run unity:dogfight:setup
npm run unity:dogfight:test
npm run unity:dogfight:build
npm run unity:dogfight
npm run unity:dogfight:verify
```

Look at these first, because they have never run:

1. **Does the project compile in the Editor at all?** Two more assemblies (Playground, Traversal) are in the tree for the first time alongside Dogfight.
2. **The EditMode count.** It was 265. It should now be 265 plus the new tests, with `WingmanAttackIntegrationTests` and `KillSequenceVisualTests` passing.
3. **The tuning asset.** After setup, `Builds/dogfight-combat-tuning.json` should show the four new switches as true and the new numbers as written in `DogfightTuning.cs`.
4. **The 11 baseline cases with `SPACE_DRAGON_DOGFIGHT_BASELINE=1`.** They prove that all switches off is still the earlier encounter.

## Try this first, about thirty seconds

1. Fly at the first three Fighters and hold fire. Small white ticks should flick on the reticle as shots land.
2. Finish one. It should flash and tumble for a moment, then go in a ring. The reticle shows larger amber ticks and a diamond.
3. Let a bolt hit you. The view should jolt briefly and settle.
4. Press Escape, turn Reduced Motion on, and repeat. No jolt, no tumble; a small still ring.
5. On wave four, shoot the Gunship from the front. Two upright bars on the reticle mean the shield stopped it.

If any of it is unwelcome, the four switch names above turn each part off.
