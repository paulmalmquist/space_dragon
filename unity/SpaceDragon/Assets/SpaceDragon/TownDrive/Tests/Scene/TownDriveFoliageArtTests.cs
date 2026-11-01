using System;
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
        public void AuthoredPalmCrownsHaveDroopingVolumeAndAStableLowDetailSilhouette()
        {
            Mesh near=null,far=null;
            try
            {
                near=TownDriveProject.CreatePalmCrownForReview(537,false);far=TownDriveProject.CreatePalmCrownForReview(537,true);
                Assert.That(near.bounds.size.x,Is.GreaterThan(5));Assert.That(near.bounds.size.z,Is.GreaterThan(5));
                Assert.That(near.bounds.size.y,Is.GreaterThan(2.8f),"A palm crown must contain upright and drooping fronds, not an umbrella plane.");
                Assert.That(near.bounds.min.y,Is.GreaterThan(7.8f));Assert.That(near.bounds.max.y,Is.LessThan(12.1f));
                Assert.That(far.bounds.size.x/near.bounds.size.x,Is.InRange(.8f,1.15f));Assert.That(far.bounds.size.z/near.bounds.size.z,Is.InRange(.8f,1.15f));
                Assert.That(far.triangles.Length,Is.LessThan(near.triangles.Length/4));
                foreach(var mesh in new[]{near,far})
                {
                    Assert.That(mesh.vertices.All(v=>FiniteArt(v.x)&&FiniteArt(v.y)&&FiniteArt(v.z)),Is.True);
                    Assert.That(mesh.normals.All(n=>n.sqrMagnitude>.9f&&n.sqrMagnitude<1.1f),Is.True);
                    Assert.That(mesh.uv.All(uv=>uv.x>=0&&uv.x<=1&&uv.y>=0&&uv.y<=1),Is.True);
                }
            }
            finally{if(near!=null)Object.DestroyImmediate(near);if(far!=null)Object.DestroyImmediate(far);}
        }

        [Test]
        public void PersistedPalmCrownsRetainMappedAnchorsAndOnlyReplaceLeafPresentation()
        {
            var report=JsonUtility.FromJson<TownDriveProject.TownDriveFoliageEvidence>(File.ReadAllText(TownDriveProject.FoliageArtReceipt));
            Assert.That(report.result,Is.EqualTo("Succeeded"));Assert.That(report.manifestSha256,Is.EqualTo(TownDriveProject.HashFile(TownDriveProject.ManifestPath)));
            Assert.That(report.palms,Is.EqualTo(162));Assert.That(report.replacedParts,Is.EqualTo(324));
            Assert.That(report.retainedParts,Is.EqualTo(manifest.vegetationInstances.Length));
            string leafPath=TownDriveProject.FoliageArtFolder+"/pinnate-leaf.png";
            Assert.That(report.leafTextureSha256,Is.EqualTo(TownDriveProject.HashFile(leafPath)));
            var leafImporter=AssetImporter.GetAtPath(leafPath) as TextureImporter;
            Assert.That(leafImporter,Is.Not.Null);Assert.That(leafImporter.mipmapEnabled,Is.True);
            Assert.That(leafImporter.wrapMode,Is.EqualTo(TextureWrapMode.Clamp));Assert.That(leafImporter.sRGBTexture,Is.True);
            var foliage=Node("TownDrive.FoliageArt");Assert.That(foliage.GetComponentsInChildren<Collider>(true),Is.Empty);
            Assert.That(foliage.localPosition,Is.EqualTo(Vector3.zero));Assert.That(foliage.localScale,Is.EqualTo(Vector3.one));
            var groups=foliage.GetComponentsInChildren<LODGroup>(true);var renderers=foliage.GetComponentsInChildren<MeshRenderer>(true);
            Assert.That(groups.Length,Is.EqualTo(report.cells));Assert.That(renderers.Length,Is.EqualTo(report.renderers));Assert.That(renderers.Length,Is.LessThan(80));
            int triangles=0;
            foreach(var group in groups)
            {
                var levels=group.GetLODs();Assert.That(levels.Length,Is.EqualTo(2));
                Assert.That(levels[0].screenRelativeTransitionHeight,Is.GreaterThan(levels[1].screenRelativeTransitionHeight));
                foreach(var renderer in levels.SelectMany(level=>level.renderers))
                {
                    var mesh=renderer.GetComponent<MeshFilter>().sharedMesh;
                    Assert.That(AssetDatabase.GetAssetPath(mesh),Does.StartWith(TownDriveProject.FoliageArtFolder+"/"));
                    Assert.That(mesh.bounds.min.y,Is.GreaterThan(4.1f),"New crowns must leave road and pedestrian height clear.");
                    triangles+=mesh.triangles.Length/3;
                    Assert.That(renderer.sharedMaterial.GetTexture("_BaseMap"),Is.Not.Null);
                    Assert.That(renderer.sharedMaterial.GetFloat("_AlphaClip"),Is.Zero,"Silhouette is geometry, not fragile alpha cards.");
                }
            }
            Assert.That(triangles,Is.EqualTo(report.nearTriangles+report.farTriangles));Assert.That(triangles,Is.LessThan(150000));
            foreach(var anchor in report.anchors)
            {
                var source=manifest.vegetationInstances.Single(part=>part.id==anchor.sourceId);
                Assert.That(Vector3.Distance(source.position,anchor.position),Is.LessThan(.00001f));
                Assert.That(Vector3.Distance(source.scale,anchor.scale),Is.LessThan(.00001f));
                Assert.That(Quaternion.Angle(source.rotationQuaternion,anchor.rotation),Is.LessThan(.001f));
            }
            foreach(var source in manifest.vegetationInstances.Where(part=>part.assetId=="vegetation-palm"))
            {
                var original=Node("TownDrive.PlantPart."+source.id);
                bool leaf=source.meshName=="palm.near.2"||source.meshName=="palm.near.3";
                Assert.That(original.gameObject.activeSelf,Is.EqualTo(!leaf),source.id);
                Assert.That(original.GetComponentsInChildren<MeshFilter>(true).All(filter=>filter.sharedMesh!=null),Is.True);
            }
        }
    }
}
