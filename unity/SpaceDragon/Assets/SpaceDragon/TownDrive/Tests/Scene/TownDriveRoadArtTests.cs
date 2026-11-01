using System;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace SpaceDragon.TownDrive.Editor.Tests
{
    public sealed partial class TownDriveSceneTests
    {
        [Serializable] sealed class RoadPaintTestData { public RoadPaintTestJunction[] junctions = null; }
        [Serializable] sealed class RoadPaintTestJunction { public float x = 0, z = 0, radius = 0; }
        [Test]
        public void PaintRibbonStaysStraightFlatAndJoinedAcrossPolylineVertices()
        {
            var line = new[] { new Vector3(0, 5, 0), new Vector3(0, -2, 10), new Vector3(0, 7, 22), new Vector3(0, 0, 41) };
            var vertices = TownDriveProject.JoinedPaintVertices(line, .11f, .10f);
            Assert.That(vertices.Length, Is.EqualTo(line.Length * 2));
            for (int i = 0; i < line.Length; i++)
            {
                Assert.That(vertices[2 * i].x, Is.EqualTo(.06f).Within(.00001));
                Assert.That(vertices[2 * i + 1].x, Is.EqualTo(.16f).Within(.00001));
                Assert.That(vertices[2 * i].z, Is.EqualTo(line[i].z));
                Assert.That(vertices[2 * i].y, Is.EqualTo(TownDriveProject.RoadPaintHeight));
                Assert.That(vertices[2 * i + 1].y, Is.EqualTo(TownDriveProject.RoadPaintHeight));
            }
            var bend = new[] { Vector3.zero, new Vector3(0, 0, 12), new Vector3(6, 0, 24) };
            var joined = TownDriveProject.JoinedPaintVertices(bend, .11f, .10f);
            Assert.That(joined.Length, Is.EqualTo(6), "One shared left/right pair at the join, rather than overlapping rotated boxes.");
            var beforeNormal = Vector3.right;
            var afterNormal = new Vector3(12, 0, -6).normalized;
            foreach (var normal in new[] { beforeNormal, afterNormal })
            {
                Assert.That(Vector3.Dot(joined[2] - bend[1], normal), Is.EqualTo(.06f).Within(.00001));
                Assert.That(Vector3.Dot(joined[3] - bend[1], normal), Is.EqualTo(.16f).Within(.00001));
            }
            Assert.Throws<ArgumentException>(() => TownDriveProject.JoinedPaintVertices(new[] { Vector3.zero, Vector3.zero }, 0, .1f));
        }

        [Test]
        public void ReferenceRoadPaintPersistsWithoutMarkingTheCourtOrChangingSourceGeometry()
        {
            var report = JsonUtility.FromJson<TownDriveProject.TownDriveRoadEvidence>(File.ReadAllText(TownDriveProject.RoadArtReceipt));
            Assert.That(report.result, Is.EqualTo("Succeeded"));
            Assert.That(report.routeSha256, Is.EqualTo(TownDriveProject.HashFile(TownDriveProject.DataPath)));
            Assert.That(report.paintHeight, Is.EqualTo(.030f));
            Assert.That(report.markings.Length, Is.EqualTo(report.strokes).And.GreaterThan(50));
            Assert.That(report.markings.Any(stroke => stroke.id == "green-island-stop-approach"), Is.True);
            Assert.That(report.markings.Any(stroke => stroke.id == "winston-gate-approach"), Is.True);
            Assert.That(report.markings.Any(stroke => stroke.id == "gate-island-guide"), Is.True);
            Assert.That(report.markings.All(stroke => stroke.fromS >= 105 && stroke.toS < 2578), Is.True,
                "The court, ordinary Green Island stretch and invented residential return have no blanket paint.");
            var world = Node("TownDrive.World");
            var originals = world.GetComponentsInChildren<MeshRenderer>(true).Where(TownDriveProject.IsOriginalRoadPaint).ToArray();
            Assert.That(originals.Length, Is.EqualTo(report.hiddenSourceRenderers).And.GreaterThan(100));
            Assert.That(originals.All(renderer => !renderer.gameObject.activeInHierarchy), Is.True);
            foreach (var renderer in originals)
            {
                Assert.That(renderer.CompareTag("EditorOnly"), Is.True, "Superseded paint must remain in the Editor but leave the player build.");
                Assert.That(renderer.transform.childCount, Is.Zero, "Only presentation leaves may be stripped.");
                Assert.That(renderer.GetComponents<Component>().All(component => component is Transform || component is MeshFilter || component is MeshRenderer), Is.True,
                    "Original paint may not carry collisions or gameplay components.");
                Assert.That(AssetDatabase.GetAssetPath(renderer.GetComponent<MeshFilter>().sharedMesh), Does.StartWith(TownDriveProject.Imported + "/"), "Original stripe geometry must remain recoverable.");
            }
            var root = Node("TownDrive.RoadArt");
            Assert.That(root.GetComponentsInChildren<Transform>(true).All(node => !node.CompareTag("EditorOnly")), Is.True,
                "The replacement ribbons must remain in the player build.");
            for (var parent = root.parent; parent != null; parent = parent.parent)
                Assert.That(parent.CompareTag("EditorOnly"), Is.False, "No world ancestor may strip the replacement paint.");
            Assert.That(root.GetComponentsInChildren<Collider>(true), Is.Empty);
            var renderers = root.GetComponentsInChildren<MeshRenderer>(true);
            Assert.That(renderers.Length, Is.EqualTo(report.renderers).And.LessThanOrEqualTo(80));
            Assert.That(renderers.SelectMany(renderer => renderer.sharedMaterials).Distinct().Count(), Is.EqualTo(2));
            var junctions = JsonUtility.FromJson<RoadPaintTestData>(File.ReadAllText(TownDriveProject.DataPath)).junctions;
            int triangles = 0;
            foreach (var renderer in renderers)
            {
                Assert.That(renderer.shadowCastingMode, Is.EqualTo(ShadowCastingMode.Off), "Paint cannot cast a raised-strip shadow.");
                Assert.That(TownDriveProject.SupportsTownDrivePipeline(renderer.sharedMaterial), Is.True);
                var mesh = renderer.GetComponent<MeshFilter>().sharedMesh;
                Assert.That(AssetDatabase.GetAssetPath(mesh), Does.StartWith(TownDriveProject.RoadArtFolder + "/"));
                Assert.That(mesh.vertices.All(vertex => Mathf.Abs(vertex.y - .030f) < .00001f), Is.True, "Paint must remain a flat road-surface ribbon.");
                Assert.That(mesh.vertices.All(vertex => Vector2.Distance(new Vector2(vertex.x, vertex.z), Vector2.zero) > 55), Is.True, "No new road paint at the home cul-de-sac.");
                Assert.That(mesh.vertices.All(vertex => junctions.All(junction => Vector2.Distance(new Vector2(vertex.x, vertex.z), new Vector2(junction.x, junction.z)) >= junction.radius - .02f)), Is.True,
                    "Paint cannot extend through a turning intersection.");
                Assert.That(mesh.normals.All(normal => Vector3.Dot(normal, Vector3.up) > .99f), Is.True);
                triangles += mesh.triangles.Length / 3;
            }
            Assert.That(triangles, Is.EqualTo(report.triangles).And.LessThan(30000));
        }
    }
}
