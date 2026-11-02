using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using Object = UnityEngine.Object;

namespace SpaceDragon.Dogfight
{
    /// <summary>
    /// Reversible render-only Oscar spacecraft adapter. Two measured wing sockets
    /// carry physical nacelles, forward laser emitters and aft exhaust. No collider,
    /// Rigidbody, Animator, timer outside the presentation clock or state mutation.
    /// </summary>
    public sealed class WingPropulsion : IDisposable
    {
        public const string WingShader = "SpaceDragon/Dogfight/Spacecraft Wing";
        public const string ExhaustShader = "SpaceDragon/Dogfight/Wing Exhaust";
        readonly List<Object> resources = new List<Object>();
        readonly List<GameObject> roots = new List<GameObject>();
        readonly Dictionary<Renderer,Material[]> originals = new Dictionary<Renderer,Material[]>();
        readonly Transform[] exhaust = new Transform[2], cores = new Transform[2];
        readonly Renderer[] glow = new Renderer[2];
        readonly MaterialPropertyBlock glowBlock = new MaterialPropertyBlock();
        float demand = .6f; bool reducedMotion;
        public Transform LaserLeft { get; private set; }
        public Transform LaserRight { get; private set; }
        public Transform NozzleLeft { get; private set; }
        public Transform NozzleRight { get; private set; }
        public float Level { get; private set; }
        public bool Boosting { get; private set; }
        public bool Braking { get; private set; }
        public int Triangles { get; private set; }
        public int WingMaterialCount { get; private set; }

        public WingPropulsion(Transform model,Transform left,Transform right)
        {
            if(model==null || left==null || right==null || left==right || !left.IsChildOf(model) || !right.IsChildOf(model))
                throw new ArgumentException("Spacecraft engines require both measured wing attachments below the imported model.");
            Shader wingShader=Shader.Find(WingShader),exhaustShader=Shader.Find(ExhaustShader);
            var lit=Shader.Find("Universal Render Pipeline/Lit");
            if(wingShader==null || exhaustShader==null || lit==null)
                throw new InvalidOperationException("Spacecraft presentation shaders must be retained in the player build.");
            try
            {
                ConvertWingMaterials(model,wingShader);
                var casing=Own(new Material(lit) {name="Spacecraft wing nacelle - brushed gunmetal"});
                casing.SetColor("_BaseColor",new Color(.24f,.29f,.34f)); casing.SetFloat("_Metallic",.86f);casing.SetFloat("_Smoothness",.64f);
                var plume=Own(new Material(exhaustShader) {name="Wing propulsion - blue plasma envelope"});
                plume.SetColor("_Tint",new Color(.055f,.50f,1.7f,.48f));
                var core=Own(new Material(exhaustShader) {name="Wing propulsion - hot white core"});
                core.SetColor("_Tint",new Color(.85f,1.8f,2.2f,.8f));
                var nozzle=Own(new Material(exhaustShader) {name="Wing propulsion - engine aperture"});
                nozzle.SetColor("_Tint",new Color(.12f,1.15f,1.7f,1));
                var body=Own(NacelleMesh()); var cone=Own(PlumeMesh()); var ring=Own(ApertureMesh());
                for(int side=0;side<2;side++)
                {
                    var mount=new GameObject(side==0?"Port wing propulsion":"Starboard wing propulsion");roots.Add(mount);
                    mount.transform.SetParent(side==0?left:right,false);
                    mount.transform.localPosition=new Vector3(0,.18f,0);
                    Render(mount.transform,"Nacelle casing",body,casing,true);
                    Transform laser=Child(side==0?"socket_laser_l":"socket_laser_r",mount.transform,new Vector3(0,0,.66f));
                    Transform exit=Child(side==0?"socket_wing_exhaust_l":"socket_wing_exhaust_r",mount.transform,new Vector3(0,0,-.60f));
                    if(side==0){LaserLeft=laser;NozzleLeft=exit;}else{LaserRight=laser;NozzleRight=exit;}
                    glow[side]=Render(exit,"Engine aperture",ring,nozzle,false);
                    exhaust[side]=Render(exit,"Exhaust envelope",cone,plume,false).transform;
                    cores[side]=Render(exit,"Exhaust core",cone,core,false).transform;
                }
                Triangles=2*(body.triangles.Length/3+ring.triangles.Length/3+2*cone.triangles.Length/3);
                Reset();
            }
            catch { Dispose(); throw; }
        }

        public static bool IsWingMaterial(string name) => name=="OscarGame_CUERPO_1031_512" || name=="OscarGame_CUERPO_1032_512";

        void ConvertWingMaterials(Transform model,Shader shader)
        {
            var clones=new Dictionary<Material,Material>();
            foreach(var renderer in model.GetComponentsInChildren<Renderer>(true))
            {
                var source=renderer.sharedMaterials;Material[] replacements=null;
                for(int i=0;i<source.Length;i++)
                {
                    var material=source[i];if(material==null || !IsWingMaterial(material.name))continue;
                    if(replacements==null)replacements=(Material[])source.Clone();
                    if(!clones.TryGetValue(material,out var clone))
                    {
                        clone=Own(new Material(shader) {name=material.name+" - spacecraft metallic instance"});
                        CopyTexture(material,"baseColorTexture","_BaseMap",clone);
                        CopyTexture(material,"normalTexture","_NormalMap",clone);
                        // The measured Oscar maps pack roughness and occlusion
                        // into the same texture; both channels remain in use.
                        CopyTexture(material,"occlusionTexture","_MaskMap",clone);
                        CopyTexture(material,"emissiveTexture","_EmissionMap",clone);
                        // Actual chase screenshots exposed foil-like highlights
                        // from the organic normal relief. Broader alloy response
                        // keeps the wing readable while retaining its source maps.
                        clone.SetColor("_PlateColor",new Color(.32f,.36f,.40f));
                        clone.SetFloat("_Metallic",.72f); clone.SetFloat("_Smoothness",.45f);clone.SetFloat("_NormalStrength",.22f);
                        clones.Add(material,clone);WingMaterialCount++;
                    }
                    replacements[i]=clone;
                }
                if(replacements!=null){originals.Add(renderer,source);renderer.sharedMaterials=replacements;}
            }
        }
        static void CopyTexture(Material source,string original,string target,Material clone)
        {
            string property=source.HasProperty(original)?original:target;
            if(!source.HasProperty(property))return;
            clone.SetTexture(target,source.GetTexture(property));
            clone.SetTextureScale(target,source.GetTextureScale(property));clone.SetTextureOffset(target,source.GetTextureOffset(property));
        }
        public void SetDemand(float thrust01,bool boosting,bool braking,bool reduceMotion)
        {
            demand=float.IsNaN(thrust01)||float.IsInfinity(thrust01)?0:Mathf.Clamp01(thrust01);
            Boosting=boosting;Braking=braking;reducedMotion=reduceMotion;
        }
        public void Reset(){Level=.6f;demand=.6f;Boosting=Braking=false;Apply(0);}
        public void Shutdown(){Level=demand=0;Boosting=Braking=false;Apply(0);}
        public void Tick(float dt,float presentationSeconds)
        {
            if(dt<=0 || float.IsNaN(dt)||float.IsInfinity(dt))return;
            float target=demand*(Boosting?1.8f:Braking?.40f:1);
            Level=Mathf.Lerp(Level,target,1-Mathf.Exp(-dt*9));Apply(presentationSeconds);
        }
        void Apply(float time)
        {
            float pulse=reducedMotion?1:1+.035f*Mathf.Sin(time*23)+.02f*Mathf.Sin(time*37);
            float length=(.45f+Level*2.0f)*pulse;
            for(int i=0;i<2;i++)
            {
                bool enabled=Level>.025f;
                glow[i].enabled=enabled;
                exhaust[i].gameObject.SetActive(enabled);cores[i].gameObject.SetActive(enabled);
                exhaust[i].localScale=new Vector3(.90f+Level*.18f,.90f+Level*.18f,length);
                cores[i].localScale=new Vector3(.46f,.46f,length*.8f);
                glowBlock.SetColor("_Tint",new Color(.12f,1.15f,1.7f,1)*Mathf.Lerp(.22f,1.4f,Mathf.Clamp01(Level)));
                glow[i].SetPropertyBlock(glowBlock);
            }
        }
        T Own<T>(T value) where T:Object { resources.Add(value);return value; }
        static Transform Child(string name,Transform parent,Vector3 position)
        {var t=new GameObject(name).transform;t.SetParent(parent,false);t.localPosition=position;return t;}
        static MeshRenderer Render(Transform parent,string name,Mesh mesh,Material material,bool shadows)
        {
            var obj=new GameObject(name,typeof(MeshFilter),typeof(MeshRenderer));obj.transform.SetParent(parent,false);
            obj.GetComponent<MeshFilter>().sharedMesh=mesh;var renderer=obj.GetComponent<MeshRenderer>();renderer.sharedMaterial=material;
            renderer.shadowCastingMode=shadows?ShadowCastingMode.On:ShadowCastingMode.Off;renderer.receiveShadows=shadows;return renderer;
        }
        static Mesh NacelleMesh()
        {
            // A recessed aft throat, rolled rim and tapered nose form a coherent
            // small engine, rather than attaching a primitive sphere to the wing.
            var radii=new[]{.105f,.13f,.19f,.24f,.23f,.12f,.085f};
            var zs=new[]{-.43f,-.58f,-.64f,-.48f,.22f,.50f,.65f};
            return Lathe("Wing nacelle with recessed nozzle",radii,zs,false);
        }
        static Mesh PlumeMesh()=>Lathe("Wing exhaust tapered volume",new[]{.13f,.18f,.11f,.005f},new[]{0f,-.22f,-.65f,-1f},true);
        static Mesh ApertureMesh()=>Lathe("Wing nozzle luminous throat",new[]{.112f,.112f,.04f},new[]{.06f,0f,.035f},true);
        static Mesh Lathe(string name,float[] radii,float[] zs,bool emissive)
        {
            const int segments=20;var vertices=new List<Vector3>();var uv=new List<Vector2>();var indices=new List<int>();
            for(int ring=0;ring<radii.Length;ring++)for(int i=0;i<=segments;i++)
            {
                float angle=i*Mathf.PI*2/segments;vertices.Add(new Vector3(Mathf.Cos(angle)*radii[ring],Mathf.Sin(angle)*radii[ring],zs[ring]));
                uv.Add(new Vector2((float)i/segments,emissive?(float)ring/(radii.Length-1):0));
            }
            for(int ring=0;ring<radii.Length-1;ring++)for(int i=0;i<segments;i++)
            {
                int a=ring*(segments+1)+i,b=a+1,c=a+segments+1,d=c+1;
                indices.AddRange(new[]{a,b,c,b,d,c});
            }
            var mesh=new Mesh {name=name};mesh.SetVertices(vertices);mesh.SetUVs(0,uv);mesh.SetTriangles(indices,0);mesh.RecalculateNormals();mesh.RecalculateBounds();return mesh;
        }
        public void Dispose()
        {
            foreach(var pair in originals)if(pair.Key!=null)pair.Key.sharedMaterials=pair.Value;
            originals.Clear();
            foreach(var root in roots)if(root!=null){root.SetActive(false);root.transform.SetParent(null,false);Release(root);}
            roots.Clear();foreach(var resource in resources)if(resource!=null)Release(resource);resources.Clear();
        }
        static void Release(Object value){if(Application.isPlaying)Object.Destroy(value);else Object.DestroyImmediate(value);}
    }
}
