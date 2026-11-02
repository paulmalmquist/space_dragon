# SD-089 — PlayStation controls for Unity Dogfight

**Recorded:** November 1, 2026. **Authority:** CONFIRMED owner direction. **Work state:** verified for named software checks; bindings are IMPLEMENTED. Physical controller and human review remain pending.

Owner wording, verbatim:

> in this pass, bind to playstation controller too. ill bring it next test

This explicitly adds controller implementation to the current Unity Dogfight pass. It supersedes deferral of that work under the earlier [keyboard-first decision](2026-10-29-keyboard-first-input.md) and the October 31 “Not now” hardware-testing response. Keyboard/mouse remain a complete supported path. Physical controller testing is planned for the owner's next session, not already completed. The [earlier browser controller adapter](2026-10-30-playstation-controller.md) remains historical evidence for its own Earth runtime; it does not verify Unity Dogfight. [ID allocation/collision crosswalk](2026-11-01-combat-controller-identifiers.md).

## Binding contract

The mapping uses existing gameplay actions. It adds no keyboard binding beyond the combat pass's T key and no crew role, campaign progression or new game system.

| Action | PlayStation input |
| --- | --- |
| Fly / independent aim | Left stick / right stick |
| Recenter aim | R3 |
| Ordinary fire / zoom | R2 / L2 |
| Full barrel roll | Fresh L1 / R1 |
| Independent visual bank | Hold L2 + L1 / R1; L2 still zooms |
| Boost / held sharp evasive turn | Cross / Circle |
| Guided missile / charged breath | Square / Triangle |
| Assisted breath charge or SONG recovery | D-pad Up; assistance remains marked |
| Wingman | D-pad Down |
| Throttle down / up | D-pad Left / Right outside repair selection |
| Select hull / propulsion / weapons repair | Hold Share/Create + D-pad Left / Up / Right |
| Pause | Options |
| Menu navigation / activate / back | D-pad / Cross / Circle |

Input ownership follows the active context: menus and repair selection consume their buttons before flight/combat, so selecting propulsion cannot also assist a charge, and selecting hull/weapons cannot change throttle. L2 plus a bumper requests bank rather than a full roll. Use fresh edges for discrete actions, dead zones for sticks and neutral/release rearming after pause, focus loss, connection or disconnection. Clear held controller actions on device loss; keyboard/mouse remain available. Comeback input routes to SONG without filling the normal breath word.

Normal repair remains fully usable without entering the optional digit code. This mapping does not add controller digit entry; Numbers/Sums bonus entry remains a keyboard path. Ignoring the bonus must retain the ordinary repair duration and resource rules.

## Verification boundaries

Verify state/input routing, repeat guards, menu/repair priority, focus/pause/restart, disconnect/reconnect fallback and simulated controller browser flows separately from physical play. The latest combined [265/265 EditMode tests pass](../../artifacts/unity/dogfight-editmode-20261102-000041-113-32444.xml), including controller software routing. Setup verifies serialized stick dead zone .16, trigger threshold .2, repair hold .15 s and aim rate .9. Final `combat-upgrades-v002` Web build and **21 combat/controller + 11 all-switches-off cases per Chrome WebGPU/WebGL2 backend (32 each)** pass; [the combat receipt](../reports/2026-11-01-dogfight-combat-upgrades.md) records the artifact, software/simulated-pad checks, earlier failures and minor visual follow-ups. Next is the physical PlayStation/family test, not expanded feature scope. Earlier keyboard/repository browser passes and the software unit result do not establish physical controller behavior.

**NOT TESTED:** physical DualShock 4 or DualSense enumeration, USB or Bluetooth pairing/reconnection, exact browser button mapping, stick drift/latency, control feel and haptics. Rumble, adaptive triggers, touchpad gestures, speaker and motion sensing are not promised by this pass. At the next owner test, record the actual controller, connection, Lenovo/Chrome versions and observed behavior before claiming hardware support. No deployment, driver installation, purchase or external service is authorized by this binding request.
