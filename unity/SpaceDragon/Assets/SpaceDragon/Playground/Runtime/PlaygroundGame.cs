using System;
using SpaceDragon.Traversal;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Rendering;

namespace SpaceDragon.Playground
{
    /// <summary>A read-only view of the running playground for checks and receipts.</summary>
    [Serializable]
    public sealed class PlaygroundSnapshot
    {
        public string world, mode, groundId, tetherId, candidateId, saveNotice;
        public float x, y, z, speed, cameraYaw, cameraDistance;
        public int sparks, totalSparks;
        public bool paused, avatarBound;
    }

    /// <summary>Where the small text save lives. PlayerPrefs in a build; a fake in tests.</summary>
    public interface IPlaygroundStore
    {
        string Read(string key);
        void Write(string key, string value);
        void Flush();
    }

    public sealed class PlaygroundPlayerPrefsStore : IPlaygroundStore
    {
        public string Read(string key) => PlayerPrefs.GetString(key, "");
        public void Write(string key, string value) => PlayerPrefs.SetString(key, value);
        public void Flush() => PlayerPrefs.Save();
    }

    /// <summary>
    /// Luke's Playground in Unity: reads keyboard, mouse and controller, advances the engine-free
    /// PlaygroundSession, then draws the result (stand-in, chase camera, tether, sparks, HUD).
    /// Game state lives only in the session; nothing drawn here is ever read back into it.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class PlaygroundGame : MonoBehaviour
    {
        public const string SaveKey = "space-dragon.playground.v1";
        public const string BackupKey = "space-dragon.playground.v1.backup";
        private const float BaseFov = 59f, BaseDistance = 3.8f, BasePitch = 0.39f, FocusHeight = 1.18f;
        /// <summary>
        /// Above an ordinary run and an ordinary jump: only sprints, hops, bounces and swings turn the
        /// camera. Otherwise a jump while strafing would rotate the view and curve the hero.
        /// </summary>
        private const float FollowSpeed = 5.6f;

        [SerializeField] private PersonAvatar avatar;
        [SerializeField] private Camera gameCamera;
        [SerializeField] private LineRenderer tether;
        [SerializeField] private Transform reticle;
        [Tooltip("One visual per practice spark, in level order.")]
        [SerializeField] private Transform[] sparks = Array.Empty<Transform>();
        [SerializeField] private RenderPipelineAsset pipeline;
        [SerializeField] private AudioSource voice;

        private TraversalWorld world;
        private PlaygroundSession session;
        private IPlaygroundStore store;
        private PlaygroundSave lastGood;
        private string saveNotice = "";
        private bool paused, confirmReset, initialized;
        private float saveTimer;

        // Chase camera; it observes the hero and owns no gameplay state.
        private float cameraYaw, cameraPitch = BasePitch, cameraDistance = BaseDistance, boom = BaseDistance, manualLook, dip;
        private Vector3 focus;
        private bool cameraReady;

        private Vector3[] sparkHome = Array.Empty<Vector3>();
        private float clock, celebration;
        private RenderPipelineAsset previousDefault, previousQuality;
        private bool ownsPipeline;
        private AudioClip jumpSound, landSound, sparkSound, tetherSound, finishSound;
        private GUIStyle titleStyle, bodyStyle, promptStyle, buttonStyle;

        public PlaygroundSession Session => session;

        /// <summary>Called by the scene generator; play mode only reads these references.</summary>
        public void Configure(PersonAvatar hero, Camera view, LineRenderer line, Transform target, Transform[] sparkVisuals, RenderPipelineAsset renderPipeline, AudioSource audio)
        {
            avatar = hero; gameCamera = view; tether = line; reticle = target; sparks = sparkVisuals ?? Array.Empty<Transform>();
            pipeline = renderPipeline; voice = audio;
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
            world = LukePlaygroundData.Create();
            session = new PlaygroundSession(world);
        }

        private void Start()
        {
            if (store == null) store = new PlaygroundPlayerPrefsStore();
            LoadSave();
            sparkHome = new Vector3[sparks.Length];
            for (int index = 0; index < sparks.Length; index++) if (sparks[index] != null) sparkHome[index] = sparks[index].position;
            RefreshSparks();
            BuildSounds();
            cameraYaw = (float)session.Hero.yaw;
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

        // ---------- Saving ----------
        private void LoadSave()
        {
            string primary = store.Read(SaveKey);
            var status = session.Restore(primary);
            if (status == PlaygroundSaveStatus.Unreadable)
            {
                // An unreadable save falls back to the last one that was known to be good.
                var recovered = session.Restore(store.Read(BackupKey));
                saveNotice = recovered == PlaygroundSaveStatus.Restored || recovered == PlaygroundSaveStatus.RecoveredPosition
                    ? "Your last practice save could not be read. An earlier one was restored."
                    : "Your practice save could not be read. Starting fresh.";
                if (recovered == PlaygroundSaveStatus.Unreadable || recovered == PlaygroundSaveStatus.Newer) session.Reset();
            }
            else if (status == PlaygroundSaveStatus.Newer) saveNotice = "This save is from a newer build. It is kept safe and will not be changed.";
            else if (status == PlaygroundSaveStatus.RecoveredPosition) saveNotice = "Sparks restored. You start back in the living room.";
            else saveNotice = "";
            lastGood = session.Snapshot();
        }

        private void SaveNow()
        {
            if (session == null || store == null || !session.MayWriteSave) return;
            var save = session.Snapshot(lastGood);
            lastGood = save;
            string text = PlaygroundSession.Encode(save);
            string current = store.Read(SaveKey);
            if (current == text) return;
            PlaygroundSession.Decode(current, out var status);
            if (status == PlaygroundSaveStatus.Restored) store.Write(BackupKey, current);
            store.Write(SaveKey, text);
            store.Flush();
        }

        private void ResetPractice()
        {
            session.Reset();
            lastGood = null;
            saveNotice = "Practice reset.";
            SaveNow();
            RefreshSparks();
            cameraYaw = (float)session.Hero.yaw;
            cameraReady = false;
            Present(0, true);
        }

        // ---------- Input ----------
        private struct Controls
        {
            public Vector2 move, look;
            public bool jumpPressed, jumpHeld, power, pausePressed, recenter;
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
                input.power |= gamepad.rightTrigger.ReadValue() > 0.35f || gamepad.leftTrigger.ReadValue() > 0.35f;
                input.pausePressed |= gamepad.startButton.wasPressedThisFrame;
                input.recenter |= gamepad.rightStickButton.wasPressedThisFrame;
            }
            var mouse = Mouse.current;
            if (mouse != null)
            {
                bool looking = mouse.rightButton.isPressed || Cursor.lockState == CursorLockMode.Locked;
                if (looking) input.look += Vector2.ClampMagnitude(mouse.delta.ReadValue(), 150) * 0.16f;
                // A click on the play view captures the mouse; Escape gives it back.
                if (!paused && mouse.leftButton.wasPressedThisFrame && Cursor.lockState != CursorLockMode.Locked && mouse.position.ReadValue().x > 360 * UiScale)
                { Cursor.lockState = CursorLockMode.Locked; Cursor.visible = false; }
            }
            input.move = Vector2.ClampMagnitude(input.move, 1);
            return input;
        }

        private void SetPaused(bool value)
        {
            paused = value;
            confirmReset = false;
            if (paused)
            {
                session.Settle();
                SaveNow();
                Cursor.lockState = CursorLockMode.None;
                Cursor.visible = true;
            }
        }

        private void Update()
        {
            if (!initialized) return;
            float seconds = Mathf.Min(Time.unscaledDeltaTime, (float)TraversalTuning.MaxFrameSeconds);
            var input = ReadControls(seconds);
            if (input.pausePressed) SetPaused(!paused);
            if (paused) return;
            clock += seconds;

            if (input.look.sqrMagnitude > 0)
            {
                cameraYaw = Mathf.Repeat(cameraYaw + input.look.x * Mathf.Deg2Rad + Mathf.PI, Mathf.PI * 2) - Mathf.PI;
                cameraPitch = Mathf.Clamp(cameraPitch - input.look.y * Mathf.Deg2Rad, 0.12f, 1.05f);
                manualLook = 1.6f;
            }
            if (input.recenter) { cameraYaw = (float)session.Hero.yaw; cameraPitch = BasePitch; manualLook = 0; }

            // Movement is relative to the camera, as in the browser slice.
            double moveX = Math.Sin(cameraYaw) * input.move.y + Math.Cos(cameraYaw) * input.move.x;
            double moveZ = Math.Cos(cameraYaw) * input.move.y - Math.Sin(cameraYaw) * input.move.x;
            if (input.jumpPressed) session.PressJump();
            int before = session.SparkCount;
            session.Advance(seconds, moveX, moveZ, input.jumpHeld, input.power);

            if (session.FoundSpark)
            {
                // A reward is made durable at once so a crash or reload can never hand it out twice.
                SaveNow();
                RefreshSparks();
                if (avatar != null) avatar.Celebrate();
                bool complete = session.SparkCount == session.TotalSparks && before < session.TotalSparks;
                if (complete) celebration = 6;
                Play(complete ? finishSound : sparkSound, 0.5f);
            }
            var events = session.FrameEvents;
            if ((events & (HeroEvent.Jump | HeroEvent.Hop | HeroEvent.Bounce)) != 0) Play(jumpSound, (events & HeroEvent.Hop) != 0 ? 0.42f : 0.3f);
            if ((events & HeroEvent.Land) != 0) Play(landSound, Mathf.Clamp01(0.15f + (float)session.Hero.impact / 28));
            if ((events & HeroEvent.Attach) != 0) Play(tetherSound, 0.38f);

            saveTimer += seconds;
            if (saveTimer > 4) { saveTimer = 0; SaveNow(); }
            celebration = Mathf.Max(0, celebration - seconds);
            Present(seconds, false);
        }

        // ---------- Drawing ----------
        private void Present(float seconds, bool snap)
        {
            var hero = session.Hero;
            var from = session.Previous;
            float alpha = (float)session.Alpha;
            var position = new Vector3(
                (float)(from.x + (hero.x - from.x) * alpha), (float)(from.y + (hero.y - from.y) * alpha), (float)(from.z + (hero.z - from.z) * alpha));
            Anchor anchor = hero.tetherId.Length > 0 ? world.FindAnchor(hero.tetherId) : null;
            Vector3 anchorPoint = anchor == null ? Vector3.zero : new Vector3((float)anchor.x, (float)anchor.y, (float)anchor.z);

            if (avatar != null)
            {
                avatar.Present(new PersonFrame
                {
                    position = position, yaw = (float)hero.yaw, mode = hero.mode,
                    velocity = new Vector3((float)hero.vx, (float)hero.vy, (float)hero.vz),
                    events = session.FrameEvents, impact = (float)hero.impact, hasAnchor = anchor != null, anchor = anchorPoint,
                }, seconds, snap);
            }
            UpdateCamera(position, seconds, snap);

            if (tether != null)
            {
                bool held = anchor != null && avatar != null;
                if (tether.enabled != held) tether.enabled = held;
                if (held) { tether.SetPosition(0, avatar.GripPosition); tether.SetPosition(1, anchorPoint); }
            }
            if (reticle != null)
            {
                Anchor candidate = anchor == null && session.CandidateAnchorId.Length > 0 ? world.FindAnchor(session.CandidateAnchorId) : null;
                if (reticle.gameObject.activeSelf != (candidate != null)) reticle.gameObject.SetActive(candidate != null);
                if (candidate != null)
                {
                    reticle.position = new Vector3((float)candidate.x, (float)candidate.y, (float)candidate.z);
                    reticle.localScale = Vector3.one * (1 + 0.12f * Mathf.Sin(clock * 9));
                    if (gameCamera != null) reticle.rotation = Quaternion.LookRotation(reticle.position - gameCamera.transform.position);
                }
            }
            for (int index = 0; index < sparks.Length; index++)
            {
                var spark = sparks[index];
                if (spark == null || !spark.gameObject.activeSelf) continue;
                spark.position = sparkHome[index] + Vector3.up * (0.12f * Mathf.Sin(clock * 1.7f + index * 1.3f));
                spark.rotation = Quaternion.Euler(0, clock * 70 + index * 40, 0);
            }
        }

        private void RefreshSparks()
        {
            for (int index = 0; index < sparks.Length && index < world.sparks.Length; index++)
            {
                if (sparks[index] == null) continue;
                bool waiting = !session.IsCollected(world.sparks[index].id);
                if (sparks[index].gameObject.activeSelf != waiting) sparks[index].gameObject.SetActive(waiting);
            }
        }

        /// <summary>
        /// A damped chase camera. While the hero runs on suit power, flies or swings it eases behind
        /// the direction of travel, widens with speed and stops at walls and ceilings.
        /// </summary>
        private void UpdateCamera(Vector3 subject, float seconds, bool snap)
        {
            if (gameCamera == null) return;
            var hero = session.Hero;
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
            if ((session.FrameEvents & HeroEvent.Land) != 0) dip = Mathf.Min(0.4f, (float)hero.impact * 0.02f);
            dip = Mathf.Max(0, dip - dt * 1.9f);
            float lead = Mathf.Min(1.5f, flat * 0.1f);
            var target = new Vector3(
                subject.x + (flat > 0.01f ? (float)hero.vx / flat * lead : 0), subject.y + FocusHeight - dip,
                subject.z + (flat > 0.01f ? (float)hero.vz / flat * lead : 0));
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
            // The house keeps its roof here, so the boom is clipped by walls and ceilings alike.
            float clear = (float)TraversalGeometry.ClipBoom(world, focus.x, focus.y, focus.z, desired.x, desired.y, desired.z, false);
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
            jumpSound = Tone("playground.jump", 0.16f, 300, 620, 0.5f, 0.15f);
            landSound = Tone("playground.land", 0.14f, 150, 70, 0.9f, 0.5f);
            sparkSound = Chime("playground.spark", new[] { 880f, 1320f });
            finishSound = Chime("playground.finish", new[] { 660f, 880f, 1100f, 1320f });
            tetherSound = Tone("playground.tether", 0.2f, 900, 1700, 0.35f, 0.25f);
        }

        private static AudioClip Tone(string name, float seconds, float fromHz, float toHz, float gain, float noise)
        {
            const int rate = 44100;
            int count = Mathf.CeilToInt(seconds * rate);
            var samples = new float[count];
            float phase = 0;
            uint seed = 12345;
            for (int index = 0; index < count; index++)
            {
                float t = index / (float)count;
                phase += Mathf.Lerp(fromHz, toHz, t) * 2 * Mathf.PI / rate;
                seed = unchecked(seed * 1664525u + 1013904223u);
                float hiss = (seed >> 8) / 8388608f - 1;
                float envelope = Mathf.Sin(Mathf.Min(1, t * 12) * Mathf.PI * 0.5f) * (1 - t) * (1 - t);
                samples[index] = (Mathf.Sin(phase) * (1 - noise) + hiss * noise) * envelope * gain;
            }
            var clip = AudioClip.Create(name, count, 1, rate, false);
            clip.SetData(samples, 0);
            return clip;
        }

        private static AudioClip Chime(string name, float[] notes)
        {
            const int rate = 44100;
            const float step = 0.09f, ring = 0.55f;
            int count = Mathf.CeilToInt((step * (notes.Length - 1) + ring) * rate);
            var samples = new float[count];
            for (int note = 0; note < notes.Length; note++)
            {
                int start = Mathf.RoundToInt(note * step * rate);
                for (int index = start; index < count; index++)
                {
                    float t = (index - start) / (float)rate;
                    float envelope = Mathf.Min(1, t * 200) * Mathf.Exp(-t * 7);
                    samples[index] += (Mathf.Sin(t * notes[note] * 2 * Mathf.PI) + 0.3f * Mathf.Sin(t * notes[note] * 4 * Mathf.PI)) * envelope * 0.28f;
                }
            }
            var clip = AudioClip.Create(name, count, 1, rate, false);
            clip.SetData(samples, 0);
            return clip;
        }

        private void Play(AudioClip clip, float volume)
        {
            if (voice != null && clip != null) voice.PlayOneShot(clip, volume);
        }

        // ---------- HUD ----------
        private float UiScale => Mathf.Max(0.75f, Screen.height / 720f);

        private string Prompt()
        {
            var hero = session.Hero;
            if (celebration > 0) return "Every practice spark found. Nice flying!";
            if (hero.mode == HeroMode.Swing) return "Swinging · let go of SHIFT to fly · SPACE to leap off";
            if (hero.mode == HeroMode.Catch) return "Safety catch · back to solid ground";
            if (session.CandidateAnchorId.Length > 0)
            {
                var candidate = world.FindAnchor(session.CandidateAnchorId);
                if (candidate != null) return candidate.perch ? "Hold SHIFT · zip to the gold perch ring" : "Hold SHIFT · swing from the blue ring";
            }
            if (hero.mode == HeroMode.Air) return hero.hopAvailable ? "SPACE again · thruster hop" : "Steer with the move keys";
            return "Run · jump · swing. Find the practice sparks.";
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

            GUILayout.BeginArea(new Rect(16, 16, 330, paused ? 330 : 150), GUI.skin.box);
            GUILayout.Label("LUKE'S PLAYGROUND", titleStyle);
            GUILayout.Label("Practice sparks: " + session.SparkCount + " / " + session.TotalSparks, bodyStyle);
            if (saveNotice.Length > 0) GUILayout.Label(saveNotice, bodyStyle);
            if (paused)
            {
                GUILayout.Label("Paused.", bodyStyle);
                GUILayout.Label("WASD / arrows or left stick: move\nSPACE or A: jump, again in the air to hop\nSHIFT or a trigger: sprint, tether in the air\nMouse, Q/E or right stick: look · R: recenter", bodyStyle);
                if (GUILayout.Button("Resume · Escape / Start", buttonStyle)) SetPaused(false);
                if (!confirmReset) { if (GUILayout.Button("Reset practice sparks…", buttonStyle)) confirmReset = true; }
                else
                {
                    GUILayout.Label("Forget every spark and start again?", bodyStyle);
                    GUILayout.BeginHorizontal();
                    if (GUILayout.Button("Yes, reset", buttonStyle)) { ResetPractice(); SetPaused(false); }
                    if (GUILayout.Button("Keep them", buttonStyle)) confirmReset = false;
                    GUILayout.EndHorizontal();
                }
            }
            else
            {
                GUILayout.Label("Escape / Start: pause and controls", bodyStyle);
            }
            GUILayout.EndArea();

            if (!paused)
            {
                const float promptWidth = 520;
                GUI.Box(new Rect((width - promptWidth) / 2, height - 76, promptWidth, 44), Prompt(), promptStyle);
            }
        }

        public PlaygroundSnapshot Snapshot()
        {
            var hero = session.Hero;
            return new PlaygroundSnapshot
            {
                world = world.id, mode = hero.mode.ToString(), groundId = hero.groundId, tetherId = hero.tetherId, candidateId = session.CandidateAnchorId,
                saveNotice = saveNotice, x = (float)hero.x, y = (float)hero.y, z = (float)hero.z,
                speed = Mathf.Sqrt((float)(hero.vx * hero.vx + hero.vy * hero.vy + hero.vz * hero.vz)),
                cameraYaw = cameraYaw, cameraDistance = boom, sparks = session.SparkCount, totalSparks = session.TotalSparks,
                paused = paused, avatarBound = avatar != null && avatar.Bound,
            };
        }
    }
}
