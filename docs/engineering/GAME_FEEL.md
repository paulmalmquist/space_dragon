# Quality of feel in a bounded world

**Owner direction, October 29, 2026 — SD-022–023:** aim for AAA-like feel without extensive customization or open-world scale. Railway is available according to the owner, and cloud tools can be connected if needed. Keep the current Lenovo with Chrome as the first target; a replacement machine is not planned now. Original wording is preserved in [the inbox](../../ideas/INBOX.md).

The current navigation blockout proves movement, collision, interaction and persistence. It does not establish the intended finished quality. Concentrate refinement in one small playable space so it can become the standard for later scenes.

## Review the experience, then tune it

Agents use these questions when proposing a bounded polish increment. Record what was observed, what changed and the result; do not mark feel approved from compilation or automated tests alone.

- **Movement:** do starts, stops and turns respond predictably? Do feet, stride, speed and body facing agree? Do collisions slide naturally without visible snagging or penetration?
- **Camera:** can the player read the route and see the character through doorways and near obstacles? Are follow, orbit and recenter comfortable, with no sudden snaps or unwanted drift? Check reduced motion too.
- **Interaction:** does approaching an object make the possible action clear? Does pressing the key produce immediate, consistent feedback with a satisfying visual/audio response? Confirm interrupted/repeated actions remain safe.
- **Animation and sound:** do transitions, weight, timing and sound support the same action? A loading pause or missing sound must not leave the player unsure whether input worked. Audio needs a human listening check.
- **Presentation:** are character silhouettes, materials, lighting and the important objects coherent and readable from ordinary playing distance? Review the result in the game, including neutral views of new assets.
- **Responsiveness:** on the actual Lenovo/Chrome renderer, record frame timing and visible hitches along a repeatable route, including loading and interactions. Separate cold asset loading from steady play. The existing desktop 60 fps goal is a target, not a measured pass.

The next useful review is a walk from the living room through the doorway, camera turns near furniture/pod, and one nearby interaction. Use the resulting feedback to choose the next change before expanding the world. Follow [the quality gates](QUALITY_GATES.md) and [current milestone](../plans/CURRENT_MILESTONE.md) for evidence and scope.

## Choose compute and languages around the observed limit

Keep a reproducible scene/job and measurements before changing architecture. Determine whether the limit is asset production time, loading, rendering, simulation or a backend operation; compare the improvement against integration and maintenance costs.

Cloud machines can be evaluated for expensive production jobs such as Blender rendering/baking, asset processing or builds. The browser still runs the current interactive scene, so production compute and Railway services do not substitute for measuring the player's rendering and input experience. Inspect the actual Railway project and available tools when a backend task needs them; no account configuration is inferred here.

The current game is TypeScript/Babylon; Python handles small repository/asset tools. The owner is open to another language when it meaningfully helps. Evaluate a bounded replacement or accelerated module against the measured bottleneck before selecting a broad rewrite. No language migration, new compute purchase or hardware change is required by the present walking increment.
