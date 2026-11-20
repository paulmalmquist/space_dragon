using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using Object = UnityEngine.Object;

namespace SpaceDragon.Dogfight.Editor
{
    /// <summary>Separate local Dogfight scene and build. Does not regenerate any other lab.</summary>
    public static class DogfightProject
    {
        public const string Root = "Assets/SpaceDragon/Dogfight";
        public const string Imported = Root + "/Imported";
        public const string Generated = Root + "/Generated";
        public const string ScenePath = Generated + "/Dogfight.unity";
        public const string HeroicDragonPath = Imported + "/dragon-heroic-v005.glb";
        public const string VioletDragonPath = Imported + "/dragon-violet-v007.glb";
        public const string OscarDragonPath = Imported + "/dragon-oscar-v001.glb";
        public const string OscarMechanicalPath = Imported + "/dragon-oscar-mechanical-v004.glb";
        static bool UsesOscarAccessories => UsesOscarCandidate && Environment.GetEnvironmentVariable("SPACE_DRAGON_DOGFIGHT_MECHANICAL") != "none";
        static string PresentationVersion => UsesOscarCandidate ? "combat-upgrades-v002" : "baseline-v001";
        // Preparing the additive receipt makes the organic candidate available.
        // An explicit local rollback remains possible without deleting any intake.
        // Invalid prepared data fails validation rather than silently falling back.
        public static string SelectedAsset
        {
            get
            {
                var requested = Environment.GetEnvironmentVariable("SPACE_DRAGON_DOGFIGHT_ASSET");
                if (!string.IsNullOrEmpty(requested) && requested != "heroic-v005" && requested != "violet-v007" && requested != "oscar-v001")
                    throw new InvalidDataException("SPACE_DRAGON_DOGFIGHT_ASSET must be heroic-v005, violet-v007 or oscar-v001.");
                if (!string.IsNullOrEmpty(requested))
                {
                    string receipt = requested == "oscar-v001" ? "asset-receipt-v005.json" : requested == "violet-v007" ? "asset-receipt-v004.json" : "asset-receipt-v003.json";
                    if (!File.Exists(Root + "/" + receipt)) throw new FileNotFoundException("Prepare the measured intake before selecting " + requested);
                    return requested;
                }
                return File.Exists(Root + "/asset-receipt-v005.json") ? "oscar-v001" : File.Exists(Root + "/asset-receipt-v004.json") ? "violet-v007" : "heroic-v005";
            }
        }
        public static bool UsesOrganicCandidate => SelectedAsset == "violet-v007";
        public static bool UsesOscarCandidate => SelectedAsset == "oscar-v001";
        public static string DragonPath => UsesOscarCandidate ? OscarDragonPath : UsesOrganicCandidate ? VioletDragonPath : HeroicDragonPath;
        public static string DragonHash => UsesOscarCandidate ? ReadOscarContract().sha256 : UsesOrganicCandidate ? ReadVioletContract().sha256 : ReadHeroicContract().sha256;
        public const int AsteroidLayer = 8;
        const string DronePath = Imported + "/drone.glb";
        static readonly string[] Sockets = { "socket_muzzle", "socket_wing_l", "socket_wing_r", "socket_thruster_l", "socket_thruster_r", "socket_target", "socket_camera", "socket_ground" };
        static readonly string[] MechanicalBones = { "Root", "Jaw", "Tail_0", "Tail_1", "Tail_2", "Tail_3", "Tail_4", "Wing_L", "Wing_R" };
        static readonly string[] OrganicBones = { "Root", "Neck", "Head", "Jaw", "Wing_L", "Wing_R", "Fore_L", "Fore_R", "Hind_L", "Hind_R", "Tail_0", "Tail_1", "Tail_2", "Tail_3", "Tail_4" };
        static string[] Bones => UsesOscarCandidate ? ReadOscarContract().bones : UsesOrganicCandidate ? OrganicBones : MechanicalBones;

        [Serializable] sealed class SourceFile { public string source, destination, sha256; public long bytes; }
        [Serializable] sealed class IntakeReceipt { public int schemaVersion; public string previousReceipt, rigProfile; public SourceFile[] sourceFiles, files; }
        [Serializable] sealed class HeroicContract { public int schemaVersion, triangles; public string file, sha256; public long bytes; public bool authoredArmor; }
        static HeroicContract ReadHeroicContract()
        {
            var contract = JsonUtility.FromJson<HeroicContract>(File.ReadAllText(Root + "/heroic-contract-v005.json"));
            if (contract?.schemaVersion != 1 || contract.file != "dragon-heroic-v005.glb" || contract.sha256?.Length != 64 || contract.triangles <= 0 || !contract.authoredArmor)
                throw new InvalidDataException("Missing measured heroic v005 asset contract. Run its additive intake first.");
            return contract;
        }
        [Serializable] sealed class SocketDefinition { public string name, parent; public float[] position, worldMatrix; }
        [Serializable] sealed class BoneRestDefinition { public string name, parent; public float[] worldMatrix; }
        [Serializable] sealed class ClipChannelDefinition { public string bone, path; }
        [Serializable] sealed class ClipDefinition { public string name; public float durationSeconds; public ClipChannelDefinition[] channels; }
        [Serializable] sealed class BoundsDefinition { public float[] min, max, size; }
        [Serializable] sealed class CoordinateDefinition { public float metersPerUnit, sourceBasisYawDegrees; public string sourceForward, sourceUp, gameplayForward; }
        [Serializable] class VioletContract
        {
            public int schemaVersion, triangles, instanceTriangles; public string file, sha256, rigProfile;
            public long bytes; public bool authoredPresentation; public float contactY;
            public string[] bones; public BoneRestDefinition[] boneRest; public SocketDefinition[] sockets;
            public ClipDefinition[] clips; public BoundsDefinition bounds; public CoordinateDefinition coordinateSystem;
        }
        [Serializable] sealed class PresentationDefinition
        {
            public string jawBone; public float[] jawAxis; public float jawScale, jawMinRadians, jawMaxRadians;
            public int sampleRate; public string[] damageSockets;
        }
        [Serializable] sealed class OscarContract : VioletContract { public PresentationDefinition presentation; }
        [Serializable] sealed class OscarMechanicalContract { public int schemaVersion, triangles; public string file, sha256; public long bytes; }
        static OscarMechanicalContract ReadMechanicalContract()
        {
            var path = Root + "/oscar-mechanical-contract-v004.json";
            var value = JsonUtility.FromJson<OscarMechanicalContract>(File.ReadAllText(path));
            if (value == null || value.schemaVersion != 1 || value.file != "dragon-oscar-mechanical-v004.glb"
                || value.sha256?.Length != 64 || value.triangles <= 0 || value.bytes != new FileInfo(OscarMechanicalPath).Length)
                throw new InvalidDataException("Invalid additive Oscar mechanical contract. Prepare the versioned candidate first.");
            return value;
        }
        static bool Finite(float[] values, int count) => values?.Length == count && values.All(value => !float.IsNaN(value) && !float.IsInfinity(value));
        static VioletContract ReadVioletContract()
        {
            var contract = JsonUtility.FromJson<VioletContract>(File.ReadAllText(Root + "/violet-contract-v007.json"));
            if (contract?.schemaVersion != 2 || contract.file != "dragon-violet-v007.glb" || contract.sha256?.Length != 64
                || contract.bytes <= 0 || contract.triangles <= 0 || contract.instanceTriangles <= 0
                || contract.rigProfile != "violet-organic-15" || !contract.authoredPresentation
                || contract.bones?.Length != 15 || !contract.bones.OrderBy(name => name).SequenceEqual(OrganicBones.OrderBy(name => name))
                || contract.sockets?.Length != 8 || !contract.sockets.Select(socket => socket.name).OrderBy(name => name).SequenceEqual(Sockets.OrderBy(name => name))
                || contract.sockets.Any(socket => !Finite(socket.position, 3) || !Finite(socket.worldMatrix, 16) || string.IsNullOrEmpty(socket.parent))
                || contract.boneRest?.Length != 15 || !contract.boneRest.Select(bone => bone.name).OrderBy(name => name).SequenceEqual(OrganicBones.OrderBy(name => name))
                || contract.boneRest.Any(bone => !Finite(bone.worldMatrix, 16))
                || contract.clips?.Length != 3 || !contract.clips.Select(clip => clip.name).OrderBy(name => name).SequenceEqual(new[] { "Boost", "Flight", "Glide" })
                || contract.clips.Any(clip => !(clip.durationSeconds > 0) || float.IsInfinity(clip.durationSeconds) || clip.channels == null || clip.channels.Length == 0)
                || contract.bounds == null || !Finite(contract.bounds.min, 3) || !Finite(contract.bounds.max, 3) || !Finite(contract.bounds.size, 3)
                || contract.coordinateSystem == null || contract.coordinateSystem.metersPerUnit != 1 || contract.coordinateSystem.sourceForward != "-Z"
                || contract.coordinateSystem.sourceUp != "+Y" || contract.coordinateSystem.gameplayForward != "+Z" || contract.coordinateSystem.sourceBasisYawDegrees != 180)
                throw new InvalidDataException("Missing or invalid measured organic v007 contract. Run its additive intake first.");
            if (float.IsNaN(contract.contactY) || float.IsInfinity(contract.contactY)
                || Mathf.Abs(contract.contactY - contract.sockets.Single(socket => socket.name == "socket_ground").position[1]) > .0001f)
                throw new InvalidDataException("Organic contact height differs from its ground attachment.");
            return contract;
        }
        static OscarContract ReadOscarContract()
        {
            var contract = JsonUtility.FromJson<OscarContract>(File.ReadAllText(Root + "/oscar-contract-v001.json"));
            if (contract?.schemaVersion != 1 || contract.file != "dragon-oscar-v001.glb" || contract.sha256?.Length != 64
                || contract.bytes <= 0 || contract.triangles <= 0 || contract.instanceTriangles <= 0 || !contract.authoredPresentation
                || contract.rigProfile != "oscar-creativo-flight" || contract.bones == null || contract.bones.Length == 0
                || contract.bones.Distinct().Count() != contract.bones.Length || contract.bones.Any(string.IsNullOrEmpty)
                || contract.boneRest?.Length != contract.bones.Length || !contract.boneRest.Select(bone => bone.name).OrderBy(name => name).SequenceEqual(contract.bones.OrderBy(name => name))
                || contract.boneRest.Any(bone => !Finite(bone.worldMatrix,16))
                || contract.sockets == null || Sockets.Any(name => contract.sockets.Count(socket => socket.name == name) != 1)
                || contract.sockets.Select(socket => socket.name).Distinct().Count() != contract.sockets.Length
                || contract.sockets.Any(socket => string.IsNullOrEmpty(socket.name) || string.IsNullOrEmpty(socket.parent) || !Finite(socket.position,3) || !Finite(socket.worldMatrix,16))
                || contract.clips?.Length != 3 || !contract.clips.Select(clip => clip.name).OrderBy(name => name).SequenceEqual(new[] { "Boost", "Flight", "Glide" })
                || contract.clips.Any(clip => !(clip.durationSeconds > 0) || float.IsInfinity(clip.durationSeconds) || clip.channels == null || clip.channels.Length == 0
                    || clip.channels.Any(channel => !contract.bones.Contains(channel.bone) || !new[] { "rotation", "translation", "scale" }.Contains(channel.path)))
                || contract.bounds == null || !Finite(contract.bounds.min,3) || !Finite(contract.bounds.max,3) || !Finite(contract.bounds.size,3)
                || contract.coordinateSystem == null || contract.coordinateSystem.metersPerUnit != 1 || contract.coordinateSystem.sourceForward != "+Z"
                || contract.coordinateSystem.sourceUp != "+Y" || contract.coordinateSystem.gameplayForward != "+Z" || contract.coordinateSystem.sourceBasisYawDegrees != 0)
                throw new InvalidDataException("Missing or invalid measured Oscar contract. Prepare its additive intake first.");
            var profile=contract.presentation;
            if (profile == null || !contract.bones.Contains(profile.jawBone) || !Finite(profile.jawAxis,3)
                || new Vector3(profile.jawAxis[0],profile.jawAxis[1],profile.jawAxis[2]).sqrMagnitude < .0001f
                || !Finite(new[] { profile.jawScale,profile.jawMinRadians,profile.jawMaxRadians,contract.contactY },4)
                || Mathf.Abs(profile.jawScale)<.0001f || profile.jawMinRadians>=profile.jawMaxRadians || profile.sampleRate<1 || profile.sampleRate>120
                || profile.damageSockets?.Length != 3 || profile.damageSockets.Any(name => !contract.sockets.Any(socket => socket.name == name))
                || Mathf.Abs(contract.contactY-contract.sockets.Single(socket => socket.name == "socket_ground").position[1])>.0001f)
                throw new InvalidDataException("Oscar presentation/contact mapping is missing or invalid.");
            return contract;
        }
        static DragonRigProfile RuntimeProfile(OscarContract contract)
        {
            var p=contract.presentation;
            return new DragonRigProfile { id=contract.rigProfile,
                animatedNodes=contract.clips.SelectMany(clip=>clip.channels).Select(channel=>channel.bone).Distinct().ToArray(),
                jawBone=p.jawBone, jawAxis=new Vector3(p.jawAxis[0],-p.jawAxis[1],-p.jawAxis[2]),
                jawScale=p.jawScale,jawMinRadians=p.jawMinRadians,jawMaxRadians=p.jawMaxRadians,sampleRate=p.sampleRate,damageSockets=p.damageSockets };
            // Rotation axes are axial vectors: glTFast X mirroring keeps X and reverses Y/Z.
        }
        [Serializable] sealed class MaterialContract { public int schemaVersion; public ModelContract[] models; }
        [Serializable] sealed class ModelContract { public string file, sha256; public MaterialDefinition[] materials; }
        [Serializable] sealed class MaterialDefinition
        {
            public int index; public string name; public bool hasEmissionStrength, hasBaseColorMap, hasNormalMap, hasOcclusionMap;
            public float[] sourceFactor, effectiveFactor; public float strength, clearcoat, normalScale, metallicFactor, roughnessFactor;
        }
        [Serializable] public sealed class MaterialEvidence
        {
            public string name, shader, generatedMaterial;
            public bool hasEmissionStrength, hasNormalMap;
            public float strength, clearcoat, importedNormalScale;
            public float[] sourceFactor, effectiveFactor;
            public int slots;
        }
        [Serializable] public sealed class ModelEvidence
        {
            public int renderers, skinnedRenderers, materials; public long triangles;
            public string[] clips, sockets, bones; public float[] clipSeconds;
            public MaterialEvidence[] materialAudit;
        }
        [Serializable] public sealed class SetupReceipt
        {
            public string unityVersion, createdUtc, scene, sourceSha256, colorSpace, coordinates, dragonVersion, rigProfile, configuredMeshDeformation;
            public string meshDeformationScope = "Configured player setting; actual execution and fallback require separate WebGPU/WebGL2 player checks.";
            public string[] graphicsAPIs;
            public string configuredSkinWeights; public string[] configuredSkinWeightsByQuality;
            public ModelEvidence dragon, drone;
            public OscarFullWeightMeshes.Evidence fullSkinWeights;
            public OscarMechanicalAccessories.Evidence mechanicalAccessories;
            public string textureMode, presentationVersion;
            public OscarCompressedTextures.Evidence compressedTextures;
            public int asteroidLayer, msaaSamples, backgroundStars = 5200, backgroundStarDraws = 1;
            public float renderScale, collisionRadius, contactY, missileDamage;
            public string visibleSky = "Unfiltered 2048px sRGB panoramic JPEG; separate filtered 512px reflection cube; identical pinned source bytes.";
            public string inspectionStatus = "SETUP ONLY: actual player loading, rendering and gameplay require separate observed checks.";
        }
        [Serializable] public sealed class BuildReceipt
        {
            public string unityVersion, createdUtc, target, output, result, scene, sourceSha256, dragonVersion, configuredMeshDeformation, originalMeshDeformation, restoredMeshDeformation;
            public string meshDeformationScope = "Configured player setting; actual execution and fallback require separate WebGPU/WebGL2 player checks.";
            public string[] graphicsAPIs; public ulong bytes; public double durationSeconds;
            public string configuredSkinWeights; public string[] configuredSkinWeightsByQuality, originalSkinWeightsByQuality, restoredSkinWeightsByQuality;
            public bool developmentBuild, settingsRestored;
            public string textureMode, presentationVersion;
            public string mechanicalAccessoriesSha256;
        }

        [MenuItem("Space Dragon/Dogfight/Generate separate Dogfight scene")]
        public static void Setup()
        {
            CanGenerate();
            if (!Application.isBatchMode && !EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            var settings = new SharedSettings();
            try { GenerateScene(); }
            finally { settings.Restore(); }
        }

        static void CanGenerate()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode) throw new InvalidOperationException("Exit Play mode before generating Dogfight.");
        }

        static SetupReceipt GenerateScene()
        {
            VerifyIntake();
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            Folder(Generated);
            ConfigurePlayer();
            ConfigureMeshDeformation();
            var pipeline = ConfigurePipeline();
            ConfigureModelImport(DragonPath);
            ConfigureModelImport(DronePath);
            if (UsesOscarAccessories) ConfigureModelImport(OscarMechanicalPath);
            ConfigureTextures();
            var organic = UsesOrganicCandidate;
            var oscar = UsesOscarCandidate;
            var oscarContract = oscar ? ReadOscarContract() : null;
            var contract = JsonUtility.FromJson<MaterialContract>(File.ReadAllText(Root + (oscar ? "/material-contract-v005.json" : organic ? "/material-contract-v004.json" : "/material-contract-v003.json")));
            if (contract?.schemaVersion != 1 || contract.models?.Length != 2) throw new InvalidDataException("Unexpected Dogfight material contract.");
            var dragonSource = Prefab(DragonPath);
            var droneSource = Prefab(DronePath);
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            ConfigureLighting();
            RetainRuntimeShaderVariants();

            // The GLB remains at its authored metre scale and origin. glTFast has
            // already converted handedness. Mechanical/violet use one Y180
            // adapter for their -Z nose; Oscar is already +Z and uses identity.
            var player = new GameObject("Dragon.GameplayRoot.+Z-metres").transform;
            var collision = player.gameObject.AddComponent<SphereCollider>();
            collision.radius = 3.3f; collision.center = Vector3.zero; collision.isTrigger = true;
            var motion = Child("Dragon.VisualMotion.bank-roll", player);
            var basis = Child(oscar ? "Dragon.SourceBasis.plusZ.identity" : "Dragon.SourceBasis.minusZ-to-plusZ.Y180", motion);
            basis.localRotation = Quaternion.Euler(0, oscar ? oscarContract.coordinateSystem.sourceBasisYawDegrees : 180, 0);
            var dragon = (GameObject)PrefabUtility.InstantiatePrefab(dragonSource);
            dragon.name = oscar ? "DragonOscar.v001.Authored" : organic ? "DragonViolet.v007.Organic" : "DragonHeroic.v005.Authored";
            dragon.transform.SetParent(basis, false);
            SetRendererDefaults(dragon);
            var dragonMaterials = ApplyMaterialParity(dragon, DragonPath, contract);
            var textureMode = oscar ? OscarCompressedTextures.SelectedMode : "source";
            var compressedTextures = oscar && textureMode == "bc7"
                ? OscarCompressedTextures.Prepare(dragon,DragonPath,oscarContract.sha256,Generated) : null;
            var clips = AssetDatabase.LoadAllAssetsAtPath(DragonPath).OfType<AnimationClip>().ToArray();
            var fullSkinWeights = oscar ? OscarFullWeightMeshes.Restore(dragon,clips,oscarContract.sha256,Generated) : null;
            AnimationClip Clip(string name) => clips.SingleOrDefault(c => c.name == name) ?? throw new InvalidDataException("Imported dragon lost " + name);
            ValidateDragon(dragon, clips);
            var dragonBodyEvidence = Evidence(dragon, clips, dragonMaterials, true);
            OscarMechanicalAccessories.Evidence mechanicalAccessories = null;
            if (UsesOscarAccessories)
            {
                var addon = ReadMechanicalContract();
                mechanicalAccessories = OscarMechanicalAccessories.Prepare(dragon, Prefab(OscarMechanicalPath),
                    OscarMechanicalPath, addon.sha256, Generated);
                if (mechanicalAccessories.triangles != addon.triangles)
                    throw new InvalidDataException("Oscar accessory triangle count changed on import.");
            }

            // Correct the drone's existing amber reactor extension too. The
            // generated prefab references immutable geometry and corrected cloned
            // materials; no imported glTF subasset is modified.
            var drone = (GameObject)PrefabUtility.InstantiatePrefab(droneSource);
            drone.name = "Drone.v001.WithSourceEmission";
            SetRendererDefaults(drone);
            var droneMaterials = ApplyMaterialParity(drone, DronePath, contract);
            var droneEvidence = Evidence(drone, Array.Empty<AnimationClip>(), droneMaterials, false);
            var dronePrefab = PrefabUtility.SaveAsPrefabAsset(drone, Generated + "/Drone.prefab");
            Object.DestroyImmediate(drone);
            if (dronePrefab == null) throw new IOException("Could not save Dogfight drone derivative.");

            var camera = new GameObject("Dogfight.Camera.stable-flight-frame").AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.allowHDR = true; camera.allowMSAA = true;
            camera.nearClipPlane = .1f; camera.farClipPlane = 90000;
            camera.clearFlags = CameraClearFlags.Skybox;
            camera.fieldOfView = 61;
            camera.transform.position = new Vector3(0, ChaseCameraState.CruiseHeight, -ChaseCameraState.CruiseDistance);
            camera.transform.LookAt(new Vector3(0, ChaseCameraState.LookHeight, ChaseCameraState.LookAhead));
            var cameraData = camera.GetUniversalAdditionalCameraData();
            cameraData.renderPostProcessing = true;
            cameraData.antialiasing = AntialiasingMode.None; // URP forward 2x MSAA; no second blur pass.
            camera.gameObject.AddComponent<AudioListener>();
            var tuningPath = Generated + "/DogfightTuning.asset";
            var tuning = AssetDatabase.LoadAssetAtPath<DogfightTuning>(tuningPath);
            if (tuning == null)
            {
                tuning = ScriptableObject.CreateInstance<DogfightTuning>();
                tuning.MissileDamage = 120; // Two hits against the encounter's 216-health drones.
                AssetDatabase.CreateAsset(tuning, tuningPath);
            }
            tuning.EnsureCombatDefaults();
            // Persist newly declared fields as well as the versioned combat migration.
            // Marking dirty preserves every existing value; it does not reset tuning.
            EditorUtility.SetDirty(tuning);
            Directory.CreateDirectory("Builds");
            File.WriteAllText("Builds/dogfight-combat-tuning.json", JsonUtility.ToJson(tuning, true));
            var host = new GameObject("DogfightEncounter").AddComponent<DogfightEncounter>();
            host.UseAuthoredArmor = true; // Both candidates own their surfaces; no generated armor overlay.
            host.UseOrganicDragon = organic;
            host.UseSpacecraftDragon = oscar;
            host.DragonTextureMode = textureMode;
            if (oscar)
            {
                host.MeasuredDragonProfile = RuntimeProfile(oscarContract);
                host.DragonAttribution = AssetDatabase.LoadAssetAtPath<TextAsset>(Imported + "/dragon-oscar-v001-NOTICE.txt");
                if (host.DragonAttribution == null) throw new InvalidDataException("Oscar player attribution must be included in the generated scene.");
            }
            // These serialized scene references preserve URP/Lit and URP/Unlit
            // variants used by runtime VFX. Runtime owns the asteroid instances
            // and simple sphere colliders on layer 8, never render-mesh colliders.
            host.RockMaterial = Material("Asteroid rock", new Color(.23f, .20f, .18f), .02f, .23f);
            DogfightEnvironmentArt.Rock(host.RockMaterial);
            host.ProjectileMaterial = Material("Plasma projectile", new Color(4, .65f, .08f), 0, 0, true);
            host.EnemyProjectileMaterial = Material("Enemy plasma", new Color(4, .16f, .035f), 0, 0, true);
            host.SalvageMaterial = Material("Recoverable salvage", new Color(.06f, 2.2f, 2.5f), 0, 0, true);
            host.Configure(player, motion, dragon.transform, dronePrefab, camera, tuning,
                Clip("Flight"), Clip("Glide"), Clip("Boost"),
                Audio("dragon-roar"), Audio("fire-breath"), Audio("machine-blast"), Audio("metal-impact"), Audio("jet-surge"));
            EditorUtility.SetDirty(host);
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, ScenePath)) throw new IOException("Failed to save generated Dogfight scene.");
            AssetDatabase.SaveAssets();
            var receipt = new SetupReceipt
            {
                unityVersion = Application.unityVersion, createdUtc = DateTime.UtcNow.ToString("O"), scene = ScenePath,
                sourceSha256 = DragonHash, colorSpace = PlayerSettings.colorSpace.ToString(),
                dragonVersion = SelectedAsset, rigProfile = oscar ? oscarContract.rigProfile : organic ? "violet-organic-15" : "mechanical-9",
                configuredMeshDeformation = PlayerSettings.meshDeformation.ToString(),
                configuredSkinWeights = QualitySettings.skinWeights.ToString(),
                configuredSkinWeightsByQuality = oscar ? CaptureSkinWeights().Select(value=>value.ToString()).ToArray() : null,
                graphicsAPIs = PlayerSettings.GetGraphicsAPIs(BuildTarget.WebGL).Select(a => a.ToString()).ToArray(),
                dragon = dragonBodyEvidence, drone = droneEvidence,
                fullSkinWeights = fullSkinWeights, mechanicalAccessories = mechanicalAccessories,
                textureMode = textureMode, compressedTextures = compressedTextures, presentationVersion = PresentationVersion,
                coordinates = oscar ? "Metres/+Y up/+Z gameplay. GameplayRoot -> visual bank/roll -> identity source basis -> measured +Z GLB; glTFast performs handedness conversion. Source normalization is already baked."
                    : "Metres/+Y up/+Z gameplay. GameplayRoot -> visual bank/roll -> single Y180 source basis -> unchanged -Z GLB; glTFast performs handedness conversion.",
                asteroidLayer = AsteroidLayer, msaaSamples = pipeline.msaaSampleCount, renderScale = pipeline.renderScale,
                collisionRadius = 3.3f, contactY = oscar ? oscarContract.contactY : organic ? ReadVioletContract().contactY : -.665026843547821f, missileDamage = tuning.MissileDamage
            };
            Directory.CreateDirectory("Builds");
            File.WriteAllText("Builds/dogfight-setup-receipt.json", JsonUtility.ToJson(receipt, true));
            Debug.Log("SPACE_DRAGON_DOGFIGHT_SETUP_OK " + ScenePath);
            return receipt;
        }

        static void VerifyIntake()
        {
            var organic = UsesOrganicCandidate;
            var oscar = UsesOscarCandidate;
            var receiptPath = Root + (oscar ? "/asset-receipt-v005.json" : organic ? "/asset-receipt-v004.json" : "/asset-receipt-v003.json");
            if (!File.Exists(receiptPath)) throw new FileNotFoundException("Prepare the selected versioned Dogfight intake before generation.", receiptPath);
            var receipt = JsonUtility.FromJson<IntakeReceipt>(File.ReadAllText(receiptPath));
            if (receipt == null || receipt.files == null || receipt.sourceFiles == null
                || (oscar ? receipt.schemaVersion != 5 || receipt.previousReceipt != "asset-receipt-v004.json" || receipt.rigProfile != "oscar-creativo-flight"
                    : organic ? receipt.schemaVersion != 4 || receipt.previousReceipt != "asset-receipt-v003.json" || receipt.rigProfile != "violet-organic-15"
                    : receipt.schemaVersion != 3 || receipt.sourceFiles.Length != 12 || receipt.files.Length != 17))
                throw new InvalidDataException("Unexpected Dogfight intake receipt; review the prepared source contract.");
            if (receipt.files.Select(file => file.destination).Distinct().Count() != receipt.files.Length)
                throw new InvalidDataException("Duplicate intake destinations.");
            if (organic)
                foreach (var required in new[] { "asset-receipt-v003.json", "Imported/dragon-violet-v007.glb", "violet-contract-v007.json", "material-contract-v004.json", "violet-export-receipt-v007.json" })
                    if (!receipt.files.Any(file => file.destination == required)) throw new InvalidDataException("Organic intake is missing " + required);
            if (oscar)
                foreach (var required in new[] { "asset-receipt-v004.json", "Imported/dragon-oscar-v001.glb", "oscar-contract-v001.json", "material-contract-v005.json", "oscar-export-receipt-v001.json", "Imported/dragon-oscar-v001-NOTICE.txt", "oscar-provenance-v001.json", "Editor/oscar-fullweights-v001.json", "Editor/oscar-fullweights-v001.bytes" })
                    if (!receipt.files.Any(file => file.destination == required)) throw new InvalidDataException("Oscar intake is missing " + required);
            foreach (var file in receipt.files)
            {
                var absolute = Path.GetFullPath(Root + "/" + file.destination);
                if (!absolute.StartsWith(Path.GetFullPath(Root) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException("Intake path escaped its own folder.");
                if (!File.Exists(absolute) || new FileInfo(absolute).Length != file.bytes || Hash(absolute) != file.sha256)
                    throw new InvalidDataException("Prepared asset changed: " + file.destination + ". Preserve edits and choose a new intake version.");
            }
            long expectedBytes = oscar ? ReadOscarContract().bytes : organic ? ReadVioletContract().bytes : ReadHeroicContract().bytes;
            if (Hash(DragonPath) != DragonHash || new FileInfo(DragonPath).Length != expectedBytes)
                throw new InvalidDataException("Dragon GLB differs from its selected measured intake.");
        }

        static string Hash(string file)
        {
            using (var sha = SHA256.Create())
            using (var stream = File.OpenRead(file))
                return string.Concat(sha.ComputeHash(stream).Select(value => value.ToString("x2")));
        }

        static void ConfigurePlayer()
        {
            PlayerSettings.productName = "Space Dragon Dogfight";
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.defaultScreenWidth = 1366; PlayerSettings.defaultScreenHeight = 768;
            PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
            PlayerSettings.runInBackground = false;
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.WebGL, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL, new[] { GraphicsDeviceType.WebGPU, GraphicsDeviceType.OpenGLES3 });
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.StandaloneWindows64, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.StandaloneWindows64, new[] { GraphicsDeviceType.Direct3D11 });
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Standalone, ScriptingImplementation.Mono2x);
            PlayerSettings.WebGL.template = "PROJECT:Dogfight";
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
            PlayerSettings.WebGL.initialMemorySize = 128; PlayerSettings.WebGL.maximumMemorySize = 512;
            QualitySettings.vSyncCount = 0;
            if (UsesOscarCandidate)
                ApplySkinWeights(Enumerable.Repeat(SkinWeights.Unlimited,QualitySettings.names.Length).ToArray(),QualitySettings.GetQualityLevel());
        }

        // WebGL defaults to a different quality level than the Editor. Scope all
        // levels to Unlimited during this build, then restore every value. Oscar
        // renderers use Auto; Bone4 would silently truncate the restored meshes.
        static SkinWeights[] CaptureSkinWeights()
        {
            int current=QualitySettings.GetQualityLevel();
            var result=new SkinWeights[QualitySettings.names.Length];
            try { for(int i=0;i<result.Length;i++) { QualitySettings.SetQualityLevel(i,false); result[i]=QualitySettings.skinWeights; } }
            finally { QualitySettings.SetQualityLevel(current,false); }
            return result;
        }
        static void ApplySkinWeights(SkinWeights[] values,int selected)
        {
            try { for(int i=0;i<values.Length;i++) { QualitySettings.SetQualityLevel(i,false); QualitySettings.skinWeights=values[i]; } }
            finally { QualitySettings.SetQualityLevel(selected,false); }
        }

        static void ConfigureMeshDeformation()
        {
            // Unity 6000.6's supported API replaces the legacy gpuSkinning flag.
            // This is scoped to generated Dogfight players and restored afterward.
            // Keep a CPU build available for a measured A/B or backend rollback.
            var requested = Environment.GetEnvironmentVariable("SPACE_DRAGON_DOGFIGHT_SKINNING");
            if (!string.IsNullOrEmpty(requested) && !string.Equals(requested, "cpu", StringComparison.OrdinalIgnoreCase))
                throw new InvalidDataException("SPACE_DRAGON_DOGFIGHT_SKINNING accepts cpu; unset it for GPUBatched.");
            PlayerSettings.meshDeformation = string.IsNullOrEmpty(requested) ? MeshDeformation.GPUBatched : MeshDeformation.CPU;
        }

        static UniversalRenderPipelineAsset ConfigurePipeline()
        {
            var rendererPath = Generated + "/DogfightRenderer.asset";
            var renderer = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(rendererPath);
            if (renderer == null) { renderer = ScriptableObject.CreateInstance<UniversalRendererData>(); AssetDatabase.CreateAsset(renderer, rendererPath); }
            renderer.postProcessData = AssetDatabase.LoadAssetAtPath<PostProcessData>("Packages/com.unity.render-pipelines.universal/Runtime/Data/PostProcessData.asset");
            if (renderer.postProcessData == null) throw new InvalidDataException("Pinned URP PostProcessData asset is missing.");
            var pipelinePath = Generated + "/DogfightURP.asset";
            var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(pipelinePath);
            if (pipeline == null) { pipeline = UniversalRenderPipelineAsset.Create(renderer); AssetDatabase.CreateAsset(pipeline, pipelinePath); }
            pipeline.renderScale = 1; pipeline.msaaSampleCount = 2; pipeline.supportsHDR = true;
            pipeline.mainLightShadowmapResolution = 1024; pipeline.shadowDistance = 90; pipeline.shadowCascadeCount = 2;
            var settings = new SerializedObject(pipeline);
            Required(settings, "m_MainLightShadowsSupported").boolValue = true;
            Required(settings, "m_AdditionalLightShadowsSupported").boolValue = false;
            Required(settings, "m_SoftShadowsSupported").boolValue = true;
            Required(settings, "m_AdditionalLightsRenderingMode").intValue = (int)LightRenderingMode.PerPixel;
            var any = settings.FindProperty("m_AnyShadowsSupported"); if (any != null) any.boolValue = true;
            settings.ApplyModifiedPropertiesWithoutUndo();
            pipeline.maxAdditionalLightsCount = 4; pipeline.useSRPBatcher = true;
            GraphicsSettings.defaultRenderPipeline = pipeline; QualitySettings.renderPipeline = pipeline;
            EditorUtility.SetDirty(renderer); EditorUtility.SetDirty(pipeline);
            DogfightGltfImportScope.ResetCaches();
            // Import workers load settings independently. The scoped postprocessor
            // selects this same pipeline locally before creating glTF materials.
            AssetDatabase.SaveAssets();
            return pipeline;
        }

        static void ConfigureModelImport(string path)
        {
            AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
            var importer = AssetImporter.GetAtPath(path) ?? throw new FileNotFoundException("glTFast import is missing.", path);
            var settings = new SerializedObject(importer);
            Required(settings, "importSettings.animationMethod").intValue = 2; // Supported Mecanim import; render adapter owns sampling.
            Required(settings, "importSettings.nodeNameMethod").intValue = 1;
            Required(settings, "importSettings.generateMipMaps").boolValue = true;
            Required(settings, "instantiationSettings.skinUpdateWhenOffscreen").boolValue = true;
            // The animated body receives an identity scene wrapper automatically.
            // glTFast omits it on a single-root, animation-free accessory unless
            // requested; keep both normalized OscarAssetRoots inside wrappers.
            if (path == OscarMechanicalPath)
                Required(settings, "instantiationSettings.sceneObjectCreation").intValue = 1; // Always
            settings.ApplyModifiedPropertiesWithoutUndo(); importer.SaveAndReimport();
        }

        static void ConfigureTextures()
        {
            var sky = AssetImporter.GetAtPath(Imported + "/nebula.jpg") as TextureImporter;
            if (sky == null) throw new InvalidDataException("Prepared nebula texture is missing.");
            sky.textureShape = TextureImporterShape.TextureCube;
            sky.generateCubemap = TextureImporterGenerateCubemap.AutoCubemap;
            var settings = new TextureImporterSettings(); sky.ReadTextureSettings(settings);
            settings.cubemapConvolution = TextureImporterCubemapConvolution.Specular;
            sky.SetTextureSettings(settings); sky.sRGBTexture = true; sky.mipmapEnabled = true; sky.maxTextureSize = 512;
            sky.SaveAndReimport();
            var visible = AssetImporter.GetAtPath(Imported + "/nebula-sky.jpg") as TextureImporter;
            if (visible == null || Hash(Imported + "/nebula-sky.jpg") != Hash(Imported + "/nebula.jpg"))
                throw new InvalidDataException("Run the v002 Dogfight intake for the unchanged visible-sky JPEG copy.");
            visible.textureShape = TextureImporterShape.Texture2D;
            visible.sRGBTexture = true; visible.mipmapEnabled = true; visible.maxTextureSize = 2048;
            visible.textureCompression = TextureImporterCompression.Uncompressed;
            visible.wrapModeU = TextureWrapMode.Repeat; visible.wrapModeV = TextureWrapMode.Clamp;
            visible.SaveAndReimport();
            var planet = AssetImporter.GetAtPath(Imported + "/planet.jpg") as TextureImporter;
            if (planet == null) throw new InvalidDataException("Prepared planet texture is missing.");
            planet.sRGBTexture = true; planet.mipmapEnabled = true; planet.maxTextureSize = 1024;
            planet.wrapMode = TextureWrapMode.Repeat; planet.SaveAndReimport();
        }

        static void ConfigureLighting()
        {
            Light Directional(string name, Vector3 from, Color color, float intensity, bool shadow)
            {
                var light = new GameObject(name).AddComponent<Light>();
                light.type = LightType.Directional; light.color = color; light.intensity = intensity;
                light.transform.rotation = Quaternion.LookRotation(-from.normalized);
                light.shadows = shadow ? LightShadows.Soft : LightShadows.None;
                light.shadowBias = .035f; light.shadowNormalBias = .25f;
                return light;
            }
            // Preserve the authored Oscar PBR maps. Shape its highlights with the
            // light rig rather than flattening metallic/roughness or repainting it.
            bool oscar = UsesOscarCandidate;
            RenderSettings.sun = Directional("Space.key.warm", new Vector3(-30, 45, 25), new Color(1, .94f, .86f), oscar ? 2.6f : 3.2f, true);
            Directional("Space.rim.neutral", new Vector3(20, 8, -35), new Color(.84f, .88f, 1), oscar ? .75f : 1.3f, false);
            Directional("Space.fill.planet-bounce", new Vector3(-20, -10, -20),
                oscar ? new Color(.56f, .69f, .9f) : new Color(.96f, .85f, .72f), oscar ? .4f : .65f, false);
            var cube = AssetDatabase.LoadAssetAtPath<Cubemap>(Imported + "/nebula.jpg") ?? throw new InvalidDataException("Nebula cubemap import failed.");
            var panorama = AssetDatabase.LoadAssetAtPath<Texture2D>(Imported + "/nebula-sky.jpg") ?? throw new InvalidDataException("Visible panoramic sky import failed.");
            var sky = MaterialAsset("Nebula sky", "Skybox/Panoramic");
            sky.SetTexture("_MainTex", panorama); sky.SetColor("_Tint", Color.gray);
            sky.SetFloat("_Exposure", 1.05f); sky.SetFloat("_Rotation", 0); sky.SetFloat("_Mapping", 1); sky.SetFloat("_ImageType", 0);
            RenderSettings.skybox = sky; RenderSettings.fog = false;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(.20f, .21f, .23f);
            RenderSettings.ambientEquatorColor = new Color(.11f, .115f, .125f);
            RenderSettings.ambientGroundColor = new Color(.055f, .05f, .045f);
            RenderSettings.defaultReflectionMode = DefaultReflectionMode.Custom;
            RenderSettings.customReflectionTexture = cube; RenderSettings.reflectionIntensity = oscar ? .25f : .42f;
            CreateStarfield();
            var planet = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            planet.name = "Near orbit planet.visual-only";
            planet.transform.position = new Vector3(0, -26800, 0); planet.transform.localScale = Vector3.one * 52000;
            Object.DestroyImmediate(planet.GetComponent<Collider>());
            var surface = Material("Planet surface", new Color(.6f, .7f, .85f), 0, .22f);
            surface.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(Imported + "/planet.jpg"));
            var renderer = planet.GetComponent<Renderer>(); renderer.sharedMaterial = surface;
            renderer.shadowCastingMode = ShadowCastingMode.Off; renderer.receiveShadows = false;
            DogfightEnvironmentArt.Planet(planet, surface);
            var profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(Generated + "/SpaceGrade.asset");
            if (profile == null) { profile = ScriptableObject.CreateInstance<VolumeProfile>(); AssetDatabase.CreateAsset(profile, Generated + "/SpaceGrade.asset"); }
            Volume<Tonemapping>(profile).mode.Override(TonemappingMode.ACES);
            Volume<ColorAdjustments>(profile).postExposure.Override(oscar ? 0 : .14f);
            var bloom = Volume<Bloom>(profile); bloom.threshold.Override(1.15f); bloom.intensity.Override(.28f); bloom.scatter.Override(.55f);
            var volume = new GameObject("Space.global-grade").AddComponent<Volume>(); volume.isGlobal = true; volume.sharedProfile = profile;
            EditorUtility.SetDirty(profile); EditorUtility.SetDirty(sky); EditorUtility.SetDirty(surface);
        }

        static void CreateStarfield()
        {
            // The supplied nebula contains NO stars. The original Three scene
            // supplied 5,200 separate points. Preserve that visual density with
            // one combined unlit mesh, not 5,200 objects or additional lights.
            const int count = 5200;
            var vertices = new Vector3[count * 4]; var triangles = new int[count * 6];
            var rng = new System.Random(983);
            for (int i = 0; i < count; i++)
            {
                float angle = (float)rng.NextDouble() * Mathf.PI * 2;
                float y = (float)rng.NextDouble() * 2 - 1;
                float radius = 13000 + (float)rng.NextDouble() * 7000;
                float xz = Mathf.Sqrt(1 - y * y);
                var direction = new Vector3(Mathf.Cos(angle) * xz, y, Mathf.Sin(angle) * xz);
                var center = direction * radius;
                var right = Vector3.Cross(direction, Mathf.Abs(y) > .98f ? Vector3.right : Vector3.up).normalized;
                var up = Vector3.Cross(right, direction).normalized;
                float halfSize = 5 + Mathf.Pow((float)rng.NextDouble(), 3) * 15;
                right *= halfSize; up *= halfSize;
                int v = i * 4, t = i * 6;
                vertices[v] = center - right - up; vertices[v + 1] = center + right - up;
                vertices[v + 2] = center + right + up; vertices[v + 3] = center - right + up;
                // Winding faces the inside of the background sphere.
                triangles[t] = v; triangles[t + 1] = v + 1; triangles[t + 2] = v + 2;
                triangles[t + 3] = v; triangles[t + 4] = v + 2; triangles[t + 5] = v + 3;
            }
            var meshPath = Generated + "/Starfield5200.asset";
            var mesh = AssetDatabase.LoadAssetAtPath<Mesh>(meshPath);
            if (mesh == null) { mesh = new Mesh(); AssetDatabase.CreateAsset(mesh, meshPath); }
            mesh.Clear(); mesh.name = "Space 5200 star quads.single-draw";
            mesh.vertices = vertices; mesh.triangles = triangles; mesh.RecalculateBounds();
            var stars = new GameObject("Space.starfield.background-only");
            stars.AddComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = stars.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = Material("Distant stars", new Color(1.4f, 1.5f, 1.65f), 0, 0, true);
            renderer.shadowCastingMode = ShadowCastingMode.Off; renderer.receiveShadows = false;
            renderer.lightProbeUsage = LightProbeUsage.Off; renderer.reflectionProbeUsage = ReflectionProbeUsage.Off;
            EditorUtility.SetDirty(mesh);
        }

        static T Volume<T>(VolumeProfile profile) where T : VolumeComponent
        {
            if (profile.TryGet<T>(out var existing)) return existing;
            var item = profile.Add<T>(true); AssetDatabase.AddObjectToAsset(item, profile); return item;
        }
        static void RetainRuntimeShaderVariants()
        {
            // Runtime smoke uses a shader_feature variant, not just an Unlit
            // shader reference. An opaque material alone can allow its transparent
            // variant to be stripped. This inactive scene reference retains the
            // exact blend/keyword configuration without issuing any draw calls.
            var material = Material("Runtime smoke transparent variant", new Color(.075f, .087f, .095f, .3f), 0, 0, true);
            material.SetFloat("_Surface", 1); material.SetFloat("_Blend", 0); material.SetFloat("_ZWrite", 0);
            material.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha); material.SetFloat("_DstBlend", (float)BlendMode.OneMinusSrcAlpha);
            material.EnableKeyword("_SURFACE_TYPE_TRANSPARENT"); material.renderQueue = (int)RenderQueue.Transparent;
            material.SetOverrideTag("RenderType", "Transparent"); EditorUtility.SetDirty(material);
            var anchor = GameObject.CreatePrimitive(PrimitiveType.Quad);
            anchor.name = "Runtime shader variants.retained-not-rendered";
            Object.DestroyImmediate(anchor.GetComponent<Collider>());
            var renderer = anchor.GetComponent<Renderer>(); renderer.sharedMaterial = material;
            renderer.shadowCastingMode = ShadowCastingMode.Off; renderer.receiveShadows = false;
            renderer.enabled = false; anchor.SetActive(false);
            foreach(string shader in new[]{"SpaceDragon/Dogfight/Weapon Energy","SpaceDragon/Dogfight/Spacecraft Wing","SpaceDragon/Dogfight/Wing Exhaust"})
            {
                var retained=MaterialAsset(shader.Substring(shader.LastIndexOf('/')+1)+".runtime-retained",shader);
                var holder=GameObject.CreatePrimitive(PrimitiveType.Quad);holder.name=shader+".retained-not-rendered";
                Object.DestroyImmediate(holder.GetComponent<Collider>());holder.GetComponent<Renderer>().sharedMaterial=retained;
                holder.GetComponent<Renderer>().enabled=false;holder.SetActive(false);
            }
        }
        static Transform Child(string name, Transform parent) { var item = new GameObject(name).transform; item.SetParent(parent, false); return item; }
        static GameObject Prefab(string path) => AssetDatabase.LoadAssetAtPath<GameObject>(path) ?? throw new InvalidDataException("glTFast failed to create prefab " + path);
        static SerializedProperty Required(SerializedObject owner, string path) => owner.FindProperty(path) ?? throw new InvalidOperationException("Pinned importer/pipeline setting changed: " + path);
        static void Folder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            Folder(Path.GetDirectoryName(path).Replace('\\', '/')); AssetDatabase.CreateFolder(Path.GetDirectoryName(path).Replace('\\', '/'), Path.GetFileName(path));
        }
        static Material MaterialAsset(string name, string shaderName)
        {
            var shader = Shader.Find(shaderName) ?? throw new InvalidDataException("Required shader is missing: " + shaderName);
            var path = Generated + "/" + name + ".mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null) { material = new Material(shader); AssetDatabase.CreateAsset(material, path); }
            material.shader = shader; material.name = name; return material;
        }
        static Material Material(string name, Color color, float metallic, float smoothness, bool unlit = false)
        {
            var material = MaterialAsset(name, unlit ? "Universal Render Pipeline/Unlit" : "Universal Render Pipeline/Lit");
            material.SetColor("_BaseColor", color);
            if (!unlit) { material.SetFloat("_Metallic", metallic); material.SetFloat("_Smoothness", smoothness); }
            EditorUtility.SetDirty(material); return material;
        }
        static AudioClip Audio(string id)
        {
            var path = Imported + "/AudioV002/" + id + "-v002.wav";
            var importer = AssetImporter.GetAtPath(path) as AudioImporter ?? throw new FileNotFoundException("Missing prepared audio.", path);
            importer.forceToMono = false; // Preserve the authored width of the v002 layered cues.
            var settings = importer.defaultSampleSettings; settings.loadType = AudioClipLoadType.DecompressOnLoad;
            settings.compressionFormat = AudioCompressionFormat.PCM; settings.sampleRateSetting = AudioSampleRateSetting.PreserveSampleRate;
            importer.defaultSampleSettings = settings; importer.SaveAndReimport();
            return AssetDatabase.LoadAssetAtPath<AudioClip>(path) ?? throw new InvalidDataException("Audio import failed: " + path);
        }

        static void SetRendererDefaults(GameObject instance)
        {
            foreach (var renderer in instance.GetComponentsInChildren<Renderer>(true)) { renderer.shadowCastingMode = ShadowCastingMode.On; renderer.receiveShadows = true; }
            foreach (var skin in instance.GetComponentsInChildren<SkinnedMeshRenderer>(true)) skin.updateWhenOffscreen = true;
            foreach (var animator in instance.GetComponentsInChildren<Animator>(true)) { animator.applyRootMotion = false; animator.cullingMode = AnimatorCullingMode.AlwaysAnimate; animator.enabled = false; }
            foreach (var animation in instance.GetComponentsInChildren<Animation>(true)) { animation.playAutomatically = false; animation.enabled = false; }
        }

        static MaterialEvidence[] ApplyMaterialParity(GameObject instance, string source, MaterialContract contract)
        {
            var definition = contract.models.SingleOrDefault(item => item.file == Path.GetFileName(source));
            if (definition == null || Hash(source) != definition.sha256) throw new InvalidDataException("Material contract is not bound to the imported GLB.");
            var renderers = instance.GetComponentsInChildren<Renderer>(true);
            var materials = renderers.SelectMany(r => r.sharedMaterials).Where(m => m != null).Distinct().ToArray();
            var replacements = new Dictionary<Material, Material>(); var evidence = new List<MaterialEvidence>();
            foreach (var entry in definition.materials)
            {
                var imported = materials.SingleOrDefault(m => m.name == entry.name);
                if (imported == null) throw new InvalidDataException("Imported GLB lost material " + entry.name);
                var actual = imported; string generated = "";
                if (entry.hasEmissionStrength)
                {
                    if (!imported.HasProperty("emissiveFactor") || entry.sourceFactor?.Length != 3 || entry.effectiveFactor?.Length != 3 || float.IsNaN(entry.strength) || float.IsInfinity(entry.strength) || entry.strength < 0)
                        throw new InvalidDataException("Unsupported or invalid source emission: " + entry.name);
                    generated = Generated + "/" + Path.GetFileNameWithoutExtension(source) + "-" + entry.name.Replace('/', '-') + ".mat";
                    actual = AssetDatabase.LoadAssetAtPath<Material>(generated);
                    if (actual == null) { actual = new Material(imported); AssetDatabase.CreateAsset(actual, generated); }
                    EditorUtility.CopySerialized(imported, actual); // Always reset before correction; repeated Setup never compounds energy.
                    actual.SetColor("emissiveFactor", new Color(entry.sourceFactor[0] * entry.strength, entry.sourceFactor[1] * entry.strength, entry.sourceFactor[2] * entry.strength, 1));
                    actual.EnableKeyword("_EMISSIVE"); EditorUtility.SetDirty(actual); replacements.Add(imported, actual);
                }
                if (entry.clearcoat > 0 && actual.shader.name.IndexOf("Clearcoat", StringComparison.OrdinalIgnoreCase) < 0)
                    throw new InvalidDataException("Clearcoat imported with an incompatible shader: " + entry.name + " -> " + actual.shader.name);
                if (source == VioletDragonPath || source == OscarDragonPath)
                {
                    foreach (var required in new[] { new { Required = entry.hasBaseColorMap, Property = "baseColorTexture" },
                        new { Required = entry.hasNormalMap, Property = "normalTexture" }, new { Required = entry.hasOcclusionMap, Property = "occlusionTexture" } })
                        if (required.Required && (!actual.HasProperty(required.Property) || actual.GetTexture(required.Property) == null))
                            throw new InvalidDataException("Organic imported material lost " + required.Property + ": " + entry.name);
                    if (!actual.HasProperty("metallicFactor") || !actual.HasProperty("roughnessFactor")
                        || Mathf.Abs(actual.GetFloat("metallicFactor") - entry.metallicFactor) > .001f
                        || Mathf.Abs(actual.GetFloat("roughnessFactor") - entry.roughnessFactor) > .001f)
                        throw new InvalidDataException("Organic surface response changed during import: " + entry.name);
                    if (entry.hasNormalMap && (!actual.HasProperty("normalTexture_scale") || Mathf.Abs(actual.GetFloat("normalTexture_scale") - entry.normalScale) > .001f))
                        throw new InvalidDataException("Organic normal-map strength changed during import: " + entry.name);
                }
                evidence.Add(new MaterialEvidence { name = entry.name, shader = actual.shader.name, generatedMaterial = generated,
                    hasEmissionStrength = entry.hasEmissionStrength, strength = entry.strength, sourceFactor = entry.sourceFactor,
                    effectiveFactor = entry.effectiveFactor, clearcoat = entry.clearcoat,
                    hasNormalMap = actual.HasProperty("normalTexture") && actual.GetTexture("normalTexture") != null,
                    importedNormalScale = actual.HasProperty("normalTexture_scale") ? actual.GetFloat("normalTexture_scale") : 1,
                    slots = renderers.Sum(r => r.sharedMaterials.Count(m => m == imported)) });
            }
            foreach (var renderer in renderers)
            {
                var slots = renderer.sharedMaterials;
                for (int i = 0; i < slots.Length; i++) if (slots[i] != null && replacements.TryGetValue(slots[i], out var replacement)) slots[i] = replacement;
                renderer.sharedMaterials = slots; PrefabUtility.RecordPrefabInstancePropertyModifications(renderer);
            }
            return evidence.ToArray();
        }

        static Mesh[] Meshes(GameObject model) => model.GetComponentsInChildren<MeshFilter>(true).Select(f => f.sharedMesh)
            .Concat(model.GetComponentsInChildren<SkinnedMeshRenderer>(true).Select(s => s.sharedMesh)).Where(m => m != null).ToArray();
        static long Triangles(GameObject model) => Meshes(model).Sum(mesh => Enumerable.Range(0, mesh.subMeshCount).Sum(i => (long)mesh.GetIndexCount(i) / 3));
        static ModelEvidence Evidence(GameObject model, AnimationClip[] clips, MaterialEvidence[] materials, bool dragon)
            => new ModelEvidence { renderers = model.GetComponentsInChildren<Renderer>(true).Length,
                skinnedRenderers = model.GetComponentsInChildren<SkinnedMeshRenderer>(true).Length, triangles = Triangles(model),
                materials = materials.Length, materialAudit = materials, clips = clips.Select(c => c.name).ToArray(),
                clipSeconds = clips.Select(c => c.length).ToArray(), sockets = dragon ? Sockets : Array.Empty<string>(), bones = dragon ? Bones : Array.Empty<string>() };
        static void ValidateDragon(GameObject model, AnimationClip[] clips)
        {
            if (UsesOscarCandidate) { ValidateOscarDragon(model,clips,ReadOscarContract()); return; }
            var organic = UsesOrganicCandidate;
            var measured = organic ? ReadVioletContract() : null;
            var nodes = model.GetComponentsInChildren<Transform>(true);
            foreach (var name in Bones.Concat(Sockets)) if (nodes.Count(t => t.name == name) != 1) throw new InvalidDataException("Expected one dragon node: " + name);
            long expectedTriangles = organic ? measured.instanceTriangles : ReadHeroicContract().triangles;
            if (Triangles(model) != expectedTriangles) throw new InvalidDataException("Selected dragon triangle count changed on import.");
            if (clips.Length != 3 || clips.Any(clip => clip.legacy) || !clips.Select(clip => clip.name).OrderBy(name => name).SequenceEqual(new[] { "Boost", "Flight", "Glide" }))
                throw new InvalidDataException("Expected canonical Flight, Glide and Boost Mecanim clips.");
            foreach (var clip in clips)
            {
                var expectedClip = organic ? measured.clips.Single(item => item.name == clip.name) : null;
                if (Mathf.Abs(clip.length - (organic ? expectedClip.durationSeconds : 1)) > .002f)
                    throw new InvalidDataException("Dragon clip duration changed on import: " + clip.name);
                var bindings = AnimationUtility.GetCurveBindings(clip);
                if (bindings.Length == 0 || bindings.Any(b => !Bones.Contains(b.path.Split('/').Last()) || b.path.Split('/').Last() == "Root" || b.path.Split('/').Last() == "Jaw" || b.type != typeof(Transform) || !b.propertyName.Contains("Rotation")))
                    throw new InvalidDataException("Dragon clip gained gameplay root, Jaw or non-rotation channels: " + clip.name);
                if (organic && !bindings.Select(binding => binding.path.Split('/').Last()).Distinct().OrderBy(name => name)
                    .SequenceEqual(expectedClip.channels.Select(channel => channel.bone).OrderBy(name => name)))
                    throw new InvalidDataException("Organic authored animation targets changed on import: " + clip.name);
            }
            if (organic) { ValidateOrganicRest(model, nodes, measured); return; }
            // Preserved mechanical rollback uses its historical measured sockets.
            var ground = nodes.Single(t => t.name == "socket_ground");
            var muzzle = nodes.Single(t => t.name == "socket_muzzle");
            var groundPoint = model.transform.InverseTransformPoint(ground.position);
            var muzzlePoint = model.transform.InverseTransformPoint(muzzle.position);
            if (Mathf.Abs(groundPoint.y + .665026843547821f) > .0001f || Mathf.Abs(muzzlePoint.z + 3.66f) > .0001f)
                throw new InvalidDataException("Dragon contact or muzzle socket moved during import.");
        }
        static void ValidateOscarDragon(GameObject model,AnimationClip[] clips,OscarContract measured)
        {
            var nodes=model.GetComponentsInChildren<Transform>(true);
            foreach (var name in measured.bones.Concat(measured.sockets.Select(socket=>socket.name)))
                if (nodes.Count(node=>node.name==name)!=1) throw new InvalidDataException("Expected one measured Oscar node: " + name);
            if (nodes.Select(node=>node.name).Distinct().Count()!=nodes.Length)
                throw new InvalidDataException("Oscar animation lookup requires unique imported node names.");
            if (Triangles(model)!=measured.instanceTriangles) throw new InvalidDataException("Oscar triangle count changed on import.");
            if (clips.Length!=3 || clips.Any(clip=>clip.legacy) || !clips.Select(clip=>clip.name).OrderBy(name=>name).SequenceEqual(new[] {"Boost","Flight","Glide"}))
                throw new InvalidDataException("Oscar requires its three measured Mecanim state clips.");
            foreach (var clip in clips)
            {
                var expected=measured.clips.Single(item=>item.name==clip.name);
                if (Mathf.Abs(clip.length-expected.durationSeconds)>.002f) throw new InvalidDataException("Oscar clip duration changed: " + clip.name);
                var bindings=AnimationUtility.GetCurveBindings(clip);
                var channels=new HashSet<string>(StringComparer.Ordinal);
                foreach (var binding in bindings)
                {
                    string name=binding.path.Split('/').Last();
                    string kind=binding.propertyName.Contains("Rotation") ? "rotation" : binding.propertyName.Contains("Position") ? "translation" : binding.propertyName.Contains("Scale") ? "scale" : "";
                    if (binding.type!=typeof(Transform) || string.IsNullOrEmpty(binding.path) || string.IsNullOrEmpty(kind) || !measured.bones.Contains(name)
                        || model.transform.Find(binding.path)==null)
                        throw new InvalidDataException("Unexpected Oscar animation binding: " + clip.name + "/" + binding.path + "/" + binding.propertyName);
                    channels.Add(name+":"+kind);
                }
                if (!channels.OrderBy(value=>value).SequenceEqual(expected.channels.Select(channel=>channel.bone+":"+channel.path).Distinct().OrderBy(value=>value)))
                    throw new InvalidDataException("Oscar full-TRS animation targets changed on import: " + clip.name);
            }
            ValidateOrganicRest(model,nodes,measured,true);
        }

        static Matrix4x4 ImportedSourceMatrix(float[] source)
        {
            var matrix = new Matrix4x4();
            for (int column = 0; column < 4; column++) for (int row = 0; row < 4; row++) matrix[row,column] = source[column*4+row];
            var mirror = Matrix4x4.Scale(new Vector3(-1,1,1));
            return mirror * matrix * mirror; // glTFast's one source-to-Unity handedness conversion.
        }
        static void RequireSourceTransform(Transform model, Transform node, float[] sourceMatrix, string label)
        {
            var actual = model.worldToLocalMatrix * node.localToWorldMatrix;
            var expected = ImportedSourceMatrix(sourceMatrix);
            for (int i = 0; i < 16; i++)
                if (float.IsNaN(actual[i]) || float.IsInfinity(actual[i]) || Mathf.Abs(actual[i] - expected[i]) > .001f)
                    throw new InvalidDataException("Organic rest/attachment transform changed on import: " + label);
        }
        static void ValidateOrganicRest(GameObject model, Transform[] nodes, VioletContract measured, bool oscar = false)
        {
            foreach (var bone in measured.boneRest)
            {
                var node = nodes.Single(item => item.name == bone.name);
                RequireSourceTransform(model.transform, node, bone.worldMatrix, bone.name);
                if ((oscar ? !string.IsNullOrEmpty(bone.parent) : bone.name != "Root") && node.parent.name != bone.parent)
                    throw new InvalidDataException("Organic bone hierarchy changed: " + bone.name);
            }
            foreach (var socket in measured.sockets)
            {
                var node = nodes.Single(item => item.name == socket.name);
                RequireSourceTransform(model.transform, node, socket.worldMatrix, socket.name);
                if (node.parent.name != socket.parent)
                    throw new InvalidDataException("Organic socket is attached to the wrong bone: " + socket.name);
            }
            var skins = model.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            if (skins.Length == 0 || !skins.SelectMany(skin => skin.bones).Where(bone => bone != null).Select(bone => bone.name).Distinct().OrderBy(name => name)
                .SequenceEqual((oscar ? measured.bones : OrganicBones).OrderBy(name => name))) throw new InvalidDataException("Imported skin differs from the selected measured skeleton.");
            // Compare actual imported rest geometry, not animated Renderer bounds.
            // This is an Editor-only temporary bake; shared meshes stay immutable.
            var minimum = Vector3.one * float.PositiveInfinity; var maximum = Vector3.one * float.NegativeInfinity;
            foreach (var skin in skins)
            {
                var baked = new Mesh();
                try
                {
                    // Compensate renderer scale before applying localToWorld;
                    // otherwise a normalized source's scale is applied twice.
                    skin.BakeMesh(baked, true);
                    var toModel = model.transform.worldToLocalMatrix * skin.transform.localToWorldMatrix;
                    foreach (var vertex in baked.vertices)
                    { var point = toModel.MultiplyPoint3x4(vertex); minimum = Vector3.Min(minimum, point); maximum = Vector3.Max(maximum, point); }
                }
                finally { Object.DestroyImmediate(baked); }
            }
            if (oscar)
                foreach (var mesh in model.GetComponentsInChildren<MeshFilter>(true))
                {
                    if (mesh.sharedMesh == null) continue;
                    var toModel=model.transform.worldToLocalMatrix*mesh.transform.localToWorldMatrix;
                    foreach (var vertex in mesh.sharedMesh.vertices)
                    { var point=toModel.MultiplyPoint3x4(vertex); minimum=Vector3.Min(minimum,point); maximum=Vector3.Max(maximum,point); }
                }
            var expectedMin = new Vector3(-measured.bounds.max[0], measured.bounds.min[1], measured.bounds.min[2]);
            var expectedMax = new Vector3(-measured.bounds.min[0], measured.bounds.max[1], measured.bounds.max[2]);
            if (!Finite(new[] { minimum.x, minimum.y, minimum.z, maximum.x, maximum.y, maximum.z }, 6)
                || Vector3.Distance(minimum, expectedMin) > .005f || Vector3.Distance(maximum, expectedMax) > .005f)
                throw new InvalidDataException("Organic imported rest bounds differ from the measured GLB. Actual " + minimum + " / " + maximum + "; expected " + expectedMin + " / " + expectedMax);
        }

        [MenuItem("Space Dragon/Dogfight/Build local Web Dogfight")]
        public static void BuildWeb() => Build(BuildTarget.WebGL, "Builds/DogfightWeb");
        [MenuItem("Space Dragon/Dogfight/Build local Windows Dogfight")]
        public static void BuildWindows() => Build(BuildTarget.StandaloneWindows64, "Builds/DogfightWindows/SpaceDragonDogfight.exe");
        static void Build(BuildTarget target, string output)
        {
            CanGenerate();
            if (EditorUserBuildSettings.activeBuildTarget != target)
                throw new InvalidOperationException("Start Unity with -buildTarget " + (target == BuildTarget.WebGL ? "WebGL" : "Win64") + " before this entry point; no mid-build domain reload.");
            if (!Application.isBatchMode && !EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            var settings = new SharedSettings(); BuildReceipt receipt = null;
            var directory = target == BuildTarget.WebGL ? output : Path.GetDirectoryName(output);
            try
            {
                GenerateScene(); Directory.CreateDirectory(directory);
                var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { ScenePath }, target = target,
                    locationPathName = output, options = BuildOptions.Development | BuildOptions.StrictMode });
                receipt = new BuildReceipt { unityVersion = Application.unityVersion, createdUtc = DateTime.UtcNow.ToString("O"),
                    target = target.ToString(), output = output, result = report.summary.result.ToString(), scene = ScenePath, sourceSha256 = DragonHash,
                    dragonVersion = SelectedAsset,
                    textureMode = UsesOscarCandidate ? OscarCompressedTextures.SelectedMode : "source", presentationVersion = PresentationVersion,
                    mechanicalAccessoriesSha256 = UsesOscarAccessories ? ReadMechanicalContract().sha256 : null,
                    configuredMeshDeformation = PlayerSettings.meshDeformation.ToString(), originalMeshDeformation = settings.MeshDeformationBefore,
                    configuredSkinWeights = QualitySettings.skinWeights.ToString(), originalSkinWeightsByQuality = settings.SkinWeightsBefore,
                    configuredSkinWeightsByQuality = UsesOscarCandidate ? CaptureSkinWeights().Select(value=>value.ToString()).ToArray() : null,
                    graphicsAPIs = PlayerSettings.GetGraphicsAPIs(target).Select(a => a.ToString()).ToArray(),
                    bytes = report.summary.totalSize, durationSeconds = report.summary.totalTime.TotalSeconds, developmentBuild = true };
                if (report.summary.result != BuildResult.Succeeded) throw new BuildFailedException("Dogfight build failed: " + report.summary.result);
            }
            finally
            {
                settings.Restore();
                if (receipt != null) { receipt.settingsRestored = true; receipt.restoredMeshDeformation = PlayerSettings.meshDeformation.ToString(); receipt.restoredSkinWeightsByQuality = settings.SkinWeightsAfter; File.WriteAllText(directory + "/build-receipt.json", JsonUtility.ToJson(receipt, true)); }
            }
            Debug.Log("SPACE_DRAGON_DOGFIGHT_BUILD_OK " + output);
        }

        // A build must not change LaunchLab/FirstContact player, pipeline or scene
        // settings. Capture exactly the shared properties we mutate and restore
        // them even when validation or BuildPipeline throws.
        sealed class SharedSettings
        {
            readonly RenderPipelineAsset defaultPipeline = GraphicsSettings.defaultRenderPipeline, qualityPipeline = QualitySettings.renderPipeline;
            readonly int vSync = QualitySettings.vSyncCount, width = PlayerSettings.defaultScreenWidth, height = PlayerSettings.defaultScreenHeight;
            readonly ColorSpace colorSpace = PlayerSettings.colorSpace;
            readonly MeshDeformation meshDeformation = PlayerSettings.meshDeformation;
            readonly int qualityLevel = QualitySettings.GetQualityLevel();
            readonly SkinWeights[] skinWeights = UsesOscarCandidate ? CaptureSkinWeights() : null;
            public string MeshDeformationBefore => meshDeformation.ToString();
            public string[] SkinWeightsBefore => skinWeights?.Select(value=>value.ToString()).ToArray();
            public string[] SkinWeightsAfter => skinWeights == null ? null : CaptureSkinWeights().Select(value=>value.ToString()).ToArray();
            readonly string product = PlayerSettings.productName, template = PlayerSettings.WebGL.template;
            readonly FullScreenMode screenMode = PlayerSettings.fullScreenMode;
            readonly bool background = PlayerSettings.runInBackground;
            readonly bool webDefault = PlayerSettings.GetUseDefaultGraphicsAPIs(BuildTarget.WebGL), winDefault = PlayerSettings.GetUseDefaultGraphicsAPIs(BuildTarget.StandaloneWindows64);
            readonly GraphicsDeviceType[] webApis = PlayerSettings.GetGraphicsAPIs(BuildTarget.WebGL), winApis = PlayerSettings.GetGraphicsAPIs(BuildTarget.StandaloneWindows64);
            readonly ScriptingImplementation windowsBackend = PlayerSettings.GetScriptingBackend(NamedBuildTarget.Standalone);
            readonly WebGLCompressionFormat compression = PlayerSettings.WebGL.compressionFormat;
            readonly int initialMemory = PlayerSettings.WebGL.initialMemorySize, maximumMemory = PlayerSettings.WebGL.maximumMemorySize;
            readonly EditorBuildSettingsScene[] scenes = EditorBuildSettings.scenes;
            public void Restore()
            {
                PlayerSettings.meshDeformation = meshDeformation;
                if (skinWeights != null) ApplySkinWeights(skinWeights,qualityLevel);
                GraphicsSettings.defaultRenderPipeline = defaultPipeline; QualitySettings.renderPipeline = qualityPipeline; QualitySettings.vSyncCount = vSync;
                DogfightGltfImportScope.ResetCaches();
                PlayerSettings.colorSpace = colorSpace; PlayerSettings.productName = product;
                PlayerSettings.defaultScreenWidth = width; PlayerSettings.defaultScreenHeight = height; PlayerSettings.fullScreenMode = screenMode;
                PlayerSettings.runInBackground = background; PlayerSettings.WebGL.template = template;
                PlayerSettings.WebGL.compressionFormat = compression; PlayerSettings.WebGL.initialMemorySize = initialMemory; PlayerSettings.WebGL.maximumMemorySize = maximumMemory;
                PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL, webApis); PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.WebGL, webDefault);
                PlayerSettings.SetGraphicsAPIs(BuildTarget.StandaloneWindows64, winApis); PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.StandaloneWindows64, winDefault);
                PlayerSettings.SetScriptingBackend(NamedBuildTarget.Standalone, windowsBackend); EditorBuildSettings.scenes = scenes;
                AssetDatabase.SaveAssets();
                if (PlayerSettings.meshDeformation != meshDeformation)
                    throw new InvalidOperationException("Dogfight could not restore the original mesh-deformation setting.");
                if (skinWeights != null && !CaptureSkinWeights().SequenceEqual(skinWeights))
                    throw new InvalidOperationException("Dogfight could not restore every quality level's skin-weight setting.");
            }
        }
    }
}
