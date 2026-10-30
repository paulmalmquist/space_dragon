# First Contact: a ten-minute keyboard playtest

An adult runs this on the computer and browser the family will actually use. Automated tests check code and browser behavior; this session checks whether a child can understand and enjoy the slice. It does not measure reading mastery.

## Before starting

The owner selected **this Lenovo 82XM laptop with Chrome and keyboard**. Record the actual Chrome version, tested commit, and whether speakers or headphones are in use. Start the game with `Start Space Dragon.cmd`, then open `http://127.0.0.1:5173/space-dragon/` in Chrome (the launcher's default browser may differ). Use a synthetic or empty local save for the first run. Check the volume yourself first.

The temporary narrator is the browser's ordinary synthetic voice, never a family voice. Confirm it is **actually audible** after pressing Start/Action. If no voice is available, record that as a blocker for a non-reading playtest; captions alone do not establish the spoken-prompt requirement. Do not install a voice, add an account, or upload recordings just to complete the session.

Keep detailed child observations locally in ignored `assets/reference/local/` or `artifacts/`, using anonymous labels. Share only a short list of product problems and device results with the agent. Do not commit names, video, voices, diagnoses, skill rankings, or detailed learning records.

## Ten minutes

| Time | Adult task | What to observe |
| --- | --- | --- |
| 0–2 min | Give the keyboard to the player. Say only “Let's see what happens.” | Can they start and notice the interrupted signal without reading? Is the narration clear and comfortable? |
| 2–4 min | Let them find the backyard and meet the five suits. | Are arrows, Space and Enter understandable? Are the five people and their roles distinguishable? Does anything move on before they are ready? |
| 4–6 min | Let them try Lyla's scan. Wait before explaining. | Do they notice the shimmer? Can they repeat the prompt? Record where they ask for help. Let the hint ladder reach “do it together”; confirm assisted completion still reaches the same archive/map. |
| 6–8 min | Ask them to repeat the spoken prompt with H, then reload the page. | Is the repeated prompt understandable? Is progress restored with the same suit collection/archive state? Is the returning objective clear? |
| 8–10 min | Let them look at the town map, then ask “What do you think we do next?” | Is the next adventure understandable from pictures and narration? Is there a moment they want to replay, or a moment they want to stop? |

Pressing and holding a key should not skip a chain of scenes. Try leaving the browser tab and returning once; no surprise progress or stuck input should result. Do not ask a child to debug a failure. Stop or help when they are frustrated, startled, or tired.

## Send the agent a short result

Plain language is enough:

> Computer/browser: …
>
> Sound actually played: yes/no; narrator too fast/quiet/clear: …
>
> Needed adult help at: …
>
> The “do it together” path: completed/stuck at …
>
> Reload returned to: …
>
> Favorite moment / confusing moment: …

The adult's observations guide the next fixes. They are not approval of final likenesses, accessibility across all devices, or a release. Xbox plug-and-play remains separately untested unless a controller was actually connected and used; touch is outside the current milestone.
