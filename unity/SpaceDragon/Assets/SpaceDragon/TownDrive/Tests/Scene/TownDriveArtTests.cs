using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using Object = UnityEngine.Object;

namespace SpaceDragon.TownDrive.Editor.Tests
{
    public sealed partial class TownDriveSceneTests
    {
        [Test]
        public void PhysicalSurfaceTilesRespectWallDimensionsRotationAndScaleWithoutChangingSourceUv()
        {
            var wall = new Mesh { name = "12m by 3m wall" };
            var top = new Mesh { name = "12m by 6m ground" };
            try
            {
                wall.vertices = new[] { new Vector3(-6,0,0), new Vector3(-6,3,0), new Vector3(6,3,0), new Vector3(6,0,0) };
                wall.normals = Enumerable.Repeat(Vector3.forward, 4).ToArray();
                wall.uv = new[] { Vector2.zero, Vector2.up, Vector2.one, Vector2.right };
                wall.triangles = new[] { 0, 2, 1, 0, 3, 2 };
                var original = wall.uv;
                var identity = TownDriveProject.ProjectSurfaceUv(wall, Matrix4x4.identity, new[] { 2f });
                Assert.That(identity[3].x - identity[0].x, Is.EqualTo(6).Within(.0001f), "12 m width must span six 2 m tiles.");
                Assert.That(identity[1].y - identity[0].y, Is.EqualTo(1.5f).Within(.0001f), "3 m height must span 1.5 tiles.");
                var rotated = Matrix4x4.TRS(new Vector3(71,2,-38), Quaternion.Euler(0,37,0), new Vector3(2,1.5f,3));
                var transformed = TownDriveProject.ProjectSurfaceUv(wall, rotated, new[] { 2f });
                Assert.That(transformed[3].x - transformed[0].x, Is.EqualTo(12).Within(.0001f), "World width includes the nonuniform scale.");
                Assert.That(transformed[1].y - transformed[0].y, Is.EqualTo(2.25f).Within(.0001f));
                Assert.That(transformed[1].x - transformed[0].x, Is.EqualTo(0).Within(.0001f), "Vertical edges cannot inherit horizontal dimensions.");
                Assert.That(transformed[3].y - transformed[0].y, Is.EqualTo(0).Within(.0001f));
                CollectionAssert.AreEqual(original, wall.uv, "Projection must leave the recoverable source UVs untouched.");

                top.vertices = new[] { new Vector3(-6,0,-3), new Vector3(-6,0,3), new Vector3(6,0,3), new Vector3(6,0,-3) };
                top.normals = Enumerable.Repeat(Vector3.up, 4).ToArray();
                top.uv = original;
                top.triangles = wall.triangles;
                var ground = TownDriveProject.ProjectSurfaceUv(top, Matrix4x4.identity, new[] { 2f });
                Assert.That(ground[3].x - ground[0].x, Is.EqualTo(6).Within(.0001f));
                Assert.That(ground[1].y - ground[0].y, Is.EqualTo(3).Within(.0001f));
                CollectionAssert.AreEqual(original, top.uv);
            }
            finally { Object.DestroyImmediate(wall); Object.DestroyImmediate(top); }
        }

        [Test]
        public void PersistedArtPreservesSurfaceGeometryBindsScansAndKeepsGardensOutsideRoads()
        {
            // Explicit pre-art route baseline: art cannot silently alter the
            // verified road, checkpoint, source context or obstacle JSON.
            Assert.That(TownDriveProject.HashFile(TownDriveProject.DataPath),
                Is.EqualTo("4c5eba111e226ffd53daf5dfe7ca68274eb1b643d58fb4c6955e863e401c47ff"));
            var surface = JsonUtility.FromJson<TownDriveSurfaceArtEvidence>(File.ReadAllText("Builds/town-drive-surface-art-receipt.json"));
            Assert.That(surface.result, Is.EqualTo("PASS"));
            Assert.That(surface.renderers, Is.GreaterThan(20));
            Assert.That(surface.meshCount, Is.EqualTo(surface.meshes.Length));
            Assert.That(surface.meshCount, Is.GreaterThan(20));
            var imported = new Dictionary<string, Mesh[]>();
            var derivatives = new HashSet<Mesh>();
            foreach (var record in surface.meshes)
            {
                if (!imported.TryGetValue(record.sourceAsset, out var candidates))
                { candidates = AssetDatabase.LoadAllAssetsAtPath(record.sourceAsset).OfType<Mesh>().ToArray(); imported.Add(record.sourceAsset, candidates); }
                var original = candidates.Single(mesh => AssetDatabase.TryGetGUIDAndLocalFileIdentifier(mesh, out string guid, out long id)
                    && guid == record.sourceGuid && id == record.sourceFileId);
                var derived = AssetDatabase.LoadAssetAtPath<Mesh>(record.derivativeAsset);
                Assert.That(derived, Is.Not.Null, record.derivativeAsset);
                Assert.That(derived, Is.Not.SameAs(original));
                Assert.DoesNotThrow(() => TownDriveProject.ValidateSurfaceGeometry(original, derived), record.derivativeAsset);
                Assert.That(derived.uv.Length, Is.EqualTo(original.vertexCount));
                Assert.That(derived.uv.All(uv => FiniteArt(uv.x) && FiniteArt(uv.y)), Is.True);
                derivatives.Add(derived);
            }
            var allRenderers = scene.GetRootGameObjects().SelectMany(root => root.GetComponentsInChildren<MeshRenderer>(true)).ToArray();
            Assert.That(allRenderers.Count(renderer => derivatives.Contains(renderer.GetComponent<MeshFilter>()?.sharedMesh)), Is.EqualTo(surface.renderers));
            var roof = allRenderers.Where(renderer => renderer.sharedMaterials.Any(material => material != null && material.name.StartsWith("TownDrive.Art.Roof"))).ToArray();
            var walls = allRenderers.Where(renderer => renderer.sharedMaterials.Any(material => material != null && material.name.StartsWith("TownDrive.Art.Stucco"))).ToArray();
            Assert.That(roof.Length, Is.GreaterThan(20)); Assert.That(walls.Length, Is.GreaterThan(20));
            foreach (var material in roof.Concat(walls).SelectMany(renderer => renderer.sharedMaterials).Where(material => material.name.StartsWith("TownDrive.Art.")).Distinct())
            {
                Assert.That(TownDriveProject.SupportsTownDrivePipeline(material), Is.True, material.name);
                foreach (string property in new[] { "_BaseMap", "_BumpMap", "_MetallicGlossMap", "_OcclusionMap" })
                {
                    var texture = material.GetTexture(property);
                    Assert.That(texture, Is.Not.Null, material.name + ":" + property);
                    string path = AssetDatabase.GetAssetPath(texture);
                    Assert.That(path, Does.StartWith(TownDriveProject.ArtInputs + "/"));
                    var importer = AssetImporter.GetAtPath(path) as TextureImporter;
                    Assert.That(importer, Is.Not.Null);
                    Assert.That(importer.mipmapEnabled, Is.True);
                    Assert.That(importer.wrapMode, Is.EqualTo(TextureWrapMode.Repeat));
                    Assert.That(importer.sRGBTexture, Is.EqualTo(property == "_BaseMap"));
                    Assert.That(importer.textureType, Is.EqualTo(property == "_BumpMap" ? TextureImporterType.NormalMap : TextureImporterType.Default));
                }
                Assert.That(material.GetTexture("_MetallicGlossMap"), Is.SameAs(material.GetTexture("_OcclusionMap")));
            }

            var garden = JsonUtility.FromJson<TownDriveProject.TownDriveGardenEvidence>(File.ReadAllText("Builds/town-drive-garden-art-receipt.json"));
            Assert.That(garden.result, Is.EqualTo("Succeeded"));
            Assert.That(garden.sourceLots, Is.EqualTo(83)); Assert.That(garden.beds, Is.EqualTo(166));
            Assert.That(garden.triangles, Is.GreaterThan(0).And.LessThan(150000));
            Assert.That(garden.maximumHeight, Is.LessThan(.95f)); Assert.That(garden.minimumRoadEdgeClearance, Is.GreaterThan(1));
            var gardenRoot = Node("TownDrive.GardenArt");
            Assert.That(gardenRoot.GetComponentsInChildren<Collider>(true), Is.Empty, "Cosmetic planting must not alter collision.");
            var gardenRenderers = gardenRoot.GetComponentsInChildren<MeshRenderer>(true);
            Assert.That(gardenRenderers.Length, Is.EqualTo(garden.renderers));
            Assert.That(gardenRoot.GetComponentsInChildren<LODGroup>(true).Length, Is.EqualTo(garden.cells));
            long triangles = 0;
            var routeEnvelope = JsonUtility.FromJson<ArtRoadEnvelope>(File.ReadAllText(TownDriveProject.DataPath));
            var roadSegments = ArtRoadSegments(routeEnvelope).ToArray();
            foreach (var renderer in gardenRenderers)
            {
                Assert.That(renderer.sharedMaterials.Length, Is.GreaterThan(0));
                Assert.That(renderer.sharedMaterials.All(material => material != null && TownDriveProject.SupportsTownDrivePipeline(material)), Is.True);
                var mesh = renderer.GetComponent<MeshFilter>().sharedMesh;
                Assert.That(mesh, Is.Not.Null);
                triangles += Enumerable.Range(0, mesh.subMeshCount).Sum(index => (long)mesh.GetIndexCount(index) / 3);
                var bounds = renderer.bounds;
                var nearby = roadSegments.Where(segment => segment.MayReach(bounds)).ToArray();
                bool finite = true;
                float minimumY = float.PositiveInfinity, maximumY = float.NegativeInfinity, clearance = float.PositiveInfinity;
                foreach (var vertex in mesh.vertices)
                {
                    var point = renderer.transform.TransformPoint(vertex);
                    finite &= FiniteArt(point.x) && FiniteArt(point.y) && FiniteArt(point.z);
                    minimumY = Mathf.Min(minimumY,point.y); maximumY = Mathf.Max(maximumY,point.y);
                    foreach (var segment in nearby) clearance = Mathf.Min(clearance,segment.Clearance(point));
                }
                Assert.That(finite, Is.True, mesh.name);
                Assert.That(minimumY, Is.GreaterThanOrEqualTo(.18f), mesh.name);
                Assert.That(maximumY, Is.LessThan(.95f), mesh.name);
                Assert.That(clearance, Is.GreaterThan(1), "Garden entered a road corridor: " + mesh.name);
            }
            Assert.That(triangles, Is.EqualTo(garden.triangles));
        }

        static bool FiniteArt(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
        [Serializable] sealed class ArtRoadEnvelope { public DriveRouteData route = null; public ArtRoadContext context = null; }
        [Serializable] sealed class ArtRoadContext { public ArtContextRoad[] roads = null; }
        [Serializable] sealed class ArtContextRoad { public float width = 0; public ArtRoadPoint[] points = null; }
        [Serializable] sealed class ArtRoadPoint { public float x = 0, z = 0; }
        struct ArtRoadSegment
        {
            public Vector2 a, b; public float halfWidth;
            public bool MayReach(Bounds bounds) => Mathf.Min(a.x,b.x)-halfWidth-1 <= bounds.max.x && Mathf.Max(a.x,b.x)+halfWidth+1 >= bounds.min.x
                && Mathf.Min(a.y,b.y)-halfWidth-1 <= bounds.max.z && Mathf.Max(a.y,b.y)+halfWidth+1 >= bounds.min.z;
            public float Clearance(Vector3 point)
            {
                var position = new Vector2(point.x,point.z); var delta = b-a;
                float t = Mathf.Clamp01(Vector2.Dot(position-a,delta)/Mathf.Max(.000001f,delta.sqrMagnitude));
                return Vector2.Distance(position,a+delta*t)-halfWidth;
            }
        }
        static IEnumerable<ArtRoadSegment> ArtRoadSegments(ArtRoadEnvelope data)
        {
            foreach (var road in data.context.roads) for (int index = 1; index < road.points.Length; index++)
                yield return new ArtRoadSegment { a = new Vector2(road.points[index-1].x,road.points[index-1].z),
                    b = new Vector2(road.points[index].x,road.points[index].z), halfWidth = road.width/2 };
            for (int index = 1; index < data.route.samples.Length; index++)
            {
                var a = data.route.samples[index-1]; var b = data.route.samples[index]; var section = data.route.sections[a.sectionIndex];
                yield return new ArtRoadSegment { a = new Vector2((float)a.x,(float)a.z), b = new Vector2((float)b.x,(float)b.z),
                    halfWidth = (float)(section.lanes*section.laneWidth+section.medianWidth/2) };
            }
        }
    }
}
