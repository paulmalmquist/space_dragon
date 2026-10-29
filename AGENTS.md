# Working on Space Dragon

Paul supplies the ideas and creative judgment. Agents maintain the structure, make routine technical choices, and carry authorized work through verification. He can send incomplete or unordered thoughts in chat or add them to `ideas/INBOX.md`; no technical brief or template is required.

## Start each session

1. Read `docs/project/STATUS.md`, `docs/project/VISION.md`, and `ideas/INBOX.md`.
2. Check `docs/project/IDEA_LEDGER.md` and `docs/project/ROADMAP.md` for existing work and dependencies.
3. Read the source document relevant to the change. For story, start with `docs/story/ACT_I_BUILD_THE_DRAGON.md`. For character work, also read `docs/BLENDER_CHARACTER_HANDOFF.md` and the reference manifest.
4. Inspect the files and working tree before editing. Preserve the owner's work and other agents' edits.

## Turn unordered ideas into changes

- Capture each new idea faithfully in `ideas/INBOX.md`, including its date and source. Keep the original wording when available. A chat instruction is a valid source; Paul does not have to repeat it in a file.
- Assign the next unused `SD-###` ID. Search the ledger before creating a duplicate. The local notebook's `NOTE-...` IDs identify raw captures, not tracked implementation decisions; link the capture to its `SD-###` entry. Split a large thought into linked ideas only when it needs separate decisions or implementation.
- Give it two independent labels: **authority** (`CONFIRMED`, `PROPOSED`, `BOOKMARKED`, or `OPEN`) and **work state** (`captured`, `planned`, `in-progress`, `verified`, or `parked`). `CONFIRMED` describes direction, never proof that something works.
- Identify what it changes, what it depends on, and the smallest useful next action. Link its canonical destination in the ledger. Keep a routing receipt in the inbox; do not silently delete the original thought.
- Implement authorized, reversible work that is useful now. Park later ideas with a reason and a revisit trigger so they survive without expanding the current milestone.
- Update the relevant canonical document and code together. Maintain one source of truth for each decision; the ledger points to it rather than copying whole specifications.
- If an idea contradicts established direction, record the conflict and its practical effect. Resolve routine engineering choices independently. Ask one plain-language question only when the user's creative intent or a consequential constraint cannot be inferred; continue independent work.
- Finish by updating `STATUS.md` with what exists, the checks actually run, remaining limitations, and the next useful action. Update the roadmap and ledger when their state changed.

## Authority and scope

The latest explicit owner instruction takes precedence. Dated decisions and the confirmed Act I direction take precedence over conflicting historical v0.1 assumptions. Preserve `CONFIRMED`, `PROPOSED`, `BOOKMARKED`, and `OPEN` within source documents. Recommendations quoted in a prompt remain proposals unless the owner adopts them or authorizes the agent to make that implementation choice.

The October 29, 2026 request authorizes repo organization, useful tool installation, and a local development foundation using agent judgment. Earlier statements that a documentation upload did not authorize implementation describe that earlier task. They do not block this local setup. Deployment, purchases, publishing additional personal media, and infrastructure expansion are separate actions with their own existing boundaries.

The current production slice is the local First Contact foundation: living-room computer, interrupted signal, backyard pod, one interaction, and a versioned local checkpoint. The roadmap distinguishes implementation preparation from a completed playable sequence. Full town production, five finished avatars, flight, party navigation, and multiplayer are outside this slice.

## Preserve the game

- Crew: Paul, Maria, Luke, Luna, and Lyla. Paul has Iron Man-inspired armor; Luke has Iron Spider-inspired armor; Maria is the purple healer; Luna wears pink and makes enemies slip with goo; Lyla gathers and stores information. Lyla's suit color remains open.
- Start at the living-room computer. The first backyard arrival supplies suits. Other components scatter around town. The family recovers equipment and assembles an existing dragon design; they were not selected in advance and did not invent it.
- The SOS was sent deliberately; the arrival at this family was accidental. The completed message leads to a choice to help in another universe. Light-speed travel alone does not explain crossing universes.
- Learning, exploration, racing, and playful combat belong together. Supported completion must still award required suits/components. Do not make a child's reading difficulty a story gate.
- The Line Leader is a bookmarked single-player party system: one controlled person and automatic companions. It does not imply online multiplayer.
- Keep the planned `/space-dragon` route and existing homepage intact. This repo does not establish the existing website's framework or deployment configuration.

## Art, assets, and verification

Use `docs/BLENDER_CHARACTER_HANDOFF.md` for character identities, source copies, review, and GLB export. Only Lyla at viewer-left in `IMG_3277.jpeg` has a confirmed per-image identity; do not infer names from faces. The existing 18-photo publication exception covers only the manifest collection. Keep unrelated family media and credentials out of commits; keep source references out of runtime/public assets and exported models. Use fictionalized schools, workplace, and antagonist.

Separate editable sources, references, and optimized runtime exports. Preserve dragon component names, pivots, and attachment structure needed for assembly. Record asset provenance and real export measurements; proposed budgets are not measured capabilities.

Use the repo's documented commands for type checking, building, reference verification, and browser checks as applicable. Test the flow affected by the change. Report actual device/browser evidence and failures; emulation is not a physical tablet GPU benchmark. Do not describe placeholders as final art or local checkpoints as cloud saves. Keep the current status truthful even when a task cannot finish.
