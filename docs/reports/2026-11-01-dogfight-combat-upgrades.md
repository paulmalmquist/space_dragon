# SD-090 — Unity Dogfight combat verification

**Identifier/provenance:** early combat commits labeled SD-088 refer to this SD-090 work, not the concurrent Town Drive slice; [crosswalk](../decisions/2026-11-01-combat-controller-identifiers.md). [SD-089](../decisions/2026-11-01-unity-dogfight-playstation-input.md) adds controller bindings to the final combined pass; earlier check counts do not automatically cover that later change. Physical DualShock 4/DualSense USB/Bluetooth and haptics remain NOT TESTED.

**State:** in-progress; not yet verified. Owner-authorized local implementation. No deployment or merge.

## Baseline and scope

Worktree `C:\Projects\space_dragon_oscar_dragon`, branch `feat/dogfight-combat-upgrades`. Baseline commit `901862a` preserves the preceding Oscar spacecraft pass. `7b5a732` reconciles remote main `5b86dda` while retaining both Town Drive and Dogfight records. Only inbox and LFS attributes required additive conflict resolution. Original checkout and other channels remain untouched. No Unity Editor was active at preflight.

Full frozen player: `artifacts/unity/oscar-spacecraft-v002-rollback`. Baseline build-receipt SHA256 `45f647cd193bf4f57a85f91bdb9187299a532084459bc08dc97093179b7696ab`. The earlier pass's 103 EditMode and 11 cases per Chrome backend apply only to that baseline, not this new work.

All eight stages and independent banking are implemented. Current validation remains in progress; browser and performance claims await the built player. The owner clarified independent tilt, implemented with RMB + Q/E and a separate comparison switch. [Owner source](../../ideas/2026-11-01-dogfight-combat-upgrades-source.md), [decision](../decisions/2026-11-01-dogfight-combat-upgrades.md).

## Failures retained

Initial baseline commit failed because this shell had no configured Git identity; retried successfully with the repository's established `Codex <codex@localhost>` identity supplied per command. No global identity setting changed. The first merge attempt was consequently rejected before modifications; after baseline commit the merge required preserving both appended records in two files.

## Human limits

Difficulty, fun, comfort, sound, sustained performance and release approval: **NOT TESTED / NOT APPROVED**. Automated rule checks cannot establish those qualities.

## Implementation checkpoints

| Commit | Increment |
| --- | --- |
| `de24d35` | Stage 1: swept-threat perfect roll, specific projectile IDs and refund. |
| `7183c25` | Stage 2: four role states, movement adapters, four data-driven waves and shield/latch cues. |
| `718207f` | Stage 3: automatic wounded-target finisher, bounded rewards and render-only impact/lunge. |
| `1d876fb` | Stage 4: T wingman, cooldown, tracking warning; T reserved from word prompts. |
| `dd8022f` | Stage 5: actual missile/scenery reward and one-shot gas pocket damage; existing colliders preserved. |
| `3d8a586` | Stage 6: three swept locks, three mouth beams and one authoritative impact per ID. |
| `f43ce5f` | Stage 7: optional Numbers/Sums/Off repair bonus with selection-digit isolation. |
| `b119c49` | Stage 8: separate five-second SONG/F1 comeback, one hull restore and guarded terminal loss. |
| `595053a` | Owner clarification: independent bank on existing RMB + Q/E, ordinary rolls retained. |

New numbers and default-on feature switches are in DogfightTuning. Setup writes the actual serialized values to `Builds/dogfight-combat-tuning.json`; the existing 120-point missile balance is preserved. Current runtime still uses the same Oscar GLBs, rig, source assets and shader art. No Blender source was changed in this combat pass.

## Executed checks so far

- Original ten pinned asset inputs prepared; heroic, five v002 audio cues, Oscar base and mechanical addon verified. The addon Khronos check has zero errors and one retained warning. No asset regeneration or promotion inferred from validation.
- Foundation PASS; Python 51 tests OK, two expected skips; 18 family reference checks PASS.
- First Unity attempt refused a simultaneous Town Drive build (PID 27964). No other process was stopped. The runner waited until that batch job exited, then used the existing Dogfight project exclusively.
- First actual EditMode run: **230 / 236 passed, six failed**, `artifacts/unity/dogfight-editmode-20261101-232529-559-17984.xml`. Two tests advanced cooldown and roll duration together without allowing the final cooldown fraction; they now advance those phases separately without weakening refund/deduplication assertions. Four effect cases exposed unawakened EditMode component cleanup and a global object-name lookup crossing test instances. Manually ticked VFX use EditMode lifecycle callbacks, own their effect children and retain all cleanup assertions.
- Review caught adapter actions executing during zero-time finisher frames. A positive finite simulation-step guard now prevents repeated automatic attacks during freeze; discrete missile/breath presses are queued until simulation resumes and cleared by pause/reset/loss. Three regression cases cover this boundary. Gas marker observation now remains current during comeback.
- Setup PASS: actual serialized switches are all on, independent bank is 65 degrees, and existing missile damage remains 120. Full values: `unity/SpaceDragon/Builds/dogfight-combat-tuning.json`.
- Second EditMode run: **239 / 239 PASS**, `artifacts/unity/dogfight-editmode-20261101-233416-220-38188.xml`.
- Full repository `SPACE_DRAGON_NATIVE_CHROME=1 npm.cmd run check` PASS: 54 development and nine production browser flows, TypeScript/build and 18 reference checks. These checks cover the retained browser labs, not Unity. Log: `artifacts/combat-upgrades/npm-check.log`.
- First Web build `combat-upgrades-v001` succeeded at `2026-11-01T23:44:32.2966546Z`; retained receipt `artifacts/combat-upgrades/build-v001.json`. First actual WebGPU player run (`2026-11-01T23-46-11-634Z`) passed **15/18** cases with zero browser console errors. All four waves were defeated through assisted charging, and roll/role/finisher/ally/multi-breath/gas/repair/banking cases passed. This is a provisional artifact, not the final combined controller build.
- The first browser failures are retained: (1) a gas explosion overwrote the ROCK SHOT callout; the scenery fixture also moved a gas rock without its recorded pocket position. The callout now preserves both outcomes, and the solid interception condition selects a non-gas rock. (2) Entering comeback with Tab open hid SONG and left the selector stuck; entry now clears selector intent, with a defensive HUD guard. (3) headless Chrome left both tabs visible/focused, so `bringToFront` never generated the requested loss. A separate blank-tab diagnostic reproduced `hasFocus=true`, `visibility=visible`, no blur events. The final check moves real DOM focus from canvas to body; it does not inject a blur or force game state. OS/tab switching remains NOT TESTED by that check.
- Independent review also corrected the covered wingman cue, clipped control legend and wingman ray/visual disagreement. Shared deterministic attack poses now drive scene queries and render endpoints; scenery clips the beam and gas can detonate. HUD pulses respect encounter freeze.
- SD-089 adds standard PlayStation gamepad mappings, menu navigation and independent release gates. Plain mapping tests plus a synthetic Unity InputSystem device and controlled browser Gamepad API checks provide software coverage only. A physical DualShock/DualSense, USB/Bluetooth, rumble, comfort and the next family playtest remain **NOT TESTED**.
- External Town Drive jobs were allowed to finish before exclusive Dogfight work. The combined suite passed **265/265** (`artifacts/unity/dogfight-editmode-20261102-000041-113-32444.xml`). `combat-upgrades-v002` Web build succeeded at `2026-11-02T00:06:32.9750311Z`.
- Initial v002 WebGPU run passed **20/21**: all 18 combat checks plus two controller flows passed. Reconnect's held-input assertion failed because Unity observed neutral input from the software device. Repeating the same held-trigger sample after the connection event passed all three controller checks without a release, changed runtime or weaker assertion (`artifacts/unity/combat-controller-debug/runs/2026-11-02T00-11-37-811Z/report.json`). The exact bridge-internal cause is unproven; this is software fixture evidence, not physical-controller coverage.
- Follow-up setup now marks the existing tuning asset dirty without resetting values, so newly declared fields persist in YAML as well as the JSON receipt. A first attempt was safely refused during external PID 37216; the subsequent exclusive setup passed (`setup-v004-persist-fields.log`). Controller fields are explicitly `.16`, `.2`, `.15`, `.9`; missile damage remains 120. This editor-only persistence correction does not change the effective runtime values in the tested v002 player.
- Final all-off suites, the complete 21-case combat/controller suites on both backends, screenshots and natural-flight performance remain pending.
