using System;
using UnityEngine;
using UnityEngine.Rendering;

namespace SpaceDragon.Dogfight
{
    /// <summary>
    /// Placeholder three-claw impact and shockwave. This component cannot hit,
    /// disable, reward or move anything. Its optional parent-local lunge offset is
    /// composed by the encounter after DragonPresentation writes its base pose.
    /// </summary>
    public sealed class FinisherFeedbackVfx : MonoBehaviour
    {
        const int RingSegments=32,SlashSamples=7;
        readonly LineRenderer[] slashes=new LineRenderer[3];
        Transform ship;
        DogfightTuning tuning;
        GameObject ownedRoot;
        LineRenderer ring;
        Material material;
        Vector3 right,up;
        float age;
        bool configured;
        public bool Active {get;private set;}
        public bool ReducedMotion {get;private set;}
        public Vector3 VisualLungeOffset {get;private set;}
        public Vector3 TargetWorld {get;private set;}
        public float ShockwaveRadius {get;private set;}
        public float RemainingSeconds=>Active?Mathf.Max(0,tuning.FinisherVisualSeconds-age):0;

        public void Setup(Transform visualMotion,DogfightTuning settings)
        {
            if(visualMotion==null || settings==null)throw new ArgumentException("Finisher feedback requires visual motion and encounter tuning.");
            if(configured)throw new InvalidOperationException("Configure finisher feedback once.");
            var shader=Shader.Find("SpaceDragon/Dogfight/Weapon Energy");
            if(shader==null)throw new InvalidOperationException("Retain the existing Weapon Energy shader for finisher feedback.");
            ship=visualMotion;tuning=settings;
            ownedRoot=new GameObject("PLACEHOLDER claw finisher impact - cosmetic only");ownedRoot.transform.SetParent(transform,false);
            material=new Material(shader){name="Placeholder heavy claw impact energy"};material.SetFloat("_Flame",0);
            ring=Line("Finisher expanding shockwave",RingSegments+1);
            for(int i=0;i<slashes.Length;i++)slashes[i]=Line("Finisher claw slash "+(i+1),SlashSamples);
            configured=true;Clear();
        }
        LineRenderer Line(string name,int count)
        {
            var obj=new GameObject(name);obj.transform.SetParent(ownedRoot.transform,false);
            var line=obj.AddComponent<LineRenderer>();line.sharedMaterial=material;line.positionCount=count;line.useWorldSpace=true;
            line.startWidth=line.endWidth=Mathf.Max(.001f,tuning.FinisherLineWidth);line.numCapVertices=3;line.numCornerVertices=2;
            line.shadowCastingMode=ShadowCastingMode.Off;line.receiveShadows=false;line.enabled=false;return line;
        }
        public void Trigger(Vector3 targetWorld)
        {
            if(!configured)return;
            if(!Finite(targetWorld.x)||!Finite(targetWorld.y)||!Finite(targetWorld.z))throw new ArgumentException("Finisher impact must be finite.");
            Clear();Active=true;TargetWorld=targetWorld;
            Vector3 forward=(targetWorld-ship.position).normalized;if(forward.sqrMagnitude<.01f)forward=ship.forward;
            right=Vector3.Cross(ship.up,forward).normalized;
            if(right.sqrMagnitude<.01f)right=Vector3.Cross(ship.right,forward).normalized;
            up=Vector3.Cross(forward,right).normalized;
            float length=Mathf.Max(0,tuning.FinisherSlashLength);
            for(int claw=0;claw<slashes.Length;claw++)for(int sample=0;sample<SlashSamples;sample++)
            {
                float t=sample/(float)(SlashSamples-1);
                float x=(claw-1)*.28f*length+(t-.5f)*.30f*length+Mathf.Sin(t*Mathf.PI)*.10f*length;
                float y=(.5f-t)*length;
                slashes[claw].SetPosition(sample,targetWorld+right*x+up*y);
            }
            // Tick selects accessibility treatment before anything is shown.
        }
        public void Tick(float dt,bool reducedMotion)
        {
            if(!configured||!Active||dt<=0||!Finite(dt))return;
            age+=dt;ReducedMotion=reducedMotion;
            float duration=Mathf.Max(0,tuning.FinisherVisualSeconds);
            if(age>=duration){Clear();return;}
            float progress=age/Mathf.Max(.001f,duration);
            VisualLungeOffset=reducedMotion?Vector3.zero:Vector3.forward*Mathf.Max(0,tuning.FinisherLungeDistance)*Mathf.Sin(progress*Mathf.PI);
            ShockwaveRadius=Mathf.Max(0,tuning.FinisherShockwaveRadius)*(reducedMotion?.3f:Mathf.Lerp(.25f,1,progress));
            float opacity=Mathf.Clamp01(tuning.FinisherCueOpacity)*(reducedMotion?1:1-progress);
            material.SetColor("_Tint",new Color(1.5f,.65f,.16f,opacity));
            ring.enabled=true;
            for(int i=0;i<=RingSegments;i++)
            {
                float angle=i*Mathf.PI*2/RingSegments;
                ring.SetPosition(i,TargetWorld+(right*Mathf.Cos(angle)+up*Mathf.Sin(angle))*ShockwaveRadius);
            }
            foreach(var slash in slashes)slash.enabled=true;
        }
        public void Clear()
        {
            Active=ReducedMotion=false;age=0;VisualLungeOffset=TargetWorld=Vector3.zero;ShockwaveRadius=0;
            if(ring!=null)ring.enabled=false;foreach(var slash in slashes)if(slash!=null)slash.enabled=false;
        }
        static bool Finite(float n)=>!float.IsNaN(n)&&!float.IsInfinity(n);
        void OnDestroy(){Clear();Release(ownedRoot);Release(material);}
        static void Release(UnityEngine.Object item){if(item==null)return;if(Application.isPlaying)Destroy(item);else DestroyImmediate(item);}
    }
}
