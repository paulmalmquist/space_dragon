using System.IO;
using System;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SpaceDragon.TownDrive.Runtime;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

namespace SpaceDragon.TownDrive.Editor.Tests
{
    public sealed class TownDriveSceneTests
    {
        Scene scene;
        bool openedScene;
        TownDriveSceneManifest manifest;
        TownDriveSceneReceipt receipt;
        Transform[] nodes;

        [OneTimeSetUp]
        public void OpenGeneratedCandidate()
        {
            Assert.That(File.Exists(TownDriveProject.ScenePath), Is.True, "Run TownDriveProject.Setup before scene acceptance tests.");
            Assert.That(File.Exists(TownDriveProject.ReceiptPath), Is.True, "Missing detailed-scene setup receipt.");
            manifest = TownDriveProject.LoadManifest();
            receipt = JsonUtility.FromJson<TownDriveSceneReceipt>(File.ReadAllText(TownDriveProject.ReceiptPath));
            scene = SceneManager.GetSceneByPath(TownDriveProject.ScenePath);
            if (!scene.IsValid() || !scene.isLoaded) { scene = EditorSceneManager.OpenScene(TownDriveProject.ScenePath, OpenSceneMode.Additive); openedScene = true; }
            nodes = scene.GetRootGameObjects().SelectMany(root => root.GetComponentsInChildren<Transform>(true)).ToArray();
        }
        [OneTimeTearDown]
        public void CloseCandidate() { if (openedScene && scene.IsValid()) EditorSceneManager.CloseScene(scene, true); }
        Transform Node(string name) => nodes.Single(node => node.name == name);

        [Test]
        public void DetailedGeometryAndExplicitRuntimeBindingsSurviveSceneSerialization()
        {
            Assert.That(receipt.result, Is.EqualTo("Succeeded"));
            Assert.That(receipt.manifestSha256, Is.EqualTo(TownDriveProject.HashFile(TownDriveProject.ManifestPath)));
            Assert.That(receipt.sharedConfigurationDifferences, Is.Empty);
            var experience = Node("TownDriveRuntime").GetComponent<TownDriveExperience>();
            Assert.That(experience, Is.Not.Null);
            var bindings = new SerializedObject(experience);
            Assert.That(bindings.FindProperty("routeData").objectReferenceValue, Is.EqualTo(AssetDatabase.LoadAssetAtPath<TextAsset>(TownDriveProject.DataPath)));
            Assert.That(bindings.FindProperty("playerRoot").objectReferenceValue, Is.EqualTo(Node("TownDrive.Player")));
            Assert.That(bindings.FindProperty("driveCamera").objectReferenceValue, Is.EqualTo(Node("TownDrive.Camera").GetComponent<Camera>()));
            var pipeline = AssetDatabase.LoadAssetAtPath<RenderPipelineAsset>(TownDriveProject.PipelinePath);
            Assert.That(pipeline, Is.Not.Null);
            Assert.That(bindings.FindProperty("townDrivePipeline").objectReferenceValue, Is.EqualTo(pipeline));
            var renderer = AssetDatabase.LoadAssetAtPath<ScriptableObject>(TownDriveProject.RendererPath);
            Assert.That(renderer, Is.Not.Null);
            var renderers = new SerializedObject(pipeline).FindProperty("m_RendererDataList");
            Assert.That(renderers.arraySize, Is.EqualTo(1));
            Assert.That(renderers.GetArrayElementAtIndex(0).objectReferenceValue, Is.EqualTo(renderer));
            Assert.That(receipt.pipelinePath, Is.EqualTo(TownDriveProject.PipelinePath));
            Assert.That(receipt.rendererPath, Is.EqualTo(TownDriveProject.RendererPath));
            foreach (var expected in new[] { ("trafficTemplates", 3), ("pedestrianTemplates", 2), ("pedestrianWalks", 2) })
            {
                var array = bindings.FindProperty(expected.Item1);
                Assert.That(array.arraySize, Is.EqualTo(expected.Item2));
                for (int index = 0; index < array.arraySize; index++) Assert.That(array.GetArrayElementAtIndex(index).objectReferenceValue, Is.Not.Null);
            }
            Assert.That(receipt.importedAssets.Length, Is.EqualTo(manifest.assets.Length));
            foreach (var asset in manifest.assets)
            {
                var root = Node(asset.kind == "interior" ? "TownDrive.OptionalInterior" : "TownDrive.Asset." + asset.id).gameObject;
                Assert.That(TownDriveProject.TriangleCount(root), Is.EqualTo(asset.expectedImportedTriangleCount), asset.id);
                Assert.That(TownDriveProject.Meshes(root).Length, Is.EqualTo(asset.expectedImportedMeshCount), asset.id);
            }
        }

        [Test]
        public void ImportedAxisAndMappedRouteAnchorsRemainInSourceMetres()
        {
            Assert.That(receipt.anchors.Length, Is.GreaterThanOrEqualTo(6));
            foreach (var anchor in manifest.anchors)
            {
                var assetId = string.IsNullOrEmpty(anchor.assetId) ? "minivan-detailed" : anchor.assetId;
                var root = Node("TownDrive.Asset." + assetId);
                Vector3 local = root.InverseTransformPoint(TownDriveProject.FindUnique(root.gameObject, anchor.name).position);
                Assert.That(Vector3.Distance(local, anchor.position), Is.LessThan(.015f), anchor.name);
            }
            Assert.That(receipt.contextRoads, Is.EqualTo(26));
            Assert.That(receipt.contextWaters, Is.EqualTo(4));
            Assert.That(receipt.estimatedContextLots, Is.EqualTo(83));
            Assert.That(receipt.junctions, Is.EqualTo(10));
            Assert.That(receipt.closures, Is.EqualTo(11));
            Assert.That(nodes.Count(node => node.name.StartsWith("drive.home.water.") && node.GetComponent<MeshFilter>() != null), Is.EqualTo(4));
        }

        [Test]
        public void WhiteMinivanRetainsFullCabinDriverSideAndIndependentWheelPivots()
        {
            var player = Node("TownDrive.Player");
            var carNodes = player.GetComponentsInChildren<Transform>(true);
            Assert.That(carNodes.Count(node => node.name.StartsWith(manifest.minivan.wheelSteerPrefix)), Is.EqualTo(4));
            Assert.That(carNodes.Count(node => node.name.StartsWith(manifest.minivan.wheelSpinPrefix)), Is.EqualTo(4));
            Assert.That(carNodes.Count(node => node.name == manifest.minivan.steeringWheelName), Is.EqualTo(1));
            Assert.That(carNodes.Any(node => node.name.StartsWith("drive.car.cabin-detail")), Is.True);
            var driverEye = player.InverseTransformPoint(TownDriveProject.FindUnique(player.gameObject, "TownDrive.DriverEye").position);
            Assert.That(Vector3.Distance(driverEye, new Vector3(-.46f, 1.42f, .42f)), Is.LessThan(.002f));
            Assert.That(TownDriveProject.Meshes(player.gameObject).Length, Is.GreaterThanOrEqualTo(40));
            var renderedSize = TownDriveProject.LocalBounds(player.gameObject, player).size;
            var size = TownDriveProject.MinivanPhysicalBounds(player.gameObject, player).size;
            Assert.That(size.z, Is.InRange(4.912f, 5.512f));
            Assert.That(size.x, Is.InRange(1.844f, 2.594f));
            Assert.That(size.y, Is.InRange(1.468f, 2.068f));
            // Independent POSITION-accessor + hierarchy calculation of the
            // source GLB establishes the physical width and shadow-card width.
            Assert.That(size.x, Is.EqualTo(2.43f).Within(.002f));
            Assert.That(renderedSize.x, Is.EqualTo(2.60f).Within(.002f));
            Assert.That(Vector3.Distance(receipt.minivanBounds, size), Is.LessThan(.002f));
            Assert.That(Vector3.Distance(receipt.minivanRenderedBounds, renderedSize), Is.LessThan(.002f));
            Assert.That(receipt.minivanBoundsScope, Does.Contain("contact-shadow"));
            Assert.That(carNodes.SelectMany(node => node.GetComponents<Renderer>()).SelectMany(renderer => renderer.sharedMaterials)
                .Any(material => material != null && material.name.Contains("pearl-white")), Is.True, "Detailed white paint material is missing.");
        }

        [Test]
        public void TexturesTransparencyThreeTierVegetationAndOriginalWalkRigsRemainBound()
        {
            var plants = Node("TownDrive.Vegetation").GetComponentsInChildren<LODGroup>(true);
            Assert.That(plants.Length, Is.EqualTo(manifest.vegetationInstances.Length));
            Assert.That(plants.Length, Is.GreaterThan(0));
            foreach (var placement in manifest.vegetationInstances)
            {
                var plant = plants.Single(group => group.name == "TownDrive.PlantPart." + placement.id);
                var levels = plant.GetLODs();
                int expectedTiers = 0; string part = placement.meshName;
                foreach (var sourceLod in placement.lods)
                { if (string.IsNullOrEmpty(part)) break; expectedTiers++; part = sourceLod.meshName; }
                if (expectedTiers == 0 || !string.IsNullOrEmpty(part)) expectedTiers++;
                // Original palm fruit intentionally disappears before the
                // distant crown/trunk tier; preserve that authored cull.
                Assert.That(levels.Length, Is.EqualTo(expectedTiers), plant.name);
                Assert.That(levels.All(level => level.renderers.Length > 0 && level.renderers.All(renderer => renderer != null)), Is.True, plant.name);
                for (int index = 1; index < levels.Length; index++)
                    Assert.That(levels[index - 1].screenRelativeTransitionHeight, Is.GreaterThan(levels[index].screenRelativeTransitionHeight));
            }
            Assert.That(plants.Any(plant => plant.GetLODs().Length == 3), Is.True);
            Assert.That(receipt.texturedMaterials, Is.GreaterThan(10));
            Assert.That(receipt.materials.Any(material => material.alphaMode == "MASK"), Is.True, "Leaf cutout material missing.");
            Assert.That(receipt.materials.Any(material => material.alphaMode == "BLEND"), Is.True, "Transparent glass material missing.");
            var normalMapped = new HashSet<string>(manifest.materials.Where(material => material.textures.Any(texture => texture.slot == "normal")).Select(material => material.name));
            Assert.That(scene.GetRootGameObjects().Sum(root => TownDriveProject.ValidateNormalMappedMeshes(root, normalMapped)), Is.GreaterThan(0));
            var sceneRenderers = scene.GetRootGameObjects().SelectMany(root => root.GetComponentsInChildren<Renderer>(true)).ToArray();
            var nonTriangleRenderers = sceneRenderers.Select(renderer => new { renderer,
                mesh = renderer is SkinnedMeshRenderer skin ? skin.sharedMesh : renderer.GetComponent<MeshFilter>()?.sharedMesh })
                .Where(item => item.mesh != null && Enumerable.Range(0, item.mesh.subMeshCount).Any(index => item.mesh.GetTopology(index) != MeshTopology.Triangles)).ToArray();
            // Independent GLB inventory: all 70 non-triangle nodes are utility
            // wires. Preserve their normal-pass geometry and visibility while
            // preventing WebGPU's invalid depth-biased LineList shadow pipeline.
            Assert.That(nonTriangleRenderers.Length, Is.EqualTo(70), "Source utility-wire renderers must remain present.");
            foreach (var item in nonTriangleRenderers)
            {
                Assert.That(item.renderer.name, Does.Contain(".wire."));
                Assert.That(item.renderer.enabled, Is.True, item.renderer.name);
                Assert.That(item.mesh.vertexCount, Is.GreaterThan(0), item.renderer.name);
                Assert.That(Enumerable.Range(0, item.mesh.subMeshCount).Sum(index => (long)item.mesh.GetIndexCount(index)), Is.GreaterThan(0), item.renderer.name);
                Assert.That(item.renderer.shadowCastingMode, Is.EqualTo(ShadowCastingMode.Off), "Non-triangle shadow caster: " + item.renderer.name);
            }
            Assert.That(receipt.materials.Count(material => material.name.StartsWith("drive.street-name-material.", StringComparison.Ordinal)), Is.EqualTo(7));
            foreach (var material in receipt.materials)
            {
                var asset = AssetDatabase.LoadAssetAtPath<Material>(material.assetPath);
                Assert.That(asset, Is.Not.Null, material.name);
                Assert.That(asset.shader.name, Is.Not.EqualTo("Hidden/InternalErrorShader"));
                Assert.That(TownDriveProject.SupportsTownDrivePipeline(asset), Is.True, material.name);
                if (material.name.StartsWith("drive.street-name-material.", StringComparison.Ordinal))
                {
                    Assert.That(asset.GetTexture("baseColorTexture"), Is.Not.Null, material.name);
                    Assert.That(asset.GetTexture("emissiveTexture"), Is.EqualTo(asset.GetTexture("baseColorTexture")), material.name);
                    Assert.That(asset.GetTextureScale("emissiveTexture"), Is.EqualTo(asset.GetTextureScale("baseColorTexture")), material.name);
                    Assert.That(asset.GetTextureOffset("emissiveTexture"), Is.EqualTo(asset.GetTextureOffset("baseColorTexture")), material.name);
                    Assert.That(asset.GetVector("emissiveTexture_Rotation"), Is.EqualTo(asset.GetVector("baseColorTexture_Rotation")), material.name);
                    Assert.That(asset.GetFloat("emissiveTexture_texCoord"), Is.EqualTo(asset.GetFloat("baseColorTexture_texCoord")), material.name);
                    Assert.That(asset.IsKeywordEnabled("_EMISSIVE"), Is.True, material.name);
                    Assert.That(asset.GetColor("emissiveFactor"), Is.EqualTo(material.emissiveFactor), material.name);
                }
                if (material.alphaMode == "BLEND")
                {
                    string label = material.name + " / " + material.assetPath + " / " + asset.shader.name;
                    Assert.That(asset.renderQueue, Is.GreaterThanOrEqualTo((int)RenderQueue.Transparent), label);
                    Assert.That(asset.HasProperty("_CastShadows"), Is.True, "Persistent URP shadow control: " + label);
                    Assert.That(asset.GetFloat("_CastShadows"), Is.Zero, "Serialized URP shadow control: " + label);
                    Assert.That(asset.GetShaderPassEnabled("ShadowCaster"), Is.False, "Serialized ShadowCaster pass: " + label);
                    var users = sceneRenderers.Where(renderer => renderer.sharedMaterials.Contains(asset)).ToArray();
                    Assert.That(users.Length, Is.GreaterThan(0), "Transparent material has no scene renderer: " + label);
                    foreach (var renderer in users)
                        Assert.That(renderer.shadowCastingMode, Is.EqualTo(ShadowCastingMode.Off), "Transparent renderer " + renderer.name + ": " + label);
                }
                Assert.That(asset.GetTexturePropertyNames().Count(property => asset.GetTexture(property) != null), Is.EqualTo(material.textureCount));
            }
            foreach (int appearance in new[] { 0, 1 })
            {
                var person = manifest.pedestrianAssets.Single(asset => asset.appearance == appearance);
                var personNode = Node("TownDrive.PedestrianTemplate." + person.id);
                var derivative = TownDriveProject.ImportedPath(person.path);
                Assert.That(PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(personNode.gameObject), Is.EqualTo(derivative));
                var skins = personNode.GetComponentsInChildren<SkinnedMeshRenderer>(true);
                Assert.That(skins.Length, Is.GreaterThan(0));
                Assert.That(skins.All(skin => skin.sharedMesh != null && skin.bones.Length == person.jointCount && skin.bones.All(bone => bone != null)), Is.True);
                foreach (string relative in new[] { person.sourcePath, person.path, person.provenancePath })
                {
                    var file = manifest.files.Single(item => item.path == relative);
                    Assert.That(TownDriveProject.HashFile(TownDriveProject.ImportedPath(relative)), Is.EqualTo(file.sha256));
                }
                var clips = AssetDatabase.LoadAllAssetsAtPath(derivative).OfType<AnimationClip>().Where(clip => !clip.name.StartsWith("__preview__", StringComparison.Ordinal)).ToArray();
                Assert.That(clips.Length, Is.EqualTo(person.animationCount));
                Assert.That(clips.Count(clip => clip.name == person.clipName && clip.length > 0), Is.EqualTo(1));
            }
            foreach (string kind in new[] { "sedan", "suv", "van" })
            {
                var groups = Node("TownDrive.Asset.traffic-" + kind).GetComponentsInChildren<LODGroup>(true);
                Assert.That(groups.Length, Is.EqualTo(8), "Traffic near/far parts must not overlap: " + kind);
                Assert.That(groups.All(group => group.GetLODs().Length == 2), Is.True);
            }
            Assert.That(Node("TownDrive.ParkedVehicles").childCount, Is.EqualTo(manifest.parkedVehicles.Length));
            foreach (var parked in manifest.parkedVehicles)
            {
                var paint = Node(parked.id).GetComponentsInChildren<Renderer>(true).SelectMany(renderer => renderer.sharedMaterials)
                    .Where(material => material.name.StartsWith("drive.traffic.paint")).Distinct().ToArray();
                Assert.That(paint.Length, Is.GreaterThan(0));
                Assert.That(paint.All(material => material.name.EndsWith(".parked-palette-" + parked.colorIndex)), Is.True, parked.id);
            }
        }
    }
}
