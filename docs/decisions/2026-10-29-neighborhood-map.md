# Decision — A compact neighborhood with real landmarks

**Recorded:** October 29, 2026  
**Idea:** SD-024  
**Status:** CONFIRMED owner direction for the places, small-neighborhood scope, a few restaurants and Google Maps image references. Layout, scale and specific restaurant choices remain PROPOSED or OPEN as described below.

## Owner direction

> “id like a map the size of a small neighborhood and a microcosm of winsotn trails / lake worth all the way to target home depot, lake worth christian and manatee elementary. its ok to use real places”

The owner then selected:

> “wellington target / home depot on lantana and jog / you can put a few of those restaurants there too”

And authorized reference gathering:

> “feel free to log images from google maps”

The owner then supplied a home address and requested the surrounding area and nearby lake (SD-026). The full address/source wording is retained in ignored local home notes. Add those surroundings and the lake to the reference scope; the game's home/road placement remains a compressed design choice.

## Decision and rationale

Use a compact playable neighborhood that combines Winston Trails, Wellington South Target, Lake Worth II Home Depot at Jog/Lantana, Lake Worth Christian School and Manatee Elementary School. Include a few restaurant exteriors around the shopping pocket. Real place names and recognizable public-facing landmarks are allowed.

Compress the area's destinations and connecting spaces to support the owner's bounded-world, AAA-like [quality direction](../engineering/GAME_FEEL.md). The goal is familiar places connected by enjoyable exploration. A literal city-scale road network, real-world travel distances and exact property-by-property reconstruction are outside this increment.

The selected stores are [Wellington South Target, 5900 State Rd 7](https://www.target.com/sl/wellington-south-store/2065), and [Lake Worth II Home Depot, 5750 Jog Rd](https://www.homedepot.com/l/Lake-Worth-II/FL/Lake-Worth/33467/6316). Their earlier branch ambiguity is resolved. The [map plan](../world/NEIGHBORHOOD_MAP.md) holds the complete landmark/source list and a clearly proposed connection diagram.

## Scope and authority

- **CONFIRMED:** the named landmarks, the selected store branches, a small-neighborhood treatment, a few restaurant exteriors and permission to log Google Maps image references.
- **PROPOSED:** the diagram's junctions/return loop and the initial Chili's, Chipotle and Chick-fil-A roster. These are reversible production choices, not new owner-selected canon.
- **OPEN:** numeric dimensions, road lengths, walking times, traversal targets, detailed building treatment and measured performance budgets.
- **Not assigned here:** missions, recovered components, school activities, dialogue, NPC identities, traffic simulation or new story progression. Existing Act I authority remains in force.

The Google Maps permission covers gathering visual references. [The reference log](../world/REFERENCE_LOG.md) records actual capture status; no captured images are implied by this decision. Keep source images local and separate from runtime exports under [the asset pipeline](../ASSET_PIPELINE.md). Existing family photos, voices and likeness approval boundaries are unchanged.

## Superseded guidance and continuing boundaries

This direction replaces any assumption that every town destination must use an invented name or that the world must remain only the current house/yard blockout. The owner explicitly permits these real places and requests a broader neighborhood.

The instruction to fictionalize sensitive school/workplace layouts and the neighbor still applies. Public landmark names and exteriors do not require reproducing private interiors, security details or student routines. The Winston Trails HOA address is a public reference, not the family's home location. The [future home video](../REFERENCE_HOME_VIDEO.md) remains a separate input; no actual house reconstruction has been supplied.

This decision does not reopen the dragon's origin, grant new mission rewards, authorize a likeness upload, select a backend dependency or deploy the game.

## Implementation and verification

The existing third-person room/yard slice is the verified technical base. The neighborhood is **PLANNED**, not implemented by this record. Next, extend the blockout with connected streets/sidewalks and landmark masses, then exercise the whole walking/return loop with the existing camera, collision and save rules.

Keep progress independent of presentation; changed geometry must recover an unsafe saved position without losing earned inventory. Record software checks separately from human movement/camera review and Lenovo/Chrome hardware measurements. The [map plan](../world/NEIGHBORHOOD_MAP.md) and [status](../project/STATUS.md) own the next steps and actual evidence.

The layout can be revised or reduced while retaining the confirmed destinations and current story saves. Expand detail only after the connected blockout is comfortable to navigate.
