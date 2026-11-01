using System;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace SpaceDragon.TownDrive.Editor.Tests
{
    public sealed partial class TownDriveSceneTests
    {
        [Test]
        public void BlenderVegetationKeepsSourceAnchorsAndVerifiedRuntimeProvenance()
        {
            var input = TownDriveProject.LoadReferenceArtManifest();
            var report = JsonUtility.FromJson<TownDriveProject.TownDriveReferenceEvidence>(File.ReadAllText(TownDriveProject.ReferenceArtReceipt));
            Assert.That(report.result, Is.EqualTo("Succeeded"));
            Assert.That(report.inputManifestSha256, Is.EqualTo(TownDriveProject.HashFile(TownDriveProject.ReferenceArtInputs + "/reference-art.json")));
            Assert.That(report.sourceReceiptSha256, Is.EqualTo(input.sourceReceiptSha256));
            Assert.That(report.sourceManifestSha256, Is.EqualTo(TownDriveProject.HashFile(TownDriveProject.ManifestPath)));
            Assert.That(report.routeSha256, Is.EqualTo("4c5eba111e226ffd53daf5dfe7ca68274eb1b643d58fb4c6955e863e401c47ff"));
            Assert.That(TownDriveProject.HashFile(TownDriveProject.DataPath), Is.EqualTo(report.routeSha256));
            Assert.That(report.palms, Is.EqualTo(162)); Assert.That(report.royalPalms, Is.GreaterThan(16)); Assert.That(report.fanPalms, Is.GreaterThan(50));
            Assert.That(report.royalPalms + report.fanPalms, Is.EqualTo(report.palms)); Assert.That(report.hedges, Is.EqualTo(207));
            Assert.That(report.retainedParts, Is.EqualTo(1302)); Assert.That(report.disabledParts, Is.EqualTo(855));
            Assert.That(report.editorOnlyRollbackRoots, Is.EqualTo(856));
            Assert.That(report.placements.Length, Is.EqualTo(162 + 207 + 40));
            Assert.That(report.placements.Select(placement => placement.sourceId).Distinct().Count(), Is.EqualTo(report.placements.Length));
            var sources = Node("TownDrive.Vegetation");
            Assert.That(sources.childCount, Is.EqualTo(1302));
            foreach (var source in manifest.vegetationInstances)
            {
                var original = Node("TownDrive.PlantPart." + source.id);
                Assert.That(Vector3.Distance(original.position, source.position), Is.LessThan(.0001f), source.id);
                Assert.That(Vector3.Distance(original.localScale, source.scale), Is.LessThan(.0001f), source.id);
                Assert.That(Quaternion.Angle(original.rotation, source.rotationQuaternion), Is.LessThan(.001f), source.id);
                bool replaced = source.assetId == "vegetation-palm" || source.assetId == "vegetation-hedge";
                Assert.That(original.gameObject.activeSelf, Is.EqualTo(!replaced), source.id);
                Assert.That(original.tag, Is.EqualTo(replaced ? "EditorOnly" : "Untagged"), "Only superseded source plants are excluded from the player.");
                if (!replaced) AssertReferencePlayerIncluded(original);
                Assert.That(original.GetComponentsInChildren<MeshFilter>(true).All(filter => filter.sharedMesh != null), Is.True);
            }
            var vegetationTemplates = manifest.assets.Where(asset => asset.kind == "vegetation").Select(asset => Node("TownDrive.Asset." + asset.id)).ToArray();
            Assert.That(vegetationTemplates, Is.Not.Empty);
            foreach (var template in vegetationTemplates)
            {
                Assert.That(template.tag, Is.EqualTo("EditorOnly"), "Construction-only vegetation templates must not retain superseded assets in the player.");
                Assert.That(template.gameObject.activeSelf, Is.False);
            }
            foreach (var asset in manifest.assets.Where(asset => asset.kind == "traffic")) AssertReferencePlayerIncluded(Node("TownDrive.Asset." + asset.id));
            foreach (var person in manifest.pedestrianAssets) AssertReferencePlayerIncluded(Node("TownDrive.PedestrianTemplate." + person.id));
            var fallback = Node("TownDrive.FoliageArt");
            Assert.That(fallback.gameObject.activeSelf, Is.False, "Retain the v003 generator output as inactive rollback, without double crowns.");
            Assert.That(fallback.tag, Is.EqualTo("EditorOnly"));
            var rollbackRoots = sources.Cast<Transform>().Where(part => part.CompareTag("EditorOnly")).Concat(new[] { fallback }).ToArray();
            Assert.That(rollbackRoots.Length, Is.EqualTo(856));
            foreach (var rollback in rollbackRoots)
            {
                Assert.That(rollback.GetComponentsInChildren<Collider>(true), Is.Empty);
                Assert.That(rollback.GetComponentsInChildren<Component>(true).All(component =>
                    component is Transform || component is MeshFilter || component is MeshRenderer || component is LODGroup), Is.True,
                    "Build-excluded rollback objects must contain presentation components only.");
            }
            var rollbackNodes = new System.Collections.Generic.HashSet<Transform>(rollbackRoots.Concat(vegetationTemplates).SelectMany(part => part.GetComponentsInChildren<Transform>(true)));
            foreach (var behaviour in UnityEngine.Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Include))
            {
                var properties = new SerializedObject(behaviour).GetIterator();
                while (properties.Next(true))
                {
                    if (properties.propertyType != SerializedPropertyType.ObjectReference) continue;
                    var value = properties.objectReferenceValue;
                    var target = value is GameObject gameObject ? gameObject.transform : value is Component component ? component.transform : null;
                    Assert.That(target == null || !rollbackNodes.Contains(target), Is.True,
                        behaviour.name + "." + properties.propertyPath + " must not bind build-excluded rollback objects.");
                }
            }
            foreach (var placement in report.placements.Where(placement => !placement.infill))
            {
                var source = manifest.vegetationInstances.Single(part => part.id == placement.sourceId);
                var model = input.models.Single(asset => asset.id == placement.modelId);
                Assert.That(placement.position, Is.EqualTo(source.position)); Assert.That(placement.sourceScale, Is.EqualTo(source.scale));
                Assert.That(Quaternion.Angle(placement.sourceRotation, source.rotationQuaternion), Is.LessThan(.001f));
                Assert.That(placement.horizontalSafetyScale, Is.InRange(.50f, 1f));
                Assert.That(placement.trunkWidthScale, Is.InRange(.30f, 1f));
                if (placement.trunkWidthScale < 1) Assert.That(TownDriveProject.IsExistingReferenceContextOverlap(placement.position), Is.True, "Only the two known source overlaps need narrower replacement bark.");
                if (placement.modelId != "clipped-hedge")
                {
                    Assert.That(Vector3.Distance(placement.appliedScale, source.scale * (12 / model.sourceHeight)), Is.LessThan(.0001f), "New crown proportions cannot be stretched into the old placeholder silhouette.");
                    Assert.That(Quaternion.Angle(placement.appliedRotation, source.rotationQuaternion), Is.LessThan(.001f));
                }
                else
                {
                    var expected = Vector3.Scale(source.scale, new Vector3(3.11f / model.sourceWidth * placement.horizontalSafetyScale, 1.35f / model.sourceHeight, 1.10f / model.sourceDepth * placement.horizontalSafetyScale));
                    Assert.That(Vector3.Distance(placement.appliedScale, expected), Is.LessThan(.0001f));
                    Assert.That(Quaternion.Angle(placement.appliedRotation, source.rotationQuaternion * Quaternion.Euler(0, 90, 0)), Is.LessThan(.001f));
                }
            }
            var infill = report.placements.Where(placement => placement.infill).ToArray();
            Assert.That(report.infillWalls, Is.EqualTo(5)); Assert.That(report.infillModules, Is.EqualTo(40));
            Assert.That(infill.Length, Is.EqualTo(40)); Assert.That(infill.Select(placement => placement.sourceWall).Distinct().Count(), Is.EqualTo(5));
            var wallSourceAsset = manifest.assets.Single(asset => asset.id == "road-chunk-006");
            var wallSourceNode = wallSourceAsset.nodeState.Single(node => node.materialName == "drive.pbr.boundary-wall");
            var wallSourceGroup = TownDriveProject.FindUnique(Node("TownDrive.Asset." + wallSourceAsset.id).gameObject, wallSourceNode.name);
            foreach (var row in infill.GroupBy(placement => placement.sourceWall))
            {
                var wall = Node("TownDrive.World").Find(row.Key); Assert.That(wall, Is.Not.Null, "Hedge infill requires its unchanged actual source wall.");
                Assert.That(wall.IsChildOf(wallSourceGroup), Is.True, "Infill must derive from the original manifest's exact Hypoluxo wall batch.");
                Assert.That(row.Count(), Is.EqualTo(8));
                var mesh = wall.GetComponent<MeshFilter>().sharedMesh;
                var size = Vector3.Scale(mesh.bounds.size, wall.lossyScale);
                Assert.That(Vector3.Distance(new Vector3(Mathf.Abs(size.x), Mathf.Abs(size.y), Mathf.Abs(size.z)), new Vector3(.35f, 2.1f, 24.2f)), Is.LessThan(.03f));
                foreach (var placement in row)
                {
                    Assert.That(Vector3.Distance(placement.sourceWallPosition, wall.TransformPoint(mesh.bounds.center)), Is.LessThan(.0001f));
                    Assert.That(Vector3.Distance(placement.position, placement.sourceWallPosition), Is.LessThan(12));
                    Assert.That(placement.groundClearance, Is.GreaterThan(2.4f), "New infill must clear both the lane and sidewalk, not only the source center.");
                }
            }
            Assert.That(report.minimumInfillClearance, Is.GreaterThan(2.4f));
        }

        [Test]
        public void SharedBlenderInstancesKeepTexturedLodsAndClearRoadCorridors()
        {
            var input = TownDriveProject.LoadReferenceArtManifest();
            var report = JsonUtility.FromJson<TownDriveProject.TownDriveReferenceEvidence>(File.ReadAllText(TownDriveProject.ReferenceArtReceipt));
            var root = Node("TownDrive.ReferenceArt"); Assert.That(root.gameObject.activeInHierarchy, Is.True);
            AssertReferencePlayerIncluded(root);
            Assert.That(root.GetComponentsInChildren<Transform>(true).All(node => node.CompareTag("Untagged") && !node.gameObject.isStatic), Is.True,
                "Replacement art must remain in the player and reuse shared geometry without static batching.");
            Assert.That(root.localPosition, Is.EqualTo(Vector3.zero)); Assert.That(root.localRotation, Is.EqualTo(Quaternion.identity)); Assert.That(root.localScale, Is.EqualTo(Vector3.one));
            Assert.That(root.GetComponentsInChildren<Collider>(true), Is.Empty);
            var groups = root.GetComponentsInChildren<LODGroup>(true); var renderers = root.GetComponentsInChildren<MeshRenderer>(true);
            Assert.That(groups.Length, Is.EqualTo(report.cells).And.EqualTo(409));
            Assert.That(root.childCount, Is.EqualTo(groups.Length));
            Assert.That(renderers.Length, Is.EqualTo(report.renderers).And.EqualTo(1636));
            Assert.That(report.placements.Select(placement => placement.instanceName).Distinct().Count(), Is.EqualTo(groups.Length));
            var sharedMaterials = renderers.Select(renderer => renderer.sharedMaterial).Distinct().ToArray();
            var sharedMeshes = renderers.Select(renderer => renderer.GetComponent<MeshFilter>().sharedMesh).Distinct().ToArray();
            Assert.That(sharedMaterials.Length, Is.EqualTo(report.materials).And.EqualTo(5));
            Assert.That(sharedMeshes.Length, Is.EqualTo(report.sharedMeshes).And.EqualTo(12), "Placements must reuse twelve imported mesh subassets, not serialize world-baked copies.");
            var sourcePrefabs = input.models.ToDictionary(model => model.id, model => AssetDatabase.LoadAssetAtPath<GameObject>(TownDriveProject.ReferenceInputPath(model.path)));
            var vertices = sharedMeshes.ToDictionary(mesh => mesh, mesh => mesh.vertices);
            foreach (var mesh in sharedMeshes)
            {
                Assert.That(AssetDatabase.GetAssetPath(mesh), Does.StartWith(TownDriveProject.ReferenceArtInputs + "/Models/"));
                Assert.That(mesh.subMeshCount, Is.EqualTo(1));
                Assert.That(mesh.uv.Length, Is.EqualTo(mesh.vertexCount)); Assert.That(mesh.normals.Length, Is.EqualTo(mesh.vertexCount)); Assert.That(mesh.tangents.Length, Is.EqualTo(mesh.vertexCount));
            }
            foreach (var material in sharedMaterials)
            {
                Assert.That(AssetDatabase.GetAssetPath(material), Does.StartWith(TownDriveProject.ReferenceArtFolder + "/Materials/"));
                Assert.That(TownDriveProject.SupportsTownDrivePipeline(material), Is.True);
                Assert.That(material.enableInstancing, Is.True);
                Assert.That(material.renderQueue, Is.LessThan(3000), "Leaf silhouettes use opaque/masked geometry, not sorting-prone blended surfaces.");
                var textures = material.GetTexturePropertyNames().Select(property => material.GetTexture(property)).Where(texture => texture != null && !string.IsNullOrEmpty(AssetDatabase.GetAssetPath(texture))).Distinct().ToArray();
                Assert.That(textures, Is.Not.Empty);
                foreach (var texture in textures)
                {
                    Assert.That(AssetDatabase.GetAssetPath(texture), Does.StartWith(TownDriveProject.ReferenceArtInputs + "/Models/"), "Only verified self-contained GLB textures may enter the new art.");
                    Assert.That(((Texture2D)texture).mipmapCount, Is.GreaterThan(1));
                }
            }
            long sharedTriangles = sharedMeshes.Sum(mesh => (long)mesh.GetIndexCount(0) / 3);
            Assert.That(sharedTriangles, Is.EqualTo(input.models.Sum(model => (long)model.nearTriangles + model.farTriangles)).And.LessThanOrEqualTo(30000));
            var roads = TownDriveProject.ReferenceRoadCorridors(File.ReadAllText(TownDriveProject.DataPath));
            Assert.That(report.existingContextOverlaps.Length, Is.LessThanOrEqualTo(2));
            foreach (var overlap in report.existingContextOverlaps)
            {
                Assert.That(TownDriveProject.IsExistingReferenceContextOverlap(overlap.position), Is.True);
                var source = manifest.vegetationInstances.Single(part => part.id == overlap.sourceId);
                var trunk = manifest.vegetationInstances.Single(part => part.assetId == "vegetation-palm" && part.meshName == "palm.near.0" && part.position == source.position);
                float original = TownDriveProject.ReferenceOriginalGroundClearance(Node("TownDrive.PlantPart." + trunk.id), roads);
                Assert.That(overlap.originalClearance, Is.EqualTo(original).Within(.001f));
                Assert.That(overlap.replacementClearance, Is.GreaterThanOrEqualTo(original - .005f), "Existing context overlap is bounded, not a general road-clearance exception.");
            }
            long nearTriangles = 0, farTriangles = 0;
            foreach (var group in groups)
            {
                var placement = report.placements.Single(item => item.instanceName == group.name);
                var model = input.models.Single(item => item.id == placement.modelId);
                Assert.That(group.transform.parent, Is.EqualTo(root));
                Assert.That(Vector3.Distance(group.transform.position, placement.position), Is.LessThan(.0001f));
                Assert.That(Vector3.Distance(group.transform.localScale, placement.appliedScale), Is.LessThan(.0001f));
                Assert.That(Quaternion.Angle(group.transform.rotation, placement.appliedRotation), Is.LessThan(.001f));
                Assert.That(group.gameObject.isStatic, Is.False, "Static batching must not recreate per-placement geometry copies.");
                var levels = group.GetLODs(); Assert.That(levels.Length, Is.EqualTo(2));
                Assert.That(levels[0].screenRelativeTransitionHeight, Is.GreaterThan(levels[1].screenRelativeTransitionHeight));
                Assert.That(levels.SelectMany(level => level.renderers).Distinct().Count(), Is.EqualTo(4));
                for (int level = 0; level < 2; level++)
                {
                    string levelName = level == 0 ? model.nearNode : model.farNode;
                    var sourceLevel = TownDriveProject.FindUnique(sourcePrefabs[placement.modelId], levelName);
                    var sourceParts = sourceLevel.GetComponentsInChildren<MeshFilter>(true);
                    var levelNode = group.transform.Find(levelName);
                    Assert.That(levelNode, Is.Not.Null);
                    Assert.That(levelNode.localPosition, Is.EqualTo(Vector3.zero)); Assert.That(levelNode.localRotation, Is.EqualTo(Quaternion.identity)); Assert.That(levelNode.localScale, Is.EqualTo(Vector3.one));
                    Assert.That(levels[level].renderers.Length, Is.EqualTo(2));
                    long instanceTriangles = 0;
                    foreach (var renderer in levels[level].renderers)
                    {
                        Assert.That(renderer, Is.Not.Null); Assert.That(renderer.transform.parent, Is.EqualTo(levelNode));
                        Assert.That(renderer.gameObject.isStatic, Is.False);
                        Assert.That(renderer.transform.localPosition, Is.EqualTo(Vector3.zero)); Assert.That(renderer.transform.localRotation, Is.EqualTo(Quaternion.identity));
                        var mesh = renderer.GetComponent<MeshFilter>().sharedMesh;
                        var sourcePart = sourceParts.Single(part => part.name == renderer.name);
                        Assert.That(mesh, Is.EqualTo(sourcePart.sharedMesh), "Every instance must reference the actual matching imported LOD mesh.");
                        Assert.That(AssetDatabase.GetAssetPath(mesh), Is.EqualTo(TownDriveProject.ReferenceInputPath(model.path)));
                        Assert.That(renderer.sharedMaterial.name, Is.EqualTo(sourcePart.GetComponent<MeshRenderer>().sharedMaterial.name));
                        var expectedScale = mesh.name.Contains(".Trunk") ? new Vector3(placement.trunkWidthScale, 1, placement.trunkWidthScale) : Vector3.one;
                        Assert.That(renderer.transform.localScale, Is.EqualTo(expectedScale), "Only the two recorded source overlaps may narrow bark; crowns keep their authored proportions.");
                        long count = (long)mesh.GetIndexCount(0) / 3; instanceTriangles += count;
                        if (level == 0) nearTriangles += count; else farTriangles += count;
                        var nearby = roads.Where(road => road.MayReach(placement.position, 20)).ToArray();
                        bool finite = true, clear = true; Vector3 failedPoint = Vector3.zero;
                        foreach (var vertex in vertices[mesh])
                        {
                            var point = renderer.transform.TransformPoint(vertex);
                            finite &= FiniteArt(point.x) && FiniteArt(point.y) && FiniteArt(point.z);
                            if (point.y > 2.4f) continue;
                            float clearance = nearby.Select(road => road.Clearance(point)).DefaultIfEmpty(float.PositiveInfinity).Min();
                            if (clearance >= .09f) continue;
                            var exception = report.existingContextOverlaps.SingleOrDefault(overlap => overlap.sourceId == placement.sourceId);
                            if (exception == null || clearance < exception.originalClearance - .005f) { clear = false; failedPoint = point; }
                        }
                        Assert.That(finite, Is.True, mesh.name);
                        Assert.That(clear, Is.True, "New low geometry entered a lane/context road: " + placement.sourceId + " / " + mesh.name + " " + failedPoint);
                    }
                    Assert.That(instanceTriangles, Is.EqualTo(level == 0 ? model.nearTriangles : model.farTriangles));
                }
            }
            Assert.That(nearTriangles, Is.EqualTo(report.nearTriangles).And.LessThanOrEqualTo(2600000));
            Assert.That(farTriangles, Is.EqualTo(report.farTriangles).And.LessThanOrEqualTo(650000));
            Assert.That(farTriangles, Is.LessThan(nearTriangles / 3));
            long expectedNear = report.placements.Sum(placement => (long)input.models.Single(model => model.id == placement.modelId).nearTriangles);
            long expectedFar = report.placements.Sum(placement => (long)input.models.Single(model => model.id == placement.modelId).farTriangles);
            Assert.That(nearTriangles, Is.EqualTo(expectedNear)); Assert.That(farTriangles, Is.EqualTo(expectedFar));
        }

        static void AssertReferencePlayerIncluded(Transform node)
        {
            Assert.That(node, Is.Not.Null);
            for (var ancestor = node; ancestor != null; ancestor = ancestor.parent)
                Assert.That(ancestor.CompareTag("EditorOnly"), Is.False, node.name + " must survive player build with all of its ancestors.");
        }
    }
}
