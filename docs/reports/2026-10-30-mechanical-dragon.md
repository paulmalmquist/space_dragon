# Mechanical dragon visual candidate

October 30, 2026 · SD-048 · IMPLEMENTED; source/rig checks VERIFIED; human appearance review pending.

Later local integration is recorded separately under [SD-049/050/051](2026-10-30-mechanical-dragon-integration.md), including the owner's red game-palette override. The source-only measurements and pending export status below describe this earlier art phase; the blue v002 source remains unchanged.

Owner request: “make it look more like that”, with two mechanical-dragon screenshots in chat. The authorized task is a Blender visual revision of Space Dragon Spacecraft.

Working source: `assets/source/local/spacecraft/space-dragon-spacecraft/Space Dragon Spacecraft-v002.blend`. Previous v001 and original Seele source retained. Reproducible local modeling script: `mechanical-v002.py` beside the source. No attached image was uploaded to another service.

Candidate direction: blue-steel faceted armor, oxide-red wing surfaces and shoulder caps, exposed bearings/pistons, a longer angular head with a toothed articulated jaw, orange eyes, metallic spars and segmented tail armor. Existing bones and pivots retained. Original organic forms hidden and preserved; new armor uses the existing armature. Studio lights/camera are in a separate non-export collection.

## Verification

Live MCP connected to Blender 5.2.1 LTS, add-on 1.8/protocol 15. Modeling, material edits, source saves and viewport review used `execute_blender_code` and `look`. Separate background Blender reopened both versions, compared the skeleton, checked attachment weights and rendered the saved v002.

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Original and v001 preservation | PASS | Original SHA-256 `02e3252df4b222cc05adb2ce80cafad50634ed7bd1ac8f83b7da71a9e9c84b9e`; v001 `0c20980f9515837400b1d6563c8ab11933f7c84648958254bd8689f88a016c14`, unchanged from SD-047. |
| Runtime model preservation | PASS | `dragon.glb` remains `4d38601d5bd8022efce27aa6df26f36d4e8173189612a82022f5f1be62e5cec2`. |
| Source reopen | PASS | Background Blender reopened v002 and produced both review renders. |
| Skeleton | PASS | All nine names and rest matrices exactly equal v001; no new bone or pivot changes. |
| New component weights | PASS | All 679 new meshes parent to SpaceDragonRig, have its armature modifier, and have fully weighted vertices. |
| Sample pose deformation | PASS | Both wing armor samples, lower jaw and a Tail_3 segment moved under their bones and were restored. Sample vertex displacements: 0.1584, 0.1130, 0.1872 and 0.0911 meters. This is not full flight animation/collision testing. |
| Materials/textures | PASS | Eight candidate materials; retained source texture exists and is packed. No family-reference images or new external generators. |
| Visual inspection | REVIEWED by agent | Full-body, side, top and head views inspected. Mechanical silhouette, red wings, orange eyes, armor and joints are visible. Candidate remains cleaner/more geometric than the cinematic reference; human approval and further weathering remain separate. |
| Runtime export/performance | NOT TESTED | No export or game replacement requested; optimization is required before promotion. |

Actual v002 measurements: **11,971,962 bytes**, **706 visible meshes**, **135,780 evaluated triangles** including bevel/solidify modifiers. Nine bones and eight visible materials. These are source measurements, not runtime budgets or performance results. Hidden organic forms remain as recoverable source components.

Saved v002 SHA-256: `5214e4c82053d41d42bc55062353b998cc59a2a2c76d294d88a39665690439dc`.

Review images beside the source: `Space Dragon Spacecraft-v002-review.png` (1600 × 1100) and `Space Dragon Spacecraft-v002-head.png` (1500 × 1100). `verification-v002.json` holds measured results; `verify-render-v002.py` reproduces the checks. `detail-v002.py` adds the panel seams, fasteners and final material refinement after the base modeling script.

Human design approval, game integration, performance and public release remain pending. Art work is local, uncommitted on `feat/town-drive-lab`. Branch HEAD advanced concurrently from `3b615b2` to `1495ded` during the task; unrelated work was preserved and this task made no commit/push. Next useful action: owner appearance review, then directed refinements or a separately scoped optimized game export. [Direction decision](../decisions/2026-10-30-mechanical-dragon-reference.md).
