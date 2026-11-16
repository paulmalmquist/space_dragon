using System;
using System.Collections.Generic;
using SpaceDragon.Traversal;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Rendering;

namespace SpaceDragon.Playground
{
    /// <summary>Materials and meshes the arena draws its moving parts with. Assigned by the scene generator.</summary>
    [Serializable]
    public sealed class ArenaArt
    {
        public Material shell, dark, mower, drone, pip, pipSpent, gem, gemTaken, lane, target, quiet, wrap, star, beam;
        public Material eyeCalm, eyeCurious, eyeAlert, eyeHeld, eyeOff, fanCalm, fanCurious, fanAlert;
        public Mesh diamond;
    }

    /// <summary>A read-only view of the running arena for checks and receipts.</summary>
    [Serializable]
    public sealed class ArenaSnapshot
    {
        public string world, trial, mode, targetId, action, saveNotice;
        public float x, y, z;
        public int energy, wave, stars, courseStars, ringStars, stealthStars, quiet, robotsShown;
        public bool paused, avatarBound, seen, targetQuiet;
    }

    /// <summary>
    /// Luke's Arena in Unity: reads keyboard, mouse and controller, advances the engine-free
    /// ArenaSession, then draws the result (stand-in, robots, what they can see, telegraphs, HUD).
    /// Game state lives only in the session; nothing drawn here is ever read back into it.
    /// A lab for trying abilities and stealth, not a story mission.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class ArenaGame : MonoBehaviour
    {
        public const string SaveKey = "space-dragon.arena.v1";
        public const string BackupKey = "space-dragon.arena.v1.backup";
        private const float BaseFov = 59f, BaseDistance = 5.6f, BasePitch = 0.5f, FocusHeight = 1.18f, FollowSpeed = 5.6f;
        private const int FanRays = 22;

        [SerializeField] private PersonAvatar avatar;
        [SerializeField] private Camera gameCamera;
        [SerializeField] private LineRenderer tether;
        [SerializeField] private Transform reticle;
        [SerializeField] private RenderPipelineAsset pipeline;
        [SerializeField] private AudioSource voice;
        [SerializeField] private Light floodlight;
        [SerializeField] private ArenaArt art = new ArenaArt();

        private sealed class RobotView
        {
            public RobotSpec spec; public RobotProfile profile;
            public Transform root, body, mark, wrap, lane;
            public Renderer eye, markRenderer;
            public Renderer[] pips;
            public Transform[] spinners = Array.Empty<Transform>();
            public Mesh fanMesh; public GameObject fan; public Renderer fanRenderer; public Vector3[] fanPoints;
            public float shown, down; public int lastSparks;
        }

        private ArenaLayout layout;
        private ArenaSession session;
        private IPlaygroundStore store;
        private string saveNotice = "", toast = "";
        private bool paused, confirmReset, initialized;
        private float toastTime, clock, lifted;
        private RobotView[] robots = Array.Empty<RobotView>();
        private RobotMode[] robotModes = Array.Empty<RobotMode>();
        private Transform[] gems = Array.Empty<Transform>();
        private Renderer[] gemRenderers = Array.Empty<Renderer>();
        private Vector3[] gemHome = Array.Empty<Vector3>();
        private Transform[] dizzyStars = Array.Empty<Transform>();
        private LineRenderer targetRing, quietRing, catchBeam;

        private float cameraYaw, cameraPitch = BasePitch, cameraDistance = BaseDistance, boom = BaseDistance, manualLook, dip;
        private Vector3 focus;
        private bool cameraReady;
        private RenderPipelineAsset previousDefault, previousQuality;
        private bool ownsPipeline;
        private AudioClip snareSound, pounceSound, impactSound, boopSound, hitSound, alertSound, waveSound, caughtSound, sparkSound, starSound, windupSound, jumpSound, landSound;
        private GUIStyle titleStyle, bodyStyle, promptStyle, buttonStyle;

        public ArenaSession Session => session;

        /// <summary>Called by the scene generator; play mode only reads these references.</summary>
        public void Configure(PersonAvatar hero, Camera view, LineRenderer line, Transform anchorReticle, RenderPipelineAsset renderPipeline, AudioSource audio, Light flood, ArenaArt artwork)
        {
            avatar = hero; gameCamera = view; tether = line; reticle = anchorReticle; pipeline = renderPipeline; voice = audio; floodlight = flood; art = artwork ?? new ArenaArt();
        }

        /// <summary>Tests replace PlayerPrefs before Start.</summary>
        public void UseStore(IPlaygroundStore replacement) { store = replacement; }

        private void Awake()
        {
            if (pipeline != null)
            {
                previousDefault = GraphicsSettings.defaultRenderPipeline;
                previousQuality = QualitySettings.renderPipeline;
                GraphicsSettings.defaultRenderPipeline = pipeline;
                QualitySettings.renderPipeline = pipeline;
                ownsPipeline = true;
            }
            layout = LukeArenaData.Create();
            session = new ArenaSession(layout);
        }

        private void Start()
        {
            if (store == null) store = new PlaygroundPlayerPrefsStore();
            LoadSave();
            BuildVisuals();
            BuildSounds();
            cameraYaw = (float)session.State.hero.yaw;
            Present(0, true);
            initialized = true;
        }

        private void OnDestroy()
        {
            if (initialized) SaveNow();
            // Restore only values still owned here; never overwrite a later change.
            if (ownsPipeline)
            {
                if (GraphicsSettings.defaultRenderPipeline == pipeline) GraphicsSettings.defaultRenderPipeline = previousDefault;
                if (QualitySettings.renderPipeline == pipeline) QualitySettings.renderPipeline = previousQuality;
            }
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        private void OnApplicationFocus(bool focused) { if (!focused && initialized) { SaveNow(); session.Settle(); } }
        private void OnApplicationPause(bool pausing) { if (pausing && initialized) SaveNow(); }

        // ---------- Saving: stars and counters only ----------
        private void LoadSave()
        {
            var status = session.Restore(store.Read(SaveKey));
            if (status == ArenaSaveStatus.Unreadable)
            {
                // An unreadable save falls back to the last one that was known to be good.
                var recovered = session.Restore(store.Read(BackupKey));
                saveNotice = recovered == ArenaSaveStatus.Restored ? "Your last arena save could not be read. An earlier one was restored." : "Your arena save could not be read. Starting fresh.";
                if (recovered != ArenaSaveStatus.Restored) session.Restore(null);
            }
            else if (status == ArenaSaveStatus.Newer) saveNotice = "These stars are from a newer build. They are kept safe and will not be changed.";
            else saveNotice = "";
        }

        private void SaveNow()
        {
            if (session == null || store == null) return;
            string current = store.Read(SaveKey);
            string text = session.SaveText(current);
            if (text == null || text == current) return;
            ArenaSession.Decode(layout, current, out var status);
            if (status == ArenaSaveStatus.Restored) store.Write(BackupKey, current);
            store.Write(SaveKey, text);
            store.Flush();
        }

        private void ResetStars()
        {
            string current = store.Read(SaveKey);
            string text = session.ResetText();
            if (text == null) { saveNotice = "These stars are from a newer build and were left alone."; return; }
            ArenaSession.Decode(layout, current, out var status);
            if (status == ArenaSaveStatus.Restored) store.Write(BackupKey, current);
            store.Write(SaveKey, text);
            store.Flush();
            saveNotice = "Stars cleared.";
            cameraYaw = (float)session.State.hero.yaw;
            cameraReady = false;
            Present(0, true);
        }

        // ---------- Input ----------
        private struct Controls
        {
            public Vector2 move, look;
            public bool jumpPressed, jumpHeld, power, actionPressed, actionHeld, pouncePressed, pounceHeld, pausePressed, recenter;
        }

        private Controls ReadControls(float seconds)
        {
            var input = new Controls();
            var keyboard = Keyboard.current;
            if (keyboard != null)
            {
                input.move.x = (keyboard.dKey.isPressed || keyboard.rightArrowKey.isPressed ? 1 : 0) - (keyboard.aKey.isPressed || keyboard.leftArrowKey.isPressed ? 1 : 0);
                input.move.y = (keyboard.wKey.isPressed || keyboard.upArrowKey.isPressed ? 1 : 0) - (keyboard.sKey.isPressed || keyboard.downArrowKey.isPressed ? 1 : 0);
                input.look.x = ((keyboard.eKey.isPressed ? 1 : 0) - (keyboard.qKey.isPressed ? 1 : 0)) * 110 * seconds;
                input.jumpPressed = keyboard.spaceKey.wasPressedThisFrame;
                input.jumpHeld = keyboard.spaceKey.isPressed;
                input.power = keyboard.leftShiftKey.isPressed || keyboard.rightShiftKey.isPressed;
                input.actionPressed = keyboard.fKey.wasPressedThisFrame || keyboard.jKey.wasPressedThisFrame || keyboard.enterKey.wasPressedThisFrame;
                input.actionHeld = keyboard.fKey.isPressed || keyboard.jKey.isPressed || keyboard.enterKey.isPressed;
                input.pouncePressed = keyboard.gKey.wasPressedThisFrame || keyboard.kKey.wasPressedThisFrame;
                input.pounceHeld = keyboard.gKey.isPressed || keyboard.kKey.isPressed;
                input.pausePressed = keyboard.escapeKey.wasPressedThisFrame || keyboard.pKey.wasPressedThisFrame;
                input.recenter = keyboard.rKey.wasPressedThisFrame;
            }
            var gamepad = Gamepad.current;
            if (gamepad != null)
            {
                input.move += gamepad.leftStick.ReadValue();
                input.look += gamepad.rightStick.ReadValue() * (130 * seconds);
                input.jumpPressed |= gamepad.buttonSouth.wasPressedThisFrame;
                input.jumpHeld |= gamepad.buttonSouth.isPressed;
                input.power |= gamepad.rightTrigger.ReadValue() > 0.35f || gamepad.leftTrigger.ReadValue() > 0.35f || gamepad.leftShoulder.isPressed || gamepad.rightShoulder.isPressed;
                input.actionPressed |= gamepad.buttonWest.wasPressedThisFrame || gamepad.buttonEast.wasPressedThisFrame;
                input.actionHeld |= gamepad.buttonWest.isPressed || gamepad.buttonEast.isPressed;
                input.pouncePressed |= gamepad.buttonNorth.wasPressedThisFrame;
                input.pounceHeld |= gamepad.buttonNorth.isPressed;
                input.pausePressed |= gamepad.startButton.wasPressedThisFrame;
                input.recenter |= gamepad.rightStickButton.wasPressedThisFrame;
            }
            var mouse = Mouse.current;
            if (mouse != null)
            {
                bool looking = mouse.rightButton.isPressed || Cursor.lockState == CursorLockMode.Locked;
                if (looking) input.look += Vector2.ClampMagnitude(mouse.delta.ReadValue(), 150) * 0.16f;
                // A click on the play view captures the mouse; Escape gives it back.
                if (!paused && mouse.leftButton.wasPressedThisFrame && Cursor.lockState != CursorLockMode.Locked && mouse.position.ReadValue().x > 380 * UiScale)
                { Cursor.lockState = CursorLockMode.Locked; Cursor.visible = false; }
            }
            input.move = Vector2.ClampMagnitude(input.move, 1);
            return input;
        }

        private void SetPaused(bool value)
        {
            paused = value;
            confirmReset = false;
            if (!paused) return;
            session.Settle();
            SaveNow();
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        private void Say(string message) { toast = message; toastTime = 2.6f; }

        private void Update()
        {
            if (!initialized) return;
            float seconds = Mathf.Min(Time.unscaledDeltaTime, (float)TraversalTuning.MaxFrameSeconds);
            var input = ReadControls(seconds);
            if (input.pausePressed) SetPaused(!paused);
            if (paused) return;
            clock += seconds;
            toastTime = Mathf.Max(0, toastTime - seconds);

            if (input.look.sqrMagnitude > 0)
            {
                cameraYaw = Mathf.Repeat(cameraYaw + input.look.x * Mathf.Deg2Rad + Mathf.PI, Mathf.PI * 2) - Mathf.PI;
                cameraPitch = Mathf.Clamp(cameraPitch - input.look.y * Mathf.Deg2Rad, 0.12f, 1.05f);
                manualLook = 1.6f;
            }
            if (input.recenter) { cameraYaw = (float)session.State.hero.yaw; cameraPitch = BasePitch; manualLook = 0; }

            // Movement is relative to the camera. Aim where the stick points, or where the camera looks when standing still.
            double moveX = Math.Sin(cameraYaw) * input.move.y + Math.Cos(cameraYaw) * input.move.x;
            double moveZ = Math.Cos(cameraYaw) * input.move.y - Math.Sin(cameraYaw) * input.move.x;
            bool steering = moveX * moveX + moveZ * moveZ > 0.04;
            if (input.jumpPressed) session.PressJump();
            if (input.actionPressed) session.PressAction();
            if (input.pouncePressed) session.PressPounce();
            session.Advance(seconds, moveX, moveZ, input.jumpHeld, input.power, input.actionHeld, input.pounceHeld, steering ? moveX : Math.Sin(cameraYaw), steering ? moveZ : Math.Cos(cameraYaw));
            React();
            Present(seconds, false);
        }

        /// <summary>Sounds, messages and saving for everything that happened this frame.</summary>
        private void React()
        {
            var events = session.FrameEvents;
            var heroEvents = session.FrameHeroEvents;
            var state = session.State;
            if ((heroEvents & (HeroEvent.Jump | HeroEvent.Hop | HeroEvent.Bounce)) != 0) Play(jumpSound, 0.3f);
            if ((heroEvents & HeroEvent.Land) != 0) Play(landSound, Mathf.Clamp01(0.15f + (float)state.hero.impact / 28));
            if ((events & ArenaEvent.Snare) != 0 || (heroEvents & HeroEvent.Attach) != 0) Play(snareSound, 0.38f);
            if ((events & ArenaEvent.Pounce) != 0) Play(pounceSound, 0.3f);
            if ((events & ArenaEvent.Impact) != 0) Play(impactSound, 0.5f);
            // Robots power down with a sad boop.
            if ((events & ArenaEvent.Resolve) != 0) Play(boopSound, 0.45f);
            if ((events & ArenaEvent.Hit) != 0) Play(hitSound, 0.5f);
            if ((events & ArenaEvent.Spotted) != 0) Play(alertSound, 0.3f);
            if ((events & ArenaEvent.Wave) != 0) { Play(waveSound, 0.4f); Say("Wave " + state.wave); }
            if ((events & ArenaEvent.Caught) != 0) { Play(caughtSound, 0.4f); Say("Caught in the light. Back to hiding: try another way."); }
            if ((events & ArenaEvent.Bonk) != 0) Say("Bonked! Shake it off.");
            if ((events & ArenaEvent.Quiet) != 0) Say("Quiet takedown");
            if ((events & ArenaEvent.Pickup) != 0) { Play(sparkSound, 0.5f); if (avatar != null) avatar.Celebrate(); }
            if ((events & ArenaEvent.Trial) != 0 && (events & ArenaEvent.Star) == 0) Say("Done! Try for another star.");
            if ((events & ArenaEvent.Star) != 0) { Play(starSound, 0.55f); Say("New star!"); if (avatar != null) avatar.Celebrate(); }
            // A robot starting its wind-up is heard as well as seen.
            for (int index = 0; index < state.robots.Length && index < robotModes.Length; index++)
            {
                if (state.robots[index].mode == RobotMode.Windup && robotModes[index] != RobotMode.Windup) Play(windupSound, 0.3f);
                robotModes[index] = state.robots[index].mode;
            }
            // A reward is made durable at once so a crash or reload can never hand it out twice.
            if (session.ShouldSave) SaveNow();
        }

        // ---------- Building the moving parts ----------
        private Transform Part(PrimitiveType type, string partName, Transform parent, Material material, Vector3 position, Vector3 scale, bool shadows = true)
        {
            var shape = GameObject.CreatePrimitive(type);
            shape.name = partName;
            var collider = shape.GetComponent<Collider>();
            if (collider != null) Destroy(collider);
            shape.transform.SetParent(parent, false);
            shape.transform.localPosition = position;
            shape.transform.localScale = scale;
            var renderer = shape.GetComponent<Renderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = shadows ? ShadowCastingMode.On : ShadowCastingMode.Off;
            return shape.transform;
        }

        private LineRenderer Circle(string ringName, Transform parent, float radius, float width, Material material)
        {
            var line = new GameObject(ringName).AddComponent<LineRenderer>();
            line.transform.SetParent(parent, false);
            const int points = 28;
            line.useWorldSpace = false; line.loop = true; line.positionCount = points;
            for (int index = 0; index < points; index++)
            {
                float angle = index * Mathf.PI * 2 / points;
                line.SetPosition(index, new Vector3(Mathf.Cos(angle) * radius, Mathf.Sin(angle) * radius, 0));
            }
            line.startWidth = width; line.endWidth = width;
            line.sharedMaterial = material;
            line.shadowCastingMode = ShadowCastingMode.Off; line.receiveShadows = false;
            return line;
        }

        private Transform Gem(string gemName, Transform parent, Material material, float size, out Renderer renderer)
        {
            var gem = new GameObject(gemName);
            gem.transform.SetParent(parent, false);
            gem.transform.localScale = new Vector3(size, size * 1.4f, size);
            gem.AddComponent<MeshFilter>().sharedMesh = art.diamond;
            renderer = gem.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = ShadowCastingMode.Off; renderer.receiveShadows = false;
            return gem.transform;
        }

        private RobotView BuildRobot(RobotSpec spec, Transform parent)
        {
            var profile = layout.Profile(spec.kind);
            var view = new RobotView { spec = spec, profile = profile, lastSparks = profile.sparks };
            view.root = new GameObject("Robot." + spec.id).transform;
            view.root.SetParent(parent, false);
            view.body = new GameObject("body").transform;
            view.body.SetParent(view.root, false);
            var spinners = new List<Transform>();
            Transform eye;
            if (spec.kind == RobotKind.Iguana)
            {
                Part(PrimitiveType.Sphere, "torso", view.body, art.shell, new Vector3(0, 0.42f, 0), new Vector3(0.56f, 0.36f, 1.08f));
                Part(PrimitiveType.Cube, "head", view.body, art.shell, new Vector3(0, 0.5f, 0.62f), new Vector3(0.36f, 0.25f, 0.38f));
                eye = Part(PrimitiveType.Cube, "eye", view.body, art.eyeCalm, new Vector3(0, 0.55f, 0.81f), new Vector3(0.3f, 0.07f, 0.05f), false);
                var tail = Part(PrimitiveType.Cylinder, "tail", view.body, art.shell, new Vector3(0, 0.4f, -0.86f), new Vector3(0.14f, 0.42f, 0.14f));
                tail.localRotation = Quaternion.Euler(90, 0, 0);
                foreach (var corner in new[] { new Vector2(0.3f, 0.3f), new Vector2(-0.3f, 0.3f), new Vector2(0.3f, -0.3f), new Vector2(-0.3f, -0.3f) })
                    Part(PrimitiveType.Cube, "leg", view.body, art.dark, new Vector3(corner.x, 0.16f, corner.y), new Vector3(0.11f, 0.32f, 0.13f));
            }
            else if (spec.kind == RobotKind.Drone)
            {
                Part(PrimitiveType.Sphere, "shell", view.body, art.drone, new Vector3(0, 0.2f, 0), new Vector3(0.5f, 0.32f, 0.5f));
                eye = Part(PrimitiveType.Sphere, "eye", view.body, art.eyeCalm, new Vector3(0, 0.18f, 0.22f), Vector3.one * 0.17f, false);
                foreach (float side in new[] { -0.32f, 0.32f })
                    spinners.Add(Part(PrimitiveType.Cube, "rotor", view.body, art.dark, new Vector3(side, 0.34f, 0), new Vector3(0.44f, 0.015f, 0.06f), false));
            }
            else if (spec.kind == RobotKind.Mower)
            {
                Part(PrimitiveType.Cube, "deck", view.body, art.mower, new Vector3(0, 0.46f, 0), new Vector3(1.14f, 0.46f, 1.34f));
                Part(PrimitiveType.Cube, "cowl", view.body, art.dark, new Vector3(0, 0.8f, -0.1f), new Vector3(0.8f, 0.26f, 0.72f));
                eye = Part(PrimitiveType.Cube, "eye", view.body, art.eyeCalm, new Vector3(0, 0.6f, 0.69f), new Vector3(0.62f, 0.09f, 0.05f), false);
                var drum = Part(PrimitiveType.Cylinder, "drum", view.body, art.drone, new Vector3(0, 0.2f, 0.78f), new Vector3(0.3f, 0.52f, 0.3f));
                drum.localRotation = Quaternion.Euler(0, 0, 90);
                foreach (var corner in new[] { new Vector2(0.6f, 0.42f), new Vector2(-0.6f, 0.42f), new Vector2(0.6f, -0.42f), new Vector2(-0.6f, -0.42f) })
                    Part(PrimitiveType.Cylinder, "wheel", view.body, art.dark, new Vector3(corner.x, 0.21f, corner.y), new Vector3(0.42f, 0.07f, 0.42f)).localRotation = Quaternion.Euler(0, 0, 90);
            }
            else
            {
                Part(PrimitiveType.Cylinder, "base", view.body, art.dark, new Vector3(0, 0.07f, 0), new Vector3(0.8f, 0.07f, 0.8f));
                Part(PrimitiveType.Cylinder, "post", view.body, art.dark, new Vector3(0, 1, 0), new Vector3(0.16f, 0.95f, 0.16f));
                Part(PrimitiveType.Cube, "lamp", view.body, art.dark, new Vector3(0, 2.05f, 0.12f), new Vector3(0.4f, 0.32f, 0.52f)).localRotation = Quaternion.Euler(17, 0, 0);
                eye = Part(PrimitiveType.Sphere, "lens", view.body, art.eyeCalm, new Vector3(0, 1.97f, 0.38f), new Vector3(0.28f, 0.28f, 0.06f), false);
            }
            view.eye = eye.GetComponent<Renderer>();
            view.spinners = spinners.ToArray();
            float top = (float)profile.height + 0.5f;
            view.pips = new Renderer[profile.sparks];
            for (int index = 0; index < profile.sparks; index++)
                view.pips[index] = Part(PrimitiveType.Sphere, "pip", view.root, art.pip, new Vector3((index - (profile.sparks - 1) / 2f) * 0.22f, top, 0), Vector3.one * 0.14f, false).GetComponent<Renderer>();
            // Noticed-you marker: a small gem over its head, yellow while it wonders and red once it knows.
            view.mark = Gem("mark", view.root, art.eyeCurious, 0.16f, out view.markRenderer);
            view.mark.localPosition = new Vector3(0, top + 0.45f, 0);
            view.wrap = Circle("wrap", view.root, (float)profile.radius + 0.25f, 0.05f, art.wrap).transform;
            view.wrap.localPosition = new Vector3(0, (float)profile.height * 0.5f, 0);
            view.wrap.localRotation = Quaternion.Euler(90, 0, 0);
            if (spec.kind != RobotKind.Drone)
            {
                // What it can see right now, drawn on the floor and cut off by cover.
                view.fan = new GameObject("Fan." + spec.id);
                view.fan.transform.SetParent(parent, false);
                view.fanPoints = new Vector3[FanRays + 2];
                var triangles = new int[FanRays * 3];
                for (int ray = 0; ray < FanRays; ray++) { triangles[ray * 3] = 0; triangles[ray * 3 + 1] = ray + 1; triangles[ray * 3 + 2] = ray + 2; }
                view.fanMesh = new Mesh { name = "Fan." + spec.id };
                view.fanMesh.MarkDynamic();
                view.fanMesh.vertices = view.fanPoints;
                view.fanMesh.triangles = triangles;
                view.fan.AddComponent<MeshFilter>().sharedMesh = view.fanMesh;
                view.fanRenderer = view.fan.AddComponent<MeshRenderer>();
                view.fanRenderer.sharedMaterial = art.fanCalm;
                view.fanRenderer.shadowCastingMode = ShadowCastingMode.Off; view.fanRenderer.receiveShadows = false;
            }
            if (spec.kind != RobotKind.Sentry)
            {
                // Where its attack will go: shown for the whole wind-up.
                float reach = (float)(profile.hit + TraversalTuning.Default.radius);
                view.lane = spec.kind == RobotKind.Drone
                    ? Part(PrimitiveType.Cylinder, "Lane." + spec.id, parent, art.lane, Vector3.zero, new Vector3(reach * 2, 0.01f, reach * 2), false)
                    : Part(PrimitiveType.Cube, "Lane." + spec.id, parent, art.lane, Vector3.zero, new Vector3(reach * 2, 0.02f, (float)profile.strikeDistance), false);
                view.lane.gameObject.SetActive(false);
            }
            view.root.gameObject.SetActive(false);
            return view;
        }

        private void BuildVisuals()
        {
            var root = new GameObject("Arena.moving").transform;
            robots = new RobotView[layout.robots.Length];
            robotModes = new RobotMode[layout.robots.Length];
            for (int index = 0; index < robots.Length; index++) { robots[index] = BuildRobot(layout.robots[index], root); robotModes[index] = session.State.robots[index].mode; }
            gems = new Transform[layout.pickups.Length];
            gemRenderers = new Renderer[layout.pickups.Length];
            gemHome = new Vector3[layout.pickups.Length];
            for (int index = 0; index < gems.Length; index++)
            {
                var pickup = layout.pickups[index];
                gems[index] = Gem("Spark." + pickup.id, root, art.gem, pickup.trial == TrialId.Stealth ? 0.45f : 0.3f, out gemRenderers[index]);
                gemHome[index] = new Vector3((float)pickup.x, (float)pickup.y, (float)pickup.z);
                gems[index].position = gemHome[index];
            }
            dizzyStars = new Transform[3];
            for (int index = 0; index < dizzyStars.Length; index++) { dizzyStars[index] = Gem("Dizzy." + index, root, art.star, 0.09f, out _); dizzyStars[index].gameObject.SetActive(false); }
            targetRing = Circle("Arena.target", root, 0.5f, 0.045f, art.target);
            quietRing = Circle("Arena.target-quiet", root, 0.33f, 0.05f, art.quiet);
            targetRing.gameObject.SetActive(false); quietRing.gameObject.SetActive(false);
            catchBeam = new GameObject("Arena.catch-beam").AddComponent<LineRenderer>();
            catchBeam.transform.SetParent(root, false);
            catchBeam.useWorldSpace = true; catchBeam.positionCount = 2; catchBeam.startWidth = 0.16f; catchBeam.endWidth = 0.9f;
            catchBeam.sharedMaterial = art.beam; catchBeam.shadowCastingMode = ShadowCastingMode.Off; catchBeam.receiveShadows = false;
            catchBeam.enabled = false;
        }

        // ---------- Drawing ----------
        /// <summary>Distance along a flat ray to the first block, for the sight fans.</summary>
        private float Reach(double x, double z, double dirX, double dirZ, double limit, double eyeHeight)
        {
            double best = limit;
            foreach (var solid in layout.world.solids)
            {
                if (solid.maxY <= eyeHeight || solid.IsTrunk) continue;
                double tx1 = (solid.minX - x) / dirX, tx2 = (solid.maxX - x) / dirX, tz1 = (solid.minZ - z) / dirZ, tz2 = (solid.maxZ - z) / dirZ;
                double near = Math.Max(Math.Min(tx1, tx2), Math.Min(tz1, tz2)), far = Math.Min(Math.Max(tx1, tx2), Math.Max(tz1, tz2));
                if (far >= Math.Max(near, 0) && near > 0 && near < best) best = near;
            }
            return (float)best;
        }

        private static float Blend(double from, double to, float alpha) => (float)(from + (to - from) * alpha);

        private void Present(float seconds, bool snap)
        {
            var state = session.State;
            var before = session.Previous;
            var hero = state.hero;
            float alpha = (float)session.Alpha;
            bool teleported = Math.Abs(hero.x - before.hero.x) + Math.Abs(hero.y - before.hero.y) + Math.Abs(hero.z - before.hero.z) > 2;
            var from = teleported || snap ? hero : before.hero;
            // Held by the floodlight: lifted a little off the ground.
            lifted = snap ? 0 : Mathf.Lerp(lifted, state.held > 0 ? 1 : 0, 1 - Mathf.Exp(-8 * seconds));
            var position = new Vector3(Blend(from.x, hero.x, alpha), Blend(from.y, hero.y, alpha) + lifted * 0.45f, Blend(from.z, hero.z, alpha));
            var rules = layout.rules;

            // ----- Robots -----
            Vector3 reachPoint = Vector3.zero;
            bool hasReach = false;
            int flood = -1;
            for (int index = 0; index < robots.Length; index++)
            {
                var view = robots[index];
                var now = state.robots[index];
                var was = before.robots[index];
                var profile = view.profile;
                if (view.spec.kind == RobotKind.Sentry) flood = index;
                bool active = now.InPlay;
                // Power up when its wave starts; slump, then sink away, when it powers down.
                view.down = now.mode == RobotMode.Resolved ? view.down + seconds : 0;
                float wanted = active || (now.mode == RobotMode.Resolved && view.down < 1.6f) ? 1 : 0;
                view.shown = snap ? wanted : Mathf.Lerp(view.shown, wanted, 1 - Mathf.Exp(-(wanted > 0 ? 9 : 5) * seconds));
                bool visible = view.shown > 0.02f;
                if (view.root.gameObject.activeSelf != visible) view.root.gameObject.SetActive(visible);
                bool showFan = false, showLane = false;
                if (visible)
                {
                    bool jumped = Math.Abs(now.x - was.x) + Math.Abs(now.z - was.z) > 2 || snap;
                    float x = jumped ? (float)now.x : Blend(was.x, now.x, alpha), z = jumped ? (float)now.z : Blend(was.z, now.z, alpha), y = jumped ? (float)now.y : Blend(was.y, now.y, alpha);
                    float yaw = jumped ? (float)now.yaw : (float)was.yaw + Mathf.DeltaAngle((float)was.yaw * Mathf.Rad2Deg, (float)now.yaw * Mathf.Rad2Deg) * Mathf.Deg2Rad * alpha;
                    float slump = Mathf.Min(1, view.down * 2.5f);
                    view.root.position = new Vector3(x, y - (now.mode == RobotMode.Resolved ? Mathf.Max(0, view.down - 0.9f) * 1.4f : 0), z);
                    view.root.rotation = Quaternion.Euler(0, yaw * Mathf.Rad2Deg, 0);
                    view.root.localScale = Vector3.one * Mathf.Max(0.05f, view.shown);
                    float windup = now.mode == RobotMode.Windup ? 1 - Mathf.Max(0, (float)now.timer) / (float)profile.windup : 0;
                    // Body language: rear back to wind up, stretch into the strike, droop while recovering.
                    float pitch = now.mode == RobotMode.Windup ? -16 * windup : now.mode == RobotMode.Strike ? 12 : now.mode == RobotMode.Recover ? 9 : 0;
                    float shake = (now.hold > 0 ? 1 : windup * 2) * Mathf.Sin(clock * 60);
                    view.body.localRotation = Quaternion.Euler(view.spec.kind == RobotKind.Sentry ? 0 : pitch + slump * 28, 0, shake + slump * (view.spec.kind == RobotKind.Drone ? 70 : 20));
                    view.body.localScale = new Vector3(1, 1 - slump * (view.spec.kind == RobotKind.Sentry ? 0 : 0.35f), 1);
                    foreach (var spinner in view.spinners) if (active && now.hold <= 0) spinner.Rotate(0, 2200 * seconds, 0, Space.Self);

                    Material eye = !active ? art.eyeOff : now.hold > 0 ? art.eyeHeld : now.mode == RobotMode.Recover ? (Mathf.Sin(clock * 12) > 0 ? art.eyeOff : art.eyeCalm)
                        : now.awareness >= 1 || now.mode == RobotMode.Alert || now.mode == RobotMode.Windup || now.mode == RobotMode.Strike ? art.eyeAlert
                        : now.awareness >= rules.unaware || now.mode == RobotMode.Curious || now.mode == RobotMode.Search ? art.eyeCurious : art.eyeCalm;
                    if (view.eye.sharedMaterial != eye) view.eye.sharedMaterial = eye;
                    for (int pip = 0; pip < view.pips.Length; pip++)
                    {
                        var wantedPip = pip < now.sparks ? art.pip : art.pipSpent;
                        if (view.pips[pip].sharedMaterial != wantedPip) view.pips[pip].sharedMaterial = wantedPip;
                        if (view.pips[pip].enabled != active) view.pips[pip].enabled = active;
                    }
                    bool marked = active && now.hold <= 0 && (eye == art.eyeAlert || eye == art.eyeCurious) && now.mode != RobotMode.Windup && now.mode != RobotMode.Strike;
                    if (view.mark.gameObject.activeSelf != marked) view.mark.gameObject.SetActive(marked);
                    if (marked && view.markRenderer.sharedMaterial != eye) view.markRenderer.sharedMaterial = eye;
                    bool held = active && now.hold > 0;
                    if (view.wrap.gameObject.activeSelf != held) view.wrap.gameObject.SetActive(held);
                    if (held) view.wrap.Rotate(0, 0, 340 * seconds, Space.Self);
                    if (state.snareId == now.id) { reachPoint = new Vector3(x, y + (float)profile.height * 0.55f, z); hasReach = true; }

                    // Sight on the floor, for robots that are still looking rather than fighting.
                    showFan = view.fan != null && active && now.hold <= 0 && (now.mode == RobotMode.Patrol || now.mode == RobotMode.Curious || now.mode == RobotMode.Search);
                    if (showFan)
                    {
                        view.fanPoints[0] = new Vector3(x, 0.06f, z);
                        for (int ray = 0; ray <= FanRays; ray++)
                        {
                            double angle = yaw - profile.cone + (double)ray / FanRays * profile.cone * 2;
                            double dirX = Math.Sin(angle), dirZ = Math.Cos(angle);
                            if (dirX == 0) dirX = 1e-9;
                            if (dirZ == 0) dirZ = 1e-9;
                            float length = Reach(now.x, now.z, dirX, dirZ, profile.sight, profile.eye);
                            view.fanPoints[ray + 1] = new Vector3(x + (float)dirX * length, 0.06f, z + (float)dirZ * length);
                        }
                        view.fanMesh.vertices = view.fanPoints;
                        view.fanMesh.RecalculateBounds();
                        var fanMaterial = eye == art.eyeAlert ? art.fanAlert : eye == art.eyeCurious ? art.fanCurious : art.fanCalm;
                        if (view.fanRenderer.sharedMaterial != fanMaterial) view.fanRenderer.sharedMaterial = fanMaterial;
                    }
                    // The telegraph: a lane or a landing spot shown for the whole wind-up.
                    showLane = view.lane != null && (now.mode == RobotMode.Windup || now.mode == RobotMode.Strike);
                    if (showLane)
                    {
                        if (view.spec.kind == RobotKind.Drone) { if (now.mode == RobotMode.Windup) view.lane.position = new Vector3((float)now.strikeX, 0.05f, (float)now.strikeZ); }
                        else
                        {
                            float half = (float)profile.strikeDistance / 2;
                            view.lane.position = new Vector3(x + Mathf.Sin(yaw) * half, 0.05f, z + Mathf.Cos(yaw) * half);
                            view.lane.rotation = Quaternion.Euler(0, yaw * Mathf.Rad2Deg, 0);
                        }
                    }
                    if (now.sparks < view.lastSparks && avatar != null && now.sparks == 0) avatar.Celebrate();
                }
                view.lastSparks = now.sparks;
                if (view.fan != null && view.fan.activeSelf != showFan) view.fan.SetActive(showFan);
                if (view.lane != null && view.lane.gameObject.activeSelf != showLane) view.lane.gameObject.SetActive(showLane);
            }

            // ----- Floodlight: a real light, bright where it looks and dark while it rests -----
            if (flood >= 0)
            {
                var now = state.robots[flood];
                var spec = layout.robots[flood];
                bool on = now.mode != RobotMode.Resolved && now.mode != RobotMode.Recover && now.hold <= 0;
                if (floodlight != null)
                {
                    if (floodlight.enabled != on) floodlight.enabled = on;
                    floodlight.transform.rotation = Quaternion.LookRotation(new Vector3(Mathf.Sin((float)now.yaw), -0.3f, Mathf.Cos((float)now.yaw)));
                    floodlight.color = Color.Lerp(new Color(1, 0.95f, 0.8f), new Color(1, 0.5f, 0.4f), (float)now.awareness);
                }
                bool caught = state.held > 0;
                if (catchBeam.enabled != caught) catchBeam.enabled = caught;
                if (caught) { catchBeam.SetPosition(0, new Vector3((float)spec.x, 2, (float)spec.z)); catchBeam.SetPosition(1, position + Vector3.up * 0.9f); }
            }

            // ----- Hero, camera, tether and snare lines -----
            Anchor anchor = hero.tetherId.Length > 0 ? layout.world.FindAnchor(hero.tetherId) : null;
            Vector3 anchorPoint = anchor == null ? Vector3.zero : new Vector3((float)anchor.x, (float)anchor.y, (float)anchor.z);
            if (avatar != null)
            {
                avatar.Present(new PersonFrame
                {
                    position = position, yaw = (float)hero.yaw, mode = hero.mode, velocity = new Vector3((float)hero.vx, (float)hero.vy, (float)hero.vz),
                    events = session.FrameHeroEvents, impact = (float)hero.impact, hasAnchor = anchor != null, anchor = anchorPoint,
                    dizzy = state.bonk > 0 ? 1 : 0, lifted = lifted, hasReach = anchor == null && hasReach, reach = reachPoint,
                }, seconds, snap);
            }
            UpdateCamera(position, seconds, snap);
            if (tether != null)
            {
                // The snare is drawn with the same line as the tether.
                bool held = (anchor != null || hasReach) && avatar != null;
                if (tether.enabled != held) tether.enabled = held;
                if (held) { tether.SetPosition(0, avatar.GripPosition); tether.SetPosition(1, anchor != null ? anchorPoint : reachPoint); }
            }
            if (reticle != null)
            {
                Anchor candidate = anchor == null && session.CandidateAnchorId.Length > 0 ? layout.world.FindAnchor(session.CandidateAnchorId) : null;
                if (reticle.gameObject.activeSelf != (candidate != null)) reticle.gameObject.SetActive(candidate != null);
                if (candidate != null)
                {
                    reticle.position = new Vector3((float)candidate.x, (float)candidate.y, (float)candidate.z);
                    reticle.localScale = Vector3.one * (1 + 0.12f * Mathf.Sin(clock * 9));
                    if (gameCamera != null) reticle.rotation = Quaternion.LookRotation(reticle.position - gameCamera.transform.position);
                }
            }

            // ----- Target marker: white for the ringed robot, with a purple inner ring when it cannot see Luke -----
            RobotView aimed = null;
            for (int index = 0; index < robots.Length; index++) if (state.targetId.Length > 0 && robots[index].spec.id == state.targetId) aimed = robots[index];
            if (targetRing.gameObject.activeSelf != (aimed != null)) targetRing.gameObject.SetActive(aimed != null);
            bool quiet = aimed != null && state.targetQuiet;
            if (quietRing.gameObject.activeSelf != quiet) quietRing.gameObject.SetActive(quiet);
            if (aimed != null && gameCamera != null)
            {
                Vector3 centre = aimed.root.position + Vector3.up * ((float)aimed.profile.height * 0.5f);
                float size = (float)aimed.profile.radius * 2 + 0.7f;
                Quaternion facing = Quaternion.LookRotation(centre - gameCamera.transform.position);
                targetRing.transform.SetPositionAndRotation(centre, facing);
                targetRing.transform.localScale = Vector3.one * size * (1 + 0.05f * Mathf.Sin(clock * 6));
                quietRing.transform.SetPositionAndRotation(centre, facing);
                quietRing.transform.localScale = Vector3.one * size * (0.9f + 0.12f * Mathf.Sin(clock * 9));
            }

            // ----- Sparks and dizzy stars -----
            for (int index = 0; index < gems.Length; index++)
            {
                var pickup = layout.pickups[index];
                bool taken = pickup.trial == TrialId.Course ? state.trial == TrialId.Course && state.lap.Contains(pickup.id) : state.vaultTaken && state.trial == TrialId.Stealth;
                var material = taken ? art.gemTaken : art.gem;
                if (gemRenderers[index].sharedMaterial != material) gemRenderers[index].sharedMaterial = material;
                gems[index].position = gemHome[index] + Vector3.up * (0.12f * Mathf.Sin(clock * 2 + index * 0.7f));
                gems[index].rotation = Quaternion.Euler(0, clock * 90 + index * 40, 0);
            }
            for (int index = 0; index < dizzyStars.Length; index++)
            {
                bool dizzy = state.bonk > 0;
                if (dizzyStars[index].gameObject.activeSelf != dizzy) dizzyStars[index].gameObject.SetActive(dizzy);
                float angle = clock * 4.5f + index * Mathf.PI * 2 / 3;
                dizzyStars[index].position = position + new Vector3(Mathf.Cos(angle) * 0.32f, 1.5f, Mathf.Sin(angle) * 0.32f);
            }
        }

        /// <summary>The same damped chase camera as the playground, framed a little wider to show the floor around Luke.</summary>
        private void UpdateCamera(Vector3 subject, float seconds, bool snap)
        {
            if (gameCamera == null) return;
            var hero = session.State.hero;
            float dt = Mathf.Max(0, seconds);
            float flat = Mathf.Sqrt((float)(hero.vx * hero.vx + hero.vz * hero.vz));
            float speed = Mathf.Sqrt(flat * flat + (float)(hero.vy * hero.vy));
            float fast = Mathf.Clamp01((flat - 5) / 9);
            manualLook = Mathf.Max(0, manualLook - dt);
            bool driven = hero.mode != HeroMode.Ground || hero.powerHeld;
            if (driven && manualLook <= 0 && flat > FollowSpeed && !snap)
            {
                float follow = (1.1f + fast * 1.5f) * (hero.mode == HeroMode.Swing ? 1.25f : 1);
                float heading = Mathf.Atan2((float)hero.vx, (float)hero.vz);
                cameraYaw += Mathf.DeltaAngle(cameraYaw * Mathf.Rad2Deg, heading * Mathf.Rad2Deg) * Mathf.Deg2Rad * (1 - Mathf.Exp(-follow * dt));
                cameraYaw = Mathf.Repeat(cameraYaw + Mathf.PI, Mathf.PI * 2) - Mathf.PI;
            }
            if ((session.FrameHeroEvents & HeroEvent.Land) != 0) dip = Mathf.Min(0.4f, (float)hero.impact * 0.02f);
            dip = Mathf.Max(0, dip - dt * 1.9f);
            float lead = Mathf.Min(1.5f, flat * 0.1f);
            var target = new Vector3(subject.x + (flat > 0.01f ? (float)hero.vx / flat * lead : 0), subject.y + FocusHeight - dip, subject.z + (flat > 0.01f ? (float)hero.vz / flat * lead : 0));
            if (!cameraReady || snap) focus = target;
            else
            {
                float side = 1 - Mathf.Exp(-12 * dt);
                float rise = 1 - Mathf.Exp(-(hero.mode == HeroMode.Ground ? 14 : 8) * dt);
                focus.x += (target.x - focus.x) * side;
                focus.z += (target.z - focus.z) * side;
                focus.y += (target.y - focus.y) * rise;
            }
            float wantDistance = BaseDistance + fast * 1.6f + (hero.mode == HeroMode.Swing ? 0.9f : 0);
            cameraDistance = !cameraReady || snap ? wantDistance : cameraDistance + (wantDistance - cameraDistance) * (1 - Mathf.Exp(-3 * dt));
            float tilt = Mathf.Clamp(-(float)hero.vy * 0.008f, -0.14f, 0.2f);
            float angle = Mathf.Clamp(cameraPitch + tilt, 0.1f, 1.1f);
            float horizontal = Mathf.Cos(angle) * cameraDistance;
            var desired = new Vector3(focus.x - Mathf.Sin(cameraYaw) * horizontal, focus.y + Mathf.Sin(angle) * cameraDistance, focus.z - Mathf.Cos(cameraYaw) * horizontal);
            float clear = (float)TraversalGeometry.ClipBoom(layout.world, focus.x, focus.y, focus.z, desired.x, desired.y, desired.z, false);
            float allowed = Mathf.Max(0.35f, cameraDistance * clear);
            boom = !cameraReady || snap || allowed < boom ? allowed : boom + (allowed - boom) * (1 - Mathf.Exp(-5 * dt));
            var cameraTransform = gameCamera.transform;
            cameraTransform.position = focus + (desired - focus) * (boom / cameraDistance);
            cameraTransform.rotation = Quaternion.LookRotation(focus - cameraTransform.position, Vector3.up);
            float wantFov = BaseFov + Mathf.Min(13.5f, Mathf.Max(0, speed - 5.5f) * 1.26f);
            gameCamera.fieldOfView = !cameraReady || snap ? wantFov : gameCamera.fieldOfView + (wantFov - gameCamera.fieldOfView) * (1 - Mathf.Exp(-4 * dt));
            cameraReady = true;
        }

        // ---------- Sound: short synthesised cues, no imported audio ----------
        private void BuildSounds()
        {
            if (voice == null) return;
            jumpSound = PlaygroundGame.Tone("arena.jump", 0.16f, 300, 620, 0.5f, 0.15f);
            landSound = PlaygroundGame.Tone("arena.land", 0.14f, 150, 70, 0.9f, 0.5f);
            snareSound = PlaygroundGame.Tone("arena.snare", 0.2f, 900, 1700, 0.35f, 0.25f);
            pounceSound = PlaygroundGame.Tone("arena.pounce", 0.22f, 260, 520, 0.4f, 0.5f);
            impactSound = PlaygroundGame.Tone("arena.impact", 0.16f, 140, 50, 0.9f, 0.35f);
            boopSound = PlaygroundGame.Tone("arena.boop", 0.4f, 520, 130, 0.6f, 0);
            hitSound = PlaygroundGame.Tone("arena.hit", 0.2f, 210, 90, 0.8f, 0.3f);
            alertSound = PlaygroundGame.Tone("arena.alert", 0.12f, 1180, 1500, 0.4f, 0);
            windupSound = PlaygroundGame.Tone("arena.windup", 0.95f, 200, 640, 0.3f, 0.05f);
            caughtSound = PlaygroundGame.Tone("arena.caught", 0.5f, 880, 220, 0.5f, 0);
            waveSound = PlaygroundGame.Chime("arena.wave", new[] { 440f, 660f });
            sparkSound = PlaygroundGame.Chime("arena.spark", new[] { 880f, 1320f });
            starSound = PlaygroundGame.Chime("arena.star", new[] { 660f, 880f, 1100f, 1320f });
        }

        private void Play(AudioClip clip, float volume)
        {
            if (voice != null && clip != null) voice.PlayOneShot(clip, volume);
        }

        // ---------- HUD ----------
        private float UiScale => Mathf.Max(0.75f, Screen.height / 720f);
        private static string Stars(int earned, int possible)
        {
            // Plain characters every built-in font has: * earned, o still possible on this try, - out of reach.
            var text = new System.Text.StringBuilder();
            for (int index = 0; index < ArenaProgress.StarMax; index++) text.Append(index < earned ? "* " : index < possible ? "o " : "- ");
            return text.ToString();
        }

        private string Prompt()
        {
            var state = session.State;
            var rules = layout.rules;
            if (toastTime > 0) return toast;
            if (state.bonk > 0) return "Bonked! Back up in a moment.";
            if (state.held > 0) return "Caught in the light.";
            string action = session.Action == ActionKind.Quiet ? "F · quiet pounce (it cannot see you)" : session.Action == ActionKind.Pounce ? "F · pounce" : session.Action == ActionKind.Snare ? "F · snare" : "";
            if (state.hero.mode == HeroMode.Climb) return "Push toward the wall to climb · SPACE to jump off";
            if (state.trial == TrialId.Course)
                return state.lapRest > 0 ? "Lap done. Step away and the sparks come back." : state.lap.Count > 0 ? state.lap.Count + " of " + layout.CourseSparkCount + " sparks · " + state.lapTime.ToString("0.0") + " s" : "Walk into a lit wall to climb it. Collect the five sparks.";
            if (state.trial == TrialId.Ring)
                return state.wave > layout.waves ? "Ring cleared. Step out and back in to go again." : state.waveTimer > 0 ? "Get ready…" : "Wave " + state.wave + " of " + layout.waves + (action.Length > 0 ? " · " + action : "") + " · step aside when the floor turns red";
            if (state.trial == TrialId.Stealth)
            {
                if (state.vaultTaken) return "Vault reached. Step out and back in to try for more stars.";
                bool seen = false, looking = false;
                for (int index = 0; index < state.robots.Length; index++)
                {
                    if (layout.robots[index].trial != TrialId.Stealth) continue;
                    var robot = state.robots[index];
                    seen |= robot.mode == RobotMode.Alert || robot.awareness >= 1;
                    looking |= robot.awareness >= rules.unaware || robot.mode == RobotMode.Curious || robot.mode == RobotMode.Search;
                }
                return seen ? "Spotted! Break the line of sight." : looking ? "Something is looking your way…" : action.Length > 0 ? action : "Hidden. Stay behind them, behind crates, or up high.";
            }
            return "Step over a glowing line to start a trial. Step back out to stop.";
        }

        private void EnsureStyles()
        {
            if (titleStyle != null) return;
            titleStyle = new GUIStyle(GUI.skin.label) { fontSize = 20, fontStyle = FontStyle.Bold, wordWrap = true };
            bodyStyle = new GUIStyle(GUI.skin.label) { fontSize = 15, wordWrap = true };
            promptStyle = new GUIStyle(GUI.skin.box) { fontSize = 17, alignment = TextAnchor.MiddleCenter, wordWrap = true };
            promptStyle.normal.textColor = Color.white;
            buttonStyle = new GUIStyle(GUI.skin.button) { fontSize = 15 };
        }

        private void OnGUI()
        {
            if (!initialized) return;
            EnsureStyles();
            float scale = UiScale;
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1));
            float width = Screen.width / scale, height = Screen.height / scale;
            var state = session.State;
            var progress = state.progress;
            var rules = layout.rules;

            GUILayout.BeginArea(new Rect(16, 16, 350, paused ? 400 : 190), GUI.skin.box);
            GUILayout.Label("LUKE'S ARENA", titleStyle);
            int lapStars = state.lapTime <= rules.courseGold ? 3 : state.lapTime <= rules.courseSilver ? 2 : 1;
            GUILayout.Label("Course  " + Stars(progress.courseStars, state.trial == TrialId.Course && state.lap.Count > 0 ? lapStars : 3), bodyStyle);
            GUILayout.Label("Ring    " + Stars(progress.ringStars, state.trial == TrialId.Ring && state.wave <= layout.waves ? (state.ringBonks > 0 ? 1 : state.ringHits > 0 ? 2 : 3) : 3), bodyStyle);
            GUILayout.Label("Yard    " + Stars(progress.stealthStars, state.trial == TrialId.Stealth && !state.vaultTaken ? (!state.seen ? 3 : state.catches == 0 ? 2 : 1) : 3), bodyStyle);
            GUILayout.Label("Suit energy  " + new string('#', Mathf.Max(0, state.energy)) + new string('-', Mathf.Max(0, rules.energyMax - state.energy)), bodyStyle);
            if (saveNotice.Length > 0) GUILayout.Label(saveNotice, bodyStyle);
            if (paused)
            {
                GUILayout.Label("Paused. Nobody gets hurt and nothing can be lost.", bodyStyle);
                GUILayout.Label("WASD / arrows or left stick: move\nSPACE or A: jump · SHIFT or a trigger: sprint, tether in the air\nF or X: the one-button action · G or Y: pounce\nWalk into a lit wall to climb it\nMouse, Q/E or right stick: look · R: recenter", bodyStyle);
                if (GUILayout.Button("Carry on · Escape / Start", buttonStyle)) SetPaused(false);
                if (!confirmReset) { if (GUILayout.Button("Clear my stars…", buttonStyle)) confirmReset = true; }
                else
                {
                    GUILayout.Label("Forget every star and start again?", bodyStyle);
                    GUILayout.BeginHorizontal();
                    if (GUILayout.Button("Yes, clear them", buttonStyle)) { ResetStars(); SetPaused(false); }
                    if (GUILayout.Button("Keep them", buttonStyle)) confirmReset = false;
                    GUILayout.EndHorizontal();
                }
            }
            else GUILayout.Label("Escape / Start: pause and controls", bodyStyle);
            GUILayout.EndArea();

            if (!paused)
            {
                const float promptWidth = 640;
                GUI.Box(new Rect((width - promptWidth) / 2, height - 76, promptWidth, 44), Prompt(), promptStyle);
            }
        }

        public ArenaSnapshot Snapshot()
        {
            var state = session.State;
            int shown = 0;
            foreach (var view in robots) if (view.root.gameObject.activeSelf) shown++;
            return new ArenaSnapshot
            {
                world = layout.world.id, trial = state.trial.ToString(), mode = state.hero.mode.ToString(), targetId = state.targetId, action = session.Action.ToString(), saveNotice = saveNotice,
                x = (float)state.hero.x, y = (float)state.hero.y, z = (float)state.hero.z, energy = state.energy, wave = state.wave, stars = session.TotalStars,
                courseStars = state.progress.courseStars, ringStars = state.progress.ringStars, stealthStars = state.progress.stealthStars, quiet = state.progress.quiet,
                robotsShown = shown, paused = paused, avatarBound = avatar != null && avatar.Bound, seen = state.seen, targetQuiet = state.targetQuiet,
            };
        }
    }
}
