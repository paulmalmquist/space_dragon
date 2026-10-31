using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using SpaceDragon.LaunchLab;
using Unity.Cinemachine;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;
using UnityEngine.Timeline;
using Object = UnityEngine.Object;

namespace SpaceDragon.Editor
{
    /// <summary>Separate, reproducible SD-073 lab. Never changes First Contact scene definitions or source art.</summary>
    public static class LaunchLabProject
    {
        public const string Root = "Assets/SpaceDragon/LaunchLab";
        public const string Generated = Root + "/Generated";
        public const string ScenePath = Generated + "/LaunchLab.unity";
        public const string OrbitScenePath = Generated + "/OrbitLab.unity";
        public const string DragonPath = Root + "/Imported/dragon-flight-v003.glb";
        public const string ChoreographyPath = Root + "/launch-choreography-v001.json";
        const string BasePipeline = "Assets/SpaceDragon/Generated/FirstContactURP.asset";
        static readonly string[] Sockets = { "socket_muzzle", "socket_wing_l", "socket_wing_r", "socket_thruster_l", "socket_thruster_r", "socket_target", "socket_camera", "socket_ground" };
        static readonly string[] Bones = { "Root", "Jaw", "Tail_0", "Tail_1", "Tail_2", "Tail_3", "Tail_4", "Wing_L", "Wing_R" };

        [Serializable] sealed class Frame
        {
            public float time, cameraFov;
            public Vector3 position, velocity, cameraPosition, cameraTarget;
            public Quaternion rotation;
        }
        [Serializable] sealed class Choreography { public float duration, frameRate, videoStart, videoEnd; public Frame[] frames; }

        [MenuItem("Space Dragon/Launch Lab/Generate separate launch lab")]
        public static void Setup()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode) throw new InvalidOperationException("Exit Play mode before generating LaunchLab.");
            if (!Application.isBatchMode && !EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            // Reuse the tested base configuration; only bootstrap it on a clean checkout without generated assets.
            if (AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(BasePipeline) == null) FirstContactProject.Setup();
            Folder(Generated);
            ConfigurePipeline();
            ConfigureDragonImport();
            var document = AssetDatabase.LoadAssetAtPath<TextAsset>(ChoreographyPath);
            if (document == null) throw new FileNotFoundException("Run tools/unity/prepare-launch-assets.mjs first.", ChoreographyPath);
            var choreography = JsonUtility.FromJson<Choreography>(document.text);
            if (choreography == null || choreography.frames?.Length != 361 || choreography.duration != 12 || choreography.videoStart != 3 || choreography.videoEnd != 10)
                throw new InvalidDataException("Unexpected launch choreography; explicitly review contract changes.");
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(DragonPath);
            if (prefab == null) throw new FileNotFoundException("glTFast did not import the original dragon.", DragonPath);
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var surface = CreateSurface();
            var reflection = ConfigureLighting();
            var actor = new GameObject("Dragon.GameplayRoot");
            actor.transform.SetPositionAndRotation(choreography.frames[0].position, choreography.frames[0].rotation);
            var actorAnimator = actor.AddComponent<Animator>();
            actorAnimator.applyRootMotion = false;
            actorAnimator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            var visual = new GameObject("Dragon.VisualBasis.+Z-gameplay-from-source-minusZ").transform;
            visual.SetParent(actor.transform, false);
            visual.localRotation = Quaternion.Euler(0, 180, 0);
            var dragon = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
            dragon.name = "DragonFlight.v003.Original";
            dragon.transform.SetParent(visual, false);
            var evidence = GltfEmissionParity.Apply(dragon, DragonPath, Generated);
            foreach (var animator in dragon.GetComponentsInChildren<Animator>(true))
            { animator.applyRootMotion = false; animator.cullingMode = AnimatorCullingMode.AlwaysAnimate; }
            var clips = AssetDatabase.LoadAllAssetsAtPath(DragonPath).OfType<AnimationClip>().ToArray();
            AnimationClip Clip(string name) => clips.SingleOrDefault(c => c.name == name) ?? throw new InvalidDataException("Dragon lost source clip " + name);
            ValidateDragon(dragon, clips);

            var camera = new GameObject("LaunchLab.Camera").AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.allowHDR = true;
            camera.nearClipPlane = .1f;
            camera.farClipPlane = 6000;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(.006f, .012f, .026f);
            camera.fieldOfView = choreography.frames[0].cameraFov;
            camera.transform.SetPositionAndRotation(choreography.frames[0].cameraPosition, CameraRotation(choreography.frames[0]));
            camera.GetUniversalAdditionalCameraData().renderPostProcessing = true;
            camera.gameObject.AddComponent<AudioListener>();
            var brain = camera.gameObject.AddComponent<CinemachineBrain>();
            brain.UpdateMethod = CinemachineBrain.UpdateMethods.ManualUpdate;
            brain.DefaultBlend = new CinemachineBlendDefinition(CinemachineBlendDefinition.Styles.Cut, 0);
            var virtualCamera = new GameObject("LaunchLab.Cinemachine.AuthoredCamera").AddComponent<CinemachineCamera>();
            virtualCamera.Lens.FieldOfView = choreography.frames[0].cameraFov;
            virtualCamera.Lens.NearClipPlane = .1f;
            virtualCamera.Lens.FarClipPlane = 6000;
            virtualCamera.transform.SetPositionAndRotation(camera.transform.position, camera.transform.rotation);
            var cameraAnimator = virtualCamera.gameObject.AddComponent<Animator>();
            cameraAnimator.applyRootMotion = false;
            cameraAnimator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            var host = new GameObject("LaunchLabCandidate");
            var director = host.AddComponent<PlayableDirector>();
            director.playOnAwake = false;
            director.timeUpdateMode = DirectorUpdateMode.Manual;
            director.extrapolationMode = DirectorWrapMode.Hold;
            BuildTimeline(director, actorAnimator, cameraAnimator, virtualCamera, brain, choreography);
            var timelineEvidence = ValidateTimeline(director, brain, actor.transform, camera, choreography);
            var experience = host.AddComponent<LaunchLabExperience>();
            experience.Configure(actor.transform, dragon.transform, camera, director, brain, Clip("Flight"), Clip("Glide"), Clip("Boost"), document, reflection);
            experience.ConfigureOrbitScene("OrbitLab");
            experience.ConfigureEnvironment(surface);
            experience.ConfigureVideoUrls("videos/launch-blender-720.mp4", "");
            experience.ConfigureLowVideoUrl("videos/launch-blender-540.mp4");
            experience.ConfigureAudio(ConfigureAudio());
            var receipt = CreateReceipt(dragon, clips, evidence);
            receipt.timelineSamples = timelineEvidence;
            EditorSceneManager.SaveScene(scene, ScenePath);
            CreateOrbitScene(scene);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true), new EditorBuildSettingsScene(OrbitScenePath, true) };
            AssetDatabase.SaveAssets();
            Directory.CreateDirectory("Builds");
            File.WriteAllText("Builds/launch-setup-receipt.json", JsonUtility.ToJson(receipt, true));
            Debug.Log("SPACE_DRAGON_LAUNCH_SETUP_OK " + ScenePath);
        }

        static void ConfigurePipeline()
        {
            var path = Generated + "/LaunchURP.asset";
            var original = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(BasePipeline);
            var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(path);
            if (pipeline == null) { pipeline = Object.Instantiate(original); AssetDatabase.CreateAsset(pipeline, path); }
            else EditorUtility.CopySerialized(original, pipeline);
            pipeline.name = "LaunchURP";
            pipeline.shadowDistance = 65;
            pipeline.mainLightShadowmapResolution = 2048;
            GraphicsSettings.defaultRenderPipeline = pipeline;
            QualitySettings.renderPipeline = pipeline;
            QualitySettings.realtimeReflectionProbes = true;
            QualitySettings.vSyncCount = 0;
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.runInBackground = false;
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.WebGL, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL, new[] { GraphicsDeviceType.WebGPU, GraphicsDeviceType.OpenGLES3 });
            PlayerSettings.WebGL.template = "PROJECT:LaunchLab";
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
            PlayerSettings.WebGL.initialMemorySize = 128;
            PlayerSettings.WebGL.maximumMemorySize = 512;
            EditorUtility.SetDirty(pipeline);
        }

        static void ConfigureDragonImport()
        {
            AssetDatabase.ImportAsset(DragonPath, ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
            var importer = AssetImporter.GetAtPath(DragonPath);
            if (importer == null) throw new FileNotFoundException("Missing prepared dragon export.", DragonPath);
            var settings = new SerializedObject(importer);
            Required(settings, "importSettings.animationMethod").intValue = 2; // Mecanim; removed Playables import mode is never used.
            Required(settings, "importSettings.nodeNameMethod").intValue = 1;
            Required(settings, "importSettings.generateMipMaps").boolValue = true;
            Required(settings, "instantiationSettings.skinUpdateWhenOffscreen").boolValue = true;
            settings.ApplyModifiedPropertiesWithoutUndo();
            importer.SaveAndReimport();
        }

        static AudioClip ConfigureAudio()
        {
            const string path = Root + "/Imported/jet-surge-v001.wav";
            var importer = AssetImporter.GetAtPath(path) as AudioImporter;
            if (importer == null) throw new FileNotFoundException("Run the launch asset preparer for the existing licensed cue.", path);
            importer.forceToMono = true;
            var settings = importer.defaultSampleSettings;
            settings.loadType = AudioClipLoadType.DecompressOnLoad;
            settings.compressionFormat = AudioCompressionFormat.PCM;
            settings.sampleRateSetting = AudioSampleRateSetting.PreserveSampleRate;
            importer.defaultSampleSettings = settings;
            importer.SaveAndReimport();
            return AssetDatabase.LoadAssetAtPath<AudioClip>(path) ?? throw new InvalidDataException("Launch cue audio import failed.");
        }

        static SerializedProperty Required(SerializedObject owner, string path)
            => owner.FindProperty(path) ?? throw new InvalidOperationException("Pinned importer setting changed: " + path);

        static void BuildTimeline(PlayableDirector director, Animator actor, Animator camera, CinemachineCamera virtualCamera, CinemachineBrain brain, Choreography choreography)
        {
            var path = Generated + "/Launch12Seconds.playable";
            var timeline = AssetDatabase.LoadAssetAtPath<TimelineAsset>(path);
            if (timeline == null) { timeline = ScriptableObject.CreateInstance<TimelineAsset>(); AssetDatabase.CreateAsset(timeline, path); }
            foreach (var track in timeline.GetRootTracks().ToArray()) timeline.DeleteTrack(track);
            timeline.durationMode = TimelineAsset.DurationMode.FixedLength;
            timeline.fixedDuration = choreography.duration;
            timeline.editorSettings.frameRate = choreography.frameRate;
            var trajectory = Animation("LaunchRootTrajectory", choreography, false);
            var cameraMotion = Animation("LaunchCameraTrajectory", choreography, true);
            director.playableAsset = timeline;
            AddAnimationTrack(timeline, director, "Authoritative cinematic root trajectory", actor, trajectory, choreography.duration);
            AddAnimationTrack(timeline, director, "Continuous authored camera transform and lens", camera, cameraMotion, choreography.duration);
            var cameras = timeline.CreateTrack<CinemachineTrack>(null, "Cinemachine camera ownership 0–12s");
            var shot = cameras.CreateClip<CinemachineShot>();
            shot.displayName = "Pad → clouds → orbit; release camera at 12s";
            shot.start = 0;
            // Keep all three owners active while evaluating the exact 12s endpoint.
            // Timeline's fixed duration remains 12s; the unplayed guard frame prevents
            // an end-exclusive clip interval releasing the camera before handoff.
            shot.duration = choreography.duration + 1.0 / choreography.frameRate;
            var reference = new PropertyName("LaunchLab.AuthoredCamera");
            ((CinemachineShot)shot.asset).VirtualCamera = new ExposedReference<CinemachineVirtualCameraBase> { exposedName = reference };
            director.SetReferenceValue(reference, virtualCamera);
            director.SetGenericBinding(cameras, brain);
            EditorUtility.SetDirty(timeline);
        }

        static void AddAnimationTrack(TimelineAsset timeline, PlayableDirector director, string name, Animator animator, AnimationClip animation, double duration)
        {
            var track = timeline.CreateTrack<AnimationTrack>(null, name);
            track.trackOffset = TrackOffset.ApplyTransformOffsets;
            track.position = Vector3.zero;
            track.rotation = Quaternion.identity;
            var clip = track.CreateClip(animation);
            clip.start = 0;
            clip.duration = duration + 1.0 / 30;
            var playable = (AnimationPlayableAsset)clip.asset;
            playable.removeStartOffset = false;
            playable.applyFootIK = false;
            playable.loop = AnimationPlayableAsset.LoopMode.Off;
            director.SetGenericBinding(track, animator);
        }

        static AnimationClip Animation(string name, Choreography choreography, bool camera)
        {
            var path = Generated + "/" + name + ".anim";
            var clip = AssetDatabase.LoadAssetAtPath<AnimationClip>(path);
            if (clip == null) { clip = new AnimationClip(); AssetDatabase.CreateAsset(clip, path); }
            clip.ClearCurves();
            clip.name = name;
            clip.frameRate = choreography.frameRate;
            clip.legacy = false;
            Quaternion previous = Quaternion.identity;
            var rotations = choreography.frames.Select((f, i) =>
            {
                var q = camera ? CameraRotation(f) : f.rotation;
                if (i > 0 && Quaternion.Dot(previous, q) < 0) q = new Quaternion(-q.x, -q.y, -q.z, -q.w);
                previous = q; return q;
            }).ToArray();
            for (int axis = 0; axis < 3; axis++)
            {
                int component = axis;
                Curve(clip, typeof(Transform), "m_LocalPosition." + "xyz"[axis], choreography.frames.Select(f => new Keyframe(f.time, (camera ? f.cameraPosition : f.position)[component])).ToArray());
            }
            for (int axis = 0; axis < 4; axis++)
            {
                int component = axis;
                Curve(clip, typeof(Transform), "m_LocalRotation." + "xyzw"[axis], choreography.frames.Select((f, i) => new Keyframe(f.time, rotations[i][component])).ToArray());
            }
            if (camera) Curve(clip, typeof(CinemachineCamera), "Lens.FieldOfView", choreography.frames.Select(f => new Keyframe(f.time, f.cameraFov)).ToArray());
            clip.EnsureQuaternionContinuity();
            EditorUtility.SetDirty(clip);
            return clip;
        }

        static void Curve(AnimationClip clip, Type type, string property, Keyframe[] keys)
        {
            var curve = new AnimationCurve(keys);
            for (int i = 0; i < curve.length; i++)
            { AnimationUtility.SetKeyLeftTangentMode(curve, i, AnimationUtility.TangentMode.Linear); AnimationUtility.SetKeyRightTangentMode(curve, i, AnimationUtility.TangentMode.Linear); }
            AnimationUtility.SetEditorCurve(clip, EditorCurveBinding.FloatCurve("", type, property), curve);
        }
        static Quaternion CameraRotation(Frame frame) => Quaternion.LookRotation(frame.cameraTarget - frame.cameraPosition, Vector3.up);

        [Serializable] sealed class TimelineSample
        {
            public float time, rootPositionError, rootRotationError, cameraPositionError, cameraRotationError, fovError;
        }
        static TimelineSample[] ValidateTimeline(PlayableDirector director, CinemachineBrain brain, Transform actor, Camera camera, Choreography choreography)
        {
            var results = new List<TimelineSample>();
            int updateFrame = Time.frameCount;
            foreach (float time in new[] { 0f, 3f, 10f, 12f })
            {
                var frame = choreography.frames[Mathf.RoundToInt(time * choreography.frameRate)];
                director.time = time;
                director.Evaluate();
                brain.ManualUpdate(++updateFrame, -1);
                var sample = new TimelineSample { time = time,
                    rootPositionError = Vector3.Distance(actor.position, frame.position), rootRotationError = Quaternion.Angle(actor.rotation, frame.rotation),
                    cameraPositionError = Vector3.Distance(camera.transform.position, frame.cameraPosition), cameraRotationError = Quaternion.Angle(camera.transform.rotation, CameraRotation(frame)),
                    fovError = Mathf.Abs(camera.fieldOfView - frame.cameraFov) };
                results.Add(sample);
                if (sample.rootPositionError > .002f || sample.cameraPositionError > .002f || sample.rootRotationError > .05f || sample.cameraRotationError > .05f || sample.fovError > .01f)
                    throw new InvalidDataException("Generated Timeline differs from shared choreography: " + JsonUtility.ToJson(sample));
            }
            director.time = 0; director.Evaluate(); brain.ManualUpdate(++updateFrame, -1); director.Stop();
            return results.ToArray();
        }

        static Transform CreateSurface()
        {
            var parent = new GameObject("LaunchLab.Surface").transform;
            var concrete = Material("Pad concrete", new Color(.16f, .19f, .21f), .15f, .15f);
            var steel = Material("Pad graphite", new Color(.065f, .08f, .10f), .58f, .65f);
            var strip = Material("Pad guidance amber", new Color(.45f, .2f, .035f), .5f, .4f, new Color(2.0f, .6f, .08f));
            var blue = Material("Pad perimeter blue", new Color(.035f, .16f, .23f), .5f, .2f, new Color(.08f, .65f, 1.2f));
            Primitive(PrimitiveType.Cube, "Ground slab", new Vector3(0, -.7f, 0), new Vector3(180, 1, 180), concrete, parent);
            Primitive(PrimitiveType.Cylinder, "Launch dais", new Vector3(0, -.14f, 0), new Vector3(19, .14f, 19), steel, parent);
            for (int i = 0; i < 32; i++)
            {
                float angle = i * Mathf.PI * 2 / 32;
                var marker = Primitive(PrimitiveType.Cube, "Dais rim " + i, new Vector3(Mathf.Cos(angle) * 9.3f, .015f, Mathf.Sin(angle) * 9.3f), new Vector3(.85f, .035f, .12f), strip, parent, false);
                marker.transform.rotation = Quaternion.Euler(0, -angle * Mathf.Rad2Deg - 90, 0);
            }
            foreach (float x in new[] { -7.5f, 7.5f })
                for (int i = 0; i < 12; i++) Primitive(PrimitiveType.Cube, "Guidance strip", new Vector3(x, -.15f, 12 + i * 4), new Vector3(.2f, .08f, 1.9f), blue, parent, false);
            foreach (float x in new[] { -19f, 19f })
                for (int i = 0; i < 4; i++)
                {
                    var column = Primitive(PrimitiveType.Cube, "Perimeter pylon", new Vector3(x, 3.5f, -20 + i * 13), new Vector3(1.3f, 7, 1.3f), steel, parent);
                    Primitive(PrimitiveType.Cube, "Pylon glow", column.transform.position + Vector3.up * 3.3f, new Vector3(1.5f, .2f, 1.5f), blue, parent, false);
                }
            var cloud = CloudMaterial();
            var random = new System.Random(73001);
            for (int i = 0; i < 24; i++)
            {
                var position = new Vector3((float)random.NextDouble() * 130 - 65, 42 + (float)random.NextDouble() * 65, 55 + (float)random.NextDouble() * 125);
                var quad = Primitive(PrimitiveType.Quad, "Cloud wisp " + i, position, new Vector3(45 + i % 4 * 12, 20 + i % 3 * 8, 1), cloud, parent, false);
                quad.transform.rotation = Quaternion.LookRotation(new Vector3(-.15f, .2f, -1));
            }
            return parent;
        }

        static ReflectionProbe ConfigureLighting()
        {
            var key = new GameObject("LaunchLab.Key").AddComponent<Light>();
            key.type = LightType.Directional;
            key.transform.rotation = Quaternion.Euler(38, -32, 0);
            key.color = new Color(1, .88f, .7f);
            key.intensity = 2.2f;
            key.shadows = LightShadows.Soft;
            key.shadowBias = .03f;
            key.shadowNormalBias = .12f;
            var rim = new GameObject("LaunchLab.CoolRim").AddComponent<Light>();
            rim.type = LightType.Directional;
            rim.transform.rotation = Quaternion.Euler(25, 145, 0);
            rim.color = new Color(.33f, .57f, 1);
            rim.intensity = 1.1f;
            RenderSettings.sun = key;
            RenderSettings.fog = false;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(.15f, .19f, .28f);
            RenderSettings.ambientEquatorColor = new Color(.07f, .09f, .13f);
            RenderSettings.ambientGroundColor = new Color(.045f, .04f, .04f);
            var cube = AssetDatabase.LoadAssetAtPath<Cubemap>("Assets/SpaceDragon/Imported/daylight.hdr");
            if (cube == null) throw new FileNotFoundException("Existing prepared HDR cube required.");
            var sky = ExistingMaterial("Launch reflection sky", "Skybox/Cubemap");
            sky.SetTexture("_Tex", cube); sky.SetFloat("_Exposure", .55f); sky.SetFloat("_Rotation", 270);
            RenderSettings.skybox = sky;
            RenderSettings.defaultReflectionMode = DefaultReflectionMode.Custom;
            RenderSettings.customReflectionTexture = cube;
            RenderSettings.reflectionIntensity = .55f;
            var probe = new GameObject("LaunchLab.OneShotSkyReflection").AddComponent<ReflectionProbe>();
            probe.transform.position = new Vector3(0, 140, 200);
            probe.mode = ReflectionProbeMode.Realtime;
            probe.refreshMode = ReflectionProbeRefreshMode.ViaScripting;
            probe.timeSlicingMode = ReflectionProbeTimeSlicingMode.NoTimeSlicing;
            probe.cullingMask = 0;
            probe.clearFlags = ReflectionProbeClearFlags.Skybox;
            probe.resolution = 512;
            probe.size = Vector3.one * 3000;
            probe.hdr = true;
            probe.intensity = 1;
            probe.blendDistance = 0;
            probe.importance = 100;
            var profilePath = Generated + "/LaunchGrade.asset";
            var profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(profilePath);
            if (profile == null) { profile = ScriptableObject.CreateInstance<VolumeProfile>(); AssetDatabase.CreateAsset(profile, profilePath); }
            T Effect<T>() where T : VolumeComponent
            {
                if (profile.TryGet<T>(out var value)) return value;
                value = profile.Add<T>(true);
                AssetDatabase.AddObjectToAsset(value, profile);
                return value;
            }
            Effect<Tonemapping>().mode.Override(TonemappingMode.ACES);
            var bloom = Effect<Bloom>(); bloom.intensity.Override(.13f); bloom.threshold.Override(1.1f); bloom.scatter.Override(.55f);
            Effect<Vignette>().intensity.Override(.12f);
            Effect<ColorAdjustments>().saturation.Override(-4);
            var volume = new GameObject("LaunchLab.Grade").AddComponent<Volume>();
            volume.isGlobal = true; volume.sharedProfile = profile;
            EditorUtility.SetDirty(profile); EditorUtility.SetDirty(sky);
            return probe;
        }

        static void CreateOrbitScene(Scene launch)
        {
            var orbit = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Additive);
            SceneManager.SetActiveScene(orbit);
            var decor = new GameObject("OrbitLab.Decor-only-no-camera-or-actor").transform;
            var planet = Material("Orbit planet blue", new Color(.045f, .16f, .32f), .24f, .05f, new Color(.006f, .028f, .055f));
            Primitive(PrimitiveType.Sphere, "Distant planet curvature", new Vector3(0, -3400, 600), Vector3.one * 6400, planet, decor, false);
            var meshPath = Generated + "/OrbitStars.asset";
            var mesh = AssetDatabase.LoadAssetAtPath<Mesh>(meshPath);
            if (mesh == null) { mesh = new Mesh(); AssetDatabase.CreateAsset(mesh, meshPath); }
            var vertices = new List<Vector3>(); var triangles = new List<int>();
            var random = new System.Random(73002); var center = new Vector3(0, 155, 290);
            for (int i = 0; i < 340; i++)
            {
                float y = (float)random.NextDouble() * 1.7f - .7f, phi = (float)random.NextDouble() * Mathf.PI * 2;
                var direction = new Vector3(Mathf.Sqrt(1 - y * y) * Mathf.Cos(phi), y, Mathf.Sqrt(1 - y * y) * Mathf.Sin(phi));
                var position = center + direction * 2300;
                var right = Vector3.Cross(direction, Vector3.up).normalized * (1.1f + (float)random.NextDouble() * 1.4f);
                var up = Vector3.Cross(direction, right).normalized * right.magnitude;
                int offset = vertices.Count;
                vertices.Add(position - right - up); vertices.Add(position - right + up); vertices.Add(position + right + up); vertices.Add(position + right - up);
                triangles.AddRange(new[] { offset, offset + 1, offset + 2, offset, offset + 2, offset + 3 });
            }
            mesh.Clear(); mesh.SetVertices(vertices); mesh.SetTriangles(triangles, 0); mesh.RecalculateBounds(); mesh.RecalculateNormals();
            EditorUtility.SetDirty(mesh);
            var starMaterial = ExistingMaterial("Orbit starlight", "Universal Render Pipeline/Unlit");
            starMaterial.SetColor("_BaseColor", new Color(1.4f, 1.5f, 1.7f)); starMaterial.SetFloat("_Cull", 0);
            var stars = new GameObject("Orbit stars original procedural mesh"); stars.transform.SetParent(decor, false);
            stars.AddComponent<MeshFilter>().sharedMesh = mesh;
            stars.AddComponent<MeshRenderer>().sharedMaterial = starMaterial;
            EditorUtility.SetDirty(starMaterial);
            EditorSceneManager.SaveScene(orbit, OrbitScenePath);
            EditorSceneManager.CloseScene(orbit, true);
            SceneManager.SetActiveScene(launch);
        }

        static Material CloudMaterial()
        {
            var path = Generated + "/OriginalCloudFalloff.asset";
            var texture = AssetDatabase.LoadAssetAtPath<Texture2D>(path);
            if (texture == null) { texture = new Texture2D(128, 128, TextureFormat.RGBA32, true, false); AssetDatabase.CreateAsset(texture, path); }
            var colors = new Color[128 * 128];
            for (int y = 0; y < 128; y++) for (int x = 0; x < 128; x++)
            {
                float u = (x + .5f) / 64 - 1, v = (y + .5f) / 64 - 1;
                float falloff = Mathf.Pow(Mathf.Clamp01(1 - u * u - v * v), 2.2f);
                float noise = .45f + .55f * Mathf.PerlinNoise(x * .045f + 7, y * .045f + 13);
                colors[y * 128 + x] = new Color(1, 1, 1, falloff * noise * .4f);
            }
            texture.SetPixels(colors); texture.Apply(true, false); texture.wrapMode = TextureWrapMode.Clamp;
            EditorUtility.SetDirty(texture);
            var material = ExistingMaterial("Cloud wisps original procedural", "Universal Render Pipeline/Unlit");
            material.SetTexture("_BaseMap", texture);
            material.SetColor("_BaseColor", new Color(.62f, .72f, .86f, 1));
            material.SetFloat("_Surface", 1); material.SetFloat("_Blend", 0); material.SetFloat("_ZWrite", 0); material.SetFloat("_Cull", 0);
            material.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha); material.SetFloat("_DstBlend", (float)BlendMode.OneMinusSrcAlpha);
            material.SetFloat("_SrcBlendAlpha", (float)BlendMode.One); material.SetFloat("_DstBlendAlpha", (float)BlendMode.OneMinusSrcAlpha);
            material.SetOverrideTag("RenderType", "Transparent"); material.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
            material.renderQueue = (int)RenderQueue.Transparent; EditorUtility.SetDirty(material);
            return material;
        }

        static GameObject Primitive(PrimitiveType type, string name, Vector3 position, Vector3 size, Material material, Transform parent, bool collision = true)
        {
            var instance = GameObject.CreatePrimitive(type); instance.name = name;
            instance.transform.SetParent(parent, false); instance.transform.position = position; instance.transform.localScale = size;
            instance.GetComponent<Renderer>().sharedMaterial = material;
            if (!collision) Object.DestroyImmediate(instance.GetComponent<Collider>());
            return instance;
        }
        static Material ExistingMaterial(string name, string shaderName)
        {
            var path = Generated + "/" + name.Replace(' ', '-') + ".mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                var shader = Shader.Find(shaderName) ?? throw new InvalidOperationException("Missing shader " + shaderName);
                material = new Material(shader); AssetDatabase.CreateAsset(material, path);
            }
            return material;
        }
        static Material Material(string name, Color color, float smoothness, float metallic, Color? emission = null)
        {
            var material = ExistingMaterial(name, "Universal Render Pipeline/Lit");
            material.SetColor("_BaseColor", color); material.SetFloat("_Smoothness", smoothness); material.SetFloat("_Metallic", metallic);
            if (emission.HasValue) { material.EnableKeyword("_EMISSION"); material.SetColor("_EmissionColor", emission.Value); }
            EditorUtility.SetDirty(material); return material;
        }
        static void Folder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            var parent = Path.GetDirectoryName(path).Replace('\\', '/'); Folder(parent); AssetDatabase.CreateFolder(parent, Path.GetFileName(path));
        }
        static Mesh[] Meshes(GameObject instance) => instance.GetComponentsInChildren<MeshFilter>(true).Select(f => f.sharedMesh)
            .Concat(instance.GetComponentsInChildren<SkinnedMeshRenderer>(true).Select(r => r.sharedMesh)).Where(m => m != null).ToArray();
        static int Triangles(GameObject instance) => Meshes(instance).Sum(mesh => Enumerable.Range(0, mesh.subMeshCount).Sum(index => (int)mesh.GetIndexCount(index) / 3));
        static void ValidateDragon(GameObject dragon, AnimationClip[] clips)
        {
            var names = dragon.GetComponentsInChildren<Transform>(true).Select(t => t.name).ToArray();
            foreach (var name in Sockets.Concat(Bones)) if (!names.Contains(name)) throw new InvalidDataException("Original dragon lost required node " + name);
            if (Triangles(dragon) != 81991) throw new InvalidDataException("Dragon triangle parity changed: " + Triangles(dragon));
            foreach (var name in new[] { "Flight", "Glide", "Boost" })
                if (!clips.Any(c => c.name == name && Mathf.Abs(c.length - 1) < .001f && !c.legacy)) throw new InvalidDataException("Expected one-second Mecanim source clip " + name);
        }
        [Serializable] sealed class SetupReceipt
        {
            public string unityVersion, scene, orbitScene, dragon, choreography, createdUtc;
            public int triangles, meshes, timelineTracks;
            public string[] sockets, bones, clips;
            public GltfEmissionParity.Evidence[] emission;
            public TimelineSample[] timelineSamples;
        }
        static SetupReceipt CreateReceipt(GameObject dragon, AnimationClip[] clips, GltfEmissionParity.Evidence[] evidence)
            => new SetupReceipt { unityVersion = Application.unityVersion, scene = ScenePath, orbitScene = OrbitScenePath, dragon = DragonPath,
                choreography = ChoreographyPath, createdUtc = DateTime.UtcNow.ToString("O"), triangles = Triangles(dragon), meshes = Meshes(dragon).Length,
                timelineTracks = 3, sockets = Sockets, bones = Bones, clips = clips.Select(c => c.name).ToArray(), emission = evidence };

        [MenuItem("Space Dragon/Launch Lab/Build local Web launch lab")]
        public static void BuildWeb() => Build(BuildTarget.WebGL, "Builds/LaunchWeb");
        [MenuItem("Space Dragon/Launch Lab/Build local Windows launch lab")]
        public static void BuildWindows() => Build(BuildTarget.StandaloneWindows64, "Builds/LaunchWindows/SpaceDragonLaunch.exe");
        static void Build(BuildTarget target, string output)
        {
            if (EditorUserBuildSettings.activeBuildTarget != target)
                throw new InvalidOperationException("Launch Editor with -buildTarget " + (target == BuildTarget.WebGL ? "WebGL" : "Win64") + " before Build.");
            Setup();
            Directory.CreateDirectory(target == BuildTarget.WebGL ? output : Path.GetDirectoryName(output));
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { ScenePath, OrbitScenePath }, target = target,
                locationPathName = output, options = BuildOptions.StrictMode });
            if (report.summary.result != BuildResult.Succeeded) throw new BuildFailedException("LaunchLab build failed: " + report.summary.result);
            File.WriteAllText((target == BuildTarget.WebGL ? output : Path.GetDirectoryName(output)) + "/build-receipt.json",
                JsonUtility.ToJson(new BuildReceipt { unityVersion = Application.unityVersion, target = target.ToString(), output = output,
                    result = report.summary.result.ToString(), bytes = report.summary.totalSize, durationSeconds = report.summary.totalTime.TotalSeconds }, true));
            Debug.Log("SPACE_DRAGON_LAUNCH_BUILD_OK " + output);
        }
        [Serializable] sealed class BuildReceipt { public string unityVersion, target, output, result; public ulong bytes; public double durationSeconds; }
    }
}
