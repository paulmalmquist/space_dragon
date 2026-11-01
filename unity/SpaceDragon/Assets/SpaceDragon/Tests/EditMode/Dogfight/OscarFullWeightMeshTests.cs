using System.IO;
using NUnit.Framework;
using SpaceDragon.Dogfight.Editor;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class OscarFullWeightMeshTests
    {
        [Test] public void RestoredCloneRetainsSixInfluencesAndTheirDeformationWithoutChangingSource()
        {
            var source=new Mesh {name="Immutable imported mesh"}; Mesh clone=null,baked=null; GameObject actor=null;
            var quality=QualitySettings.skinWeights;
            try
            {
                source.vertices=new[] {Vector3.zero,Vector3.right,Vector3.up}; source.triangles=new[] {0,1,2};
                source.normals=new[] {Vector3.forward,Vector3.forward,Vector3.forward};
                source.tangents=new[] {new Vector4(1,0,0,1),new Vector4(1,0,0,1),new Vector4(1,0,0,1)};
                source.uv=new[] {Vector2.zero,Vector2.right,Vector2.up};
                source.colors=new[] {new Color(.12345f,.2f,.3f),Color.green,Color.blue};
                source.AddBlendShapeFrame("retained shape",100,new[] {Vector3.up*.01f,Vector3.zero,Vector3.zero},new Vector3[3],new Vector3[3]);
                source.bindposes=new[] {Matrix4x4.identity,Matrix4x4.identity,Matrix4x4.identity,Matrix4x4.identity,Matrix4x4.identity,Matrix4x4.identity};
                source.boneWeights=new[] {new BoneWeight {boneIndex0=0,weight0=1},new BoneWeight {boneIndex0=0,weight0=1},new BoneWeight {boneIndex0=1,weight0=1}};
                var counts=new byte[] {6,1,1};
                var weights=new[] {W(0,.25f),W(1,.2f),W(2,.18f),W(3,.15f),W(4,.12f),W(5,.1f),W(0,1),W(1,1)};
                clone=OscarFullWeightMeshes.CreateWeightedClone(source,counts,weights,out float error);
                Assert.AreEqual(6,clone.GetBonesPerVertex()[0]); Assert.AreEqual(8,clone.GetAllBoneWeights().Length);
                Assert.AreEqual(1,source.GetBonesPerVertex()[0]); Assert.AreEqual(3,source.GetAllBoneWeights().Length);
                Assert.AreEqual(source.vertices,clone.vertices); Assert.AreEqual(source.triangles,clone.triangles);
                Assert.AreEqual(source.normals,clone.normals); Assert.AreEqual(source.tangents,clone.tangents);
                Assert.AreEqual(source.uv,clone.uv); Assert.AreEqual(source.colors,clone.colors); Assert.AreEqual(source.bounds,clone.bounds);
                Assert.AreEqual(1,clone.blendShapeCount); Assert.AreEqual("retained shape",clone.GetBlendShapeName(0));
                Assert.LessOrEqual(error,2f/65535);
                actor=new GameObject("Full weight test"); var skin=actor.AddComponent<SkinnedMeshRenderer>();
                var bones=new Transform[6];
                for(int i=0;i<bones.Length;i++) { bones[i]=new GameObject("bone"+i).transform; bones[i].SetParent(actor.transform,false); }
                skin.sharedMesh=clone; skin.bones=bones; skin.rootBone=bones[0]; skin.quality=SkinQuality.Auto;
                QualitySettings.skinWeights=SkinWeights.Unlimited;
                bones[4].localPosition=Vector3.right*2; bones[5].localPosition=Vector3.forward*3;
                baked=new Mesh(); skin.BakeMesh(baked,true);
                Assert.Less(Vector3.Distance(new Vector3(.24f,0,.3f),baked.vertices[0]),.0003f,
                    "The fifth and sixth source influences must contribute to the actual baked pose.");
                // Reproduce the imported Oscar renderer's non-unit normalization
                // and tilted/translated transform. Compensate first, transform once.
                actor.transform.SetPositionAndRotation(new Vector3(0,-1.13053796f,.36450218f),Quaternion.Euler(-10.17f,0,0));
                actor.transform.localScale=Vector3.one*.162447207f;
                skin.BakeMesh(baked,true);
                var expectedWorld=actor.transform.TransformPoint(new Vector3(.24f,0,.3f));
                Assert.Less(Vector3.Distance(expectedWorld,actor.transform.TransformPoint(baked.vertices[0])),.0003f);
                skin.BakeMesh(baked,false);
                Assert.Greater(Vector3.Distance(expectedWorld,actor.transform.TransformPoint(baked.vertices[0])),.02f,
                    "The uncompensated bake must expose the double-scale regression.");
            }
            finally
            {
                QualitySettings.skinWeights=quality;
                if(actor!=null) Object.DestroyImmediate(actor);
                if(baked!=null) Object.DestroyImmediate(baked);
                if(clone!=null) Object.DestroyImmediate(clone);
                Object.DestroyImmediate(source);
            }
        }
        [Test] public void InvalidFullWeightCountsFailBeforeMutatingImportedMesh()
        {
            var source=new Mesh();
            try
            {
                source.vertices=new[] {Vector3.zero};
                Assert.Throws<InvalidDataException>(()=>OscarFullWeightMeshes.CreateWeightedClone(source,new byte[] {2},new[] {W(0,1)},out _));
                Assert.Throws<InvalidDataException>(()=>OscarFullWeightMeshes.CreateWeightedClone(source,new byte[] {0},new BoneWeight1[0],out _));
                Assert.AreEqual(0,source.GetAllBoneWeights().Length);
            }
            finally { Object.DestroyImmediate(source); }
        }
        [Test] public void EightInfluenceNormalizationRemainderUsesAccumulatedQuantizationBound()
        {
            var source=new Mesh {name="CUERNOS.001 vertex1935 regression"};Mesh clone=null;
            try
            {
                source.vertices=new[] {Vector3.zero};
                var binds=new Matrix4x4[149];for(int i=0;i<binds.Length;i++) binds[i]=Matrix4x4.identity;source.bindposes=binds;
                // Actual source values from the first successful-format readback.
                var weights=new[] {W(119,.23325982689857483f),W(114,.22138641774654388f),W(102,.20922647416591644f),W(116,.10740459710359573f),
                    W(148,.08492589741945267f),W(42,.07037176191806793f),W(105,.04461058974266052f),W(104,.02881443500518799f)};
                clone=OscarFullWeightMeshes.CreateWeightedClone(source,new byte[] {8},weights,out float error);
                Assert.AreEqual(8,clone.GetBonesPerVertex()[0]);Assert.AreEqual(8,clone.GetAllBoneWeights().Length);
                Assert.LessOrEqual(error,7*.5f/65535+8*1.1920929e-7f);
                var actual=clone.GetAllBoneWeights();double sum=0;for(int i=0;i<actual.Length;i++) sum+=actual[i].weight;
                Assert.That(sum,Is.EqualTo(1).Within(8*1.1920929e-7));
                Assert.AreEqual(0,source.GetAllBoneWeights().Length);
            }
            finally {if(clone!=null) Object.DestroyImmediate(clone);Object.DestroyImmediate(source);}
        }
        [Test] public void FourInfluenceNormalizationCanAssignTheRemainderToTheFirstWeight()
        {
            var source=new Mesh {name="CUERNOS.001 vertex0 regression"};Mesh clone=null;
            try
            {
                source.vertices=new[] {Vector3.zero};
                var binds=new Matrix4x4[121];for(int i=0;i<binds.Length;i++) binds[i]=Matrix4x4.identity;source.bindposes=binds;
                var weights=new[] {W(43,.5018390417098999f),W(114,.24201497435569763f),W(42,.21835720539093018f),W(120,.03778877854347229f)};
                clone=OscarFullWeightMeshes.CreateWeightedClone(source,new byte[] {4},weights,out float error);
                Assert.AreEqual(4,clone.GetBonesPerVertex()[0]);Assert.AreEqual(4,clone.GetAllBoneWeights().Length);
                Assert.LessOrEqual(error,3*.5f/65535+4*1.1920929e-7f);
                var actual=clone.GetAllBoneWeights();double sum=0;for(int i=0;i<actual.Length;i++) sum+=actual[i].weight;
                Assert.That(sum,Is.EqualTo(1).Within(4*1.1920929e-7));
                Assert.AreEqual(0,source.GetAllBoneWeights().Length);
            }
            finally {if(clone!=null) Object.DestroyImmediate(clone);Object.DestroyImmediate(source);}
        }
        static BoneWeight1 W(int bone,float weight) => new BoneWeight1 {boneIndex=bone,weight=weight};
    }
}
