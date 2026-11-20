using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using Object=UnityEngine.Object;

namespace SpaceDragon.Dogfight
{
    /// <summary>
    /// Labeled, reversible role silhouettes. The existing imported drone is
    /// unchanged; owned additions contain no colliders or authoritative rules.
    /// Encounter rotates the imported visual Y180, so its pilot-facing nose is -Z.
    /// </summary>
    public sealed class EnemyRoleVisual : IDisposable
    {
        readonly List<Object> resources=new List<Object>();
        readonly List<LineRenderer> shieldLines=new List<LineRenderer>();
        readonly List<Transform> hooks=new List<Transform>(),stunStars=new List<Transform>();
        Transform visual,root;
        DogfightTuning tuning;
        Material shieldMaterial;
        Bounds bounds;
        bool configured;
        public EnemyRole Role {get;private set;}
        public bool VisibleShield {get;private set;}
        public bool VisibleStun {get;private set;}
        public bool LatchedPose {get;private set;}
        public int OwnedRendererCount=>root!=null?root.GetComponentsInChildren<Renderer>(true).Length:0;
        public Vector3 ForwardWorld=>visual!=null?-visual.forward:Vector3.zero;

        public void Setup(Transform importedVisual,EnemyRole role,DogfightTuning settings)
        {
            if(importedVisual==null || settings==null)throw new ArgumentException("Role visuals require the imported drone and tuning.");
            if(configured)throw new InvalidOperationException("Configure each role silhouette once.");
            if(!Enum.IsDefined(typeof(EnemyRole),role))throw new ArgumentOutOfRangeException(nameof(role));
            visual=importedVisual;tuning=settings;Role=settings.EnableEnemyRoles?role:EnemyRole.Fighter;configured=true;
            if(Role==EnemyRole.Fighter)return;
            try
            {
                var lit=Shader.Find("Universal Render Pipeline/Lit");
                var energy=Shader.Find("SpaceDragon/Dogfight/Weapon Energy");
                if(lit==null || energy==null)throw new InvalidOperationException("Role placeholders require retained existing Lit and Weapon Energy shaders.");
                bounds=MeasureBounds(visual);
                root=new GameObject("PLACEHOLDER "+Role+" silhouette - removable").transform;root.SetParent(visual,false);
                root.localScale=Vector3.one*Mathf.Max(.01f,tuning.RoleVisualScale);
                var metal=Own(new Material(lit){name="Placeholder enemy-role armored metal"});
                metal.SetColor("_BaseColor",new Color(.32f,.36f,.40f));metal.SetFloat("_Metallic",.7f);metal.SetFloat("_Smoothness",.4f);
                var cue=Own(new Material(energy){name="Placeholder enemy-role readable outline"});
                cue.SetFloat("_Flame",0);cue.SetColor("_Tint",new Color(.7f,1.2f,1.4f,.65f));
                if(Role==EnemyRole.Racer)BuildRacer(metal,cue);
                else if(Role==EnemyRole.Grappler)BuildGrappler(metal,cue);
                else BuildGunship(metal,energy);
                Clear();
            }
            catch{Dispose();throw;}
        }
        static Bounds MeasureBounds(Transform model)
        {
            Bounds result=default;bool first=true;
            foreach(var filter in model.GetComponentsInChildren<MeshFilter>(true))
            {
                if(filter.sharedMesh==null)continue;var b=filter.sharedMesh.bounds;
                for(int i=0;i<8;i++)
                {
                    Vector3 p=b.center+Vector3.Scale(b.extents,new Vector3((i&1)==0?-1:1,(i&2)==0?-1:1,(i&4)==0?-1:1));
                    p=model.InverseTransformPoint(filter.transform.TransformPoint(p));
                    if(first){result=new Bounds(p,Vector3.zero);first=false;}else result.Encapsulate(p);
                }
            }
            return first||result.size.sqrMagnitude<.001f?new Bounds(Vector3.zero,Vector3.one*2):result;
        }
        Vector3 P(float x,float y,float z)=>bounds.center+Vector3.Scale(bounds.size,new Vector3(x,y,z));
        void BuildRacer(Material metal,Material cue)
        {
            var verts=new List<Vector3>();var tris=new List<int>();
            for(int side=-1;side<=1;side+=2)
            {
                AddWedge(verts,tris,P(side*.16f,0,-.58f),P(side*.80f,0,.34f),P(side*.10f,0,.24f),bounds.size.y*.10f);
                var line=Line("Racer pointed dart edge",root,cue,bounds.size.y*.025f);
                line.positionCount=3;line.SetPositions(new[]{P(side*.16f,.06f,-.58f),P(side*.80f,.06f,.34f),P(side*.10f,.06f,.24f)});
            }
            MeshObject("Racer swept solid dart fins",root,Mesh("Racer twin dart fins",verts,tris),metal);
        }
        void BuildGrappler(Material metal,Material cue)
        {
            for(int side=-1;side<=1;side+=2)
            {
                var hook=new GameObject(side<0?"Grappler left hooked claw":"Grappler right hooked claw").transform;
                hook.SetParent(root,false);hooks.Add(hook);
                var points=new[]{P(side*.22f,0,.25f),P(side*.63f,0,.05f),P(side*.68f,0,-.35f),
                    P(side*.52f,0,-.67f),P(side*.30f,0,-.66f),P(side*.22f,0,-.44f)};
                MeshObject("Curved gripping hook",hook,Tube("Grappler open hook",points,bounds.size.y*.075f),metal);
                var rim=Line("Grappler hook edge",hook,cue,bounds.size.y*.018f);rim.positionCount=points.Length;rim.SetPositions(points);
            }
            for(int i=0;i<3;i++)
            {
                var star=Line("Grappler stunned star "+i,root,cue,bounds.size.y*.025f);star.positionCount=11;
                for(int point=0;point<11;point++)
                {
                    float a=point*Mathf.PI/5,rad=point%2==0?.12f:.05f;
                    star.SetPosition(point,new Vector3(Mathf.Cos(a)*rad,Mathf.Sin(a)*rad,0)*bounds.size.x);
                }
                stunStars.Add(star.transform);
            }
        }
        void BuildGunship(Material metal,Shader energy)
        {
            var verts=new List<Vector3>();var tris=new List<int>();
            for(int side=-1;side<=1;side+=2)
                AddWedge(verts,tris,P(side*.18f,0,-.30f),P(side*.85f,0,-.25f),P(side*.70f,0,.45f),bounds.size.y*.22f);
            MeshObject("Gunship broad armored shoulders",root,Mesh("Gunship broad hull plates",verts,tris),metal);
            shieldMaterial=Own(new Material(energy){name="Placeholder directional front shield"});shieldMaterial.SetFloat("_Flame",0);
            var perimeter=Line("Gunship forward hexagonal shield",root,shieldMaterial,bounds.size.y*.055f);shieldLines.Add(perimeter);
            perimeter.positionCount=7;
            for(int i=0;i<7;i++){float a=i*Mathf.PI/3;perimeter.SetPosition(i,P(Mathf.Cos(a)*.95f,Mathf.Sin(a)*.62f,-.66f));}
            // Broad crossbars make the shield legible by geometry without color.
            foreach(float y in new[]{-.23f,.23f})
            {
                var rib=Line("Gunship shield crossbar",root,shieldMaterial,bounds.size.y*.035f);shieldLines.Add(rib);
                rib.positionCount=2;rib.SetPositions(new[]{P(-.74f,y,-.66f),P(.74f,y,-.66f)});
            }
        }
        public void Tick(EnemyRoleState state,float clock,bool reducedMotion)
        {
            if(!configured || state==null)return;
            if(state.Role!=Role)throw new ArgumentException("Role silhouette must match the authoritative enemy role.");
            if(Role==EnemyRole.Fighter)return;
            if(state.Dead){Clear();return;}
            root.gameObject.SetActive(true);
            VisibleShield=Role==EnemyRole.Gunship&&state.ShieldIntact;
            foreach(var line in shieldLines)line.enabled=VisibleShield;
            if(shieldMaterial!=null)
            {
                float pulse=reducedMotion?1:.8f+.2f*Mathf.Sin(Finite(clock)?clock*Mathf.PI*2*tuning.RoleCuePulseHz:0);
                shieldMaterial.SetColor("_Tint",new Color(.55f,1.3f,1.6f,Mathf.Clamp01(tuning.RoleShieldOpacity)*pulse));
            }
            LatchedPose=Role==EnemyRole.Grappler&&state.Latched;
            for(int i=0;i<hooks.Count;i++)hooks[i].localRotation=Quaternion.Euler(0,LatchedPose?(i==0?-14:14):0,0);
            VisibleStun=Role==EnemyRole.Grappler&&state.Stunned;
            for(int i=0;i<stunStars.Count;i++)
            {
                stunStars[i].gameObject.SetActive(VisibleStun);if(!VisibleStun)continue;
                float a=i*Mathf.PI*2/3+(reducedMotion||!Finite(clock)?0:clock);
                stunStars[i].localPosition=P(Mathf.Cos(a)*.65f,.7f+Mathf.Sin(a)*.08f,Mathf.Sin(a)*.22f);
            }
        }
        public void Clear()
        {
            VisibleShield=VisibleStun=LatchedPose=false;
            if(root!=null)root.gameObject.SetActive(false);
        }
        static bool Finite(float value)=>!float.IsNaN(value)&&!float.IsInfinity(value);
        static void AddWedge(List<Vector3> verts,List<int> tris,Vector3 a,Vector3 b,Vector3 c,float thickness)
        {
            if(Vector3.Cross(b-a,c-a).y<0){Vector3 swap=b;b=c;c=swap;}
            int start=verts.Count;Vector3 h=Vector3.up*thickness*.5f;
            verts.AddRange(new[]{a+h,b+h,c+h,a-h,b-h,c-h});
            foreach(int n in new[]{0,1,2,5,4,3,0,3,4,0,4,1,1,4,5,1,5,2,2,5,3,2,3,0})tris.Add(start+n);
        }
        Mesh Tube(string name,Vector3[] points,float radius)
        {
            var verts=new List<Vector3>();var tris=new List<int>();
            for(int i=0;i<points.Length;i++)
            {
                Vector3 direction=(points[Mathf.Min(i+1,points.Length-1)]-points[Mathf.Max(i-1,0)]).normalized;
                Vector3 side=Vector3.Cross(direction,Vector3.up).normalized;
                for(int j=0;j<4;j++){float angle=j*Mathf.PI*.5f;verts.Add(points[i]+(side*Mathf.Cos(angle)+Vector3.up*Mathf.Sin(angle))*radius);}
                if(i==0)continue;
                for(int j=0;j<4;j++){int a=(i-1)*4+j,b=(i-1)*4+(j+1)%4,c=i*4+j,d=i*4+(j+1)%4;tris.AddRange(new[]{a,c,b,b,c,d});}
            }
            return Mesh(name,verts,tris);
        }
        Mesh Mesh(string name,List<Vector3> vertices,List<int> triangles)
        {
            var mesh=Own(new Mesh{name=name});mesh.SetVertices(vertices);mesh.SetTriangles(triangles,0);mesh.RecalculateNormals();mesh.RecalculateBounds();return mesh;
        }
        static void MeshObject(string name,Transform parent,Mesh mesh,Material material)
        {
            var go=new GameObject(name,typeof(MeshFilter),typeof(MeshRenderer));go.transform.SetParent(parent,false);
            go.GetComponent<MeshFilter>().sharedMesh=mesh;go.GetComponent<MeshRenderer>().sharedMaterial=material;
        }
        static LineRenderer Line(string name,Transform parent,Material material,float width)
        {
            var obj=new GameObject(name);obj.transform.SetParent(parent,false);var line=obj.AddComponent<LineRenderer>();
            line.sharedMaterial=material;line.useWorldSpace=false;line.startWidth=line.endWidth=Mathf.Max(.001f,width);
            line.shadowCastingMode=ShadowCastingMode.Off;line.receiveShadows=false;return line;
        }
        T Own<T>(T resource) where T:Object{resources.Add(resource);return resource;}
        public void Dispose()
        {
            Clear();if(root!=null){root.SetParent(null,false);Release(root.gameObject);root=null;}
            foreach(var item in resources)Release(item);resources.Clear();shieldLines.Clear();hooks.Clear();stunStars.Clear();
            shieldMaterial=null;visual=null;configured=false;
        }
        static void Release(Object item){if(item==null)return;if(Application.isPlaying)Object.Destroy(item);else Object.DestroyImmediate(item);}
    }
}
