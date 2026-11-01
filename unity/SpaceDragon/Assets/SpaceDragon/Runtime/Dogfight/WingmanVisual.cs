using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using Object=UnityEngine.Object;

namespace SpaceDragon.Dogfight
{
    /// <summary>Collider-free lab ally placeholder. Motion and beam only observe
    /// WingmanState; this helper never selects targets, ticks damage or owns crew.</summary>
    public sealed class WingmanVisual : IDisposable
    {
        readonly List<Object> resources=new List<Object>();
        Transform root;
        LineRenderer beam;
        DogfightTuning tuning;
        bool configured,placed;
        float clock;
        public bool Visible=>root!=null&&root.gameObject.activeSelf;
        public bool BeamVisible=>beam!=null&&beam.enabled;
        public Vector3 Position=>root!=null?root.position:Vector3.zero;
        public Vector3 FormationPosition {get;private set;}
        public int OwnedRendererCount=>root!=null?root.GetComponentsInChildren<Renderer>(true).Length:0;

        public void Setup(DogfightTuning settings)
        {
            if(settings==null)throw new ArgumentNullException(nameof(settings));
            if(configured)throw new InvalidOperationException("Configure the lab wingman once.");
            tuning=settings;configured=true;
            if(!tuning.EnableWingman)return;
            try
            {
                var lit=Shader.Find("Universal Render Pipeline/Lit");var energy=Shader.Find("SpaceDragon/Dogfight/Weapon Energy");
                if(lit==null||energy==null)throw new InvalidOperationException("Retain existing Lit and Weapon Energy shaders for wingman presentation.");
                root=new GameObject("PLACEHOLDER lab wingman - no crew or collision").transform;
                root.localScale=Vector3.one*Mathf.Max(.01f,tuning.WingmanVisualScale);
                var armor=Own(new Material(lit){name="Placeholder wingman ivory alloy"});
                armor.SetColor("_BaseColor",new Color(.48f,.56f,.60f));armor.SetFloat("_Metallic",.65f);armor.SetFloat("_Smoothness",.4f);
                var glow=Own(new Material(energy){name="Placeholder wingman engine and beam"});
                glow.SetFloat("_Flame",0);glow.SetColor("_Tint",new Color(.2f,1.3f,1.6f,.7f));
                var mesh=BuildMesh();var shell=new GameObject("Wingman solid hull and two swept wings",typeof(MeshFilter),typeof(MeshRenderer));shell.transform.SetParent(root,false);
                shell.GetComponent<MeshFilter>().sharedMesh=mesh;shell.GetComponent<MeshRenderer>().sharedMaterial=armor;
                for(int side=-1;side<=1;side+=2)
                {
                    var engine=Line("Wingman aft engine "+side,glow,.16f,false);
                    engine.SetPositions(new[]{new Vector3(side*.38f,0,-1.15f),new Vector3(side*.38f,0,-1.7f)});
                }
                beam=Line("Wingman cosmetic strafe beam",glow,tuning.WingmanBeamWidth,true);
                Clear();
            }
            catch{Dispose();throw;}
        }
        LineRenderer Line(string name,Material material,float width,bool world)
        {
            var go=new GameObject(name);go.transform.SetParent(root,false);var line=go.AddComponent<LineRenderer>();
            line.useWorldSpace=world;line.positionCount=2;line.startWidth=line.endWidth=Mathf.Max(.001f,width);line.sharedMaterial=material;
            line.shadowCastingMode=ShadowCastingMode.Off;line.receiveShadows=false;line.numCapVertices=2;return line;
        }
        Mesh BuildMesh()
        {
            var vertices=new List<Vector3>();var indices=new List<int>();
            Wedge(vertices,indices,new Vector3(0,0,1.8f),new Vector3(-.46f,0,-1.2f),new Vector3(.46f,0,-1.2f),.55f);
            for(int side=-1;side<=1;side+=2)
                Wedge(vertices,indices,new Vector3(side*.3f,0,.7f),new Vector3(side*2.3f,0,-.85f),new Vector3(side*.3f,0,-.5f),.16f);
            var mesh=Own(new Mesh{name="Placeholder wingman three solid aerodynamic forms"});
            mesh.SetVertices(vertices);mesh.SetTriangles(indices,0);mesh.RecalculateNormals();mesh.RecalculateBounds();return mesh;
        }
        static void Wedge(List<Vector3> vertices,List<int> indices,Vector3 a,Vector3 b,Vector3 c,float thickness)
        {
            if(Vector3.Cross(b-a,c-a).y<0){Vector3 swap=b;b=c;c=swap;}
            int start=vertices.Count;Vector3 h=Vector3.up*thickness*.5f;
            vertices.AddRange(new[]{a+h,b+h,c+h,a-h,b-h,c-h});
            foreach(int index in new[]{0,1,2,5,4,3,0,3,4,0,4,1,1,4,5,1,5,2,2,5,3,2,3,0})indices.Add(start+index);
        }
        public void Tick(float dt,FlightState player,WingmanState state,Vector3? target,bool reducedMotion)
        {
            if(!configured||root==null||player==null||state==null||!Finite(dt)||dt<=0)return;
            if(!tuning.EnableWingman){Clear();return;}
            clock+=dt;root.gameObject.SetActive(true);
            float distance=Mathf.Max(0,tuning.WingmanFormationDistance);
            FormationPosition=player.Position+player.Rotation*new Vector3(-distance,distance*.25f,distance);
            Vector3 desired=FormationPosition;
            if(!reducedMotion)desired+=player.Up*Mathf.Sin(clock*1.2f)*distance*.015f;
            bool attacking=state.Running&&target.HasValue&&Finite(target.Value);
            if(attacking)
            {
                float progress=1-Mathf.Clamp01(state.RunRemaining/Mathf.Max(.001f,tuning.WingmanRunSeconds));
                float radius=Mathf.Max(0,tuning.WingmanStrafeRadius);
                float angle=Mathf.Lerp(-Mathf.PI*.65f,Mathf.PI*.65f,progress);
                Vector3 relative=new Vector3(Mathf.Sin(angle)*radius,radius*.22f,-Mathf.Cos(angle)*radius-radius*.45f);
                desired=target.Value+player.Rotation*relative;
            }
            if(!placed){root.SetPositionAndRotation(FormationPosition,player.Rotation);placed=true;}
            root.position=Vector3.MoveTowards(root.position,desired,Mathf.Max(0,tuning.WingmanVisualSpeed)*dt);
            Vector3 forward=attacking?target.Value-root.position:player.Forward;
            if(forward.sqrMagnitude>.001f)
            {
                Vector3 up=Mathf.Abs(Vector3.Dot(forward.normalized,player.Up))>.99f?player.Rotation*Vector3.right:player.Up;
                root.rotation=Quaternion.LookRotation(forward,up);
            }
            beam.enabled=attacking;
            if(attacking){beam.SetPosition(0,root.TransformPoint(new Vector3(0,0,1.8f)));beam.SetPosition(1,target.Value);}
        }
        public void Clear()
        {
            placed=false;clock=0;FormationPosition=Vector3.zero;
            if(beam!=null)beam.enabled=false;if(root!=null)root.gameObject.SetActive(false);
        }
        T Own<T>(T item)where T:Object{resources.Add(item);return item;}
        static bool Finite(float n)=>!float.IsNaN(n)&&!float.IsInfinity(n);
        static bool Finite(Vector3 p)=>Finite(p.x)&&Finite(p.y)&&Finite(p.z);
        public void Dispose()
        {
            Clear();if(root!=null){Release(root.gameObject);root=null;}
            foreach(var resource in resources)Release(resource);resources.Clear();beam=null;configured=false;
        }
        static void Release(Object item){if(item==null)return;if(Application.isPlaying)Object.Destroy(item);else Object.DestroyImmediate(item);}
    }
}
