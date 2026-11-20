using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using Object=UnityEngine.Object;

namespace SpaceDragon.Dogfight
{
    /// <summary>Removable scenery-weapon marker and vents. Existing asteroid
    /// mesh, material, scale, position and collision remain untouched.</summary>
    public sealed class GasPocketVisual : IDisposable
    {
        readonly List<Object> resources=new List<Object>();
        readonly LineRenderer[] plumes=new LineRenderer[3];
        readonly Vector3[] ventOrigins=new Vector3[3],ventDirections=new Vector3[3];
        Transform root;
        DogfightTuning tuning;
        float span;
        bool configured;
        public bool Visible=>root!=null&&root.gameObject.activeSelf;
        public bool Detonated {get;private set;}
        public int OwnedRendererCount=>root!=null?root.GetComponentsInChildren<Renderer>(true).Length:0;

        public void Setup(Transform existingRock,DogfightTuning settings)
        {
            if(existingRock==null||settings==null)throw new ArgumentException("Gas-pocket presentation requires its existing asteroid and tuning.");
            if(configured)throw new InvalidOperationException("Configure each gas-pocket marker once.");
            configured=true;tuning=settings;
            if(!settings.EnableRockWeapons)return;
            try
            {
                var lit=Shader.Find("Universal Render Pipeline/Lit");var energy=Shader.Find("SpaceDragon/Dogfight/Weapon Energy");
                if(lit==null||energy==null)throw new InvalidOperationException("Retain existing Lit and Weapon Energy shaders for gas markers.");
                var filter=existingRock.GetComponent<MeshFilter>();var bounds=filter!=null&&filter.sharedMesh!=null?filter.sharedMesh.bounds:new Bounds(Vector3.zero,Vector3.one);
                span=Mathf.Max(.01f,Mathf.Max(bounds.size.x,Mathf.Max(bounds.size.y,bounds.size.z)));
                root=new GameObject("PLACEHOLDER gas pocket - marker and three vents only").transform;root.SetParent(existingRock,false);
                var metal=Own(new Material(lit){name="Placeholder gas vent stone-metal collar"});
                metal.SetColor("_BaseColor",new Color(.26f,.30f,.25f));metal.SetFloat("_Metallic",.4f);metal.SetFloat("_Smoothness",.3f);
                var glow=Own(new Material(energy){name="Placeholder gas-pocket marker and vent gas"});glow.SetFloat("_Flame",0);
                glow.SetColor("_Tint",new Color(.72f,1.2f,.35f,Mathf.Clamp01(settings.GasMarkerOpacity)));
                BuildMarker(bounds,glow);
                var nozzle=BuildNozzle();
                for(int i=0;i<3;i++)
                {
                    float angle=i*Mathf.PI*2/3;
                    var direction=new Vector3(Mathf.Cos(angle)*.72f,.70f,Mathf.Sin(angle)*.72f).normalized;
                    Vector3 surface=bounds.center+Vector3.Scale(bounds.extents,direction);
                    ventOrigins[i]=surface+direction*span*.08f;ventDirections[i]=direction;
                    var vent=new GameObject("Gas pocket solid vent collar "+(i+1),typeof(MeshFilter),typeof(MeshRenderer));vent.transform.SetParent(root,false);
                    vent.transform.localPosition=surface;vent.transform.localRotation=Quaternion.FromToRotation(Vector3.forward,direction);
                    vent.transform.localScale=Vector3.one*span;vent.GetComponent<MeshFilter>().sharedMesh=nozzle;vent.GetComponent<MeshRenderer>().sharedMaterial=metal;
                    plumes[i]=Line("Gas pocket outward vent plume "+(i+1),glow,span*.055f,2);
                    plumes[i].endWidth=span*.12f;
                }
                Tick(false,0,true);
            }
            catch{Dispose();throw;}
        }
        void BuildMarker(Bounds bounds,Material material)
        {
            float radius=span*.5f*Mathf.Max(.01f,tuning.GasMarkerScale);
            var ring=Line("Gas pocket ring shape",material,span*.012f,33);
            for(int i=0;i<33;i++){float a=i*Mathf.PI*2/32;ring.SetPosition(i,bounds.center+new Vector3(Mathf.Cos(a),0,Mathf.Sin(a))*radius);}
            Vector3 center=bounds.center+Vector3.up*(bounds.extents.y+span*.30f);
            float size=span*.20f;
            Vector3[] points={center+Vector3.up*size,center+Vector3.right*size,center+Vector3.forward*size,
                center+Vector3.left*size,center+Vector3.back*size,center+Vector3.down*size};
            int[] path={0,1,5,2,0,3,5,4,0,1,2,3,4,1};
            var diamond=Line("Gas pocket three-dimensional diamond shape",material,span*.018f,path.Length);
            for(int i=0;i<path.Length;i++)diamond.SetPosition(i,points[path[i]]);
        }
        Mesh BuildNozzle()
        {
            const int sides=8;var vertices=new List<Vector3>();var triangles=new List<int>();
            float[] radius={.075f,.060f,.045f,.030f},depth={0,.065f,.09f,.065f};
            for(int ring=0;ring<radius.Length;ring++)for(int i=0;i<sides;i++)
            {float a=i*Mathf.PI*2/sides;vertices.Add(new Vector3(Mathf.Cos(a)*radius[ring],Mathf.Sin(a)*radius[ring],depth[ring]));}
            for(int ring=0;ring<radius.Length-1;ring++)for(int i=0;i<sides;i++)
            {int a=ring*sides+i,b=ring*sides+(i+1)%sides,c=a+sides,d=b+sides;triangles.AddRange(new[]{a,b,c,b,d,c});}
            var mesh=Own(new Mesh{name="Placeholder low-poly gas vent collar"});mesh.SetVertices(vertices);mesh.SetTriangles(triangles,0);mesh.RecalculateNormals();mesh.RecalculateBounds();return mesh;
        }
        LineRenderer Line(string name,Material material,float width,int count)
        {
            var obj=new GameObject(name);obj.transform.SetParent(root,false);var line=obj.AddComponent<LineRenderer>();
            line.useWorldSpace=false;line.positionCount=count;line.sharedMaterial=material;line.startWidth=line.endWidth=Mathf.Max(.001f,width);
            line.shadowCastingMode=ShadowCastingMode.Off;line.receiveShadows=false;return line;
        }
        public void Tick(bool detonated,float clock,bool reducedMotion)
        {
            if(!configured)return;Detonated=detonated;
            if(root==null)return;
            root.gameObject.SetActive(!detonated&&tuning.EnableRockWeapons);if(!Visible)return;
            for(int i=0;i<plumes.Length;i++)
            {
                float pulse=reducedMotion?1:1+.12f*Mathf.Sin((Finite(clock)?clock:0)*Mathf.PI*2*tuning.GasVentPulseHz+i*Mathf.PI*2/3);
                plumes[i].SetPosition(0,ventOrigins[i]);
                plumes[i].SetPosition(1,ventOrigins[i]+ventDirections[i]*span*Mathf.Max(0,tuning.GasVentLength)*pulse);
            }
        }
        static bool Finite(float n)=>!float.IsNaN(n)&&!float.IsInfinity(n);
        T Own<T>(T item)where T:Object{resources.Add(item);return item;}
        public void Dispose()
        {
            if(root!=null){root.gameObject.SetActive(false);root.SetParent(null,false);Release(root.gameObject);root=null;}
            foreach(var item in resources)Release(item);resources.Clear();configured=false;Detonated=false;
        }
        static void Release(Object item){if(item==null)return;if(Application.isPlaying)Object.Destroy(item);else Object.DestroyImmediate(item);}
    }
}
