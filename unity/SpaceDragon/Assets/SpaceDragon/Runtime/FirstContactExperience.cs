using System;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Rendering;

namespace SpaceDragon.FirstContact
{
    [Serializable]
    public sealed class FirstContactRuntimeSnapshot
    {
        public bool ready;
        public bool reflectionReady;
        public string reflectionStatus;
        public int reflectionCaptureRequests;
        public double reflectionCaptureMs;
        public string scene = "unity-first-contact-candidate";
        public string phase;
        public bool paused;
        public bool benchmarkMode;
        public string benchmarkShot;
        public bool podOpened;
        public int podRewardCount;
        public bool nearPod;
        public bool moving;
        public bool controlsReady;
        public float cinematicFraction;
        public Vector3 playerPosition;
        public Vector3 cameraPosition;
        public Vector3 cameraEuler;
        public string lidPresentation;
        public string checkpointStatus;
        public string positionRestoreStatus;
        public string controller;
        public string controllerCoverage = "Bindings implemented; physical PlayStation controller NOT TESTED";
        public ContactMetricsSnapshot performance;
    }

    /// <summary>A bounded local Unity candidate; no campaign, network, learning data or Babylon save access.</summary>
    public sealed class FirstContactExperience : MonoBehaviour
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] private static extern void SDPublishSnapshot(string json);
#endif
        [SerializeField] private CharacterController player;
        [SerializeField] private Transform podRoot;
        [SerializeField] private Transform podLid;
        [SerializeField] private Camera gameplayCamera;
        [SerializeField] private Animator podAnimator;
        [SerializeField] private AnimationClip podOpenClip;
        [SerializeField] private ReflectionProbe reflectionProbe;
        [SerializeField] private Vector3 lidOpenEuler = new Vector3(-62, 0, 0);
        [SerializeField] private float interactionDistance = 2.1f;
        private FirstContactProgress progress;
        private FirstContactStorage storage;
        private FirstContactPlayer movement;
        private PodPresentation pod;
        private FirstContactMetrics metrics;
        private bool initialized;
        private bool nativeBenchmarkRun;
        private bool reflectionReady;
        private string reflectionStatus = "not requested";
        private int reflectionRenderId = -1;
        private int reflectionCaptureRequests;
        private double reflectionRequestedAt;
        private double reflectionCaptureMs;
        private bool suppressInputUntilNeutral;
        private bool benchmarkMode;
        private string benchmarkShot = "";
        private string positionRestoreStatus = "new starting place";
        private bool showMetrics;
        private string metricLabel = "Warming up";
        private float nextMetricUpdate;
        private string message = "A signal has arrived. Find the pod in the backyard.";
        private Vector3 introPosition;
        private Quaternion introRotation;
        private Vector3 introEndPosition;
        private Quaternion introEndRotation;

        public bool IsVisualReady => initialized && reflectionReady;

        public void Configure(CharacterController character, Transform podTransform, Transform lid, Camera camera, Animator animator = null, AnimationClip clip = null)
        {
            player = character; podRoot = podTransform; podLid = lid; gameplayCamera = camera;
            podAnimator = animator; podOpenClip = clip;
        }

        public void ConfigureReflectionProbe(ReflectionProbe probe) { reflectionProbe = probe; }

        private void Start()
        {
            nativeBenchmarkRun = FirstContactNativeBenchmark.Requested;
            if (player == null || podRoot == null || gameplayCamera == null)
            {
                Debug.LogError("First Contact candidate requires its generated player, pod and camera.", this);
                enabled = false;
                return;
            }
            storage = new FirstContactStorage(new ContactPlayerPrefsStore());
            var checkpoint = nativeBenchmarkRun ? new FirstContactCheckpoint() : storage.Load();
            progress = FirstContactProgress.Restore(checkpoint);
            movement = new FirstContactPlayer(player, gameplayCamera);
            if (checkpoint.hasPosition)
            {
                var restored = movement.RestorePosition(new Vector3(checkpoint.playerX, checkpoint.playerY, checkpoint.playerZ));
                positionRestoreStatus = restored.ToString();
                if (restored != ContactPositionRestoreResult.Restored)
                    storage.ReportPositionRecovery(restored == ContactPositionRestoreResult.RecoveredToSpawn);
            }
            pod = new PodPresentation(podRoot, podLid, podAnimator, podOpenClip, lidOpenEuler);
            pod.SetOpen(progress.PodOpened, true);
            metrics = new FirstContactMetrics();
            initialized = true;
            PrepareReveal();
            RequestInitialReflection();
        }

        private void RequestInitialReflection()
        {
            if (reflectionProbe == null)
            {
                reflectionStatus = "missing configured reflection probe";
                return;
            }
            // Runtime owns exactly one request; never also refresh OnAwake or EveryFrame.
            reflectionProbe.refreshMode = ReflectionProbeRefreshMode.ViaScripting;
            reflectionRequestedAt = Time.realtimeSinceStartupAsDouble;
            reflectionCaptureRequests++;
            try
            {
                reflectionRenderId = reflectionProbe.RenderProbe();
                reflectionStatus = reflectionRenderId >= 0 ? "capture requested" : "capture request failed";
            }
            catch (Exception error)
            {
                reflectionStatus = "capture request failed: " + error.Message;
                Debug.LogWarning(reflectionStatus, this);
            }
        }

        private void CheckReflectionReadiness()
        {
            if (reflectionReady || reflectionProbe == null || reflectionRenderId < 0) return;
            if (!reflectionProbe.IsFinishedRendering(reflectionRenderId) || reflectionProbe.texture == null) return;
            reflectionReady = true;
            reflectionStatus = "single rotated-sky capture finished";
            reflectionCaptureMs = (Time.realtimeSinceStartupAsDouble - reflectionRequestedAt) * 1000;
            metrics.Reset();
        }

        private struct Controls
        {
            public Vector2 movement;
            public Vector2 look;
            public bool interact;
            public bool interactHeld;
            public bool pause;
            public bool recenter;
            public bool metrics;
            public bool Neutral => movement.sqrMagnitude < 0.01f && look.sqrMagnitude < 0.01f && !interactHeld;
        }

        private Controls ReadControls(float seconds)
        {
            var input = new Controls();
            var keyboard = Keyboard.current;
            if (keyboard != null)
            {
                input.movement.x = (keyboard.dKey.isPressed || keyboard.rightArrowKey.isPressed ? 1 : 0) - (keyboard.aKey.isPressed || keyboard.leftArrowKey.isPressed ? 1 : 0);
                input.movement.y = (keyboard.wKey.isPressed || keyboard.upArrowKey.isPressed ? 1 : 0) - (keyboard.sKey.isPressed || keyboard.downArrowKey.isPressed ? 1 : 0);
                input.look.x = ((keyboard.eKey.isPressed ? 1 : 0) - (keyboard.qKey.isPressed ? 1 : 0)) * 90 * seconds;
                input.interact = keyboard.spaceKey.wasPressedThisFrame || keyboard.enterKey.wasPressedThisFrame;
                input.interactHeld = keyboard.spaceKey.isPressed || keyboard.enterKey.isPressed;
                input.pause = keyboard.escapeKey.wasPressedThisFrame;
                input.recenter = keyboard.rKey.wasPressedThisFrame;
                input.metrics = keyboard.f3Key.wasPressedThisFrame;
            }
            var gamepad = Gamepad.current;
            if (gamepad != null)
            {
                input.movement += gamepad.leftStick.ReadValue();
                input.look += gamepad.rightStick.ReadValue() * (100 * seconds);
                input.interact |= gamepad.buttonSouth.wasPressedThisFrame;
                input.interactHeld |= gamepad.buttonSouth.isPressed;
                input.pause |= gamepad.startButton.wasPressedThisFrame;
                input.recenter |= gamepad.rightStickButton.wasPressedThisFrame;
            }
            var mouse = Mouse.current;
            if (mouse != null && mouse.rightButton.isPressed) input.look += Vector2.ClampMagnitude(mouse.delta.ReadValue(), 150) * 0.16f;
            input.movement = Vector2.ClampMagnitude(input.movement, 1);
            return input;
        }

        private void Update()
        {
            if (!initialized) return;
            CheckReflectionReadiness();
            if (reflectionReady) metrics.Record();
            float seconds = Mathf.Min(Time.unscaledDeltaTime, 0.05f);
            var input = ReadControls(seconds);
            if (input.metrics) showMetrics = !showMetrics;
            if (input.pause) { SetPaused(!progress.Paused); return; }
            if (progress.Paused) return;
            if (benchmarkMode) return;
            if (suppressInputUntilNeutral)
            {
                if (input.Neutral) suppressInputUntilNeutral = false;
                input = new Controls();
            }
            if (progress.Phase == ContactPhase.Reveal)
            {
                if (input.interact) SkipReveal();
                else
                {
                    progress.AdvanceReveal(seconds);
                    float amount = Mathf.SmoothStep(0, 1, progress.RevealFraction);
                    gameplayCamera.transform.SetPositionAndRotation(Vector3.Lerp(introPosition, introEndPosition, amount), Quaternion.Slerp(introRotation, introEndRotation, amount));
                    if (progress.Phase == ContactPhase.Play) FinishHandoff();
                }
            }
            else
            {
                if (input.recenter) movement.Recenter();
                movement.Tick(input.movement, input.look, seconds);
                if (input.interact) TryInteract();
            }
            pod.Tick(seconds);
            if (showMetrics && Time.unscaledTime >= nextMetricUpdate)
            {
                var stats = metrics.Snapshot(gameplayCamera);
                metricLabel = $"{stats.frames.sampleCount} frames · median {stats.frames.medianFrameMs:F1} ms · p95 {stats.frames.p95FrameMs:F1} ms\n" +
                    $"{stats.cameraPixelWidth} × {stats.cameraPixelHeight} · draws {(stats.drawCallsAvailable ? stats.previousCompletedFrameDrawCalls.ToString() : "unavailable")}";
                nextMetricUpdate = Time.unscaledTime + 0.5f;
            }
        }

        private void PrepareReveal()
        {
            movement.Stop();
            introPosition = podRoot.position + new Vector3(-4.5f, 3.2f, -5.5f);
            introRotation = Quaternion.LookRotation(podRoot.position + Vector3.up * 1.15f - introPosition);
            movement.UpdateCamera(0, true);
            introEndPosition = gameplayCamera.transform.position;
            introEndRotation = gameplayCamera.transform.rotation;
            gameplayCamera.transform.SetPositionAndRotation(introPosition, introRotation);
            metrics.Reset();
        }

        private void FinishHandoff()
        {
            movement.UpdateCamera(0, true);
            suppressInputUntilNeutral = true;
            metrics.Reset();
        }

        public void SkipReveal()
        {
            if (!initialized || progress.Paused || benchmarkMode) return;
            progress.SkipReveal();
            FinishHandoff();
        }

        public void ReplayReveal()
        {
            if (!initialized || benchmarkMode) return;
            progress.ReplayReveal();
            suppressInputUntilNeutral = true;
            PrepareReveal();
        }

        private bool NearPod()
        {
            Vector3 difference = player.transform.position - podRoot.position;
            difference.y = 0;
            return difference.sqrMagnitude <= interactionDistance * interactionDistance;
        }

        public void TryInteract()
        {
            if (!initialized || benchmarkMode || nativeBenchmarkRun) return;
            var result = progress.TryOpenPod(NearPod());
            if (result == PodInteractionResult.Opened)
            {
                // Durable progress is recorded before animation. A skipped/interrupted lid never loses the item.
                SaveCheckpoint();
                pod.SetOpen(true);
                message = "Pod opened. Arrival recorded. Walk around or replay the reveal.";
            }
            else if (result == PodInteractionResult.AlreadyOpened) message = "Arrival is already recorded. Replaying the reveal keeps one reward.";
            else if (result == PodInteractionResult.OutOfReach) message = "Walk closer to the glowing pod.";
        }

        public void SetPaused(bool value)
        {
            if (!initialized) return;
            progress.SetPaused(value);
            metrics.SetPaused(value);
            movement.Stop();
            suppressInputUntilNeutral = true;
            if (value) SaveCheckpoint();
        }

        public void ResetMeasurement() { if (initialized) metrics.Reset(); }

        private void EnableBenchmarkMode(bool enabled)
        {
            if (!initialized) return;
            benchmarkMode = enabled;
            benchmarkShot = "";
            movement.Stop();
            suppressInputUntilNeutral = true;
            if (!enabled)
            {
                if (!progress.Paused) progress.SkipReveal();
                movement.UpdateCamera(0, true);
            }
            metrics.Reset();
        }

        public void SetBenchmarkMode(string mode)
        {
            if (mode == "play") EnableBenchmarkMode(false);
            else SetBenchmarkShot(mode);
        }

        public void SetPausedFromString(string value)
        {
            if (value == "true") SetPaused(true);
            if (value == "false") SetPaused(false);
        }

        public void SetBenchmarkShot(string shot)
        {
            if (!initialized || (shot != "home" && shot != "arrival" && shot != "reveal")) return;
            EnableBenchmarkMode(true);
            benchmarkShot = shot;
            // Match the Babylon scene's numerical orbit and vertical field of view.
            // Renderer screenshots must still be checked before claiming visual equivalence.
            float alpha = shot == "reveal" ? -Mathf.PI / 2.2f : -Mathf.PI / 2.6f;
            float beta = shot == "reveal" ? 1.2f : 1.05f;
            float radius = shot == "home" ? 11 : shot == "arrival" ? 7 : 5;
            Vector3 target = shot == "home" ? new Vector3(-3.3f, 1.1f, 0) : new Vector3(3.5f, shot == "reveal" ? 1.25f : 1.1f, 0);
            Vector3 offset = new Vector3(radius * Mathf.Cos(alpha) * Mathf.Sin(beta), radius * Mathf.Cos(beta), radius * Mathf.Sin(alpha) * Mathf.Sin(beta));
            gameplayCamera.transform.SetPositionAndRotation(target + offset, Quaternion.LookRotation(-offset));
            metrics.Reset();
        }

        private void SaveCheckpoint()
        {
            if (!initialized || nativeBenchmarkRun) return;
            var checkpoint = progress.CreateCheckpoint();
            Vector3 location = player.transform.position;
            checkpoint.hasPosition = true;
            checkpoint.playerX = location.x; checkpoint.playerY = location.y; checkpoint.playerZ = location.z;
            storage.Save(checkpoint);
        }

        public string CaptureSnapshotJson()
        {
            if (!initialized) return "{\"ready\":false}";
            return JsonUtility.ToJson(new FirstContactRuntimeSnapshot
            {
                ready = reflectionReady, reflectionReady = reflectionReady, reflectionStatus = reflectionStatus,
                reflectionCaptureRequests = reflectionCaptureRequests, reflectionCaptureMs = reflectionCaptureMs,
                phase = progress.Phase.ToString(), paused = progress.Paused, benchmarkMode = benchmarkMode, benchmarkShot = benchmarkShot,
                podOpened = progress.PodOpened, podRewardCount = progress.PodRewardCount, nearPod = NearPod(), moving = movement.Moving,
                controlsReady = progress.Phase == ContactPhase.Play && !progress.Paused && !benchmarkMode && !suppressInputUntilNeutral,
                cinematicFraction = progress.RevealFraction,
                playerPosition = player.transform.position, cameraPosition = gameplayCamera.transform.position, cameraEuler = gameplayCamera.transform.eulerAngles,
                lidPresentation = pod.Mode, checkpointStatus = nativeBenchmarkRun ? "Persistence disabled for explicit native benchmark." : storage.Notice,
                positionRestoreStatus = positionRestoreStatus,
                controller = Gamepad.current != null ? Gamepad.current.displayName : "No Gamepad detected",
                performance = metrics.Snapshot(gameplayCamera)
            }, true);
        }

        public void RequestSnapshot()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            SDPublishSnapshot(CaptureSnapshotJson());
#else
            Debug.Log(CaptureSnapshotJson(), this);
#endif
        }

        private void OnApplicationFocus(bool focused) { if (!focused && !nativeBenchmarkRun) SetPaused(true); }
        private void OnApplicationPause(bool paused) { if (paused && !nativeBenchmarkRun) SetPaused(true); }
        private void OnApplicationQuit() => SaveCheckpoint();
        private void OnDestroy() { metrics?.Dispose(); }

        private void OnGUI()
        {
            if (!initialized || benchmarkMode) return;
            float width = Mathf.Min(440, Screen.width - 32);
            GUILayout.BeginArea(new Rect(16, 16, width, 285), GUI.skin.box);
            GUILayout.Label("SPACE DRAGON · FIRST CONTACT");
            if (progress.Paused)
            {
                GUILayout.Label("Paused. Release held controls before continuing.");
                if (GUILayout.Button("Resume · Escape / Options")) SetPaused(false);
            }
            else if (progress.Phase == ContactPhase.Reveal)
            {
                GUILayout.Label("A signal in the backyard…");
                if (GUILayout.Button("Skip reveal · Space / Cross")) SkipReveal();
            }
            else
            {
                GUILayout.Label(message);
                GUILayout.Label("WASD / arrows or left stick: walk\nQ/E, right-drag or right stick: look · R: recenter");
                GUILayout.Label(NearPod() ? "Space / Enter / Cross: inspect pod" : "Find the glowing pod in the backyard.");
                if (GUILayout.Button("Pause · Escape / Options")) SetPaused(true);
                if (GUILayout.Button("Replay reveal")) ReplayReveal();
            }
            GUILayout.Label(storage.Notice);
            GUILayout.Label($"Arrival checkpoint: {progress.PodRewardCount}/1");
            showMetrics = GUILayout.Toggle(showMetrics, "Frame measurements · F3");
            if (showMetrics) GUILayout.Label(metricLabel);
            GUILayout.EndArea();
        }
    }
}
