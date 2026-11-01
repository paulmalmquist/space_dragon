using System.IO;
using System.Linq;
using NUnit.Framework;
using SpaceDragon.TownDrive.Runtime;
using UnityEditor;
using UnityEngine;

namespace SpaceDragon.TownDrive.Editor.Tests
{
    public sealed partial class TownDriveSceneTests
    {
        [Test]
        public void CabinGrainPreservesSourceGeometryAndRearViewKeepsItsHandednessAndBudget()
        {
            var report = JsonUtility.FromJson<TownDriveProject.CabinArtReceipt>(File.ReadAllText("Builds/town-drive-cabin-art-receipt.json"));
            Assert.That(report.result, Is.EqualTo("Succeeded")); Assert.That(report.materials, Is.EqualTo(5)); Assert.That(report.renderers, Is.GreaterThanOrEqualTo(5));
            // The shared fixture already opened the persisted candidate and owns
            // its cached nodes. Reopening in Single mode destroys those nodes.
            var player = Node("TownDrive.Player").gameObject;
            foreach (var record in report.meshes)
            {
                var source = AssetDatabase.LoadAllAssetsAtPath(record.sourceAsset).OfType<Mesh>().Single(mesh =>
                    AssetDatabase.TryGetGUIDAndLocalFileIdentifier(mesh, out string guid, out long id) && guid == record.sourceGuid && id == record.sourceFileId);
                var derivative = AssetDatabase.LoadAssetAtPath<Mesh>(record.derivativeAsset);
                TownDriveProject.ValidateSurfaceGeometry(source, derivative);
                Assert.That(player.GetComponentsInChildren<MeshFilter>(true).Any(filter => filter.sharedMesh == derivative), Is.True, "Persisted cabin mesh binding.");
                Assert.That(derivative.tangents.Length, Is.EqualTo(derivative.vertexCount));
            }
            var materials = player.GetComponentsInChildren<MeshRenderer>(true).SelectMany(renderer => renderer.sharedMaterials)
                .Where(material => material != null && material.name.EndsWith(".cabin-art")).Distinct().ToArray();
            Assert.That(materials.Length, Is.EqualTo(5));
            foreach (var material in materials)
            {
                Assert.That(material.shader.name, Is.EqualTo("Universal Render Pipeline/Lit"));
                var normal = material.GetTexture("_BumpMap"); Assert.That(normal, Is.Not.Null);
                var importer = (TextureImporter)AssetImporter.GetAtPath(AssetDatabase.GetAssetPath(normal));
                Assert.That(importer.textureType, Is.EqualTo(TextureImporterType.NormalMap)); Assert.That(importer.sRGBTexture, Is.False);
                Assert.That(importer.mipmapEnabled, Is.True); Assert.That(importer.wrapMode, Is.EqualTo(TextureWrapMode.Repeat));
            }
            Assert.That(player.GetComponents<TownDriveRearView>().Length, Is.EqualTo(1));
            var surface = player.transform.Find("TownDrive.RearViewSurface"); Assert.That(surface, Is.Not.Null);
            Assert.That(surface.localPosition.z, Is.LessThan(1.020f));
            Assert.That(surface.GetComponent<Collider>(), Is.Null);
            var mirrorMesh = surface.GetComponent<MeshFilter>().sharedMesh;
            Assert.That(mirrorMesh.normals.All(normal => normal.z < -.99f), Is.True, "Rear view faces the driver.");
            for (int i = 0; i < mirrorMesh.vertexCount; i++)
                Assert.That(mirrorMesh.uv[i].x, Is.EqualTo(1 - (mirrorMesh.vertices[i].x + .125f) / .25f).Within(.00001f), "Horizontal reflection preserves vehicle left/right.");
            Assert.That(TownDriveRearView.CameraLocalPosition.z, Is.LessThan(-2.606f), "Camera is beyond the preserved body.");
            Assert.That(TownDriveRearView.TextureWidth * TownDriveRearView.TextureHeight, Is.LessThan(30000));
            Assert.That(TownDriveRearView.CaptureInterval, Is.GreaterThanOrEqualTo(1.0 / 6.0));
        }
    }
}
