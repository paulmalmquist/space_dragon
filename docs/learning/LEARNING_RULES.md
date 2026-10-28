# Learning rules

**Status:** proposed product rules adopted as development guardrails; not a validated curriculum, diagnostic assessment or mastery algorithm. The owner wants early reading and other learning alongside enjoyable exploration, racing and combat. Age is context, not a measured skill level.

## One adventure, independent learner profiles

Store a local learner ID separately from avatar and action-assistance settings. Do not use a selected suit or inferred age to set educational difficulty. Begin with supported, low-pressure activities; allow an adult to adjust practice and reset only the intended profile. Do not publish learner data, collect voice recordings or add remote analytics by default.

## Name the actual practice skill

Keep `letter_matching`, `letter_name_recognition`, `letter_sound_recognition` and `word_decoding` distinct. Matching an on-screen letter to an identical example is not independent letter-name recognition. Guessing a word from a picture is not proof of decoding. Record the stimulus, support used and response at the level actually exercised.

Initial candidate content can include familiar letters, small tangible quantities, shape matching, simple patterns, spatial directions, memory, music and creative storytelling. Introduce letter-sound/word tasks only with appropriate prerequisites. A parent/educator review is required before claims about instructional effectiveness or an adaptive mastery model.

## Challenge contract

Each authored challenge needs a stable ID, version, practice skill, prerequisite assumptions, stimulus, spoken/text prompt, answer handling, hint sequence, assisted-completion route, replay/cancel behavior, story reward and observation format. Validate references and fallback paths when the first content schema is implemented.

Teach or demonstrate before expecting unfamiliar knowledge. Hints may repeat audio, reduce choices, model the answer or guide a joint action. Never use a wrong answer to remove health, shame the player or block a required story forever. Provide adult help/skip when an interaction is unsuitable. Successful assisted play earns the same required story component.

## Progress is not mastery

Record independent success, assisted completion, skip and cancellation separately. A hint followed by a correct tap remains assisted. A timeout, accidental tap or controller problem must not automatically lower a skill estimate. One success must not mark mastery. Do not implement adaptive progression from these prose rules alone: define and review the policy, then test it with synthetic observations.

Illustrative observation, not a production save schema:

```json
{
  "challenge_id": "demo_find_l",
  "skill": "letter_name_recognition",
  "result": "completed",
  "assistance": ["visual_highlight"],
  "independent": false,
  "story_reward_granted": true
}
```

This says the activity was completed with help, not that recognition was mastered. Test data uses fictional learner IDs, never the children's real progress.

## Presentation and play

Pause action or engage autopilot for a reading interaction; no decoding while dodging. Use large separated choices, clear audio, replay, redundant shape/text cues and forgiving timing. Support an audio-unavailable fallback with adult help; do not count reading the fallback as evidence of listening skill. Do not use color alone for answers.

Do not attach a question to every jump or victory. Include pure racing/combat, exploration and creative activities with no single correct answer. Learning turns may rotate with family portraits, but an adult can reassign or skip without penalty. All subjects remain available regardless of suit specialty.

## Review before calling a learning feature ready

Test independent, wrong, repeated, assisted, skipped and interrupted responses; verify story progression and the saved observation for each. Confirm that switching avatar does not change learner. Then review audio clarity, answer cues, letter legibility, motor demands and emotional tone with a responsible adult. Passing automated checks is not proof of age suitability or improved reading.
