# Continue Space Dragon from a fresh chat

Open this repository in the new chat's workspace and give your ideas in ordinary language. You do not need to reconstruct the previous conversation or write a technical brief.

A starter you can reuse:

> Here are more Space Dragon ideas. Follow AGENTS.md, read the current campaign structure, and reconcile these into the repo's story and plan: …

## What agents read

`AGENTS.md` routes a new agent to project status, vision, the idea inbox and the current milestone. `CLAUDE.md` imports that same file. For story and mission work, [CAMPAIGN_STRUCTURE.md](../story/CAMPAIGN_STRUCTURE.md) and its linked decision hold the latest confirmed structure and party rules. Older treatment details do not override them.

Agents preserve your wording in [the inbox](../../ideas/INBOX.md), allocate the next unused ID from [the ledger](IDEA_LEDGER.md), distinguish confirmed direction from proposed details, and update the affected story/contracts and plan. They make routine technical choices and retain open creative questions rather than inventing answers. They report what was changed and checked.

The current campaign is Earth to build the dragon, then four exploration planets and final planet Viera, with five missions on each off-Earth planet: 25 plus the Earth opening. Missions use at most three family members, one controlled leader and a designated mostly autonomous sidekick with a sidekick button. The canonical campaign file holds the full rules and open details.

Seele is the prototype-game input: several prototypes contribute to the shared game, starting with dragon dogfighting. For a new export, a fresh chat can say: “Here is another Seele prototype; this is what I like. Inspect it and integrate one useful part.” Read [the integration plan](../engineering/PROTOTYPE_INTEGRATION.md) and [intake instructions](../../seeles-assets/README.md) before executing or migrating exported code. Preserve the Earth-first story even when flight is the first prototype to be developed.

## Keeping the context available

A fresh chat needs access to the repository and the branch containing these files. Local chats attached to this checkout see the local files. Another computer or cloud checkout needs the committed branch brought into that workspace. A chat without repository access will need these documents supplied; no earlier chat transcript is required by this workflow.

The local Idea notebook and `ideas/INBOX.md` remain equivalent inputs. A notebook entry is saved for the next invoked agent session; saving an idea does not start an agent automatically. Actual startup behavior in each installed assistant is separate from the repository's documented instructions.
