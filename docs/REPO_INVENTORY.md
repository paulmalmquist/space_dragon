# Repository inventory

**Inspected October 29, 2026.** This separates what was present when setup began from the new foundation. Use [current project status](project/STATUS.md) for ongoing work and [the toolchain](TOOLCHAIN.md) for machine/tool verification.

## What was already present

The initial checkout contained **29 tracked files**: story/specification and handoff documents, 18 JPEG reference photographs, their manifest/gallery, and a Python reference verifier. There was no `package.json`, application runtime, test runner, build, backend, or deployment configuration in this checkout.

| Existing source | What it establishes |
| --- | --- |
| [Act I](story/ACT_I_BUILD_THE_DRAGON.md) | Current opening: computer → backyard arrival/suits → town recoveries → assemble the supplied dragon design → choose to answer the SOS. Confirmed premise, proposed treatment, and open questions are explicit. |
| [Initial specification](space-dragon-spec-v0.1.md) | Historical broader game/technical baseline. Its flight-first opening and Three.js proposal are not the latest story or an installed engine. |
| [Planning context](context/RAILWAY_GAME_SUPPORT.md) | Consolidates the family adventure, learning goals, bookmarked Line Leader mechanic, source map, and open decisions. The chat title does not prove a Railway service exists. |
| [Implementation handoff](IMPLEMENTATION_HANDOFF.md) | Preserves scope, homepage/route constraint, acceptance evidence, and publication boundaries. The owner's October 29 request now authorizes this setup; historical text is preserved as context. |
| [Blender handoff](BLENDER_CHARACTER_HANDOFF.md) | Pilot-character/reference workflow and unconfirmed identity labels. Lyla is the only filename-and-position identity anchor recorded. No finished model, rig, animation, or approved runtime likeness is present. |
| [Family reference collection](../assets/reference/family/README.md) | 18 supplied photographs and a narrow publication receipt. `python tools/verify_family_references.py` passed all 18 checksum, byte-size, and inventory checks during setup. |

The origin remote identifies `paulmalmquist/space_dragon`. The existing handoffs describe it as public; this setup did not change visibility, publish more family media, or upload photographs to another service.

## Foundation added during this setup

| Area | Location / purpose |
| --- | --- |
| Unordered idea intake | [ideas/INBOX.md](../ideas/INBOX.md), plus local workspace intake. Raw ideas stay understandable without forms or technical categorization. |
| Agent instructions and memory | Root [AGENTS.md](../AGENTS.md), [vision](project/VISION.md), [roadmap](project/ROADMAP.md), [idea ledger](project/IDEA_LEDGER.md), and [status](project/STATUS.md). Agents route ideas, track conflicts and affected files, and keep decisions separate from suggestions. |
| Local browser foundation | Babylon.js + TypeScript + Vite, under the planned `/space-dragon/` base route. See project status for the actual delivered behavior and latest checks. |
| Browser verification | Project-local Playwright installation and smoke checks. Browser emulation does not establish real tablet/phone GPU performance. |
| Asset preparation | [Art pipeline](ASSET_PIPELINE.md), glTF Transform, source/reference/export destinations, and reference-media helpers. |
| Local setup | [setup doctor](../tools/setup-doctor.ps1), [repeatable tools installer](../tools/setup-tools.ps1), FFmpeg, and Khronos KTX tools. |

The foundation is a local development starting point. It is not the full town, five final characters, a finished dragon, cloud saves, multiplayer, or an AAA-quality release. This file records the setup scope; executable checks and their outcomes belong in project status and verification reports.

## Website and deployment evidence

A public read-only HTTP check of `https://paulmalmquist.com` returned **200**, Cloudflare headers, HTML with `_next/` asset paths, and title **“What We Do | Novendor.”** That title does not match the expected personal-site/game context. `_next/` suggests Next.js output but does not establish a version, source repository, ownership, or deployment linkage.

A public check of `https://paulmalmquist.com/space-dragon` returned **404**, with HTML title **“Winston.”** No live game route was observed. These are point-in-time observations, not permission to alter that site's homepage, routing, or accounts.

A sibling folder `C:\Projects\Paul-malmquist` was inspected read-only. Its README describes an unrelated Toptal travel dashboard, its frontend uses Angular 21.2, and its origin is a Toptal screening repository. It is not evidence of the intended personal website's implementation and was not changed. The actual host website's source remains unidentified. The new game foundation can run and be reviewed independently while that is resolved.

Railway account configuration, existing services, public asset hosting, credentials, capacity, costs, and actual deployment routing have **not been verified or changed**. A Railway backend remains the requested direction for future services, while gameplay/rendering run in the player's browser. The local checkpoint foundation can precede cloud synchronization.

## Decisions still needing creative or integration input

- The intended host site/repository, given the unexpected public titles and missing route.
- Named player devices and the first input method; desktop/tablet performance must be measured on the actual hardware.
- Remaining photo subject labels, expressed as filename plus position; agents must not infer identities across photos.
- Lyla's suit color, final dragon design/assembly joints, and which visual/movement references should govern each feature.
- Exact SOS sender/emergency/crossing lore and later town mission count; setup does not decide these.

Ideas can arrive before these answers. Agents should make progress on independent work and ask only for a decision needed by the next dependent step.
