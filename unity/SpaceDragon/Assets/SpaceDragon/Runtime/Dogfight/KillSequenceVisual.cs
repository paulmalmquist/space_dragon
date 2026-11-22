using System;
using UnityEngine;
using UnityEngine.Rendering;
using Object=UnityEngine.Object;

namespace SpaceDragon.Dogfight
{
    /// <summary>
    /// Draws one kill sequence or gas blast from <see cref="KillSequenceState"/>: a starburst,
    /// flying shards and a camera-facing shockwave ring. Code-built lines on the existing Weapon
    /// Energy shader, labelled placeholder art. It owns no rule and no collider and never touches
    /// an enemy; the encounter moves the wreck itself. Line widths grow with distance so that the
    /// effect can be seen at combat range.
    /// Nothing is built until the first sequence is shown, so a switched-off pass owns nothing.
    /// </summary>
    public sealed class KillSequenceVisual : IDisposable
    {
        public const int RingSegments=40,SpikeCount=8,ShardCount=10;
        readonly LineRenderer[] spikes=new LineRenderer[SpikeCount],shards=new LineRenderer[ShardCount];
        LineRenderer ring;
        Material ringMaterial,flashMaterial,shardMaterial;
        GameObject root;
        DogfightTuning tuning;
        bool built;
        public bool Visible {get;private set;}
        public bool RingVisible=>built&&ring.enabled;
        public int VisibleSpikes {get;private set;}
        public int VisibleShards {get;private set;}
        public float DrawnRingRadius {get;private set;}
        public float DrawnLineWidth {get;private set;}
        public int OwnedRendererCount=>root!=null?root.GetComponentsInChildren<Renderer>(true).Length:0;

        public void Setup(DogfightTuning settings)
        {
            if(settings==null)throw new ArgumentException("Kill sequence visuals require encounter tuning.");
            if(tuning!=null)throw new InvalidOperationException("Configure each kill sequence visual once.");
            tuning=settings;
        }

        /// <summary>Evenly spread directions that differ per variant, with no Random.</summary>
        public static Vector3 Direction(int index,int count,int variant)
        {
            if(count<=0)return Vector3.up;
            float y=1-2*(index+.5f)/count,r=Mathf.Sqrt(Mathf.Max(0,1-y*y));
            float angle=index*2.39996f+variant*1.3f;
            return new Vector3(Mathf.Cos(angle)*r,y,Mathf.Sin(angle)*r);
        }

        void Build()
        {
            var shader=Shader.Find("SpaceDragon/Dogfight/Weapon Energy");
            if(shader==null)throw new InvalidOperationException("Retain the existing Weapon Energy shader for kill sequences.");
            root=new GameObject("PLACEHOLDER kill sequence - cosmetic only");
            ringMaterial=Energy(shader,"Placeholder kill shockwave ring");
            flashMaterial=Energy(shader,"Placeholder kill flash starburst");
            shardMaterial=Energy(shader,"Placeholder kill debris shards");
            ring=Line("Kill shockwave ring",ringMaterial,RingSegments+1);
            for(int i=0;i<SpikeCount;i++)spikes[i]=Line("Kill flash spike "+(i+1),flashMaterial,2);
            for(int i=0;i<ShardCount;i++)shards[i]=Line("Kill debris shard "+(i+1),shardMaterial,2);
            built=true;
        }
        static Material Energy(Shader shader,string name)
        {
            var material=new Material(shader){name=name};material.SetFloat("_Flame",0);
            material.SetColor("_Tint",new Color(0,0,0,0));return material;
        }
        LineRenderer Line(string name,Material material,int count)
        {
            var obj=new GameObject(name);obj.transform.SetParent(root.transform,false);
            var line=obj.AddComponent<LineRenderer>();line.sharedMaterial=material;line.useWorldSpace=true;line.positionCount=count;
            line.numCapVertices=2;line.shadowCastingMode=ShadowCastingMode.Off;line.receiveShadows=false;line.enabled=false;return line;
        }

        /// <summary>Draws the current moment of a sequence. The ring faces the camera given.</summary>
        public void Show(KillSequenceState state,Vector3 cameraPosition,Vector3 cameraRight,Vector3 cameraUp)
        {
            if(tuning==null||state==null||!state.Active){Hide();return;}
            if(!built)Build();
            Visible=true;
            Vector3 centre=state.Position;
            float opacity=Mathf.Clamp01(tuning.KillEffectOpacity);
            float widen=Vector3.Distance(cameraPosition,centre)*Mathf.Max(0,tuning.KillWidthPerMetre);
            float thin=Mathf.Max(.001f,Mathf.Max(tuning.KillSpikeWidth,widen));
            DrawnLineWidth=Mathf.Max(.001f,Mathf.Max(tuning.KillRingWidth,widen));

            bool showRing=state.RingOpacity>0&&state.RingRadius>0;
            ring.enabled=showRing;DrawnRingRadius=showRing?state.RingRadius:0;
            if(showRing)
            {
                ring.startWidth=ring.endWidth=DrawnLineWidth;
                ringMaterial.SetColor("_Tint",new Color(1.5f,.62f,.16f,opacity*state.RingOpacity));
                for(int i=0;i<=RingSegments;i++)
                {
                    float angle=i*Mathf.PI*2/RingSegments;
                    ring.SetPosition(i,centre+(cameraRight*Mathf.Cos(angle)+cameraUp*Mathf.Sin(angle))*state.RingRadius);
                }
            }

            bool showFlash=state.FlashOpacity>0&&state.FlashRadius>0;
            VisibleSpikes=showFlash?SpikeCount:0;
            if(showFlash)flashMaterial.SetColor("_Tint",new Color(2.2f,1.6f,.7f,opacity*state.FlashOpacity));
            for(int i=0;i<SpikeCount;i++)
            {
                spikes[i].enabled=showFlash;if(!showFlash)continue;
                Vector3 direction=Direction(i,SpikeCount,state.Variant);
                spikes[i].startWidth=thin;spikes[i].endWidth=thin*.3f;
                spikes[i].SetPosition(0,centre+direction*state.FlashRadius*.15f);
                spikes[i].SetPosition(1,centre+direction*state.FlashRadius);
            }

            bool showShards=state.ShardOpacity>0&&state.ShardLength>0;
            VisibleShards=showShards?ShardCount:0;
            if(showShards)shardMaterial.SetColor("_Tint",new Color(1.6f,.7f,.2f,opacity*state.ShardOpacity));
            for(int i=0;i<ShardCount;i++)
            {
                shards[i].enabled=showShards;if(!showShards)continue;
                Vector3 direction=Direction(i,ShardCount,state.Variant+3);
                float head=state.ShardDistance,tail=Mathf.Max(0,head-state.ShardLength);
                shards[i].startWidth=thin*.4f;shards[i].endWidth=thin;
                shards[i].SetPosition(0,centre+direction*tail);
                shards[i].SetPosition(1,centre+direction*head);
            }
        }

        public void Hide()
        {
            Visible=false;VisibleSpikes=VisibleShards=0;DrawnRingRadius=0;
            if(!built)return;
            ring.enabled=false;
            foreach(var line in spikes)if(line!=null)line.enabled=false;
            foreach(var line in shards)if(line!=null)line.enabled=false;
        }

        public void Dispose()
        {
            Hide();Release(root);Release(ringMaterial);Release(flashMaterial);Release(shardMaterial);
            root=null;ring=null;ringMaterial=flashMaterial=shardMaterial=null;built=false;tuning=null;
            for(int i=0;i<SpikeCount;i++)spikes[i]=null;for(int i=0;i<ShardCount;i++)shards[i]=null;
        }
        static void Release(Object item){if(item==null)return;if(Application.isPlaying)Object.Destroy(item);else Object.DestroyImmediate(item);}
    }
}
