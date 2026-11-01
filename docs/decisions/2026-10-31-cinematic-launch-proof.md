# Cinematic strategy and Unity launch proof — SD-073

**Later workflow direction:** [SD-076](2026-10-31-google-vids-manual-exports.md) selects **Google Vids with manual exports** and parks Runway. Its manual file handoff supersedes this decision's earlier provider/reconnection follow-on. The local Blender/Unity proof and historical evidence below remain intact.

**Date:** October 31, 2026 · **Authority:** CONFIRMED request for a cinematic strategy and a 10–15-second dragon-launch proof, narrowed by the later owner reply below to a local Unity/Blender comparison. **Work state:** implemented and technically verified for that bounded proof. [The receipt](../reports/2026-10-31-unity-launch-cinematic.md) owns actual build, browser, focus-recovery and regression evidence, retained failures and remaining gaps. This decision does not approve final art, campaign migration or release.

The exact owner request is preserved in [the source capture](../../ideas/2026-10-31-cinematic-launch-source.md) and routed through [the inbox](../../ideas/INBOX.md). The [implementation plan](../plans/UNITY_LAUNCH_CINEMATIC.md) defines the bounded deliverables and evidence.

**Owner steering during this proof, October 31:** “Proceed locally; defer AI enhancement”. That narrowed this deliverable to the fully Unity-rendered launch versus a controlled local Blender-video insert, each with playable handoff. Enhancement was excluded from this proof's completion gate. Subsequent video work follows SD-076 above; Runway reconnection is not a next action.

## Selected approach

Use **in-engine Unity cinematics as the default**, particularly the final shot and playable handoff. Keep the original versioned Blender dragon as the recurring source of geometry, proportions, materials, rig, clips and sockets. An enhanced video can provide a fixed cinematic insert; its generated pixels do not replace the editable dragon or become new design canon.

Build a separate **LaunchLab** scene in the existing `unity/SpaceDragon` project. Preserve the verified First Contact scene, setup/build entry points and isolated state. This lab is a rehearsal for launch-to-flight continuity, not an early campaign departure or a complete Dogfight migration. Coordinate exclusive Editor/build ownership; do not start a competing project or overwrite shared asset masters.

The bounded timing choice is **12 seconds**: Unity controls 0–3 s, the hybrid route uses an optional video insert from 3–10 s, and **10–12 s remain controlled, unaltered live Unity** before player control. The in-engine route renders the same entire trajectory. Blender authors the motion/camera source and source footage; shared endpoint data aligns the real dragon, camera and velocity. Video need not be frame accurate to grant progress: readiness and the protected live ending own the transfer. Buffering or preparation can extend wall-clock playback; 12 seconds describes the authored sequence.

First establish the original dragon's Unity import/material/animation parity, author the shared ascent and matched ending in Blender/Unity, and render/inspect clean Blender source footage. Capture the fully Unity-rendered alternative separately. Account/provider readiness, clip preparation, any future submitted generation and a returned artifact are separate evidence. Runway required reauthentication; the owner subsequently deferred enhancement. No external upload or AI generation is claimed, and neither is required to finish this local proof. Preserve the source clip for a later selected enhancement task.

Retain original soundtrack, sound-effect and dialogue stems separately from the video for timing, pause, mute and SOS-motif continuity. The source's Timeline/Cinemachine, VideoPlayer preparation, destination preloading and quality/QA responsibilities guide the implementation; no package/API execution is established by naming them. The initial browser encoding target is URL-served H.264 MP4, with actual playback/fallback evidence required. A CDN delivery layer is a future deployment choice; do not route video through Railway's API process or configure hosting as part of this local proof.

The video route must accept a deliberately selected video URL or local candidate and recover from missing/unavailable media, rejected playback, stalls, decode failure or skip. It converges on the **same ready Unity ending and safe-flight state** as normal in-engine completion. A network or media callback cannot award items, unlock flight in the campaign, or become the sole authority for control transfer. An unavailable AI service limits the enhancement comparison; it must not prevent the locally authored scene and video/fallback path from working.

## Superseded and preserved guidance

- [SD-038](2026-10-30-cinematic-transition-scope.md) authorized scoping only and proposed a roughly 20-second proof inside the Three.js lab. This explicit request now authorizes the bounded construction, selects 10–15 seconds and follows [SD-072](2026-10-31-unity-channel-alignment.md) into Unity. SD-038's readiness, pause, skip, ownership and save-safety principles remain useful.
- The [Unity dragon handoff](../engineering/UNITY_DOGFIGHT_HANDOFF.md) governs the unchanged export and imported orientation/material/rig/socket checks. The existing Blender export is reused, not redesigned to match an AI frame. Existing sources and browser labs remain rollback/reference.
- Earth still equips the family and assembles the pre-existing dragon before a real departure. The lab writes no campaign, learner or First Contact saves and grants no rewards. Its free-flight continuation is a test space, not a new mission or planet unlock.
- Atmospheric ascent remains distinct from other-universe travel. Departure location, family/cockpit staging and any universe-crossing depiction remain at their existing authority levels. Flight remains single-pilot; the mission-party cap is unchanged.
- The flight handoff contains no required reading, combat or timed learning task. This does not change SD-041's active flight/dodging rule when the actual Dogfight spelling mechanic is later ported.
- No family likeness, private reference footage, voice cloning, backend, hosting change, subscription purchase or production deployment follows from this proof. Export only the selected original game assets and permitted cinematic derivatives.

## Completion boundary

The useful result under the latest steering is two honestly labeled **local** alternatives and playable handoffs: the fully Unity-rendered sequence and a controlled Blender animatic insert. Verify actual media decoding and control recovery; a URL input or scaffold alone is insufficient. No AI-enhanced output has been produced, and owner-deferred enhancement does not block completion of these local deliverables.

Verify normal completion, skip, replay, pause/focus loss, failed/delayed video and fresh input. Capture the transition itself and measure pose/velocity/camera continuity and actual hardware cost. Human cinematic preference and controller feel remain separate from automated success. Preserve all failed runs and source/output identities; no final art or release approval is implied.

**Tracking:** local and remote ledgers were inspected before reserving SD-073. Local SD-072 records Unity alignment; `origin/main@5121e1d` ends at SD-071 and overlaps earlier local IDs. Preserve those namespaces; next unused ID is SD-074.
