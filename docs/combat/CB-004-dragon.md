# CB-004 - Dragon flight and defensive space combat

**Authority:** CONFIRMED fighter-jet direction; detailed mechanics PROPOSED. **Maturity:** SPECIFIED. **Gameplay evidence:** NOT TESTED.

## Player outcome and hypothesis

The dragon must deliver the owner's flight-simulator/fighter-jet direction: speed, banking, throttle and dogfighting, expressed through a powerful dragon body. Start the separately labeled flight prototype with Cadet and Pilot controls; deeper Ace behavior and optional flight-assist-off space drift are later comparisons, not prerequisites for young pilots.

## Proposed contract

Separate flight orientation/velocity from orbit camera and targeting. Preserve one pilot and no crew roles, crew buttons or family-member-specific dragon abilities. The removed Wing Shield station is not restored here. A pilot-controlled timed deflection is a separate PROPOSED experiment prompted by the parry request, not part of the accepted standard flight kit. Its visual form and independent timing remain open; ground timings must not silently become dragon defaults.

Resolve the defense arc in the dragon's local 3D forward direction. Pitch and yaw change that direction; roll rotates the local defense frame. A world-up or horizontal-only calculation is not sufficient. Use compound hurt zones for gameplay contact, with one hit-group transaction across overlapping body parts.

Only designated bolts and charging enemies are deflectable. A reflected projectile changes ownership once, cannot immediately damage its new owner, and cannot generate an unbounded reflection loop. Choose and document physical reflection versus assisted return aim before implementing; neither is silently assumed. Sustained beams and area blasts require their own evasion/cover rules.

Use a swept contact query or equivalent continuous test for fast projectiles. Target selection must consider a visible/valid candidate and must safely release destroyed targets. Prototype brake/turn assistance without taking aiming decisions away from the player. Flight animation, breathing attacks and tail motion are presentation driven by state, not independent hit authorities.

Use the same dragon and sortie state across assist tiers. Cadet simplifies direction, throttle, aiming and recovery; Pilot exposes more flight control. Do not replace the flight model with a mandatory rail shooter. In-atmosphere lift/gravity and space-flight assistance need distinct declared rules. Stall and energy-management depth remain tuning/implementation questions. No tier has a fatal crash; the existing wing-energy/reboot recovery model remains the baseline.

## Smallest experiment

Three placeholder drones, one shielded heavy target, a breath burst, a dodge/brake action and one reflectable bolt. Test whether a player can find, pursue, defend and re-engage without losing the target. Begin with flight school and one bounded dogfight using Cadet and Pilot on the chosen input device. A bounded arena constrains world size, not the promised fighter-jet feel. This experiment does not move the dragon ahead of its Act I assembly in the story.

## Failure signs

Most playtime is spent reacquiring targets; reflection works behind the dragon; bolts tunnel through it; or small camera motions cause nausea. Fix control/readability before capital ships, giant battles or realistic orbital mechanics.

## Test specifications

Cases in the [registry](../../tests/combat_cases.json): CB-004-T01, CB-004-T02, CB-004-T03, CB-004-T04, CB-004-T05, CB-004-T06.
These cases are not executed by the notebook checker.

## Evidence and next revision

Record build/commit, tuning values, exact case IDs, input/device, observed results, failures and recording/log locations in a verification receipt. Human judgment remains separate from rule-test results. Revise this note after the smallest experiment; do not silently mark it accepted.

**2026-10-28 / v0.1:** initial hypothesis and test specification. No gameplay implemented or tested.
