using System;
using UnityEngine;
using UnityEngine.Rendering;

namespace SpaceDragon.Dogfight
{
    /// <summary>
    /// Labeled placeholder feedback only. Snapshots a cheap dragon outline at the
    /// accepted roll pose; it never samples/replaces skin meshes, moves the ship,
    /// advances combat time or decides whether a roll deserves a reward.
    /// </summary>
    public sealed class CombatFeedbackVfx : MonoBehaviour
    {
        const int FlareCount = 8;
        readonly LineRenderer[] outlines = new LineRenderer[3], flares = new LineRenderer[FlareCount];
        readonly Vector3[] flareStarts = new Vector3[FlareCount], flareDirections = new Vector3[FlareCount];
        Transform ship;
        DogfightTuning tuning;
        GameObject effectsRoot;
        Material outlineMaterial, flareMaterial;
        Bounds localBounds;
        float age;
        bool configured;
        public bool Active { get; private set; }
        public bool OutlineVisible => configured && outlines[0].enabled;
        public bool ReducedMotion { get; private set; }
        public int VisibleFlareCount { get; private set; }
        public float RemainingSeconds => Active ? Mathf.Max(0,tuning.PerfectRollVisualSeconds-age) : 0;
        public Vector3 SnapshotOrigin { get; private set; }

        public void Setup(Transform visualShip,DogfightTuning settings)
        {
            if(visualShip==null || settings==null)throw new ArgumentException("Combat feedback needs the visual ship and encounter tuning.");
            if(configured)throw new InvalidOperationException("Configure combat feedback once.");
            var shader=Shader.Find("SpaceDragon/Dogfight/Weapon Energy");
            if(shader==null)throw new InvalidOperationException("Retain the existing Weapon Energy shader for combat feedback.");
            ship=visualShip;tuning=settings;localBounds=MeasureSkinBounds(ship);
            effectsRoot=new GameObject("Placeholder perfect-roll outline and cosmetic flares");
            effectsRoot.transform.SetParent(transform,false);
            outlineMaterial=new Material(shader) {name="Placeholder perfect-roll red afterimage"};
            flareMaterial=new Material(shader) {name="Placeholder perfect-roll cosmetic flare shards"};
            outlineMaterial.SetFloat("_Flame",0);flareMaterial.SetFloat("_Flame",0);
            for(int i=0;i<outlines.Length;i++)outlines[i]=Line("Snapshot dragon outline "+i,outlineMaterial,tuning.PerfectRollOutlineWidth);
            for(int i=0;i<flares.Length;i++)flares[i]=Line("Cosmetic rear flare "+i,flareMaterial,tuning.PerfectRollFlareWidth);
            configured=true;Clear();
        }

        static Bounds MeasureSkinBounds(Transform root)
        {
            Bounds result=default;bool found=false;
            foreach(var skin in root.GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                if(skin.sharedMesh==null)continue;
                var bounds=skin.localBounds;
                for(int corner=0;corner<8;corner++)
                {
                    var p=bounds.center+Vector3.Scale(bounds.extents,new Vector3((corner&1)==0?-1:1,(corner&2)==0?-1:1,(corner&4)==0?-1:1));
                    p=root.InverseTransformPoint(skin.transform.TransformPoint(p));
                    if(!found){result=new Bounds(p,Vector3.zero);found=true;}else result.Encapsulate(p);
                }
            }
            // Abstract placeholder proportions only; normal gameplay uses actual
            // imported skin bounds. This also supports an asset-free test fixture.
            return found && result.size.sqrMagnitude>.01f ? result : new Bounds(Vector3.zero,new Vector3(10,3,8));
        }
        LineRenderer Line(string name,Material material,float width)
        {
            var obj=new GameObject(name);obj.transform.SetParent(effectsRoot.transform,false);
            var line=obj.AddComponent<LineRenderer>();line.sharedMaterial=material;
            line.useWorldSpace=true;line.positionCount=2;line.startWidth=line.endWidth=Mathf.Max(.001f,width);
            line.numCapVertices=2;line.numCornerVertices=2;line.shadowCastingMode=ShadowCastingMode.Off;line.receiveShadows=false;
            line.enabled=false;return line;
        }
        Vector3 Point(float x,float y,float z) => ship.TransformPoint(localBounds.center+Vector3.Scale(localBounds.size,new Vector3(x,y,z)));
        void Outline(LineRenderer line,Vector3[] points)
        {line.positionCount=points.Length;line.SetPositions(points);}

        public void PerfectRoll()
        {
            if(!configured)return;
            Clear();age=0;Active=true;SnapshotOrigin=ship.position;
            // Fixed outline topology is intentionally recognizable and inexpensive,
            // rather than duplicating a 200k-triangle skinned dragon for 350ms.
            for(int side=0;side<2;side++)
            {
                float sign=side==0?-1:1;
                Outline(outlines[side],new[]{Point(sign*.09f,.08f,.10f),Point(sign*.21f,.09f,.25f),
                    Point(sign*.50f,.08f,.30f),Point(sign*.38f,.06f,.05f),Point(sign*.43f,.04f,-.13f),
                    Point(sign*.25f,.04f,-.06f),Point(sign*.15f,.05f,-.20f),Point(sign*.09f,.08f,.10f)});
            }
            Outline(outlines[2],new[]{Point(0,.08f,-.50f),Point(-.07f,.08f,-.12f),Point(-.08f,.08f,.16f),
                Point(-.035f,.10f,.35f),Point(0,.10f,.45f),Point(.035f,.10f,.35f),Point(.08f,.08f,.16f),
                Point(.07f,.08f,-.12f),Point(0,.08f,-.50f)});
            for(int i=0;i<FlareCount;i++)
            {
                float angle=i*Mathf.PI*2/FlareCount;
                var radial=ship.right*Mathf.Cos(angle)+ship.up*Mathf.Sin(angle);
                flareStarts[i]=Point(0,.04f,-.30f);
                flareDirections[i]=(-ship.forward+radial*.65f).normalized;
            }
            // Tick chooses reduced-motion treatment before enabling any line.
        }

        public void Tick(float dt,bool reducedMotion)
        {
            if(!configured || !Active || dt<=0 || float.IsNaN(dt) || float.IsInfinity(dt))return;
            ReducedMotion=reducedMotion;age+=dt;
            float duration=Mathf.Max(0,tuning.PerfectRollVisualSeconds);
            if(age>=duration){Clear();return;}
            float fade=reducedMotion?1:1-age/Mathf.Max(.001f,duration);
            outlineMaterial.SetColor("_Tint",new Color(1,.055f,.025f,Mathf.Clamp01(tuning.PerfectRollOpacity)*fade));
            flareMaterial.SetColor("_Tint",new Color(1,.35f,.075f,Mathf.Clamp01(tuning.PerfectRollOpacity)*fade));
            foreach(var line in outlines)line.enabled=true;
            VisibleFlareCount=reducedMotion?0:FlareCount;
            for(int i=0;i<FlareCount;i++)
            {
                flares[i].enabled=!reducedMotion;if(reducedMotion)continue;
                Vector3 tip=flareStarts[i]+flareDirections[i]*Mathf.Max(0,tuning.PerfectRollFlareSpeed)*age;
                flares[i].SetPosition(0,tip);
                flares[i].SetPosition(1,tip-flareDirections[i]*Mathf.Max(0,tuning.PerfectRollFlareLength));
            }
        }
        public void Clear()
        {
            Active=false;age=0;VisibleFlareCount=0;ReducedMotion=false;SnapshotOrigin=Vector3.zero;
            foreach(var line in outlines)if(line!=null)line.enabled=false;
            foreach(var line in flares)if(line!=null)line.enabled=false;
        }
        void OnDestroy()
        {
            Clear();Release(effectsRoot);Release(outlineMaterial);Release(flareMaterial);
        }
        static void Release(UnityEngine.Object value)
        {if(value==null)return;if(Application.isPlaying)Destroy(value);else DestroyImmediate(value);}
    }
}
