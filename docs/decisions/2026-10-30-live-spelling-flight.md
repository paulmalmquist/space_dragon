# Spell while flying and dodging

**Date:** October 30, 2026 · **Tracking:** SD-041 · **Status:** CONFIRMED owner correction; implementation evidence belongs to [the receipt](../reports/2026-10-30-live-spelling-flight.md).

The owner clarified the word-powered breath mechanic:

> the dragon keeps flying as the word is asked for
>
> spelling should require dodging

The exact source and routing receipt are in [the inbox](../../ideas/INBOX.md). The second clarification explicitly rejects the assistant's proposed safe-autopilot interpretation.

## Decision and scope

During the Dogfight Lab's letter prompts, **flight and combat remain active**: the dragon flies and steers, enemies maneuver and fire, projectiles move, and enemy hits can damage the dragon. The player must dodge while entering the displayed letters. Do not freeze the encounter, engage spelling autopilot or grant spelling invulnerability.

This owner instruction supersedes the automatic spelling hold in [SD-040](2026-10-30-word-lock-breath.md) and is a **scoped exception** to the general [learning presentation rule](../learning/LEARNING_RULES.md) and [interaction guidance](../gameplay/INTERACTION_CONTRACTS.md). It applies to this Dogfight word-charge mechanic; it does not remove the calmer presentation rule from other learning challenges or establish age suitability.

Letter prompts still avoid reserved flight bindings. Flight controls continue while charging, and completing a letter/word or using F1/Help together must not clear the pilot's held steering, firing or zoom controls. LMB ordinary plasma remains available while charging; Space still requires a completed charge and confirmed lock. Wrong keys add no separate damage, reset or deadline. Normal enemy damage is combat damage, not an incorrect-answer penalty.

F1/Help together still marks assisted charging; no learner records or mastery claim are added. Escape/focus loss still pause the encounter and release controls. Retry, main saves, lock acquisition, one-shot impact protection and later upgrade scope remain unchanged.

## Evidence and recovery

Verify movement, steering, enemy action, projectiles and damage during an incomplete word, plus control continuity through word completion/help. Retain pause/retry, lock-to-blast and existing save checks. Human readability, motor demand, comfort and performance require actual playtest review; an automated pass cannot establish those results.

Rollback restores the prior held-action behavior and its matching instructions/tests as one explicit change, rather than silently reinstating autopilot. No new service, asset publication, dependency, campaign reward or deployment is authorized.
