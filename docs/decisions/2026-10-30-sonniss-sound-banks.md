# SD-056 — file and use the supplied sound banks

Date: October 30, 2026. Authority: **CONFIRMED** owner request to file all five Sonniss GDC 2026 banks and use suitable sounds; follow-up explicitly places them with the project's sound banks. Original wording is in the [inbox](../../ideas/INBOX.md).

Use the established asset pipeline: intact originals under `assets/source/local/audio/sonniss-gdc-2026/`, reviewable catalogs and recipes under `assets/source/audio/sonniss-gdc-2026/`, and only five selected edited cues under `public/assets/audio/sonniss-gdc-2026/`. Folder names and all original bytes remain intact. Keeping 7.82 GB of masters local avoids shipping the full source library or treating it as a redistributable asset pack.

The bounded first use layers recorded roar, fire, blast, metal impact and jet surge into existing Dogfight audio events. Exact edits/gains are reversible engineering choices, pending human audition. Preserve opt-in sound, bounded voices, pause/mute/disposal, fallback synthesis and current game/save/learning behavior. No voice cloning, external generation, backend, purchase or deployment is included.

This supersedes the synthesis-only description of these particular Dogfight cues, not their gameplay triggers or SD-041's active-flight exception. Town, home, UI and later-world sounds remain cataloged candidates with revisit triggers in the [library guide](../../assets/source/audio/sonniss-gdc-2026/README.md).

Rollback: disable sample layers to recover unchanged synthesis profiles; retain catalog/provenance and masters. Restore the original root folders only if specifically needed, never overwrite existing destinations. [Verification](../reports/2026-10-30-sonniss-sound-banks.md) separates integrity/runtime evidence from listening and release approval.
