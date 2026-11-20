using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using SpaceDragon.Traversal;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using Object = UnityEngine.Object;

namespace SpaceDragon.Playground.Editor
{
    /// <summary>
    /// Idempotently generates the Luke's Playground scene and only its own assets under
    /// Playground/Generated. The level comes from LukePlaygroundData (exported from TypeScript),
    /// so what is drawn always matches what the hero collides with. Shared First Contact,
    /// Dogfight and Town Drive assets and settings are read, never edited.
    /// </summary>
    public static partial class LukePlaygroundProject
    {
        public const string Root = "Assets/SpaceDragon/Playground";
        public const string Generated = Root + "/Generated";
        public const string MaterialFolder = Generated + "/Materials";
        public const string ScenePath = Generated + "/LukePlayground.unity";
        public const string Characters = Root + "/Imported/Characters";
        public const string HeroPath = Characters + "/playground-kid.gltf";
        public const string PipelinePath = Generated + "/PlaygroundURP.asset";
        public const string RendererPath = Generated + "/PlaygroundRenderer.asset";
        public const string ClipLibraryPath = Generated + "/PlaygroundKidClips.asset";
        public const string ReceiptPath = "Builds/playground-setup-receipt.json";
        const string BasePipelinePath = "Assets/SpaceDragon/Generated/FirstContactURP.asset";
        const string Surfaces = "Assets/SpaceDragon/Imported/Surfaces";
        const string SkyPath = "Assets/SpaceDragon/Imported/daylight.hdr";
        const string PodPath = "Assets/SpaceDragon/Imported/rescue-pod-v002.glb";
        const float ExpectedHeroHeight = 1.4328f;

        [Serializable]
        class SetupEvidence
        {
            public string unityVersion, scene, world, sourceFingerprint, heroAsset, createdUtc;
            public int solids, anchors, sparks, lights, heroBones, heroBlendShapes, heroRenderers;
            public float heroHeight, heroScale;
            public bool heroTurnedToFaceForward, heroLeftIsOnTheLeft, podAssetUsed, skyAssetUsed;
            public string[] clips;
            public int[] clipFrames;
            public string[] notes;
        }

        [MenuItem("Space Dragon/Luke's Playground/Generate scene")]
        public static void Setup()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode) throw new InvalidOperationException("Exit Play mode before generating Luke's Playground.");
            if (!Application.isBatchMode && !EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            Folder(Generated); Folder(MaterialFolder);
            var notes = new List<string>();
            var pipeline = PreparePipeline();
            using var pipelineScope = new PipelineScope(pipeline, notes);
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);

            ConfigureHeroTextures();
            var heroPrefab = ImportHero(notes);
            var clips = AssetDatabase.LoadAllAssetsAtPath(HeroPath).OfType<AnimationClip>()
                .Where(clip => !clip.name.StartsWith("__preview__", StringComparison.Ordinal)).ToArray();

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var world = LukePlaygroundData.Create();
            var evidence = new SetupEvidence
            {
                unityVersion = Application.unityVersion, scene = ScenePath, world = world.id, sourceFingerprint = LukePlaygroundData.SourceFingerprint,
                heroAsset = HeroPath, createdUtc = DateTime.UtcNow.ToString("O"), solids = world.solids.Length, anchors = world.anchors.Length, sparks = world.sparks.Length,
            };

            var palette = new Palette();
            var worldRoot = new GameObject("Playground.world");
            BuildGround(worldRoot.transform, palette);
            BuildSolids(world, worldRoot.transform, palette, evidence);
            BuildScenery(worldRoot.transform, palette);
            BuildPlayset(worldRoot.transform, palette);
            BuildInterior(worldRoot.transform, palette);
            evidence.skyAssetUsed = BuildLighting(palette);

            var hero = BuildHero(heroPrefab, clips, evidence, notes);
            var camera = BuildCamera();
            BuildGameplay(world, hero, camera, pipeline, palette);

            evidence.lights = lightCount + 2; // point lights drawn above, plus the moon and the camera fill
            evidence.notes = notes.ToArray();
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, ScenePath)) throw new IOException("Failed to save the generated Luke's Playground scene.");
            AssetDatabase.SaveAssets();
            Directory.CreateDirectory("Builds");
            File.WriteAllText(ReceiptPath, JsonUtility.ToJson(evidence, true));
            Debug.Log("SPACE_DRAGON_PLAYGROUND_SETUP_OK " + ScenePath + " hero=" + evidence.heroBones + " bones, " + evidence.heroHeight.ToString("0.00") + " m");
        }

        // ---------- Render pipeline: a private clone of the shared base, never the base itself ----------
        static UniversalRenderPipelineAsset PreparePipeline()
        {
            var source = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(BasePipelinePath)
                ?? throw new FileNotFoundException("The existing URP foundation asset is missing. Generate First Contact once first.", BasePipelinePath);
            var sourceRenderers = Required(new SerializedObject(source), "m_RendererDataList");
            if (sourceRenderers.arraySize < 1 || !(sourceRenderers.GetArrayElementAtIndex(0).objectReferenceValue is UniversalRendererData rendererSource))
                throw new InvalidDataException("Expected a Universal renderer in the base pipeline.");

            var renderer = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(RendererPath);
            if (renderer == null) { renderer = Object.Instantiate(rendererSource); AssetDatabase.CreateAsset(renderer, RendererPath); }
            else EditorUtility.CopySerialized(rendererSource, renderer);
            renderer.name = "PlaygroundRenderer";
            EditorUtility.SetDirty(renderer);

            var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelinePath);
            if (pipeline == null) { pipeline = Object.Instantiate(source); AssetDatabase.CreateAsset(pipeline, PipelinePath); }
            else EditorUtility.CopySerialized(source, pipeline);
            pipeline.name = "PlaygroundURP";
            var settings = new SerializedObject(pipeline);
            var renderers = Required(settings, "m_RendererDataList");
            renderers.arraySize = 1;
            renderers.GetArrayElementAtIndex(0).objectReferenceValue = renderer;
            Required(settings, "m_DefaultRendererIndex").intValue = 0;
            settings.ApplyModifiedPropertiesWithoutUndo();
            pipeline.shadowDistance = 70;
            pipeline.mainLightShadowmapResolution = 4096;
            pipeline.shadowCascadeCount = 4;
            pipeline.msaaSampleCount = 4;
            pipeline.supportsHDR = true;
            pipeline.maxAdditionalLightsCount = 8;
            EditorUtility.SetDirty(pipeline);
            return pipeline;
        }

        static SerializedProperty Required(SerializedObject target, string name)
        {
            return target.FindProperty(name) ?? throw new InvalidOperationException("Installed package changed required setting " + name + "; inspect the matching package before regenerating.");
        }

        /// <summary>Makes the playground pipeline current while assets import, then puts back what was there.</summary>
        sealed class PipelineScope : IDisposable
        {
            readonly RenderPipelineAsset pipeline, previousDefault, previousQuality;
            readonly List<string> notes;
            bool disposed;
            public PipelineScope(RenderPipelineAsset owned, List<string> log)
            {
                pipeline = owned ?? throw new ArgumentNullException(nameof(owned));
                notes = log;
                previousDefault = GraphicsSettings.defaultRenderPipeline;
                previousQuality = QualitySettings.renderPipeline;
                GraphicsSettings.defaultRenderPipeline = pipeline;
                QualitySettings.renderPipeline = pipeline;
                ResetGltfPipelineCaches(notes);
            }
            public void Dispose()
            {
                if (disposed) return;
                disposed = true;
                // Restore only values still owned by this scope.
                if (QualitySettings.renderPipeline == pipeline) QualitySettings.renderPipeline = previousQuality;
                if (GraphicsSettings.defaultRenderPipeline == pipeline) GraphicsSettings.defaultRenderPipeline = previousDefault;
                ResetGltfPipelineCaches(notes);
            }
        }

        /// <summary>
        /// The pinned glTFast caches which render pipeline it saw first. Its own load-reset hooks
        /// clear that. The hero's materials are replaced below, so a missing hook is only noted.
        /// </summary>
        static void ResetGltfPipelineCaches(List<string> notes)
        {
            foreach (string typeName in new[] { "GLTFast.RenderPipelineUtils", "GLTFast.Materials.MaterialGenerator" })
            {
                Type type = AppDomain.CurrentDomain.GetAssemblies().Select(assembly => assembly.GetType(typeName, false)).FirstOrDefault(found => found != null);
                MethodInfo method = type == null ? null : type.GetMethod("ResetStaticsOnLoad", BindingFlags.Static | BindingFlags.NonPublic);
                if (method == null) { string note = "glTFast cache reset hook not found: " + typeName; if (!notes.Contains(note)) notes.Add(note); continue; }
                method.Invoke(null, null);
            }
        }

        // ---------- Hero import ----------
        static void ConfigureHeroTextures()
        {
            foreach (var file in Directory.GetFiles(Characters, "*.png"))
            {
                string path = file.Replace('\\', '/');
                var importer = AssetImporter.GetAtPath(path) as TextureImporter;
                if (importer == null) throw new InvalidDataException("Missing TextureImporter for " + path);
                bool normal = path.EndsWith("-normal.png", StringComparison.Ordinal);
                bool color = path.EndsWith("-color.png", StringComparison.Ordinal);
                importer.textureType = normal ? TextureImporterType.NormalMap : TextureImporterType.Default;
                importer.sRGBTexture = color;
                importer.mipmapEnabled = true;
                importer.wrapMode = TextureWrapMode.Repeat;
                importer.anisoLevel = 8;
                importer.maxTextureSize = 2048;
                importer.alphaSource = TextureImporterAlphaSource.FromInput;
                importer.textureCompression = TextureImporterCompression.CompressedHQ;
                importer.SaveAndReimport();
            }
        }

        static GameObject ImportHero(List<string> notes)
        {
            if (!File.Exists(HeroPath)) throw new FileNotFoundException("The hero model is missing. Run node tools/prepare-playground-hero.mjs.", HeroPath);
            AssetDatabase.ImportAsset(HeroPath, ImportAssetOptions.ForceSynchronousImport);
            var importer = AssetImporter.GetAtPath(HeroPath);
            if (importer == null || !importer.GetType().FullName.Contains("GLTFast"))
                throw new InvalidDataException("The pinned glTFast importer did not claim " + HeroPath);
            // The committed .meta already carries these; assert them so a regenerated .meta cannot drift.
            var settings = new SerializedObject(importer);
            void Set(string name, Action<SerializedProperty> apply)
            {
                var property = settings.FindProperty(name);
                if (property == null) { notes.Add("glTFast import setting not found: " + name); return; }
                apply(property);
            }
            Set("importSettings.animationMethod", property => property.intValue = 2); // Mecanim clips
            Set("importSettings.nodeNameMethod", property => property.intValue = 1);  // original names
            Set("importSettings.generateMipMaps", property => property.boolValue = true);
            Set("instantiationSettings.sceneObjectCreation", property =>
            {
                int always = Array.IndexOf(property.enumNames, "Always");
                if (always >= 0) property.enumValueIndex = always;
            });
            if (settings.ApplyModifiedPropertiesWithoutUndo()) importer.SaveAndReimport();
            return AssetDatabase.LoadAssetAtPath<GameObject>(HeroPath) ?? throw new InvalidDataException("glTFast did not produce a prefab for " + HeroPath);
        }

        static Material HeroMaterial(string part)
        {
            var material = Lit("PlaygroundKid-" + part, Color.white, 1);
            Texture2D Load(string channel)
            {
                string path = Characters + "/playground-kid-" + part + "-" + channel + ".png";
                return AssetDatabase.LoadAssetAtPath<Texture2D>(path) ?? throw new FileNotFoundException("Missing hero texture.", path);
            }
            material.SetTexture("_BaseMap", Load("color"));
            material.SetTexture("_BumpMap", Load("normal"));
            material.SetTexture("_MetallicGlossMap", Load("metallic-smoothness"));
            material.SetFloat("_BumpScale", 1);
            material.SetFloat("_Smoothness", part == "head" ? 0.92f : 0.85f);
            material.EnableKeyword("_NORMALMAP");
            material.EnableKeyword("_METALLICSPECGLOSSMAP");
            EditorUtility.SetDirty(material);
            return material;
        }

        static PersonAvatar BuildHero(GameObject prefab, AnimationClip[] clips, SetupEvidence evidence, List<string> notes)
        {
            var root = new GameObject("PlaygroundKid");
            var body = new GameObject("PlaygroundKid.body");
            body.transform.SetParent(root.transform, false);
            var instance = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
            instance.name = "PlaygroundKid.model";
            // Plain objects from here on: the scene owns its materials and pose.
            PrefabUtility.UnpackPrefabInstance(instance, PrefabUnpackMode.Completely, InteractionMode.AutomatedAction);
            instance.transform.SetParent(body.transform, false);
            // The baked loops drive the bones directly; importer playback components would fight them.
            foreach (var animator in instance.GetComponentsInChildren<Animator>(true)) Object.DestroyImmediate(animator);
            foreach (var legacy in instance.GetComponentsInChildren<Animation>(true)) Object.DestroyImmediate(legacy);

            var library = BakeClips(instance, clips, evidence, out Transform model);

            var named = new Dictionary<string, Transform>(StringComparer.Ordinal);
            foreach (var node in instance.GetComponentsInChildren<Transform>(true)) if (!named.ContainsKey(node.name)) named.Add(node.name, node);
            // Face +z: the toe is ahead of the ankle.
            if (named.TryGetValue("Bip01 L Foot", out var foot) && named.TryGetValue("Bip01 L Toe0", out var toe))
            {
                Vector3 ahead = toe.position - foot.position; ahead.y = 0;
                if (ahead.sqrMagnitude > 1e-6f && Vector3.Dot(ahead.normalized, Vector3.forward) < 0)
                {
                    instance.transform.localRotation = Quaternion.Euler(0, 180, 0);
                    evidence.heroTurnedToFaceForward = true;
                }
            }
            else notes.Add("Could not check which way the hero faces: foot joints not found.");
            if (named.TryGetValue("Bip01 L Thigh", out var leftThigh) && named.TryGetValue("Bip01 R Thigh", out var rightThigh))
            {
                evidence.heroLeftIsOnTheLeft = leftThigh.position.x < rightThigh.position.x;
                if (!evidence.heroLeftIsOnTheLeft) notes.Add("The hero rig appears mirrored: left thigh is on the +x side.");
            }

            var skins = instance.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            if (skins.Length == 0) throw new InvalidDataException("The imported hero has no skinned mesh.");
            var materials = new Dictionary<string, Material> { { "body", HeroMaterial("body") }, { "head", HeroMaterial("head") } };
            var bounds = new Bounds();
            bool hasBounds = false;
            foreach (var skin in skins)
            {
                var slots = skin.sharedMaterials;
                for (int index = 0; index < slots.Length; index++)
                {
                    string slotName = slots[index] == null ? "" : slots[index].name.ToLowerInvariant();
                    string part = slotName.Contains("head") ? "head" : slotName.Contains("body") ? "body" : index == 1 ? "head" : "body";
                    slots[index] = materials[part];
                }
                skin.sharedMaterials = slots;
                // Measure the rest pose before bounds start following the animated pose.
                if (!hasBounds) { bounds = skin.bounds; hasBounds = true; } else bounds.Encapsulate(skin.bounds);
                skin.updateWhenOffscreen = true; // Procedural poses move the body outside its import-time bounds.
                skin.shadowCastingMode = ShadowCastingMode.On;
                skin.receiveShadows = true;
                skin.quality = SkinQuality.Bone4;
                if (skin.sharedMesh != null) evidence.heroBlendShapes = Mathf.Max(evidence.heroBlendShapes, skin.sharedMesh.blendShapeCount);
            }
            evidence.heroRenderers = skins.Length;
            evidence.heroHeight = bounds.size.y;
            evidence.heroScale = instance.transform.lossyScale.y;
            // The export is in metres and is used as imported. A surprising size is reported, never silently rescaled.
            if (bounds.size.y < ExpectedHeroHeight * 0.8f || bounds.size.y > ExpectedHeroHeight * 1.25f)
                notes.Add("Hero rest-pose height measured " + bounds.size.y.ToString("0.###") + " m; expected about " + ExpectedHeroHeight + " m. Check the import before a visual review.");

            var avatar = root.AddComponent<PersonAvatar>();
            avatar.Configure(library, body.transform, model, skins);
            if (!avatar.Bind()) throw new InvalidDataException("The hero rig could not be bound; see the Console for the missing bone.");
            EditorUtility.SetDirty(avatar);
            return avatar;
        }

        /// <summary>
        /// Reads the imported loops' curves and stores evenly spaced samples. Curve evaluation is
        /// plain data access, so play mode needs no Animator, controller or avatar.
        /// </summary>
        static PersonClipLibrary BakeClips(GameObject instance, AnimationClip[] clips, SetupEvidence evidence, out Transform model)
        {
            string[] ids = PersonMotionData.ClipIds;
            var ordered = ids.Select(id => clips.FirstOrDefault(clip => clip.name == id)
                ?? throw new InvalidDataException("The hero import is missing the '" + id + "' loop. Found: " + string.Join(", ", clips.Select(clip => clip.name)))).ToArray();

            bool IsRotation(EditorCurveBinding binding, string component) => binding.type == typeof(Transform) && binding.propertyName.EndsWith("ocalRotation." + component, StringComparison.Ordinal);
            bool IsHeight(EditorCurveBinding binding) => binding.type == typeof(Transform) && binding.propertyName.EndsWith("ocalPosition.y", StringComparison.Ordinal);
            var first = AnimationUtility.GetCurveBindings(ordered[0]);
            string[] bonePaths = first.Where(binding => IsRotation(binding, "x")).Select(binding => binding.path).Distinct().OrderBy(path => path, StringComparer.Ordinal).ToArray();
            string[] hipPaths = first.Where(IsHeight).Select(binding => binding.path).Distinct().ToArray();
            if (bonePaths.Length < 40 || hipPaths.Length != 1)
                throw new InvalidDataException("Unexpected hero animation layout: " + bonePaths.Length + " rotating bones, " + hipPaths.Length + " moving joints.");
            string hipPath = hipPaths[0];

            // The loops' paths are relative to one transform of the imported hierarchy; find it.
            model = instance.GetComponentsInChildren<Transform>(true).FirstOrDefault(candidate => candidate.Find(bonePaths[0]) != null && candidate.Find(hipPath) != null)
                ?? throw new InvalidDataException("No imported transform resolves the animation path '" + bonePaths[0] + "'.");
            foreach (string path in bonePaths) if (model.Find(path) == null) throw new InvalidDataException("Animated bone is missing from the model: " + path);

            var library = AssetDatabase.LoadAssetAtPath<PersonClipLibrary>(ClipLibraryPath);
            if (library == null) { library = ScriptableObject.CreateInstance<PersonClipLibrary>(); AssetDatabase.CreateAsset(library, ClipLibraryPath); }
            library.bonePaths = bonePaths;
            library.hipPath = hipPath;
            library.hipRest = model.Find(hipPath).localPosition;
            library.sourceAsset = HeroPath;
            library.clips = new PersonClip[ordered.Length];
            evidence.clips = ids;
            evidence.clipFrames = new int[ordered.Length];
            evidence.heroBones = bonePaths.Length;

            for (int clipIndex = 0; clipIndex < ordered.Length; clipIndex++)
            {
                var clip = ordered[clipIndex];
                var curves = new Dictionary<string, AnimationCurve>(StringComparer.Ordinal);
                foreach (var binding in AnimationUtility.GetCurveBindings(clip))
                {
                    if (binding.type != typeof(Transform)) continue;
                    int dot = binding.propertyName.LastIndexOf('.');
                    if (dot < 0) continue;
                    string kind = binding.propertyName.Contains("ocalRotation") ? "r" : binding.propertyName.Contains("ocalPosition") ? "p" : null;
                    if (kind != null) curves[binding.path + "|" + kind + binding.propertyName.Substring(dot + 1)] = AnimationUtility.GetEditorCurve(clip, binding);
                }
                // The long idle changes slowly; the gaits keep every authored frame.
                float rate = clipIndex == 0 ? 15 : 30;
                int frames = Mathf.Max(2, Mathf.RoundToInt(clip.length * rate) + 1);
                var baked = new PersonClip { id = ids[clipIndex], frames = frames, duration = clip.length, rotations = new float[frames * bonePaths.Length * 4], hipHeights = new float[frames] };
                float widest = 0;
                for (int frame = 0; frame < frames; frame++)
                {
                    float time = clip.length * frame / (frames - 1);
                    for (int bone = 0; bone < bonePaths.Length; bone++)
                    {
                        string key = bonePaths[bone] + "|r";
                        if (!curves.TryGetValue(key + "x", out var cx) || !curves.TryGetValue(key + "y", out var cy) || !curves.TryGetValue(key + "z", out var cz) || !curves.TryGetValue(key + "w", out var cw))
                            throw new InvalidDataException("The '" + clip.name + "' loop has no rotation for " + bonePaths[bone]);
                        var rotation = new Quaternion(cx.Evaluate(time), cy.Evaluate(time), cz.Evaluate(time), cw.Evaluate(time));
                        float length = Mathf.Sqrt(rotation.x * rotation.x + rotation.y * rotation.y + rotation.z * rotation.z + rotation.w * rotation.w);
                        if (length < 1e-4f) throw new InvalidDataException("The '" + clip.name + "' loop has an empty rotation for " + bonePaths[bone]);
                        int at = (frame * bonePaths.Length + bone) * 4;
                        baked.rotations[at] = rotation.x / length; baked.rotations[at + 1] = rotation.y / length; baked.rotations[at + 2] = rotation.z / length; baked.rotations[at + 3] = rotation.w / length;
                        if (frame > 0)
                        {
                            int before = at - bonePaths.Length * 4;
                            float dotProduct = Mathf.Abs(baked.rotations[at] * baked.rotations[before] + baked.rotations[at + 1] * baked.rotations[before + 1] +
                                baked.rotations[at + 2] * baked.rotations[before + 2] + baked.rotations[at + 3] * baked.rotations[before + 3]);
                            widest = Mathf.Max(widest, 2 * Mathf.Acos(Mathf.Min(1, dotProduct)) * Mathf.Rad2Deg);
                        }
                    }
                    baked.hipHeights[frame] = curves.TryGetValue(hipPath + "|py", out var height) ? height.Evaluate(time) : library.hipRest.y;
                }
                if (clipIndex > 0 && widest < 1) throw new InvalidDataException("The '" + clip.name + "' loop baked without motion; check the glTF import settings.");
                library.clips[clipIndex] = baked;
                evidence.clipFrames[clipIndex] = frames;
            }
            EditorUtility.SetDirty(library);
            return library;
        }

        // ---------- Camera and gameplay objects ----------
        static Camera BuildCamera()
        {
            var camera = new GameObject("Playground.camera").AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.nearClipPlane = 0.08f;
            camera.farClipPlane = 900;
            camera.fieldOfView = 59;
            camera.allowHDR = true;
            camera.allowMSAA = true;
            camera.transform.position = new Vector3(-2, 2.4f, -5.5f);
            camera.gameObject.AddComponent<AudioListener>();
            var cameraData = camera.GetUniversalAdditionalCameraData();
            cameraData.renderPostProcessing = true;
            cameraData.antialiasing = AntialiasingMode.FastApproximateAntialiasing;
            // A soft fill that travels with the view keeps the face readable at night.
            var fill = new GameObject("Playground.camera-fill").AddComponent<Light>();
            fill.transform.SetParent(camera.transform, false);
            fill.transform.localPosition = new Vector3(0.6f, 0.5f, 0);
            fill.type = LightType.Point;
            fill.color = new Color(1, 0.93f, 0.84f);
            fill.intensity = 1.6f;
            fill.range = 9;
            fill.shadows = LightShadows.None;
            return camera;
        }

        static void BuildGameplay(TraversalWorld world, PersonAvatar hero, Camera camera, RenderPipelineAsset pipeline, Palette palette)
        {
            var root = new GameObject("Playground.gameplay");
            var diamond = DiamondMesh();
            var sparkVisuals = new Transform[world.sparks.Length];
            for (int index = 0; index < world.sparks.Length; index++)
            {
                var spot = world.sparks[index];
                var spark = new GameObject("Spark." + spot.id);
                spark.transform.SetParent(root.transform, false);
                spark.transform.position = new Vector3((float)spot.x, (float)spot.y, (float)spot.z);
                spark.transform.localScale = new Vector3(0.3f, 0.42f, 0.3f);
                spark.AddComponent<MeshFilter>().sharedMesh = diamond;
                var renderer = spark.AddComponent<MeshRenderer>();
                renderer.sharedMaterial = palette.sparkGlow;
                renderer.shadowCastingMode = ShadowCastingMode.Off;
                renderer.receiveShadows = false;
                sparkVisuals[index] = spark.transform;
            }
            foreach (var anchor in world.anchors)
            {
                var ring = Ring("Anchor." + anchor.id, anchor.perch ? 0.5f : 0.4f, 0.045f, anchor.perch ? palette.perchGlow : palette.tetherGlow, root.transform);
                ring.transform.position = new Vector3((float)anchor.x, (float)anchor.y, (float)anchor.z);
                ring.transform.rotation = Quaternion.Euler(90, 0, 0); // Lie flat: the ring is drawn in its local x-y plane.
            }
            var reticle = Ring("Playground.reticle", 0.75f, 0.06f, palette.reticleGlow, root.transform);
            reticle.SetActive(false);

            var tether = new GameObject("Playground.tether").AddComponent<LineRenderer>();
            tether.transform.SetParent(root.transform, false);
            tether.useWorldSpace = true;
            tether.positionCount = 2;
            tether.startWidth = 0.05f;
            tether.endWidth = 0.03f;
            tether.numCapVertices = 4;
            tether.sharedMaterial = palette.tetherGlow;
            tether.shadowCastingMode = ShadowCastingMode.Off;
            tether.receiveShadows = false;
            tether.enabled = false;

            var gameObject = new GameObject("Playground.game");
            var voice = gameObject.AddComponent<AudioSource>();
            voice.playOnAwake = false;
            voice.spatialBlend = 0;
            var game = gameObject.AddComponent<PlaygroundGame>();
            game.Configure(hero, camera, tether, reticle.transform, sparkVisuals, pipeline, voice);
            EditorUtility.SetDirty(game);
        }

        // ---------- Optional: the same stand-in for another scene's proxy player ----------
        /// <summary>
        /// Puts the realistic stand-in over the selected object in the open scene (for example
        /// First Contact's capsule player) and hides that object's own renderers. Nothing is saved
        /// and no other generator is edited: review the result, then save the scene or discard it.
        /// </summary>
        [MenuItem("Space Dragon/Luke's Playground/Dress the selected player as the stand-in")]
        public static void DressSelectedPlayer()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode) throw new InvalidOperationException("Exit Play mode first.");
            var target = Selection.activeTransform;
            if (target == null) throw new InvalidOperationException("Select the player object to dress, then run this command again.");
            if (target.GetComponentInParent<PersonAvatar>() != null) throw new InvalidOperationException("The selection is already the stand-in.");
            Folder(Generated); Folder(MaterialFolder);
            var notes = new List<string>();
            using var pipelineScope = new PipelineScope(PreparePipeline(), notes);
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            ConfigureHeroTextures();
            var prefab = ImportHero(notes);
            var clips = AssetDatabase.LoadAllAssetsAtPath(HeroPath).OfType<AnimationClip>()
                .Where(clip => !clip.name.StartsWith("__preview__", StringComparison.Ordinal)).ToArray();
            var avatar = BuildHero(prefab, clips, new SetupEvidence(), notes);
            avatar.gameObject.name = "PlaygroundKid.for." + target.name;
            var body = target.GetComponent<CharacterController>();
            float originAboveFeet = body != null ? body.height * 0.5f - body.center.y : 0;
            avatar.gameObject.AddComponent<PersonFollower>().Configure(avatar, target, originAboveFeet);
            avatar.transform.SetPositionAndRotation(target.position - Vector3.up * originAboveFeet, Quaternion.Euler(0, target.eulerAngles.y, 0));
            foreach (var renderer in target.GetComponentsInChildren<Renderer>(true)) renderer.enabled = false;
            EditorSceneManager.MarkSceneDirty(avatar.gameObject.scene);
            AssetDatabase.SaveAssets();
            Selection.activeGameObject = avatar.gameObject;
            Debug.Log("SPACE_DRAGON_PLAYGROUND_DRESS_OK " + target.name + (notes.Count > 0 ? " notes: " + string.Join(" | ", notes) : ""));
        }

        // ---------- Builds ----------
        [MenuItem("Space Dragon/Luke's Playground/Build Windows player")]
        public static void BuildWindows() => Build(BuildTarget.StandaloneWindows64, "Builds/Playground/Windows/LukePlayground.exe");
        [MenuItem("Space Dragon/Luke's Playground/Build Web player")]
        public static void BuildWeb() => Build(BuildTarget.WebGL, "Builds/Playground/Web");

        [Serializable]
        class BuildEvidence
        {
            public string unityVersion, target, output, result, scene;
            public ulong bytes;
            public double durationSeconds;
        }

        static void Build(BuildTarget target, string output)
        {
            if (EditorUserBuildSettings.activeBuildTarget != target)
                throw new InvalidOperationException("Launch Unity with -buildTarget " + (target == BuildTarget.WebGL ? "WebGL" : "Win64") + " before this entry point; no mid-method domain reload is permitted.");
            Setup();
            string folder = target == BuildTarget.WebGL ? output : Path.GetDirectoryName(output);
            Directory.CreateDirectory(folder);
            // Only this scene is passed; the shared build settings list is left as it was.
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { ScenePath }, target = target, locationPathName = output, options = BuildOptions.StrictMode });
            if (report.summary.result != BuildResult.Succeeded)
                throw new BuildFailedException("Luke's Playground " + target + " build failed: " + report.summary.result);
            File.WriteAllText(folder + "/build-receipt.json", JsonUtility.ToJson(new BuildEvidence
            {
                unityVersion = Application.unityVersion, target = target.ToString(), output = output, scene = ScenePath, bytes = report.summary.totalSize,
                durationSeconds = report.summary.totalTime.TotalSeconds, result = report.summary.result.ToString(),
            }, true));
            Debug.Log("SPACE_DRAGON_PLAYGROUND_BUILD_OK " + output);
        }

        static void Folder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            string parent = Path.GetDirectoryName(path).Replace('\\', '/');
            Folder(parent);
            AssetDatabase.CreateFolder(parent, Path.GetFileName(path));
        }
    }
}
