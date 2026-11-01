using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using SpaceDragon.TownDrive.Runtime;
using SpaceDragon.TownDrive.UnityRuntime;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using Object = UnityEngine.Object;

namespace SpaceDragon.TownDrive.Editor
{
    /// <summary>Only generates/builds the explicitly exported Town Drive scene.</summary>
    public static partial class TownDriveProject
    {
        public const string Root = "Assets/SpaceDragon/TownDrive";
        public const string Imported = Root + "/Imported";
        public const string Generated = Root + "/Generated";
        public const string ScenePath = Generated + "/TownDrive.unity";
        public const string ManifestPath = Imported + "/town-drive-scene-v001.json";
        public const string DataPath = Root + "/Data/town-drive-v001.json";
        public const string ReceiptPath = "Builds/town-drive-scene-setup-receipt.json";

        [MenuItem("Space Dragon/Town Drive/Generate detailed scene")]
        public static void Setup()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode) throw new InvalidOperationException("Exit Play mode before generating Town Drive.");
            if (!Application.isBatchMode && !EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            var sharedBefore = SharedConfiguration();
            Folder(Generated); Folder(Generated + "/Materials");
            var pipeline = PreparePipeline();
            using var pipelineScope = new TownDrivePipelineScope(pipeline);
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            var manifest = LoadManifest();
            VerifyExportFiles(manifest);
            VerifyArtInputs();
            ConfigureTextureImports(manifest);
            var routeAsset = AssetDatabase.LoadAssetAtPath<TextAsset>(DataPath) ?? throw new FileNotFoundException("Town Drive route export is missing.", DataPath);
            var data = TownDriveJson.Load(routeAsset);
            var sourceCounts = JsonUtility.FromJson<SourceCounts>(routeAsset.text);
            if (sourceCounts.context.roads.Length != 26 || sourceCounts.context.waters.Length != 4 || sourceCounts.context.lots.Length != 83 || sourceCounts.junctions.Length != 10 || sourceCounts.closures.Length != 11)
                throw new InvalidDataException("Mapped scene source counts changed; review the export before generating a new candidate.");
            var prefabs = new Dictionary<string, GameObject>();
            var evidence = new List<TownDriveAssetEvidence>();
            var normalMappedMaterials = new HashSet<string>(manifest.materials.Where(material => (material.textures ?? Array.Empty<TownDriveSceneTexture>()).Any(texture => texture.slot == "normal")).Select(material => material.name));
            foreach (var asset in manifest.assets)
            {
                string path = ImportedPath(asset.path);
                ConfigureGltfImport(path, false);
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path) ?? throw new InvalidDataException("glTFast did not produce a prefab: " + path);
                ValidateAsset(prefab, asset);
                int normalMappedMeshes = ValidateNormalMappedMeshes(prefab, normalMappedMaterials);
                prefabs.Add(asset.id, prefab);
                evidence.Add(new TownDriveAssetEvidence { id = asset.id, path = path, sha256 = HashFile(path),
                    meshes = Meshes(prefab).Length, sourceMeshes = asset.sourceMeshCount, triangles = TriangleCount(prefab), sourceTriangles = asset.sourceTriangles,
                    expectedImportedMeshes = asset.expectedImportedMeshCount, expectedImportedTriangles = asset.expectedImportedTriangleCount, normalMappedMeshes = normalMappedMeshes });
            }

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var world = new GameObject("TownDrive.World");
            var templates = new GameObject("TownDrive.Templates");
            var copies = new MaterialCopies(manifest);
            var instances = new Dictionary<string, GameObject>();
            foreach (var asset in manifest.assets)
            {
                var instance = new GameObject("TownDrive.Asset." + asset.id);
                instance.transform.SetParent(asset.kind == "vegetation" || asset.kind == "traffic" ? templates.transform : world.transform, false);
                var visual = (GameObject)PrefabUtility.InstantiatePrefab(prefabs[asset.id]);
                visual.transform.SetParent(instance.transform, false);
                copies.Apply(instance, asset);
                instances.Add(asset.id, instance);
                if (asset.kind == "vegetation") instance.SetActive(false);
                else if (asset.kind == "traffic") { ConfigureAuthoredLods(instance, asset); instance.SetActive(false); }
                else if (asset.kind == "interior") { instance.name = "TownDrive.OptionalInterior"; instance.SetActive(false); }
                else ConfigureAuthoredLods(instance, asset);
            }

            var minivanAsset = manifest.assets.Single(asset => asset.kind == "minivan");
            var minivan = instances[minivanAsset.id];
            // Validate the actual importer basis at origin, before gameplay pose.
            // Both converters negate X; any extra mirror fails here.
            var anchorEvidence = ValidateAnchors(manifest, instances);
            var player = new GameObject("TownDrive.Player");
            minivan.transform.SetParent(player.transform, false);
            var minivanRenderedBounds = LocalBounds(minivan, player.transform);
            var minivanBounds = MinivanPhysicalBounds(minivan, player.transform);
            ValidateMinivan(manifest, player, minivanBounds);
            var eye = FindUnique(player, "TownDrive.DriverEye");
            Vector3 driverEye = player.transform.InverseTransformPoint(eye.position);
            player.transform.SetPositionAndRotation(new Vector3((float)data.route.spawn.x, 0, (float)data.route.spawn.z),
                Quaternion.Euler(0, (float)(data.route.spawn.yaw * Mathf.Rad2Deg), 0));

            var vegetation = new GameObject("TownDrive.Vegetation"); vegetation.transform.SetParent(world.transform, false);
            foreach (var plant in manifest.vegetationInstances) CreateVegetationPart(plant, instances[plant.assetId], vegetation.transform);
            // These source hierarchies are used only by the Editor's ClonePart.
            // Runtime plants already reference their own shared mesh subassets;
            // retaining the hidden templates would also load superseded art.
            foreach (var asset in manifest.assets.Where(asset => asset.kind == "vegetation"))
                instances[asset.id].tag = "EditorOnly";
            var traffic = new[] { "traffic-sedan", "traffic-suv", "traffic-van" }.Select(id => instances[id]).ToArray();
            var parkedRoot = new GameObject("TownDrive.ParkedVehicles"); parkedRoot.transform.SetParent(world.transform, false);
            foreach (var parked in manifest.parkedVehicles)
            {
                var model = Object.Instantiate(instances["traffic-" + parked.kind], parkedRoot.transform);
                model.name = parked.id;
                model.SetActive(true);
                model.transform.SetPositionAndRotation(new Vector3(parked.x, 0, parked.z), Quaternion.Euler(0, parked.yaw * Mathf.Rad2Deg, 0));
                copies.ApplyParkedAppearance(model, parked.colorIndex, parked.braking);
            }

            var people = new List<GameObject>(); var walks = new List<AnimationClip>();
            foreach (int appearance in new[] { 0, 1 })
            {
                var person = manifest.pedestrianAssets.Single(asset => asset.appearance == appearance);
                // Preserve the original licensed rig and animation bytes as
                // provenance. Unity uses the verified PNG-texture derivative;
                // the pinned importer does not support required WebP textures.
                foreach (string relative in new[] { person.sourcePath, person.path, person.provenancePath })
                    if (manifest.files.Count(file => file.path == relative) != 1)
                        throw new InvalidDataException("Pedestrian source/derivative must be hash-verified in the manifest: " + relative);
                string path = ImportedPath(person.path);
                if (HashFile(path) != person.sha256 || new FileInfo(path).Length != person.bytes || HashFile(ImportedPath(person.sourcePath)) != person.sourceSha256)
                    throw new InvalidDataException("Pedestrian manifest source/derivative provenance mismatch: " + person.id);
                ConfigureGltfImport(path, true);
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path) ?? throw new InvalidDataException("Pedestrian rig did not import: " + person.id);
                var model = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
                model.name = "TownDrive.PedestrianTemplate." + person.id;
                model.transform.SetParent(templates.transform, false);
                var clips = AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().Where(clip => !clip.name.StartsWith("__preview__", StringComparison.Ordinal)).ToArray();
                var walk = clips.SingleOrDefault(clip => clip.name == person.clipName);
                var skins = model.GetComponentsInChildren<SkinnedMeshRenderer>(true);
                if (walk == null || walk.length <= 0 || clips.Length != person.animationCount || skins.Length == 0 ||
                    skins.Any(skin => skin.sharedMesh == null || skin.bones.Length != person.jointCount || skin.bones.Any(bone => bone == null)))
                    throw new InvalidDataException("Pedestrian derivative lost source rig joints or animation clips: " + person.id);
                foreach (var animator in model.GetComponentsInChildren<Animator>(true)) animator.applyRootMotion = false;
                model.SetActive(false); people.Add(model); walks.Add(walk);
            }
            templates.SetActive(false);
            ApplySurfaceArt(world);
            ApplyRoofAndWallArt(world);
            ApplyGardenArt(world);
            ApplyFoliageArt(world);
            ApplyResidentialArt(world);
            ApplyRoadArt(world);
            ApplyReferenceArt(world);
            ConfigureLighting();
            var camera = new GameObject("TownDrive.Camera").AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.nearClipPlane = .045f;
            camera.farClipPlane = 650;
            camera.fieldOfView = 62;
            camera.allowHDR = true;
            camera.clearFlags = CameraClearFlags.Skybox;
            camera.transform.position = player.transform.TransformPoint(new Vector3(0, 3.5f, -8));
            camera.transform.LookAt(player.transform.position + Vector3.up * 1.1f);
            camera.GetUniversalAdditionalCameraData().renderPostProcessing = true;
            camera.gameObject.AddComponent<AudioListener>();
            ApplyCabinArt(player, camera);
            var closureIds = new HashSet<string>(data.closureObstacles.Select(obstacle => obstacle.id));
            var obstacles = (manifest.obstacles ?? Array.Empty<DriveObstacle>()).Where(obstacle => !closureIds.Contains(obstacle.id)).ToList();
            foreach (var parked in manifest.parkedVehicles) foreach (double along in new[] { -1.1, 0, 1.1 })
                obstacles.Add(new DriveObstacle { id = parked.id, x = parked.x + Math.Sin(parked.yaw) * along,
                    z = parked.z + Math.Cos(parked.yaw) * along, radius = .9 });
            var runtime = new GameObject("TownDriveRuntime").AddComponent<TownDriveExperience>();
            runtime.Configure(routeAsset, player.transform, camera, traffic, people.ToArray(), walks.ToArray(), obstacles.ToArray());
            runtime.ConfigurePipeline(pipeline);

            EditorSceneManager.SaveScene(scene, ScenePath);
            pipelineScope.Dispose();
            AssetDatabase.SaveAssets();
            var differences = SharedDifferences(sharedBefore);
            var materialEvidence = copies.Evidence;
            var receipt = new TownDriveSceneReceipt {
                result = differences.Length == 0 ? "Succeeded" : "SharedConfigurationChanged", unityVersion = Application.unityVersion,
                scene = ScenePath, createdUtc = DateTime.UtcNow.ToString("O"), sourceRevision = manifest.sourceRevision,
                sourceFingerprint = data.sourceFingerprint, manifestSha256 = HashFile(ManifestPath), coordinateBasis = "Identity; imported +X/+Z and mapped anchors checked in metres",
                pipelinePath = PipelinePath, rendererPath = RendererPath,
                artSourceSha256 = HashFile(ArtInputs + "/provenance.json"), artRoofMeshes = ArtRoofMeshes, artWallRenderers = ArtWallRenderers,
                assets = manifest.assets.Length, vegetationParts = manifest.vegetationInstances.Length,
                vegetationLodGroups = vegetation.GetComponentsInChildren<LODGroup>(true).Length, parkedVehicles = manifest.parkedVehicles.Length,
                trafficTemplates = traffic.Length, pedestrianTemplates = people.Count, pedestrianClips = walks.Count,
                contextRoads = sourceCounts.context.roads.Length, contextWaters = sourceCounts.context.waters.Length,
                estimatedContextLots = sourceCounts.context.lots.Length, junctions = sourceCounts.junctions.Length, closures = sourceCounts.closures.Length,
                sceneObstacles = obstacles.Count, materialCount = materialEvidence.Length, texturedMaterials = materialEvidence.Count(material => material.textureCount > 0),
                triangles = evidence.Sum(asset => asset.triangles), minivanMeshes = Meshes(minivan).Length, minivanBounds = minivanBounds.size,
                minivanRenderedBounds = minivanRenderedBounds.size,
                minivanBoundsScope = "Physical vehicle including mirrors and trim; excludes only verified 2.60 x 5.20 m contact-shadow card. Rendered bounds include that card.",
                triangleScope = "Imported prefab inventory with GLB instancing expanded; excludes repeated vegetation/parked placements and runtime population",
                wheelSteerNodes = player.GetComponentsInChildren<Transform>(true).Count(node => node.name.StartsWith(manifest.minivan.wheelSteerPrefix, StringComparison.Ordinal)),
                wheelSpinNodes = player.GetComponentsInChildren<Transform>(true).Count(node => node.name.StartsWith(manifest.minivan.wheelSpinPrefix, StringComparison.Ordinal)),
                driverEye = driverEye, importedAssets = evidence.ToArray(), anchors = anchorEvidence, materials = materialEvidence,
                sharedConfigurationDifferences = differences
            };
            Directory.CreateDirectory("Builds");
            File.WriteAllText(ReceiptPath, JsonUtility.ToJson(receipt, true));
            if (differences.Length > 0) throw new InvalidOperationException("Shared configuration changed during Town Drive Setup: " + string.Join(", ", differences));
            Debug.Log("SPACE_DRAGON_TOWN_DRIVE_SETUP_OK " + ScenePath);
        }

        public static TownDriveSceneManifest LoadManifest()
        {
            if (!File.Exists(ManifestPath)) throw new FileNotFoundException("Run the detailed Town Drive scene exporter first.", ManifestPath);
            var manifest = JsonUtility.FromJson<TownDriveSceneManifest>(File.ReadAllText(ManifestPath));
            if (manifest == null || manifest.schemaVersion != 1 || manifest.units != "metres" || manifest.assets == null || manifest.materials == null ||
                manifest.vegetationInstances == null || manifest.parkedVehicles == null || manifest.minivan == null || manifest.anchors == null || manifest.files == null || manifest.pedestrianAssets == null)
                throw new InvalidDataException("Incomplete or unsupported detailed scene manifest.");
            if (manifest.pedestrianAssets.Length != 2 || new[] { 0, 1 }.Any(appearance => manifest.pedestrianAssets.Count(asset => asset.appearance == appearance && asset.id == (appearance == 0 ? "adult-male" : "adult-female")) != 1) ||
                manifest.pedestrianAssets.Any(asset => asset.skinCount != 1 || asset.jointCount <= 0 || asset.animationCount <= 0 || string.IsNullOrEmpty(asset.clipName)))
                throw new InvalidDataException("Both intact original pedestrian rigs and PNG texture derivatives are required.");
            if (manifest.assets.Count(asset => asset.kind == "minivan") != 1 || manifest.assets.Count(asset => asset.kind == "traffic") != 3 ||
                manifest.assets.Count(asset => asset.kind == "vegetation") != 3 || !manifest.assets.Any(asset => asset.kind == "neighborhood") || !manifest.assets.Any(asset => asset.kind == "roadChunk"))
                throw new InvalidDataException("Detailed scene assets are missing; primitive replacements are not accepted.");
            foreach (var asset in manifest.assets) foreach (var state in asset.nodeState ?? Array.Empty<TownDriveNodeState>()) ValidateLodOrder(state.lods, asset.id + ":" + state.name);
            foreach (var plant in manifest.vegetationInstances) ValidateLodOrder(plant.lods, plant.id);
            return manifest;
        }

        static void ValidateLodOrder(TownDrivePartLod[] levels, string label)
        {
            float previous = 0;
            foreach (var level in levels ?? Array.Empty<TownDrivePartLod>())
            {
                if (float.IsNaN(level.distance) || float.IsInfinity(level.distance) || level.distance <= previous)
                    throw new InvalidDataException("LOD distances must be explicit, positive and strictly ascending: " + label);
                previous = level.distance;
            }
        }

        static void VerifyExportFiles(TownDriveSceneManifest manifest)
        {
            foreach (var file in manifest.files)
            {
                string path = ImportedPath(file.path);
                if (!File.Exists(path) || new FileInfo(path).Length != file.bytes || HashFile(path) != file.sha256)
                    throw new InvalidDataException("Source export hash/length mismatch: " + path);
            }
        }

        public static string ImportedPath(string relative)
        {
            if (string.IsNullOrWhiteSpace(relative) || Path.IsPathRooted(relative)) throw new InvalidDataException("Expected a relative Imported path.");
            string root = Path.GetFullPath(Imported) + Path.DirectorySeparatorChar;
            string target = Path.GetFullPath(Path.Combine(Imported, relative));
            if (!target.StartsWith(root, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Asset escaped the Town Drive Imported folder.");
            return Imported + "/" + relative.Replace('\\', '/');
        }
        static void Folder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            string parent = path.Substring(0, path.LastIndexOf('/')); Folder(parent);
            AssetDatabase.CreateFolder(parent, path.Substring(path.LastIndexOf('/') + 1));
        }
        static string SafeName(string text) => new string(text.Select(character => char.IsLetterOrDigit(character) || character == '-' || character == '.' ? character : '-').ToArray());
        public static string HashFile(string path) { using (var sha = SHA256.Create()) using (var stream = File.OpenRead(path)) return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").ToLowerInvariant(); }
        static string HashText(string text) { using (var sha = SHA256.Create()) return BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(text))).Replace("-", "").ToLowerInvariant(); }

        static Dictionary<string, string> SharedConfiguration() => new[] { "ProjectSettings", "Packages" }.Where(Directory.Exists)
            .SelectMany(directory => Directory.GetFiles(directory, "*", SearchOption.AllDirectories)).ToDictionary(path => path, HashFile);
        static string[] SharedDifferences(Dictionary<string, string> before)
        {
            var after = SharedConfiguration();
            return before.Keys.Union(after.Keys).Where(path => !before.TryGetValue(path, out var a) || !after.TryGetValue(path, out var b) || a != b).ToArray();
        }

        [Serializable] sealed class EmptyRecord { }
        [Serializable] sealed class ContextCounts
        { public EmptyRecord[] roads = Array.Empty<EmptyRecord>(), waters = Array.Empty<EmptyRecord>(), lots = Array.Empty<EmptyRecord>(); }
        [Serializable] sealed class SourceCounts
        { public ContextCounts context = new ContextCounts(); public EmptyRecord[] junctions = Array.Empty<EmptyRecord>(), closures = Array.Empty<EmptyRecord>(); }
        [Serializable] sealed class BuildReceipt
        {
            public string result, unityVersion, scene, output, target, manifestSha256, artSourceSha256, buildOptions;
            public string webglMemoryGrowthMode, webglMemoryLimitScope;
            public int webglInitialMemoryMiB, webglMaximumMemoryMiB;
            public bool developmentBuild, semanticReviewHooks;
            public ulong bytes; public double durationSeconds;
        }

        [MenuItem("Space Dragon/Town Drive/Build separate Web candidate")]
        public static void BuildWeb() => Build(BuildTarget.WebGL, "Builds/TownDriveWeb");
        [MenuItem("Space Dragon/Town Drive/Build separate Windows candidate")]
        public static void BuildWindows() => Build(BuildTarget.StandaloneWindows64, "Builds/TownDriveWindows/TownDrive.exe");
        static void Build(BuildTarget target, string output)
        {
            bool reviewBuild = Environment.GetCommandLineArgs().Contains("-townDriveReviewBuild", StringComparer.Ordinal);
            var buildOptions = BuildOptions.StrictMode | (reviewBuild ? BuildOptions.Development : BuildOptions.None);
            if (EditorUserBuildSettings.activeBuildTarget != target)
                throw new InvalidOperationException("Launch with -buildTarget " + (target == BuildTarget.WebGL ? "WebGL" : "Win64") + "; no mid-method target reload is permitted.");
            Setup();
            using var pipelineScope = new TownDrivePipelineScope(AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelinePath));
            string previousTemplate = PlayerSettings.WebGL.template;
            int previousMaximumMemory = PlayerSettings.WebGL.maximumMemorySize;
            try
            {
                if (target == BuildTarget.WebGL)
                {
                    if (!File.Exists("Assets/WebGLTemplates/TownDrive/index.html")) throw new FileNotFoundException("The dedicated TownDrive web template is missing.");
                    if (PlayerSettings.WebGL.memoryGrowthMode == WebGLMemoryGrowthMode.None)
                        throw new BuildFailedException("Town Drive requires the existing WebGL heap growth mode; a fixed initial heap cannot use the scoped maximum.");
                    PlayerSettings.WebGL.template = "PROJECT:TownDrive";
                    // Keep the shared initial allocation and growth policy. This
                    // candidate may grow beyond the previous 512 MiB ceiling;
                    // the ceiling is not an allocation or a memory-use claim.
                    PlayerSettings.WebGL.maximumMemorySize = 1024;
                }
                int configuredInitialMemory = target == BuildTarget.WebGL ? PlayerSettings.WebGL.initialMemorySize : 0;
                int configuredMaximumMemory = target == BuildTarget.WebGL ? PlayerSettings.WebGL.maximumMemorySize : 0;
                string configuredGrowthMode = target == BuildTarget.WebGL ? PlayerSettings.WebGL.memoryGrowthMode.ToString() : "NotApplicable";
                string folder = target == BuildTarget.WebGL ? output : Path.GetDirectoryName(output);
                Directory.CreateDirectory(folder);
                var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { ScenePath }, target = target,
                    locationPathName = output, options = buildOptions });
                if (report.summary.result != BuildResult.Succeeded) throw new BuildFailedException("Town Drive build failed: " + report.summary.result);
                bool actualDevelopment = (report.summary.options & BuildOptions.Development) != 0;
                if (actualDevelopment != reviewBuild) throw new BuildFailedException("Town Drive review/development build option differs from the requested mode.");
                File.WriteAllText(folder + "/town-drive-build-receipt.json", JsonUtility.ToJson(new BuildReceipt {
                    result = "Succeeded", unityVersion = Application.unityVersion, scene = ScenePath, output = output,
                    target = target.ToString(), bytes = report.summary.totalSize, durationSeconds = report.summary.totalTime.TotalSeconds,
                    webglInitialMemoryMiB = configuredInitialMemory, webglMaximumMemoryMiB = configuredMaximumMemory, webglMemoryGrowthMode = configuredGrowthMode,
                    webglMemoryLimitScope = target == BuildTarget.WebGL ? "TownDrive WebGL build ceiling only; not measured allocation or runtime usage." : "NotApplicable",
                    buildOptions = report.summary.options.ToString(), developmentBuild = actualDevelopment, semanticReviewHooks = actualDevelopment,
                    manifestSha256 = HashFile(ManifestPath), artSourceSha256 = HashFile(ArtInputs + "/provenance.json") }, true));
                Debug.Log("SPACE_DRAGON_TOWN_DRIVE_BUILD_OK " + output);
            }
            finally
            {
                if (target == BuildTarget.WebGL)
                {
                    try { PlayerSettings.WebGL.maximumMemorySize = previousMaximumMemory; }
                    finally { PlayerSettings.WebGL.template = previousTemplate; }
                }
            }
        }
    }
}
