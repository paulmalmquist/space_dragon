# Cinematic launch direction — original owner text

Captured October 31, 2026 from the conversation. The IDE-referenced attachment was unavailable; the supplied message is preserved below. The accompanying diagram shows Blender feeding cinematic-video and gameplay paths into a Unity Cinematic Director and a seamless return to gameplay.

---

Three types of cutscenes
Type	Best technique	Example
In-engine cinematic	Unity Timeline + Cinemachine	Family conversations, suit assembly, dragon entering a hangar, enemy introductions
Prerendered spectacle	Blender Cycles + optional AI enhancement	Dragon launching into orbit, entering a wormhole, planetary destruction
Hybrid transition	Cinematic video → synchronized Unity scene	Dragon emerges from an atmosphere and the player takes control

The first type should be our default. Unity's Timeline and Cinemachine support animation sequencing, camera cuts, and blends between cinematic and gameplay cameras. No video loading or switching between separate representations of the dragon is necessary.
6.6.0

The second and third types are where AI video becomes especially interesting.
Example: The dragon takes off from Earth
This is exactly where I would use AI-enhanced video.

Shot 1 — Unity, real time

The family enters the dragon. The player initiates launch. Unity Timeline takes control of the camera, the wings unfold, thrusters ignite, and the dragon begins ascending.

Shot 2 — Prerendered / AI enhanced

The camera pulls back as the dragon punches through clouds. Blender establishes its flight path and shape. AI adds enormous cloud formations, turbulence, lighting and cinematic spectacle beyond what we'd want to render live.

Shot 3 — Matching handoff

The dragon emerges into orbit. The last portion of the shot is deliberately matched to the Unity scene's dragon position, orientation, camera and lighting. Cloud, glare or thruster bloom conceals the switch.

Shot 4 — Unity gameplay resumes

The cinematic camera blends into the third-person flight camera. The HUD appears, and the player immediately controls the dragon. No separate character model or fake gameplay footage is involved.

The cloud cover is particularly useful: it gives us a natural way to conceal a switch from video to a live 3D world.
How I'd actually produce the AI video
1. Animate the dragon in Blender first. Define the flight path, wing position, camera trajectory and the exact starting and ending poses. Render a rough preview.
2. Export frames or footage to an AI video model. For example, Runway's Aleph/Edit Studio can modify an existing video to add effects, atmospheric complexity and more cinematic lighting, while preserving much of its source composition.
   Runway
3. Use reference-driven generation for more ambitious shots. Runway's 3D-composition workflow can use a rendered Blender scene to direct object placement and framing. Veo supports first/last-frame conditioning and subject references, although its old Gemini API preview endpoints were retired on October 22, 2026, so we would verify the current supported access route.
   runway.com+2
4. Protect the handoff frames. AI cannot reliably guarantee pixel-perfect matching or unchanged dragon geometry. Finish the video with controlled, unaltered footage from Blender or Unity where necessary. Match the Unity camera's field of view, transform, lighting and dragon animation pose.
5. Make Unity prepare the destination during playback. Load the destination scene asynchronously, position the real dragon at its handoff transform, prepare its shaders, then use a brief visually concealed transition before enabling controls.
The key is that AI enhances a shot we have already choreographed, rather than inventing movement that Unity subsequently has to reproduce.

For music and sound, I'd retain our own soundtrack, sound effects and dialogue stems as much as possible. That gives us precise timing and keeps the musical SOS motifs consistent across gameplay and cinematics.
Important: Unity Web has video limitations
Unity 6.6 does support streaming video in browser builds, but there's one significant catch: Web builds don't support embedded Unity VideoClip assets or frame-accurate VideoPlayer playback. We need to use URL-based video and design handoffs that tolerate small timing differences.
Unity Docs

My delivery design would be:
- Encode cinematic footage as browser-compatible H.264 MP4 initially, with tested fallbacks.
- Serve the videos from a CDN, not through Railway's API process.
- Use Unity's VideoPlayer.Prepare() and a readiness check to avoid starting an unprepared video.
  Unity Docs
- Load the next gameplay scene asynchronously while the cinematic runs.
- Provide skip, replay, buffering recovery and a fallback to an in-engine transition if the video fails.
This is attractive for ordinary computers because the most demanding cinematic frames are decoded as video rather than rendered at full real-time complexity. Browser video playback still consumes resources, so we should profile video decode and scene loading together.
What I would build into Space Dragon
I'd add a reusable Cinematic Director with the following responsibilities:
System	Responsibility
Timeline Director	Runs in-engine scripted cameras and animations
Video Director	Prepares and plays AI-enhanced or Blender-rendered sequences
Handoff Controller	Stores and restores camera, actor pose, velocity and gameplay state
Scene Preloader	Loads destination environments and required assets
Audio Director	Synchronizes original score, dialogue and sound effects
Quality Controller	Chooses appropriate video resolution and fallback transitions
Cinematic QA	Tests skip, replay, buffering, continuity and control recovery

The first proof of concept should be a 10–15-second dragon-launch sequence with an actual playable handoff, produced in both a fully Unity-rendered version and an AI-enhanced video version.

That comparison would tell us whether AI meaningfully improves the spectacle without introducing obvious character inconsistencies or browser-loading problems.
My recommendation
Use Blender as the authoritative source for every recurring character and object, Unity as the authoritative gameplay world, and AI video as a cinematic enhancement layer.

That approach gives us the greatest chance of creating spectacular sequences that feel much more expensive than the underlying game, while retaining convincing, controllable gameplay and a maintainable production workflow.
