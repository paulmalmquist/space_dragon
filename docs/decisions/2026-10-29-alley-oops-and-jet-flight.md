# Decision — Alley-oop tandems and fighter-jet dragon flight

**Recorded:** October 29, 2026  
**Status:** CONFIRMED owner direction on two design points. The detailed mechanics built on them stay PROPOSED.  
**Decision source:** the owner, in conversation: "the dragon I envision as a flight simulator/fighter jet. Tandem means on foot the family can alley oop one another."

## Decision

1. **The dragon flies like a flight simulator / fighter jet.** It is not a gentle chase-camera glider. Speed, banking, throttle and dogfighting are the intended feel.
2. **On foot, a tandem is an alley-oop.** One family member launches another into the air, and the launched member delivers the finishing move.

## Scope and rationale

- The [combat system](../gameplay/COMBAT_SYSTEM.md) §4 and §6 were rewritten around these points: five launches × five finishers with marquee combinations, and fighter-jet flight with Cadet, Pilot and Ace assist tiers.
- **The child-pilot constraint is kept, not dropped.** v0.1 required that the *first* control scheme not demand independent pitch, yaw, roll, throttle, weapon selection and camera management. The Cadet tier keeps that for young pilots, and Pilot and Ace deliver the full jet experience. The tier is an action-assistance setting, separate from the learner profile and avatar.
- Non-lethal rules are unchanged. Enemy aircraft are unmanned, disabled drones parachute away, and the dragon never crashes fatally.

## Superseded guidance

- The earlier combat proposal's status-pair tandems (Decoy Slide, Lights Out and others) and dragon station tandems are replaced by alley-oops on foot.
- v0.1's "assisted flight" and Act II's "assisted chase-cam flight" now describe the Cadet tier, not the whole flight design.

## Not decided here

Input devices, the depth of Ace tier, local co-op, exact names, and implementation timing. No implementation scope is authorized by this record.

## Update — no crew roles in the dragon (October 29, 2026)

**Owner direction:** "We don't need roles in the dragon to keep it simple."

- The dragon has **one pilot**. There are no crew stations, crew buttons, crew combos or family-member-specific dragon abilities.
- The flight kit is a standard fighter-jet set: Breath Cannon (gun), Seeker Sparks (missiles), afterburner and flares, plus Song-breath (an Act II upgrade) and the Dragon Roar finisher.
- The family still rides along as passengers in cockpit view, with reactions and occasional lines. This is presentation only.
- This supersedes the combat doc's earlier crew backseater design, its station abilities (Afterburner Overdrive, Holo Flares, Slick Cloud, Wing Shield, Tail Grapple) and its crew combos.

