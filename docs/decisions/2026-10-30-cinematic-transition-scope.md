# Scope cinematic cutscenes and gameplay transitions

**Date:** October 30, 2026. **Tracking:** SD-038.
**Status:** CONFIRMED scoping request; engineering recommendation and staging PROPOSED. Work state: planned.

The owner asked: "scope out a method to use cinematic looking cutscenes and blend them to gameplay such as the dragon taking off into the atmopshere etc". The exact wording is preserved in [the inbox](../../ideas/INBOX.md). This extends SD-002/SD-022's cinematic quality goal with a concrete transition example; it is a new scoped method request, not a duplicate implementation claim.

## Recommendation and rationale

Use real-time authored cinematics for the final shot before player control, preserving the dragon, motion, lighting and camera continuity. Blender supplies motion/camera authoring; a small runtime director handles readiness, input ownership, cues, skip/pause and the handoff. Prerendered footage is an optional insert for expensive vistas, with a matched cut back to real time before steering. The [cinematic transition plan](../engineering/CINEMATIC_TRANSITIONS.md) defines the takeoff shots, code touchpoints, asset workflow, failure behavior and evidence.

The inspected Earth and Dogfight Lab run in separate Babylon/Three.js pages. The proposed first proof belongs wholly inside the flight runtime and changes no campaign save or story order. Current page navigation can support a concealed loading cut, but not an uninterrupted live-camera/audio transition. Campaign integration must later select a shared lifecycle or a bounded port on evidence.

## Alternatives, consequences and boundary

Video-only cinematics can show expensive fixed imagery, but require composition matching, download/decode and playback recovery; they do not provide the controllable final pose themselves. A whole-engine migration, remote rendering or cinematic-editor dependency adds work before the handoff is proven. Keep those parked and compare alternatives only when a measured need arises.

This scoping request authorizes documentation/research, not the construction of the proposed launch sequence, new likeness assets, external uploads, hosting changes or deployment. No runtime dependencies were added by this task. Final shot timing, departure location, dragon design and family/cockpit staging remain proposals/open. The one-pilot and mission-party rules are unchanged. Atmospheric departure does not explain other-universe travel.

**Superseded guidance:** none. SD-037's separate-page exception, Earth-first campaign and existing interaction/save requirements remain in force. The plan identifies their practical effect rather than silently expanding the lab into campaign architecture.

**Rollback:** remove the new planning references if the method is replaced; no runtime migration or save rollback is needed. Preserve the original request and link a replacement decision rather than deleting its history.

**Affected documents:** engineering plan/architecture, current milestone, roadmap, status, idea inbox/ledger and [planning receipt](../reports/2026-10-30-cinematic-transition-scope.md). No game code, assets or canon mission content changes in this scope.
