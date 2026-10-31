# Mechanical Space Dragon Spacecraft in Dogfight Lab — SD-049

Date: October 30, 2026. Authority: **CONFIRMED owner integration request**, retained verbatim in [the inbox](../../ideas/INBOX.md). Evidence: [integration receipt](../reports/2026-10-30-mechanical-dragon-integration.md).

**Later owner palette override — SD-050:** [make the whole dragon red](2026-10-30-red-mechanical-dragon.md) supersedes the blue body/red-wing color requirement below for the game candidate. The supplied blue v002 source remains unchanged; geometry/rig/component preservation still applies. The active versioned target is `dragon-mechanical-red-v001.glb` with red/crimson nonemissive finishes and retained orange eye emission, subject to actual browser/human review.

**Later owner movement steering — SD-051:** [make enemies steadier instead of flying into the dragon](2026-10-30-dogfight-enemy-standoff.md) replaces pursuit/flyby motion with bounded player-relative standoff and gentle drift. Tracking, incoming fire, damage, word charging, evasion and saves remain under their existing contracts. This is an authorized AI movement refinement alongside the asset work, not a change to the spacecraft design.

The owner requests local integration of the existing Space Dragon Spacecraft v002 mechanical candidate into the Dogfight Lab. [SD-048's source-art receipt](../reports/2026-10-30-mechanical-dragon.md) records the blue-steel armor, red wings, exposed joints/pistons, orange eyes and toothed articulated jaw. Integrate that candidate without redesigning it. This request extends the earlier source-only art scope; it does not confer final art or deployment approval.

## Source, export and recovery

- Keep `Space Dragon Spacecraft-v002.blend`, v001, the raw Seele delivery and `public/assets/dogfight/models/dragon.glb` unchanged. Prepare a separate optimized source/export candidate and a new versioned GLB before switching the lab.
- Exclude hidden original organic meshes and the `Review Studio - not for export` collection. Do not export cameras/lights/reference boards or use unapproved external media/generators.
- Preserve SpaceDragonRig's nine names and rest transforms: Root, Wing_L, Wing_R, Jaw and Tail_0 through Tail_4. Optimization must preserve materials, articulation, component identities and pivots, with explicit checks rather than indiscriminate joining/pruning.
- Source measurements of 706 visible meshes and approximately 135,780 evaluated triangles are inventory, not a browser budget. Record the optimized export's actual geometry, draws, size and measured runtime behavior separately.

## Runtime contract

Use the new versioned candidate in the existing loader and asset manifest, retaining the old model as rollback. Audit the existing organic material overrides so they do not turn the new armor/wings/eyes into the earlier purple organic treatment. Bake supported details or use restrained runtime equivalents for Blender-only procedural nodes; verify the owner-updated red palette and orange emission in the browser.

Keep the existing control, active spelling/dodging, combat, camera and save contracts. Verify flap/glide, rolls, jaw/tail articulation, aim, ordinary shots and charged breath. Muzzle/effect placement may be adjusted to the actual new model; that is an integration correction rather than a redesign. No new campaign rewards, multiplayer, backend or hosting/deployment scope follows from this asset switch.

## Acceptance and approval boundaries

Export validation, a successful load and screenshots do not establish the full integration alone. The [receipt](../reports/2026-10-30-mechanical-dragon-integration.md) must identify the final artifact, preservation/exclusion checks, animation/appearance observations, actual browser actions, size/performance measurements and limitations. Human art/comfort review, sustained performance and public release remain separate. Normal pause/retry/return and the retained previous GLB are recovery paths.
