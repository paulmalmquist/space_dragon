# Unity Dogfight migration and tactical encounter — SD-075

CONFIRMED direction, October 31, 2026. The owner explicitly chose Unity carrying over existing controls and behavior, then requested full migration for this pass. The [original tactical brief](../../ideas/2026-10-31-unity-dogfight-source.md) is preserved verbatim.

Implement a separate playable Dogfight scene in the existing `unity/SpaceDragon` project. This supersedes SD-072's documentation-only handoff for this encounter; it does not claim migration of other scenes. Launch and Town Drive retain their concurrent ownership. The Three.js lab remains a rollback/reference artifact.

Preserve arrows/mouse flight, WADZ independent aim, mouse flight/aim toggle, throttle, boost, finite rolls and break turns, ordinary fire, active flight during randomized spelling, assisted charge and Space windup/roar/beam. Add Enter/middle-click missiles and hold-Tab repair selection without consuming word-bank letters. Repairs restore one system, cost only on success, cap at three per encounter, and cannot revive a disabled dragon. Real missile trajectories and asteroid collision remain independent of render geometry.

State belongs to pure C# encounter modules. No campaign, learner or persistent save writes. Development-only fixtures support reproducible acceptance scenarios and must be distinguished from unassisted play. Build and test the actual Unity player, preserve imported rig/material identity and record measured evidence and limitations before calling this verified. No deployment, new paid service or family likeness generation is authorized by this increment.
