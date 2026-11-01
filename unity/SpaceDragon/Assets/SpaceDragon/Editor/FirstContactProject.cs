using System;
using System.IO;
using System.Linq;
using SpaceDragon.FirstContact;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using Object = UnityEngine.Object;

namespace SpaceDragon.Editor
{
    /// <summary>Idempotently generates only this candidate's scene/settings. No source export edits.</summary>
    public static class FirstContactProject
    {
        public const string ScenePath = "Assets/SpaceDragon/Generated/FirstContact.unity";
        public const string PodPath = "Assets/SpaceDragon/Imported/rescue-pod-v002.glb";
        public const string Generated = "Assets/SpaceDragon/Generated";
        const string Surfaces = "Assets/SpaceDragon/Imported/Surfaces";
        const string SkyPath = "Assets/SpaceDragon/Imported/daylight.hdr";
        const string PipelinePath = Generated + "/FirstContactURP.asset";

        [MenuItem("Space Dragon/Generate First Contact candidate")]
        public static void Setup()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
                throw new InvalidOperationException("Exit Play mode before generating the candidate.");
            if (!Application.isBatchMode && !EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            EnsureFolder(Generated);
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            ConfigurePlayer();
            ConfigurePipeline();
            ConfigureTextureImports();
            // Import again after assigning URP, so glTFast selects URP materials.
            AssetDatabase.ImportAsset(PodPath, ImportAssetOptions.ForceUpdate | ImportAssetOptions.ForceSynchronousImport);
            var podPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(PodPath);
            if (podPrefab == null)
                throw new FileNotFoundException("Prepare the original pod export with tools/unity/prepare-assets.mjs before Setup. glTFast must successfully import it.", PodPath);

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var environment = new GameObject("FirstContact.Environment").transform;
            var grass = Surface("Yard grass", "grass", new Color(.72f, .79f, .66f), 12, 9);
            var wood = Surface("Home wood", "wood", new Color(.76f, .63f, .51f), 3, 2);
            var plaster = Surface("Home plaster", "plaster", new Color(.67f, .71f, .69f), 1, 1);
            var concrete = Surface("Patio concrete", "concrete", new Color(.65f, .68f, .67f), 2, 2);
            var trim = Solid("Home trim", new Color(.82f, .78f, .69f), .15f);
            var dark = Solid("Dark steel", new Color(.1f, .14f, .18f), .48f, .4f);
            var warm = Solid("Warm furniture", new Color(.8f, .67f, .5f), .38f);
            var fabric = Solid("Sofa fabric", new Color(.31f, .4f, .44f), .05f);
            var cyan = Solid("Signal cyan", new Color(.38f, .85f, .94f), .73f, .1f, new Color(.2f, 1.5f, 2.1f));
            var lamp = Solid("Lamp shade", new Color(.97f, .84f, .63f), .3f, 0, new Color(1.2f, .75f, .32f));
            Box("yard.ground", new Vector3(28, .2f, 22), new Vector3(0, -.2f, 0), grass, environment);
            Box("home.floor", new Vector3(7, .16f, 6), new Vector3(-4, 0, 0), wood, environment);
            Box("home.back-wall", new Vector3(7, .65f, .2f), new Vector3(-4, .325f, 3), plaster, environment);
            Box("home.front-wall", new Vector3(7, .65f, .2f), new Vector3(-4, .325f, -3), plaster, environment);
            Box("home.side-wall", new Vector3(.2f, .65f, 6), new Vector3(-7.5f, .325f, 0), plaster, environment);
            foreach (float z in new[] { -2f, 2f })
            {
                Box("home.yard-wall." + z, new Vector3(.2f, .65f, 2), new Vector3(-.5f, .325f, z), plaster, environment);
                Box("door.jamb." + z, new Vector3(.22f, 2.6f, .15f), new Vector3(-.5f, 1.3f, z / 2), trim, environment);
            }
            Box("door.header", new Vector3(.25f, .18f, 2.15f), new Vector3(-.5f, 2.65f, 0), trim, environment);
            Box("door.threshold", new Vector3(.55f, .04f, 1.85f), new Vector3(-.5f, .09f, 0), warm, environment);
            Box("yard.patio", new Vector3(3.2f, .08f, 3), new Vector3(1.1f, -.07f, 0), concrete, environment);
            for (int i = 0; i < 5; i++)
                Box("yard.path." + i, new Vector3(.6f, .045f, .9f), new Vector3(1.4f + i * 1.25f, -.08f, -2.7f), concrete, environment);
            Box("computer.desk", new Vector3(2.6f, .18f, 1.1f), new Vector3(-4, 1.1f, 1), warm, environment);
            foreach (float x in new[] { -5f, -3f }) Box("desk.leg." + x, new Vector3(.12f, 1.1f, .8f), new Vector3(x, .55f, 1), dark, environment);
            Box("computer.display-frame", new Vector3(1.6f, 1, .14f), new Vector3(-4, 1.8f, 1.3f), dark, environment);
            Box("computer.signal-screen", new Vector3(1.4f, .8f, .03f), new Vector3(-4, 1.8f, 1.21f), cyan, environment);
            Box("computer.stand", new Vector3(.16f, .45f, .18f), new Vector3(-4, 1.3f, 1.3f), dark, environment);
            Box("computer.keyboard", new Vector3(1, .06f, .35f), new Vector3(-4, 1.23f, .7f), dark, environment);
            Box("home.sofa", new Vector3(2.8f, .6f, 1.1f), new Vector3(-4.6f, .4f, -1.8f), fabric, environment);
            Box("home.sofa-back", new Vector3(2.8f, .9f, .28f), new Vector3(-4.6f, .8f, -2.22f), fabric, environment);
            foreach (float x in new[] { -5.85f, -3.35f }) Box("home.sofa-arm." + x, new Vector3(.22f, .4f, 1.05f), new Vector3(x, .8f, -1.8f), fabric, environment);
            foreach (float x in new[] { -5.2f, -4.1f }) Box("home.sofa-cushion." + x, new Vector3(.72f, .12f, .7f), new Vector3(x, .73f, -1.62f), trim, environment);
            foreach (float z in new[] { -5.2f, 5.2f })
            {
                for (int i = 0; i < 15; i++) Box("fence." + z + "." + i, new Vector3(.59f, 1.4f, .12f), new Vector3(i * .69f, .6f, z), plaster, environment);
                foreach (float y in new[] { .3f, 1f }) Box("fence.rail." + z + "." + y, new Vector3(10.7f, .12f, .15f), new Vector3(4.7f, y, z), trim, environment);
            }
            for (int i = 0; i < 15; i++) Box("fence.east." + i, new Vector3(.12f, 1.4f, .59f), new Vector3(10, .6f, -4.8f + i * .69f), plaster, environment);
            foreach (float z in new[] { -4.1f, 4.1f }) Box("fence.west." + z, new Vector3(.12f, 1.4f, 2.15f), new Vector3(-.5f, .6f, z), plaster, environment);
            Box("garage.background", new Vector3(4, 3.4f, 2.8f), new Vector3(7.7f, 1.6f, 7.1f), plaster, environment);
            Box("garage.door", new Vector3(3, 2.5f, .06f), new Vector3(7.7f, 1.16f, 5.66f), trim, environment);
            for (int i = 0; i < 7; i++) Box("garage.door-slat." + i, new Vector3(3, .025f, .075f), new Vector3(7.7f, .15f + i * .36f, 5.62f), plaster, environment);
            Box("garage.roof", new Vector3(4.5f, .2f, 3.3f), new Vector3(7.7f, 3.36f, 7.1f), dark, environment);
            Box("home.practical-lamp", new Vector3(.38f, .3f, .38f), new Vector3(-3.6f, 2.7f, -1.1f), lamp, environment);
            Box("home.lamp-stem", new Vector3(.05f, 2.4f, .05f), new Vector3(-3.6f, 1.2f, -1.1f), dark, environment);

            var pod = (GameObject)PrefabUtility.InstantiatePrefab(podPrefab);
            pod.name = "RescuePod.v002.same-original-export";
            pod.transform.position = new Vector3(3.5f, -.09f, 0);
            var emissionCorrections = PodMaterialParity.Apply(pod, PodPath, Generated);
            var lid = pod.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "hinge_pod_lid");
            if (lid == null) throw new InvalidDataException("Imported pod lost required hinge_pod_lid node.");
            var clip = AssetDatabase.LoadAllAssetsAtPath(PodPath).OfType<AnimationClip>().FirstOrDefault(c => c.name == "pod_open");
            if (clip == null) throw new InvalidDataException("Imported pod lost required pod_open animation clip.");
            foreach (var animation in pod.GetComponentsInChildren<Animation>(true)) { animation.playAutomatically = false; animation.Stop(); }
            var body = new GameObject("pod.collision-proxy");
            body.transform.SetParent(pod.transform, false);
            var podCollider = body.AddComponent<BoxCollider>();
            podCollider.center = new Vector3(0, .6f, 0);
            podCollider.size = new Vector3(2.13f, 1.2f, 1.285f);

            var player = new GameObject("Player.proxy-no-family-likeness");
            player.transform.position = new Vector3(-2, .1f, -1.5f);
            var controller = player.AddComponent<CharacterController>();
            controller.height = 1.8f;
            controller.radius = .25f;
            controller.center = new Vector3(0, .9f, 0);
            controller.stepOffset = .22f;
            controller.slopeLimit = 45;
            controller.skinWidth = .025f;
            var capsule = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            capsule.name = "Capsule avatar (provisional)";
            capsule.transform.SetParent(player.transform, false);
            capsule.transform.localPosition = new Vector3(0, .9f, 0);
            capsule.transform.localScale = new Vector3(.5f, .9f, .5f);
            Object.DestroyImmediate(capsule.GetComponent<Collider>());
            capsule.GetComponent<Renderer>().sharedMaterial = Solid("Proxy suit", new Color(.64f, .71f, .71f), .4f, .15f);
            var camera = new GameObject("Main Camera").AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.nearClipPlane = .045f;
            camera.farClipPlane = 80;
            camera.fieldOfView = 45.8366f; // Babylon default vertical FOV 0.8 radians.
            camera.allowHDR = true;
            camera.backgroundColor = new Color(.018f, .032f, .053f);
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.transform.position = new Vector3(5.654f, 4.583f, -5.679f);
            camera.transform.LookAt(new Vector3(3.5f, 1.1f, 0));
            camera.gameObject.AddComponent<AudioListener>();
            var cameraData = camera.GetUniversalAdditionalCameraData();
            cameraData.renderPostProcessing = true;
            cameraData.antialiasing = AntialiasingMode.FastApproximateAntialiasing;
            var reflection = ConfigureLighting();
            var experience = new GameObject("FirstContactCandidate").AddComponent<FirstContactExperience>();
            experience.Configure(controller, pod.transform, lid, camera, pod.GetComponentInChildren<Animator>(), clip);
            experience.ConfigureReflectionProbe(reflection);

            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, ScenePath)) throw new IOException("Failed to save generated scene.");
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            WriteSetupReceipt(pod, clip, emissionCorrections);
            Debug.Log("SPACE_DRAGON_SETUP_OK " + ScenePath);
        }

        static void ConfigurePlayer()
        {
            PlayerSettings.companyName = "Space Dragon";
            PlayerSettings.productName = "Space Dragon Unity Candidate";
            PlayerSettings.bundleVersion = "0.1.0";
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.defaultScreenWidth = 1366;
            PlayerSettings.defaultScreenHeight = 768;
            PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
            PlayerSettings.runInBackground = false;
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.WebGL, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL, new[] { GraphicsDeviceType.WebGPU, GraphicsDeviceType.OpenGLES3 });
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.StandaloneWindows64, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.StandaloneWindows64, new[] { GraphicsDeviceType.Direct3D11 });
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Standalone, ScriptingImplementation.Mono2x);
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
            PlayerSettings.WebGL.template = "PROJECT:SpaceDragon";
            PlayerSettings.WebGL.initialMemorySize = 128;
            PlayerSettings.WebGL.maximumMemorySize = 512;
            // Unity exposes this only as a serialized setting. Validate the actual property.
            var playerSettings = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset")[0]);
            var input = playerSettings.FindProperty("activeInputHandler");
            if (input == null) throw new InvalidOperationException("Installed Editor changed activeInputHandler; inspect Player settings before proceeding.");
            input.intValue = 1; // Input System package only; runtime does not use the old Input Manager.
            playerSettings.ApplyModifiedPropertiesWithoutUndo();
            QualitySettings.vSyncCount = 0;
            QualitySettings.shadowDistance = 35;
            QualitySettings.realtimeReflectionProbes = true;
            EditorSettings.serializationMode = SerializationMode.ForceText;
        }

        static void ConfigurePipeline()
        {
            var rendererPath = Generated + "/FirstContactRenderer.asset";
            var renderer = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(rendererPath);
            if (renderer == null) { renderer = ScriptableObject.CreateInstance<UniversalRendererData>(); AssetDatabase.CreateAsset(renderer, rendererPath); }
            renderer.postProcessData = AssetDatabase.LoadAssetAtPath<PostProcessData>("Packages/com.unity.render-pipelines.universal/Runtime/Data/PostProcessData.asset");
            if (renderer.postProcessData == null) throw new InvalidDataException("Pinned URP package did not provide PostProcessData.asset.");
            var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelinePath);
            if (pipeline == null) { pipeline = UniversalRenderPipelineAsset.Create(renderer); AssetDatabase.CreateAsset(pipeline, PipelinePath); }
            pipeline.renderScale = 1;
            pipeline.msaaSampleCount = 1;
            pipeline.supportsHDR = true;
            pipeline.mainLightShadowmapResolution = 1024;
            pipeline.shadowDistance = 35;
            pipeline.shadowCascadeCount = 2;
            // These URP inspector settings have internal C# setters. Use their verified
            // serialized fields and fail explicitly if an Editor upgrade changes them.
            var pipelineSettings = new SerializedObject(pipeline);
            RequiredProperty(pipelineSettings, "m_MainLightShadowsSupported").boolValue = true;
            RequiredProperty(pipelineSettings, "m_AdditionalLightShadowsSupported").boolValue = false;
            RequiredProperty(pipelineSettings, "m_SoftShadowsSupported").boolValue = true;
            RequiredProperty(pipelineSettings, "m_AdditionalLightsRenderingMode").intValue = (int)LightRenderingMode.PerPixel;
            var anyShadows = pipelineSettings.FindProperty("m_AnyShadowsSupported");
            if (anyShadows != null) anyShadows.boolValue = true;
            pipelineSettings.ApplyModifiedPropertiesWithoutUndo();
            pipeline.maxAdditionalLightsCount = 4;
            pipeline.useSRPBatcher = true;
            GraphicsSettings.defaultRenderPipeline = pipeline;
            QualitySettings.renderPipeline = pipeline;
            EditorUtility.SetDirty(renderer);
            EditorUtility.SetDirty(pipeline);
        }

        static SerializedProperty RequiredProperty(SerializedObject target, string name)
        {
            var value = target.FindProperty(name);
            if (value == null) throw new InvalidOperationException("Installed package changed required setting " + name + "; inspect the matching package before regenerating.");
            return value;
        }

        static void ConfigureTextureImports()
        {
            foreach (var path in Directory.GetFiles(Surfaces, "*.png"))
            {
                var relative = path.Replace('\\', '/');
                var importer = AssetImporter.GetAtPath(relative) as TextureImporter;
                if (importer == null) throw new InvalidDataException("Missing TextureImporter for " + relative);
                bool normal = relative.EndsWith("-normal.png", StringComparison.Ordinal);
                importer.textureType = normal ? TextureImporterType.NormalMap : TextureImporterType.Default;
                importer.sRGBTexture = relative.EndsWith("-albedo.png", StringComparison.Ordinal);
                importer.mipmapEnabled = true;
                importer.wrapMode = TextureWrapMode.Repeat;
                importer.anisoLevel = 4;
                importer.maxTextureSize = 1024;
                importer.alphaSource = TextureImporterAlphaSource.FromInput;
                importer.SaveAndReimport();
            }
            var skyImporter = AssetImporter.GetAtPath(SkyPath) as TextureImporter;
            if (skyImporter == null) throw new FileNotFoundException("Prepare the same source HDR used by Babylon.", SkyPath);
            skyImporter.textureShape = TextureImporterShape.TextureCube;
            skyImporter.generateCubemap = TextureImporterGenerateCubemap.AutoCubemap;
            var skySettings = new TextureImporterSettings();
            skyImporter.ReadTextureSettings(skySettings);
            skySettings.cubemapConvolution = TextureImporterCubemapConvolution.Specular;
            skyImporter.SetTextureSettings(skySettings);
            skyImporter.sRGBTexture = false;
            skyImporter.mipmapEnabled = true;
            skyImporter.maxTextureSize = 512;
            skyImporter.SaveAndReimport();
        }

        static ReflectionProbe ConfigureLighting()
        {
            var moon = new GameObject("moon.key").AddComponent<Light>();
            moon.type = LightType.Directional;
            moon.transform.rotation = Quaternion.LookRotation(new Vector3(-.4f, -1, .3f));
            moon.color = new Color(.7f, .82f, 1);
            moon.intensity = 1.1f;
            moon.shadows = LightShadows.Soft;
            moon.shadowBias = .035f;
            moon.shadowNormalBias = .12f;
            RenderSettings.sun = moon;
            PointLight("arrival.light", new Vector3(3.5f, 1.4f, -.6f), new Color(.18f, .7f, 1), 8, 8);
            PointLight("home.light", new Vector3(-3.6f, 2.8f, -1.1f), new Color(1, .67f, .36f), 22, 9);
            var cube = AssetDatabase.LoadAssetAtPath<Cubemap>(SkyPath);
            if (cube == null) throw new InvalidDataException("HDR cube import failed: " + SkyPath);
            var sky = SolidSky(cube);
            RenderSettings.skybox = sky;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(.12f, .16f, .24f);
            RenderSettings.ambientEquatorColor = new Color(.055f, .075f, .1f);
            RenderSettings.ambientGroundColor = new Color(.025f, .03f, .035f);
            RenderSettings.defaultReflectionMode = DefaultReflectionMode.Custom;
            RenderSettings.customReflectionTexture = cube;
            RenderSettings.reflectionIntensity = .32f;
            // A customReflectionTexture would ignore the skybox's rotation. Capture
            // the rotated sky once, excluding scene geometry so both renderers use
            // the same source-only environment. Runtime records its completion ID.
            var reflection = new GameObject("HomeNight.rotated-sky-reflection").AddComponent<ReflectionProbe>();
            reflection.transform.position = new Vector3(3.5f, 1.5f, 0);
            reflection.mode = ReflectionProbeMode.Realtime;
            reflection.refreshMode = ReflectionProbeRefreshMode.ViaScripting;
            reflection.timeSlicingMode = ReflectionProbeTimeSlicingMode.NoTimeSlicing;
            reflection.resolution = 512;
            reflection.hdr = true;
            reflection.cullingMask = 0;
            reflection.clearFlags = ReflectionProbeClearFlags.Skybox;
            reflection.size = new Vector3(100, 100, 100);
            reflection.blendDistance = 0;
            reflection.boxProjection = false;
            reflection.intensity = 1; // Skybox exposure already applies the 0.32 night level.
            reflection.nearClipPlane = .05f;
            reflection.farClipPlane = 80;
            reflection.importance = 100;
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = 11;
            RenderSettings.fogEndDistance = 38;
            RenderSettings.fogColor = new Color(.025f, .048f, .07f);
            var profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(Generated + "/HomeNight.asset");
            if (profile == null) { profile = ScriptableObject.CreateInstance<VolumeProfile>(); AssetDatabase.CreateAsset(profile, Generated + "/HomeNight.asset"); }
            var tone = GetVolume<Tonemapping>(profile);
            tone.mode.Override(TonemappingMode.ACES);
            var color = GetVolume<ColorAdjustments>(profile);
            color.postExposure.Override(.505f);
            color.contrast.Override(12);
            var bloom = GetVolume<Bloom>(profile);
            bloom.threshold.Override(1.1f);
            bloom.intensity.Override(.15f);
            bloom.scatter.Override(.5f);
            var volume = new GameObject("HomeNight.graded-volume").AddComponent<Volume>();
            volume.isGlobal = true;
            volume.sharedProfile = profile;
            EditorUtility.SetDirty(profile);
            return reflection;
        }

        static T GetVolume<T>(VolumeProfile profile) where T : VolumeComponent
        {
            if (profile.TryGet<T>(out var component)) return component;
            component = profile.Add<T>(true);
            AssetDatabase.AddObjectToAsset(component, profile);
            return component;
        }

        static Material SolidSky(Cubemap cube)
        {
            var path = Generated + "/ReferenceSky.mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null) { material = new Material(Shader.Find("Skybox/Cubemap")); AssetDatabase.CreateAsset(material, path); }
            material.SetTexture("_Tex", cube);
            material.SetFloat("_Exposure", .32f);
            material.SetFloat("_Rotation", 270);
            EditorUtility.SetDirty(material);
            return material;
        }

        static Material Solid(string name, Color color, float smoothness, float metallic = 0, Color? emission = null)
        {
            var path = Generated + "/" + name.Replace(' ', '-') + ".mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                var shader = Shader.Find("Universal Render Pipeline/Lit");
                if (shader == null) throw new InvalidOperationException("URP/Lit shader is missing; resolve the pinned URP package.");
                material = new Material(shader);
                AssetDatabase.CreateAsset(material, path);
            }
            material.SetColor("_BaseColor", color);
            material.SetFloat("_Smoothness", smoothness);
            material.SetFloat("_Metallic", metallic);
            if (emission.HasValue)
            {
                material.EnableKeyword("_EMISSION");
                material.SetColor("_EmissionColor", emission.Value);
                material.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive;
            }
            EditorUtility.SetDirty(material);
            return material;
        }

        static Material Surface(string name, string source, Color tint, float repeatU, float repeatV)
        {
            var material = Solid(name, tint, 1);
            Texture2D Load(string channel)
            {
                var path = Surfaces + "/" + source + "-" + channel + ".png";
                var texture = AssetDatabase.LoadAssetAtPath<Texture2D>(path);
                if (texture == null) throw new FileNotFoundException("Missing prepared surface channel.", path);
                return texture;
            }
            material.SetTexture("_BaseMap", Load("albedo"));
            material.SetTexture("_BumpMap", Load("normal"));
            material.SetTexture("_MetallicGlossMap", Load("metallic-smoothness"));
            material.SetFloat("_BumpScale", .35f);
            material.EnableKeyword("_NORMALMAP");
            material.EnableKeyword("_METALLICSPECGLOSSMAP");
            foreach (var property in new[] { "_BaseMap", "_BumpMap", "_MetallicGlossMap" }) material.SetTextureScale(property, new Vector2(repeatU, repeatV));
            EditorUtility.SetDirty(material);
            return material;
        }

        static GameObject Box(string name, Vector3 size, Vector3 position, Material material, Transform parent)
        {
            var box = GameObject.CreatePrimitive(PrimitiveType.Cube);
            box.name = name;
            box.transform.SetParent(parent, false);
            box.transform.position = position;
            box.transform.localScale = size;
            box.GetComponent<Renderer>().sharedMaterial = material;
            GameObjectUtility.SetStaticEditorFlags(box, StaticEditorFlags.BatchingStatic | StaticEditorFlags.ReflectionProbeStatic);
            return box;
        }

        static void PointLight(string name, Vector3 position, Color color, float intensity, float range)
        {
            var light = new GameObject(name).AddComponent<Light>();
            light.type = LightType.Point;
            light.transform.position = position;
            light.color = color;
            light.intensity = intensity;
            light.range = range;
            light.shadows = LightShadows.None;
        }

        static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            var parent = Path.GetDirectoryName(path).Replace('\\', '/');
            EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent, Path.GetFileName(path));
        }

        [Serializable] class SetupEvidence
        {
            public string unityVersion, scene, podAsset, animation, createdUtc;
            public int meshCount, triangles;
            public string[] graphicsAPIs, requiredNodes;
            public PodEmissionEvidence[] emissionCorrections;
        }
        static void WriteSetupReceipt(GameObject pod, AnimationClip clip, PodEmissionEvidence[] emissionCorrections)
        {
            var meshes = pod.GetComponentsInChildren<MeshFilter>(true);
            var requiredNodes = new[] { "pod_root", "hinge_pod_lid", "pod_lid" };
            var nodeNames = pod.GetComponentsInChildren<Transform>(true).Select(t => t.name).ToArray();
            foreach (var node in requiredNodes)
                if (!nodeNames.Contains(node)) throw new InvalidDataException("Imported pod lost required node " + node);
            int triangles = meshes.Sum(m => m.sharedMesh == null ? 0 : Enumerable.Range(0, m.sharedMesh.subMeshCount).Sum(index => (int)m.sharedMesh.GetIndexCount(index) / 3));
            if (triangles != 6376) throw new InvalidDataException("Pod triangle identity changed: expected 6376, imported " + triangles);
            var evidence = new SetupEvidence { unityVersion = Application.unityVersion, scene = ScenePath, podAsset = PodPath,
                animation = clip.name, createdUtc = DateTime.UtcNow.ToString("O"), meshCount = meshes.Length,
                triangles = triangles,
                graphicsAPIs = PlayerSettings.GetGraphicsAPIs(BuildTarget.WebGL).Select(a => a.ToString()).ToArray(),
                requiredNodes = requiredNodes, emissionCorrections = emissionCorrections };
            Directory.CreateDirectory("Builds");
            File.WriteAllText("Builds/setup-receipt.json", JsonUtility.ToJson(evidence, true));
        }

        [MenuItem("Space Dragon/Build local Web candidate")]
        public static void BuildWeb() => Build(BuildTarget.WebGL, "Builds/Web");
        [MenuItem("Space Dragon/Build local Windows candidate")]
        public static void BuildWindows() => Build(BuildTarget.StandaloneWindows64, "Builds/Windows/SpaceDragon.exe");

        static void Build(BuildTarget target, string output)
        {
            if (EditorUserBuildSettings.activeBuildTarget != target)
                throw new InvalidOperationException("Launch Unity with -buildTarget " + (target == BuildTarget.WebGL ? "WebGL" : "Win64") + " before this entry point; no mid-method domain reload is permitted.");
            Setup();
            Directory.CreateDirectory(target == BuildTarget.WebGL ? output : Path.GetDirectoryName(output));
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { ScenePath }, target = target,
                locationPathName = output, options = BuildOptions.StrictMode });
            if (report.summary.result != BuildResult.Succeeded)
                throw new BuildFailedException("Space Dragon " + target + " build failed: " + report.summary.result);
            File.WriteAllText((target == BuildTarget.WebGL ? output : Path.GetDirectoryName(output)) + "/build-receipt.json",
                JsonUtility.ToJson(new BuildEvidence { unityVersion = Application.unityVersion, target = target.ToString(),
                    output = output, bytes = report.summary.totalSize, durationSeconds = report.summary.totalTime.TotalSeconds,
                    result = report.summary.result.ToString() }, true));
            Debug.Log("SPACE_DRAGON_BUILD_OK " + output);
        }
        [Serializable] class BuildEvidence
        {
            public string unityVersion, target, output, result;
            public ulong bytes;
            public double durationSeconds;
        }
    }
}
