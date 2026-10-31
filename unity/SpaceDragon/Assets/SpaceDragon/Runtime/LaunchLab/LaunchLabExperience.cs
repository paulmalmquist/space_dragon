using System;
using System.IO;
using System.Runtime.InteropServices;
using SpaceDragon.FirstContact;
using Unity.Cinemachine;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Playables;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using UnityEngine.Video;

namespace SpaceDragon.LaunchLab
{
    [Serializable]
    public sealed class LaunchRuntimeSnapshot
    {
        public string scene = "unity-launch-lab";
        public bool ready;
        public int generation;
        public string phase;
        public string mode;
        public double sequenceTime;
        public bool paused;
        public bool destinationReady;
        public bool orbitLoaded;
        public bool reflectionReady;
        public bool videoPrepared;
        public bool videoFirstFrame;
        public bool videoFallback;
        public double mediaTime;
        public string videoUrl;
        public string videoQuality;
        public string notice;
        public int handoffCount;
        public bool controlsReady;
        public bool replayRestored;
        public LaunchFlightSnapshot replayReturn;
        public LaunchFlightSnapshot flight;
        public LaunchFlightSnapshot handoffPose;
        public float handoffPositionError;
        public float handoffCameraError;
        public float handoffRotationError;
        public float handoffVelocityError;
        public double handoffWallClockMs;
        public double handoffFrameIntervalMs;
        public int collisionRecoveries;
        public string inputOwner;
        public string controllerCoverage = "Keyboard implementation; physical PlayStation controller NOT TESTED";
        public bool writesProgress = false;
        public bool reducedMotion;
        public bool soundEnabled;
        public bool launchCueTriggered;
        public bool launchCuePlayed;
        public string launchCue;
        public ContactMetricsSnapshot performance;
    }

    /// <summary>Isolated launch rehearsal. No First Contact, campaign or learner storage access.</summary>
    public sealed class LaunchLabExperience : MonoBehaviour
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] private static extern void SDPublishSnapshot(string json);
#endif
        [SerializeField] private Transform gameplayRoot;
        [SerializeField] private Transform visualRoot;
        [SerializeField] private Camera gameplayCamera;
        [SerializeField] private PlayableDirector director;
        [SerializeField] private CinemachineBrain brain;
        [SerializeField] private AnimationClip flightClip;
        [SerializeField] private AnimationClip glideClip;
        [SerializeField] private AnimationClip boostClip;
        [SerializeField] private TextAsset choreographySource;
        [SerializeField] private ReflectionProbe reflection;
        [SerializeField] private Transform surface;
        [SerializeField] private string orbitScene = "OrbitLab";
        [SerializeField] private string blenderUrl = "";
        [SerializeField] private string aiUrl = "";
        [SerializeField] private string lowVideoUrl = "";
        [SerializeField] private AudioClip launchAudio;
        private readonly LaunchSession session = new LaunchSession();
        private LaunchChoreography choreography;
        private LaunchFlight flight;
        private FirstContactMetrics metrics;
        private LaunchFlightSnapshot replayReturn;
        private VideoPlayer video;
        private AsyncOperation orbitLoading;
        private bool orbitLoaded;
        private bool ownsOrbit;
        private bool initialized;
        private bool destroyed;
        private bool reflectionReady;
        private int reflectionId = -1;
        private bool videoPlayRequested;
        private bool replayRestored;
        private string selectedVideoUrl = "";
        private string selectedVideoQuality = "balanced";
        private string activeVideoQuality = "none";
        private LaunchFlightSnapshot handoffPose;
        private string initializationError = "";
        private int cameraFrame;
        private float transitionCover;
        private bool reducedMotion;
        private bool showMeasurements;
        private bool hideInterface;
        private AudioSource launchAudioSource;
        private bool soundEnabled;
        private bool launchCueTriggered;
        private bool launchCuePlayed;
        private float handoffPositionError;
        private float handoffCameraError;
        private float handoffRotationError;
        private float handoffVelocityError;
        private double handoffWallClockMs;
        private double handoffFrameIntervalMs;
        private bool measureNextHandoffFrame;
        private double lastUpdateTime;

        public void Configure(Transform root, Transform model, Camera camera, PlayableDirector timeline,
            CinemachineBrain cameraBrain, AnimationClip flightAnimation, AnimationClip glideAnimation,
            AnimationClip boostAnimation, TextAsset choreography, ReflectionProbe reflectionProbe)
        {
            gameplayRoot = root; visualRoot = model; gameplayCamera = camera; director = timeline; brain = cameraBrain;
            flightClip = flightAnimation; glideClip = glideAnimation; boostClip = boostAnimation;
            choreographySource = choreography; reflection = reflectionProbe;
        }

        public void ConfigureEnvironment(Transform surfaceRoot) => surface = surfaceRoot;
        public void ConfigureOrbitScene(string sceneName) => orbitScene = sceneName;
        public void ConfigureVideoUrls(string original, string enhanced) { blenderUrl = original; aiUrl = enhanced; }
        public void ConfigureLowVideoUrl(string originalLow) => lowVideoUrl = originalLow;
        public void ConfigureAudio(AudioClip clip) => launchAudio = clip;

        private void Start()
        {
            try
            {
                if (gameplayRoot == null || visualRoot == null || gameplayCamera == null || director == null || brain == null ||
                    choreographySource == null || flightClip == null || reflection == null)
                    throw new InvalidOperationException("LaunchLab requires its generated dragon, Timeline, Cinemachine camera, choreography, flight clip and reflection probe.");
                choreography = LaunchChoreography.Parse(choreographySource.text);
                director.playOnAwake = false;
                director.timeUpdateMode = DirectorUpdateMode.Manual;
                director.Pause();
                brain.UpdateMethod = CinemachineBrain.UpdateMethods.ManualUpdate;
                flight = new LaunchFlight(gameplayRoot, gameplayCamera, choreography.Sample(12).position);
                metrics = new FirstContactMetrics();
                launchAudioSource = gameObject.AddComponent<AudioSource>();
                launchAudioSource.playOnAwake = false;
                launchAudioSource.loop = false;
                launchAudioSource.spatialBlend = 0;
                launchAudioSource.volume = 0.25f;
                launchAudioSource.clip = launchAudio;
                reflection.refreshMode = ReflectionProbeRefreshMode.ViaScripting;
                reflectionId = reflection.RenderProbe();
                if (reflectionId < 0) throw new InvalidOperationException("The launch reflection capture could not start.");
                initialized = true;
                EvaluateTimeline(0, -1);
            }
            catch (Exception error)
            {
                initializationError = error.Message;
                Debug.LogError("LaunchLab: " + initializationError, this);
            }
        }

        public void StartLaunch() => Begin(LaunchMode.InEngine, "", false);
        public void StartBlenderVideo() => Begin(LaunchMode.BlenderURL, ResolveMediaUrl(selectedVideoQuality == "low" && !string.IsNullOrEmpty(lowVideoUrl) ? lowVideoUrl : blenderUrl), false);
        public void StartAIVideo()
        {
            if (string.IsNullOrWhiteSpace(aiUrl)) return;
            Begin(LaunchMode.AIURL, ResolveMediaUrl(aiUrl), false);
        }
        public void StartVideoUrl(string url) => Begin(LaunchMode.BlenderURL, ResolveMediaUrl(url), false);

        public void SelectVideoQuality(string quality)
        {
            if (quality == "balanced" || (quality == "low" && !string.IsNullOrWhiteSpace(lowVideoUrl))) selectedVideoQuality = quality;
        }

        private static string ResolveMediaUrl(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "";
            try
            {
                if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
                {
                    if (Application.platform == RuntimePlatform.WebGLPlayer)
                        uri = new Uri(new Uri(Application.absoluteURL), value);
                    else uri = new Uri(Path.GetFullPath(Path.Combine(Path.GetDirectoryName(Application.dataPath) ?? "", value)));
                }
                return uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps ||
                    (Application.platform != RuntimePlatform.WebGLPlayer && uri.IsFile) ? uri.AbsoluteUri : "";
            }
            catch (Exception) { return ""; }
        }

        private void Begin(LaunchMode mode, string url, bool replay)
        {
            if (!initialized) return;
            bool active = session.Phase != LaunchPhase.Idle && session.Phase != LaunchPhase.Exited && session.Phase != LaunchPhase.Failed && session.Phase != LaunchPhase.Flight;
            if (active && !replay) return;
            if (session.Phase == LaunchPhase.Flight) replayReturn = flight.Capture();
            else if (!replay) replayReturn = null;
            DisposeVideo();
            launchAudioSource.Stop();
            launchCueTriggered = launchCuePlayed = false;
            int generation = session.Begin(mode);
            selectedVideoUrl = url;
            activeVideoQuality = mode == LaunchMode.InEngine ? "none" : url == ResolveMediaUrl(lowVideoUrl) ? "low" : url == ResolveMediaUrl(blenderUrl) ? "balanced" : "selected URL";
            replayRestored = false;
            handoffPositionError = handoffCameraError = handoffRotationError = handoffVelocityError = 0;
            handoffWallClockMs = 0;
            handoffFrameIntervalMs = 0;
            handoffPose = null;
            measureNextHandoffFrame = false;
            transitionCover = 0.2f;
            flight.SetActive(false);
            director.enabled = true;
            brain.enabled = true;
            brain.ResetState();
            if (surface != null) surface.gameObject.SetActive(true);
            EvaluateTimeline(0, -1);
            metrics.SetPaused(false);
            metrics.Reset();
            EnsureOrbitLoading();
            if (mode != LaunchMode.InEngine)
            {
                if (reducedMotion) session.FailVideo(generation, "Reduced motion uses the steady live camera.");
                else if (string.IsNullOrEmpty(url)) session.FailVideo(generation, "No supported video URL is selected.");
                else PrepareVideo(generation, url);
            }
        }

        private void EnsureOrbitLoading()
        {
            var existing = SceneManager.GetSceneByName(orbitScene);
            if (existing.IsValid() && existing.isLoaded) { orbitLoaded = true; return; }
            if (orbitLoading != null) return;
            try
            {
                orbitLoading = SceneManager.LoadSceneAsync(orbitScene, LoadSceneMode.Additive);
                if (orbitLoading == null) throw new InvalidOperationException("OrbitLab is not included in this player build.");
                ownsOrbit = true;
                orbitLoading.completed += _ =>
                {
                    orbitLoaded = SceneManager.GetSceneByName(orbitScene).isLoaded;
                    orbitLoading = null;
                    if (destroyed && orbitLoaded) SceneManager.UnloadSceneAsync(orbitScene);
                };
            }
            catch (Exception error) { session.Fail(session.Generation, "Safe flight could not load: " + error.Message); }
        }

        private void PrepareVideo(int generation, string url)
        {
            var holder = new GameObject("LaunchLab.OptionalVideo");
            holder.transform.SetParent(transform, false);
            var created = holder.AddComponent<VideoPlayer>();
            video = created;
            videoPlayRequested = false;
            created.playOnAwake = false;
            created.source = VideoSource.Url;
            created.url = url;
            created.isLooping = false;
            created.renderMode = VideoRenderMode.APIOnly;
            created.audioOutputMode = VideoAudioOutputMode.None;
            created.waitForFirstFrame = true;
            created.sendFrameReadyEvents = true;
            created.prepareCompleted += player =>
            {
                if (destroyed || generation != session.Generation || player == null || video == null || player != video) return;
                if (player.canSetSkipOnDrop) player.skipOnDrop = true;
                session.MarkVideoPrepared(generation);
            };
            created.frameReady += (player, frame) =>
            {
                if (destroyed || generation != session.Generation || player == null || video == null || player != video || session.Paused) return;
                session.ObserveVideoFrame(generation, Math.Max(0, player.time));
                if (session.VideoFirstFrame) player.sendFrameReadyEvents = false;
            };
            created.loopPointReached += player =>
            {
                if (destroyed || generation != session.Generation || player == null || video == null || player != video) return;
                session.CompleteVideo(generation);
            };
            created.errorReceived += (player, error) =>
            {
                if (destroyed || generation != session.Generation || player == null || video == null || player != video) return;
                session.FailVideo(generation, error);
            };
            try { created.Prepare(); }
            catch (Exception error) { session.FailVideo(generation, error.Message); }
        }

        private void DisposeVideo()
        {
            if (video == null) return;
            var old = video;
            video = null;
            videoPlayRequested = false;
            old.sendFrameReadyEvents = false;
            old.Stop();
            Destroy(old.gameObject);
        }

        private struct InputFrame
        {
            public Vector2 steer;
            public bool boost;
            public bool action;
            public bool actionHeld;
            public bool pause;
            public bool Neutral => steer.sqrMagnitude < 0.02f && !boost && !actionHeld;
        }

        private static InputFrame ReadInput()
        {
            var input = new InputFrame();
            var keyboard = Keyboard.current;
            if (keyboard != null)
            {
                input.steer.x = (keyboard.dKey.isPressed || keyboard.rightArrowKey.isPressed ? 1 : 0) - (keyboard.aKey.isPressed || keyboard.leftArrowKey.isPressed ? 1 : 0);
                input.steer.y = (keyboard.wKey.isPressed || keyboard.upArrowKey.isPressed ? 1 : 0) - (keyboard.sKey.isPressed || keyboard.downArrowKey.isPressed ? 1 : 0);
                input.boost = keyboard.leftShiftKey.isPressed || keyboard.rightShiftKey.isPressed;
                input.action = keyboard.spaceKey.wasPressedThisFrame || keyboard.enterKey.wasPressedThisFrame;
                input.actionHeld = keyboard.spaceKey.isPressed || keyboard.enterKey.isPressed;
                input.pause = keyboard.escapeKey.wasPressedThisFrame;
            }
            var gamepad = Gamepad.current;
            if (gamepad != null)
            {
                input.steer += gamepad.leftStick.ReadValue();
                input.boost |= gamepad.rightTrigger.ReadValue() > 0.5f;
                input.action |= gamepad.buttonSouth.wasPressedThisFrame;
                input.actionHeld |= gamepad.buttonSouth.isPressed;
                input.pause |= gamepad.startButton.wasPressedThisFrame;
            }
            input.steer = Vector2.ClampMagnitude(input.steer, 1);
            return input;
        }

        private void Update()
        {
            if (!initialized) return;
            double updateTime = Time.realtimeSinceStartupAsDouble;
            if (measureNextHandoffFrame)
            {
                handoffFrameIntervalMs = (updateTime - lastUpdateTime) * 1000;
                measureNextHandoffFrame = false;
            }
            lastUpdateTime = updateTime;
            if (!reflectionReady && reflectionId >= 0 && reflection.IsFinishedRendering(reflectionId) && reflection.texture != null)
            {
                reflectionReady = true;
                metrics.Reset();
            }
            var input = ReadInput();
            if (input.pause) { SetPaused(!session.Paused); return; }
            if (session.Paused) return;
            float seconds = Mathf.Min(Time.unscaledDeltaTime, 0.05f);
            transitionCover = Mathf.Max(0, transitionCover - seconds);
            if (session.Phase == LaunchPhase.Idle || session.Phase == LaunchPhase.Exited)
            {
                if (input.action) StartLaunch();
                return;
            }
            if (reflectionReady) session.MarkLaunchReady(session.Generation);
            if (reflectionReady && orbitLoaded) session.MarkDestinationReady(session.Generation);
            if (input.action && session.Phase != LaunchPhase.Flight) SkipCinematic();
            session.Tick(seconds);
            if (!launchCueTriggered && session.Phase == LaunchPhase.Timeline && session.SequenceTime >= 2)
            {
                launchCueTriggered = true;
                if (soundEnabled && launchAudio != null)
                {
                    launchAudioSource.Play();
                    launchCuePlayed = true;
                }
            }
            if (session.WantsVideoPlayback && video != null && !videoPlayRequested)
            {
                videoPlayRequested = true;
                try { video.Play(); }
                catch (Exception error) { session.FailVideo(session.Generation, error.Message); }
            }
            if (session.Phase == LaunchPhase.PlayingVideo && video != null)
                session.ObserveVideoTime(session.Generation, video.time);
            if (session.VideoFallback || session.Phase == LaunchPhase.Handoff || session.Phase == LaunchPhase.Flight || session.Phase == LaunchPhase.Failed ||
                (session.Phase == LaunchPhase.Timeline && session.SequenceTime >= LaunchSession.VideoEnd))
            {
                if (video != null) { transitionCover = 0.2f; DisposeVideo(); }
            }
            if (session.Phase == LaunchPhase.Timeline || session.Phase == LaunchPhase.PreparingVideo || session.Phase == LaunchPhase.PlayingVideo || session.Phase == LaunchPhase.Handoff)
            {
                EvaluateTimeline((float)session.SequenceTime, seconds);
                if (surface != null) surface.gameObject.SetActive(session.SequenceTime < 10);
            }
            if (session.TryCompleteHandoff()) { CompleteHandoff(); return; }
            if (session.Phase == LaunchPhase.Flight)
            {
                session.ObserveNeutralInput(input.Neutral);
                // Straight-ahead flight continues while stale steering/boost is suppressed.
                flight.Tick(session.ControlsReady ? input.steer : Vector2.zero, session.ControlsReady && input.boost, seconds);
                SampleDragon(flight.Boosting && boostClip != null ? boostClip : flightClip, flight.AnimationTime);
            }
            if (reflectionReady && session.Phase != LaunchPhase.Failed) metrics.Record();
        }

        private void EvaluateTimeline(float time, float seconds)
        {
            if (!director.enabled) director.enabled = true;
            if (!brain.enabled) brain.enabled = true;
            director.time = time;
            director.Evaluate();
            brain.ManualUpdate(++cameraFrame, seconds);
            SampleDragon(flightClip, time);
            if (reducedMotion)
            {
                var pose = choreography.Sample(time);
                gameplayCamera.transform.SetPositionAndRotation(pose.position + new Vector3(0, 7, -22), Quaternion.LookRotation(pose.position + Vector3.up * 2 - (pose.position + new Vector3(0, 7, -22))));
                gameplayCamera.fieldOfView = 50;
            }
        }

        private void SampleDragon(AnimationClip clip, float time)
        {
            if (clip == null || clip.length <= 0) return;
            clip.SampleAnimation(visualRoot.gameObject, time % clip.length);
        }

        private void CompleteHandoff()
        {
            double started = Time.realtimeSinceStartupAsDouble;
            var endpoint = choreography.Sample(12);
            var target = replayReturn ?? LaunchFlight.FromPose(endpoint);
            // Compare the actual rendered endpoint before relinquishing Timeline/Cinemachine ownership.
            handoffPositionError = Vector3.Distance(gameplayRoot.position, endpoint.position);
            handoffCameraError = reducedMotion ? 0 : Vector3.Distance(gameplayCamera.transform.position, endpoint.cameraPosition);
            handoffRotationError = Quaternion.Angle(gameplayRoot.rotation, endpoint.rotation);
            director.Pause();
            brain.enabled = false;
            director.enabled = false;
            if (reducedMotion && replayReturn == null)
            {
                target.cameraPosition = gameplayCamera.transform.position;
                target.cameraRotation = gameplayCamera.transform.rotation;
                target.cameraFov = gameplayCamera.fieldOfView;
            }
            flight.Seed(target);
            handoffPose = flight.Capture();
            handoffVelocityError = Vector3.Distance(flight.Velocity, target.velocity);
            replayRestored = replayReturn != null;
            if (replayRestored) transitionCover = 0.3f;
            SampleDragon(flightClip, target.animationTime);
            handoffWallClockMs = (Time.realtimeSinceStartupAsDouble - started) * 1000;
            measureNextHandoffFrame = true;
            metrics.Reset();
        }

        public void SkipCinematic()
        {
            if (!initialized || session.Phase == LaunchPhase.Idle || session.Phase == LaunchPhase.Exited ||
                session.Phase == LaunchPhase.Flight || session.Phase == LaunchPhase.Failed) return;
            session.RequestSkip();
            transitionCover = 0.25f;
            DisposeVideo();
            launchAudioSource.Stop();
        }

        public void ReplayCinematic()
        {
            if (!initialized) return;
            Begin(session.Mode, selectedVideoUrl, true);
        }

        public void SetPaused(bool paused)
        {
            if (!initialized) return;
            session.SetPaused(paused);
            metrics.SetPaused(session.Paused);
            if (session.Paused) launchAudioSource.Pause();
            else if (soundEnabled && launchCuePlayed) launchAudioSource.UnPause();
            if (video != null && videoPlayRequested)
            {
                if (session.Paused) video.Pause();
                else if (session.Phase == LaunchPhase.PlayingVideo || session.WantsVideoPlayback) video.Play();
            }
        }
        public void SetPausedFromString(string value) { if (value == "true") SetPaused(true); else if (value == "false") SetPaused(false); }
        public void SetReducedMotion(string value)
        {
            if (value != "true" && value != "false") return;
            reducedMotion = value == "true";
            if (reducedMotion && session.Mode != LaunchMode.InEngine)
                session.FailVideo(session.Generation, "Reduced motion uses the steady live camera.");
        }
        public void SetInterfaceHidden(string value) { if (value == "true" || value == "false") hideInterface = value == "true"; }
        public void SetSoundEnabled(string value)
        {
            if (value != "true" && value != "false") return;
            soundEnabled = value == "true";
            if (!soundEnabled && launchAudioSource != null) launchAudioSource.Stop();
        }
        public void ResetMeasurement() { metrics?.Reset(); }

        public void ReturnToMenu()
        {
            if (!initialized) return;
            session.Exit();
            DisposeVideo();
            launchAudioSource.Stop();
            replayReturn = null;
            flight.SetActive(false);
            metrics.SetPaused(false);
            metrics.Reset();
            if (surface != null) surface.gameObject.SetActive(true);
            transitionCover = 0.2f;
            EvaluateTimeline(0, -1);
        }

        private void OnApplicationFocus(bool focus) { if (!focus) SetPaused(true); }
        private void OnApplicationPause(bool pause) { if (pause) SetPaused(true); }

        public string CaptureSnapshotJson()
        {
            if (!initialized) return JsonUtility.ToJson(new LaunchRuntimeSnapshot { notice = initializationError, phase = "Initializing" });
            return JsonUtility.ToJson(new LaunchRuntimeSnapshot
            {
                ready = reflectionReady, generation = session.Generation, phase = session.Phase.ToString(), mode = session.Mode.ToString(),
                sequenceTime = session.SequenceTime, paused = session.Paused, destinationReady = session.DestinationReady,
                orbitLoaded = orbitLoaded, reflectionReady = reflectionReady, videoPrepared = session.VideoPrepared,
                videoFirstFrame = session.VideoFirstFrame, videoFallback = session.VideoFallback, mediaTime = session.MediaTime,
                videoUrl = selectedVideoUrl, videoQuality = activeVideoQuality, notice = session.Notice, handoffCount = session.HandoffCount, controlsReady = session.ControlsReady,
                replayRestored = replayRestored, replayReturn = replayReturn, flight = flight.Capture(), handoffPose = handoffPose,
                handoffPositionError = handoffPositionError, handoffCameraError = handoffCameraError, handoffRotationError = handoffRotationError,
                handoffVelocityError = handoffVelocityError, handoffWallClockMs = handoffWallClockMs, handoffFrameIntervalMs = handoffFrameIntervalMs, collisionRecoveries = flight.CollisionRecoveries,
                inputOwner = session.Phase == LaunchPhase.Flight ? "flight" : "cinematic", reducedMotion = reducedMotion,
                soundEnabled = soundEnabled, launchCueTriggered = launchCueTriggered, launchCuePlayed = launchCuePlayed,
                launchCue = launchAudio == null ? "unavailable" : launchAudio.name,
                performance = metrics.Snapshot(gameplayCamera)
            });
        }

        public void RequestSnapshot()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            SDPublishSnapshot(CaptureSnapshotJson());
#else
            Debug.Log(CaptureSnapshotJson());
#endif
        }

        private void OnDestroy()
        {
            destroyed = true;
            session.Exit();
            DisposeVideo();
            if (launchAudioSource != null) launchAudioSource.Stop();
            metrics?.Dispose();
            if (ownsOrbit && orbitLoaded) SceneManager.UnloadSceneAsync(orbitScene);
        }

        private void OnGUI()
        {
            if (session.Phase == LaunchPhase.PlayingVideo && video != null && session.VideoFirstFrame && video.texture != null)
            {
                GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), Texture2D.blackTexture);
                GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), video.texture, ScaleMode.ScaleToFit, false);
            }
            if (transitionCover > 0) GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), Texture2D.blackTexture);
            if (hideInterface && initialized && !session.Paused && session.Phase != LaunchPhase.Failed) return;
            GUILayout.BeginArea(new Rect(18, 18, Mathf.Min(435, Screen.width - 36), Mathf.Min(410, Screen.height - 36)), GUI.skin.box);
            GUILayout.Label("SPACE DRAGON · LAUNCH REHEARSAL");
            if (!initialized) GUILayout.Label(initializationError.Length > 0 ? initializationError : "Preparing the dragon…");
            else if (session.Phase == LaunchPhase.Idle || session.Phase == LaunchPhase.Exited || session.Phase == LaunchPhase.Failed)
            {
                if (session.Phase == LaunchPhase.Failed) GUILayout.Label(session.Notice);
                GUILayout.Label("A 12-second launch, followed by safe flight. No campaign progress is changed.");
                if (GUILayout.Button("Launch · original Unity scene · Enter")) StartLaunch();
                if (!string.IsNullOrEmpty(lowVideoUrl))
                    selectedVideoQuality = GUILayout.Toggle(selectedVideoQuality == "low", "Lower video download · 540p") ? "low" : "balanced";
                if (GUILayout.Button("Launch · original video insert")) StartBlenderVideo();
                if (!string.IsNullOrWhiteSpace(aiUrl) && GUILayout.Button("Launch · enhanced video insert")) StartAIVideo();
                if (string.IsNullOrWhiteSpace(aiUrl)) GUILayout.Label("Enhanced video is not installed.");
                reducedMotion = GUILayout.Toggle(reducedMotion, "Reduced camera motion");
                bool nextSound = GUILayout.Toggle(soundEnabled, "Sound · short launch cue");
                if (nextSound != soundEnabled) SetSoundEnabled(nextSound ? "true" : "false");
            }
            else if (session.Paused)
            {
                GUILayout.Label("Paused. Release held controls before continuing.");
                if (GUILayout.Button("Resume · Escape")) SetPaused(false);
                if (GUILayout.Button("Skip cinematic after resume")) SkipCinematic();
                if (GUILayout.Button("Return to launch menu")) ReturnToMenu();
            }
            else
            {
                GUILayout.Label(session.Notice);
                if (session.Phase == LaunchPhase.Flight)
                {
                    GUILayout.Label("WASD / arrows: steer · Shift: boost · Escape: pause");
                    if (GUILayout.Button("Replay launch, then return here")) ReplayCinematic();
                }
                else if (GUILayout.Button("Skip to safe flight · Space")) SkipCinematic();
                if (GUILayout.Button("Pause · Escape")) SetPaused(true);
                if (GUILayout.Button("Return to launch menu")) ReturnToMenu();
            }
            if (initialized)
            {
                showMeasurements = GUILayout.Toggle(showMeasurements, "Show measurements");
                if (showMeasurements)
                {
                    var measured = metrics.Snapshot(gameplayCamera);
                    GUILayout.Label($"{measured.frames.sampleCount} frames · median {measured.frames.medianFrameMs:F1} ms · p95 {measured.frames.p95FrameMs:F1} ms\n{measured.cameraPixelWidth} × {measured.cameraPixelHeight} · {measured.graphicsApi}");
                }
            }
            GUILayout.EndArea();
        }
    }
}
