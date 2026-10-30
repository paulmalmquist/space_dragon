# Decision — The story needs a way to translate language

**Recorded:** October 30, 2026  
**Status:** CONFIRMED owner direction. Superseded in part on October 30 by the update below: **the game is in English**, and the suits are a hand-wave, not a translation mechanic.  
**Decision source:** the owner, in the Space Dragon chat: *"We need: a way to translate language."* Preserved in the [idea inbox](../../ideas/INBOX.md) as SD-033.

## Decision

The family must have a clear, consistent way to understand the people, writing and creatures of the other universe, and the story has to show it.

## Scope and rationale

- The design is in [language and translation](../story/LANGUAGE_AND_TRANSLATION.md): the suits translate speech, the kids decode writing in the Glyph Book, Lyla's visor reads songs without words, and Morrow alone needs no translation.
- It builds on existing proposals rather than replacing them: the Core learning words from the family ([Act I refinements](../story/ACT_I_CRITIQUE_AND_REFINEMENTS.md) §3.2), Lyla's information-gathering suit (Act I canon) and the glyph cards in Act II.
- The [learning rules](../learning/LEARNING_RULES.md) are unchanged. No translation ever requires reading, and glyph matching is recorded as matching, not recognition or reading.
- No voice cloning or new external service is implied.

## Not decided here

Whether Vieran is sung, whether glyphs are drawn melodies, the Core's voice and name, and whether everyone understanding everyone after the Last Hold carries into the post-game.

No implementation scope is authorized by this record.

## Update — the suits translate (October 30, 2026)

**Owner direction:** *"The suits can translate."* Preserved in the [idea inbox](../../ideas/INBOX.md) as SD-034.

- **The suits are the translation mechanism.** This replaces the earlier proposal that the Core interprets. The Core still learns to talk in Act I, rides in the dragon and can read glyphs aloud as an assisted path.
- Proposed with it: the suits translate both ways, singing the family's words in Vieran in each wearer's instrument voice; they translate what they hear, not what they see, so the Glyph Book and the curriculum tie-in stay; and Morrow's note makes them drop words near Viera, with the Caller filling the gaps.

## Update — the game is in English (October 30, 2026)

**Owner direction:** *"The game just needs to be in English with the suit core hand waiving why we can understand."* Preserved in the [idea inbox](../../ideas/INBOX.md) as SD-037.

- **Everything is in English**, on Earth and off it: dialogue, signs, cards and boards.
- **The suits are the hand-wave.** They're made of the same living material as the Core, and that's why the family understands everyone and is understood. It's said once, at Lantern Rock ("How can we understand you?" … "I think it's these."), and never becomes a mechanic.
- **Retired:** sung Vieran with a beat-behind translation, the "Nice roads" mistranslation, the suits singing the family's words back in Vieran, the Glyph Book and every glyph, dropped words near Viera, the Caller filling gaps and learning English, the robot iguana translating for the neighbor, Morrow's "perfect English," and the "gift of tongues" after the Last Hold. The state flags `suits_dropping_words`, `caller_fills_gaps` and `gift_of_tongues` are removed from the scripts.
- **Kept:** "Fair lanes!" as a Vieran greeting (in English), the Heartnote symbol, the suits shivering when Morrow speaks, creatures that sing rather than talk, and the Core's Act I arc of finding its voice. That arc is an earlier [Act I refinement](../story/ACT_I_CRITIQUE_AND_REFINEMENTS.md) §3.2 and is unaffected.
- **Learning gets simpler.** Glyph puzzles become plain English: word cards (HELLO, FRIEND, HOME, REST), lettered stalls, numbered bays and an English departure board. The proposed challenge ID `a2w1_stall_glyphs_v1` is renamed `a2w1_stall_letters_v1`; nothing had been implemented under the old ID. The [learning rules](../learning/LEARNING_RULES.md) are unchanged.
- **Superseded guidance:** this update replaces the scope and "Not decided here" sections above and the "suits translate" details proposed in the previous update. [Language](../story/LANGUAGE_AND_TRANSLATION.md) is now a short page.
