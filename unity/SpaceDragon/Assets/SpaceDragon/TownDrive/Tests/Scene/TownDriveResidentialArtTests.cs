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
        [Serializable] sealed class ResidentialTestData { public ResidentialTestContext context = null; }
        [Serializable] sealed class ResidentialTestContext { public ResidentialTestLot[] lots = null; }
        [Serializable] sealed class ResidentialTestLot { public float x = 0,z = 0,yaw = 0; public int seed = 0; public bool compact = false; }

        [Test]
        public void ResidentialReliefPersistsAtMappedFacadesWithoutOccupyingPublicRoads()
        {
            var report=JsonUtility.FromJson<TownDriveProject.TownDriveResidentialEvidence>(File.ReadAllText("Builds/town-drive-residential-art-receipt.json"));
            Assert.That(report.result,Is.EqualTo("Succeeded"));
            Assert.That(report.routeSha256,Is.EqualTo("4c5eba111e226ffd53daf5dfe7ca68274eb1b643d58fb4c6955e863e401c47ff"));
            Assert.That(TownDriveProject.HashFile(TownDriveProject.DataPath),Is.EqualTo(report.routeSha256));
            Assert.That(report.sourceLots,Is.EqualTo(83));Assert.That(report.facades,Is.EqualTo(83));
            Assert.That(report.windowFrames,Is.EqualTo(83*6));Assert.That(report.porchTrims,Is.EqualTo(83));
            Assert.That(report.garagePanels,Is.GreaterThanOrEqualTo(83*8));Assert.That(report.roofCaps,Is.GreaterThan(83*10));
            Assert.That(report.paletteUse.Length,Is.EqualTo(3));Assert.That(report.paletteUse.All(count=>count>5),Is.True);
            Assert.That(report.paletteUse.Sum(),Is.EqualTo(83));
            var root=Node("TownDrive.ResidentialArt");
            Assert.That(root.GetComponentsInChildren<Collider>(true),Is.Empty,"Facade art cannot change driving/walking collision.");
            var renderers=root.GetComponentsInChildren<MeshRenderer>(true);
            Assert.That(renderers.Length,Is.EqualTo(report.renderers).And.LessThan(100));
            Assert.That(root.GetComponentsInChildren<LODGroup>(true).Length,Is.EqualTo(report.cells));
            Assert.That(renderers.SelectMany(renderer=>renderer.sharedMaterials).Distinct().Count(),Is.EqualTo(5));
            var json=File.ReadAllText(TownDriveProject.DataPath);
            var lots=JsonUtility.FromJson<ResidentialTestData>(json).context.lots;
            var roads=ArtRoadSegments(JsonUtility.FromJson<ArtRoadEnvelope>(json)).ToArray();
            int triangles=0;
            foreach(var renderer in renderers)
            {
                Assert.That(renderer.sharedMaterials.All(material=>material!=null&&TownDriveProject.SupportsTownDrivePipeline(material)),Is.True);
                var mesh=renderer.GetComponent<MeshFilter>().sharedMesh;
                Assert.That(mesh,Is.Not.Null);Assert.That(AssetDatabase.GetAssetPath(mesh),Does.StartWith(TownDriveProject.ResidentialArtFolder+"/"));
                triangles+=mesh.triangles.Length/3;
                Assert.That(mesh.uv.Length,Is.EqualTo(mesh.vertexCount));Assert.That(mesh.tangents.Length,Is.EqualTo(mesh.vertexCount));
                var nearbyRoads=roads.Where(road=>road.MayReach(renderer.bounds)).ToArray();
                var bounds=renderer.bounds;
                var nearbyLots=lots.Where(lot=>lot.x>=bounds.min.x-25&&lot.x<=bounds.max.x+25&&lot.z>=bounds.min.z-25&&lot.z<=bounds.max.z+25).ToArray();
                float minimumClearance=float.PositiveInfinity;bool finite=true,inside=true;
                foreach(var vertex in mesh.vertices)
                {
                    var point=renderer.transform.TransformPoint(vertex);
                    finite&=FiniteArt(point.x)&&FiniteArt(point.y)&&FiniteArt(point.z);
                    inside&=point.y>=.009f&&point.y<6.7f&&nearbyLots.Any(lot=>InsideExistingResidentialEnvelope(point,lot));
                    if(point.y<2.5f)foreach(var road in nearbyRoads)minimumClearance=Mathf.Min(minimumClearance,road.Clearance(point));
                }
                Assert.That(finite,Is.True,mesh.name);Assert.That(inside,Is.True,"Facade detail escaped an existing house/porch envelope: "+mesh.name);
                Assert.That(minimumClearance,Is.GreaterThan(.5f),"Low architectural trim entered a road: "+mesh.name);
            }
            Assert.That(triangles,Is.EqualTo(report.triangles).And.GreaterThan(10000).And.LessThan(60000));
        }

        static bool InsideExistingResidentialEnvelope(Vector3 point,ResidentialTestLot lot)
        {
            double Random(int seed){double n=Math.Sin(seed*63.17+341.8)*9758.543;return n-Math.Floor(n);}
            double width=(lot.compact?14.8:17)+Random(lot.seed)*(lot.compact?1.7:3);
            double depth=(lot.compact?11.5:13)+Random(lot.seed+4)*(lot.compact?1.5:2);
            double dx=point.x-lot.x,dz=point.z-lot.z,c=Math.Cos(lot.yaw),s=Math.Sin(lot.yaw);
            double x=c*dx-s*dz,z=s*dx+c*dz;
            return Math.Abs(x)<width/2+.9&&z>-depth/2-3.5&&z<depth/2+.8;
        }
    }
}
