using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class GasPocketVisualTests
    {
        GameObject rock;
        GasPocketVisual visual;
        DogfightTuning tuning;
        [SetUp] public void Setup()
        {
            rock=GameObject.CreatePrimitive(PrimitiveType.Sphere);rock.name="Existing solid asteroid";
            rock.transform.SetPositionAndRotation(new Vector3(20,30,40),Quaternion.Euler(25,15,8));rock.transform.localScale=new Vector3(35,25,40);
            tuning=ScriptableObject.CreateInstance<DogfightTuning>();visual=new GasPocketVisual();visual.Setup(rock.transform,tuning);
        }
        [TearDown] public void Cleanup(){visual.Dispose();Object.DestroyImmediate(rock);Object.DestroyImmediate(tuning);}
        [Test] public void MarkerAndVentsPreserveExistingAsteroidMeshMaterialTransformAndCollider()
        {
            var mesh=rock.GetComponent<MeshFilter>().sharedMesh;var material=rock.GetComponent<Renderer>().sharedMaterial;
            var collider=rock.GetComponent<SphereCollider>();float radius=collider.radius;
            var position=rock.transform.position;var rotation=rock.transform.rotation;var scale=rock.transform.localScale;
            visual.Tick(false,1,false);Assert.True(visual.Visible);Assert.AreEqual(8,visual.OwnedRendererCount);
            Assert.AreEqual(1,rock.GetComponentsInChildren<Collider>(true).Length);Assert.AreSame(collider,rock.GetComponent<Collider>());
            Assert.AreEqual(radius,collider.radius);Assert.AreEqual(position,rock.transform.position);Assert.AreEqual(rotation,rock.transform.rotation);Assert.AreEqual(scale,rock.transform.localScale);
            Assert.AreSame(mesh,rock.GetComponent<MeshFilter>().sharedMesh);Assert.AreSame(material,rock.GetComponent<Renderer>().sharedMaterial);
        }
        [Test] public void DetonationHidesOnlyAddedCuesAndResetRestoresThem()
        {
            visual.Tick(true,2,false);Assert.True(visual.Detonated);Assert.False(visual.Visible);
            Assert.True(rock.activeSelf);Assert.True(rock.GetComponent<Collider>().enabled);Assert.True(rock.GetComponent<Renderer>().enabled);
            visual.Tick(false,0,false);Assert.False(visual.Detonated);Assert.True(visual.Visible);
        }
        [Test] public void ReducedMotionPlumesAreStableAndNoTickMeansNoAnimation()
        {
            var plume=rock.transform.Find("PLACEHOLDER gas pocket - marker and three vents only/Gas pocket outward vent plume 1").GetComponent<LineRenderer>();
            visual.Tick(false,1,true);Vector3 end=plume.GetPosition(1);
            visual.Tick(false,100,true);Assert.AreEqual(end,plume.GetPosition(1));
            visual.Tick(false,.1f,false);Vector3 animated=plume.GetPosition(1);visual.Tick(false,.1f,false);Assert.AreEqual(animated,plume.GetPosition(1));
            Assert.AreEqual(0,rock.GetComponentsInChildren<Rigidbody>().Length);
        }
        [Test] public void DisabledFlagAndDisposeDoNotAffectOriginalRock()
        {
            var vent=rock.transform.Find("PLACEHOLDER gas pocket - marker and three vents only/Gas pocket solid vent collar 1").GetComponent<MeshFilter>();
            var ownedMesh=vent.sharedMesh;var ownedMaterial=vent.GetComponent<Renderer>().sharedMaterial;
            tuning.EnableRockWeapons=false;visual.Tick(false,1,false);Assert.False(visual.Visible);
            visual.Dispose();Assert.True(ownedMesh==null);Assert.True(ownedMaterial==null);Assert.AreEqual(0,rock.transform.childCount);
            Assert.NotNull(rock.GetComponent<Collider>());visual.Setup(rock.transform,tuning);Assert.AreEqual(0,visual.OwnedRendererCount);
        }
    }
}
