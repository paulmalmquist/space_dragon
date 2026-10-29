# What comes next

This is an adjustable production order, separate from story chronology. Agents route unordered ideas into it; Paul does not have to sort them first. The current owner request prioritizes finishing First Contact and testing it with the family before expanding the game.

| Stage | Useful result | Exit evidence | Current state |
| --- | --- | --- | --- |
| 0. Foundation | One inbox, agent memory, local runtime/tooling and preserved story/photo references. | Original checks and merge recorded in [status](STATUS.md) and historical receipts. | Verified foundation: SD-001, SD-003, SD-004. |
| 1. Protect the actual game | CI installs Node 24 and Chromium, then runs pure-state tests, build, development and production browser flows. | Observe the new GitHub job passing; prove a game failure fails the job. | Workflow implemented; execution verification in progress: SD-014. |
| 2. Complete First Contact | Scripted launch/signal → backyard → five suit cards → Lyla's supported scan → archive → town map, with keyboard, speech placeholder, hints and durable v2 progress. | Unit and browser checks; v1 migration/recovery; no repeated rewards; clear help and speech fallback; actual results in the current receipt. | State/save 17 unit cases and build pass; final browser checks in progress: SD-015–SD-016. |
| 3. Establish one real asset | Editable rescue pod → GLB → compressed texture → actual scene with preserved component/animation structure. | Source/export reopen, validation, in-scene review and measured inventory; human art approval separate. | Technical pipeline verified; provisional pod design: SD-017. Pilot character and final family artwork remain SD-006. |
| 4. Family keyboard playtest | Ten minutes on this Lenovo 82XM in Chrome; children can follow prompts, get help and finish. | Confirm sound is audible, note every help point, observe keyboard feel/loading and the actual renderer; fix blockers and record adult review. | Target confirmed; human playtest pending: SD-018 / SD-008. Xbox not tested; touch deferred. |
| 5. Space Blocks | Mission 1's learning activity, robot iguana, first alley-oop and first install party. | Implement its [existing script](../story/scripts/A1-04-M1_SPACE_BLOCKS.md) as a bounded increment after First Contact's human gate; verify help, learning observations, rewards and return-home payoff. | Queued after First Contact passes; script details remain proposed. |
| 6. Separate flight experiment | Cadet and Pilot controls establish the one-pilot fighter-jet feel without adding a whole campaign. | Independent keyboard flight playtest, forgiving recovery and measured input/renderer behavior. | Separate later risk track after the First Contact gate; SD-011 direction, detailed mechanics proposed. |
| 7. Integrations and later systems | Host-site integration, Railway when local saves become limiting, Line Leader and later acts when selected. | Actual source/account audit and explicit bounded need, followed by end-to-end evidence. | Held: site repo missing; backend SD-009; Line Leader SD-010; Act II and broader treatment SD-012. |

## Creative inputs can arrive whenever you have them

A single example with “I like this part because…” is useful. Do not wait to make a perfect package. Existing [story](../story/README.md) and [script](../story/scripts/README.md) indexes provide drafts to refine; the `new characters` source attachment still needs to be supplied (SD-013).

- **Look/motion:** armor, faces, lighting, dragon silhouette, camera behavior, or one useful timestamp.
- **Assembly:** rough views of wings folded/open, recovered parts, hinges and a family-scale comparison.
- **Characters:** filename plus position for remaining reference identities; Lyla's color when a direction occurs.
- **Sound:** editable sketches/layers for SOS, pod, suits, attachment, power-up or adventure theme.
- **Playtest:** where a child needs help, whether narration is audible, and whether the keys feel comfortable. Keep identifying child observations out of public commits.

The language question is tracked as SD-019: keep the existing TypeScript game/Python tooling split; revisit Rust/C++ only for a specific profiled need. No rewrite, cloud-save service, multiplayer, Line Leader or Act II expansion is a prerequisite for this slice.
