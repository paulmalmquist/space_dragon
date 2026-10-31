# Walkable home increment

Date: October 29, 2026. Owner request: begin the next step to 3D navigation, and add video of the actual house, yard and garage as future reference. Tracked as SD-020 and SD-021.

## Scope selected now

Build a small third-person exploration mode alongside First Contact. The player walks a visible articulated humanoid from the living room through a doorway into the yard, approaches the computer or pod, and collects one practice module. This implements the owner's new navigation instruction; the earlier human-playtest gate does not block this explicitly authorized coding increment. Human usability and final-art review remain separate.

The current character is original provisional geometry, not a family likeness or an approved suit design. Its arms and legs animate while walking. The home is a generic cutaway blockout, with a garage backdrop beyond the fence. The garage interior, stairs, jumping, companions and a whole town are outside this increment.

## Controls and interaction boundaries

- Walk around is the primary welcome action; Space/Enter from the welcome also starts it. Existing sound/quiet First Contact buttons remain available, and the player can switch modes during play.
- WASD and arrows move relative to the follow camera. Left-drag or Q/E turns the camera; R recenters it. Space/Enter interacts with the nearest reachable object. Escape pauses; blur and notebook entry clear movement so keys cannot remain stuck.
- The camera follows with damping and shortens its boom around visible obstacles. The room uses low cutaway walls so the person stays visible. Those low visual walls retain solid walking boundaries; the open doorway is the way through.
- Pure navigation rules own normalized movement, collision/sliding, reach checks and collection. Mesh animation does not award inventory. Computer and pod actions replay feedback; the pod opens. The training module is a prototype pickup, not a canonical recovered dragon component.
- Exploration uses its own `space-dragon.exploration.v1` save and backup, independent of First Contact's v1/v2 saves. It stores safe position/facing and the one stable pickup ID, validates and recovers unsafe poses, protects future saves and reports write failures honestly. Repeated pickup attempts cannot duplicate rewards.

## Source and layout

[navigation.ts](../../src/game/navigation.ts) is the renderer-independent model; [exploration-save.ts](../../src/game/exploration-save.ts) owns its persistence. [scene.ts](../../src/game/scene.ts), [player-avatar.ts](../../src/game/player-avatar.ts) and [third-person-camera.ts](../../src/game/third-person-camera.ts) present the model. The UI receives state updates and saves on movement boundaries/periodically, rather than serializing engine objects.

No physics service, backend, new dependency or family-media upload is required for this flat walking slice. More complex terrain/physics can be selected when a concrete mechanic needs it. Babylon's [camera overview](https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_introduction/) and [collision documentation](https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_collisions/) were consulted; the bounded walking/camera collision rules here are explicit tested project code.

## Reference video later

The owner wants footage of the real house, yard and garage to inform the space. No footage has arrived and the present scene is not a reconstruction. [The reference guide](../REFERENCE_HOME_VIDEO.md) accepts a simple phone walkthrough and brief notes about what should feel familiar. Agents keep source clips in ignored `assets/reference/local/home/`, connect each later adjustment to its reference, and review the result while walking in the game. Capture does not need to delay coding.

When footage changes the blockout, update scene geometry, `WORLD_COLLIDERS`, interaction positions, camera-obstacle proxies and safe spawn together. Recheck the actual walking route and saved-pose recovery so a visual edit does not leave invisible obstacles or strand a returning player.

## Verification and next gate

Use navigation unit cases and actual keyboard browser routes for movement, wall/door passage, camera follow, proximity actions, repeated pickup, reload, pause/focus loss, notebook isolation and preserved story saves. Also rerun the First Contact flows and production-asset checks. The task receipt records observed results. Human movement feel, audible guidance, AMD GPU performance and final art approval require their own evidence; software rendering is not a hardware benchmark.
