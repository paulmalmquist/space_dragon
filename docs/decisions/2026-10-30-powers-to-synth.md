# Decision — family musical voices morph into synth with powers

**Recorded:** October 30, 2026

**Status:** CONFIRMED owner direction; exact timbres and implementation PROPOSED.

**Source:** owner, Space Dragon chat; SD-022 in the [idea ledger](../project/IDEA_LEDGER.md).

> “As we get powers morph them into synth”

## Decision and scope

As the family's suit upgrades become powers, their instrumental musical identities morph into synth voices. This extends the [confirmed suit-to-power progression](2026-10-29-three-acts-linear-and-viera.md). The audible transformation belongs to the character earning the power.

The [music plan](../audio/MUSIC_PLAN.md#5-family-musical-identities) proposes an instrumental starting voice, an acoustic/synth blend during upgrades and a synth voice for the earned power. Preserve recognizable motifs throughout. Exact mappings, patches, unlock timing and transition lengths remain proposals to audition.

This supersedes any assumption that each family member keeps a fixed instrumental timbre for the whole game. It does not replace the planet contributions to the SOS, approve draft ability names or require all orchestral/world music to disappear. Viera can use gentle versions of the earned synth voices.

## Next useful action and evidence

MUS-01 includes one original character phrase rendered as instrument, blend and synth for comparison. Later runtime integration follows actual saved ability unlocks; the opening does not grant final powers for an audio demonstration. No audio assets or playback implementation were added by this decision.

Documentation verification: `python3 tools/check_foundation.py` and `git diff --check` passed. Runtime code is unchanged; sound and gameplay were not tested by this documentation update.
