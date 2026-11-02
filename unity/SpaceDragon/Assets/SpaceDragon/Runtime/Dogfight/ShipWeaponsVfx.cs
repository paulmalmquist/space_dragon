using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace SpaceDragon.Dogfight
{
    /// <summary>Render-only wing laser pulses and staged fire reactor. No damage,
    /// attack timers or lock decisions originate here. All phase comes from BreathState.</summary>
    // This has no automatic Update. Edit-mode lifetime callbacks release owned
    // preview geometry/materials just as player destruction does.
    [ExecuteAlways]
    public sealed class ShipWeaponsVfx : MonoBehaviour
    {
        const int MaximumBeams=3;
        readonly List<UnityEngine.Object> resources=new List<UnityEngine.Object>();
        readonly List<GameObject> objects=new List<GameObject>();
        readonly LineRenderer[] lasers=new LineRenderer[4], streams=new LineRenderer[8], rings=new LineRenderer[2], sparks=new LineRenderer[10];
        Transform mouth,left,right,orb;
        Material laserMaterial,fireMaterial,coreMaterial;
        readonly Vector3[] laserEnds=new Vector3[2];
        readonly Vector3[] singleEndpoint=new Vector3[1],beamEndpoints=new Vector3[MaximumBeams];
        float pulse,phase;
        bool configured;
        public bool WindupActive {get;private set;}
        public bool BeamActive {get;private set;}
        public int ActiveBeamCount {get;private set;}
        public Vector3[] BeamOrigins
        {
            get{var result=new Vector3[ActiveBeamCount];for(int i=0;i<result.Length;i++)result[i]=streams[i==0?0:4+(i-1)*2].GetPosition(0);return result;}
        }
        public Vector3[] BeamEndpoints
        {
            get{var result=new Vector3[ActiveBeamCount];Array.Copy(beamEndpoints,result,result.Length);return result;}
        }
        public bool LasersActive=>pulse>0;
        public Vector3 WindupOrigin=>orb!=null?orb.position:Vector3.zero;
        public Vector3 BeamOrigin=>streams[0]!=null&&streams[0].enabled?streams[0].GetPosition(0):Vector3.zero;
        public Vector3 BeamCoreOrigin=>streams[1]!=null&&streams[1].enabled?streams[1].GetPosition(0):Vector3.zero;
        public Vector3 LeftLaserOrigin=>lasers[0]!=null&&lasers[0].enabled?lasers[0].GetPosition(0):Vector3.zero;
        public Vector3 RightLaserOrigin=>lasers[2]!=null&&lasers[2].enabled?lasers[2].GetPosition(0):Vector3.zero;

        public void Configure(Transform muzzle,Transform wingLeft,Transform wingRight)
        {
            if(muzzle==null||wingLeft==null||wingRight==null)throw new ArgumentException("Weapon effects require measured mouth and both wing muzzles.");
            if(configured)throw new InvalidOperationException("Configure weapon effects once.");
            mouth=muzzle;left=wingLeft;right=wingRight;
            var shader=Shader.Find("SpaceDragon/Dogfight/Weapon Energy")??throw new InvalidOperationException("Retain Weapon Energy shader in the built scene.");
            var noise=new Texture2D(128,128,TextureFormat.RGBA32,true,true){name="Bounded energy noise",wrapMode=TextureWrapMode.Repeat,filterMode=FilterMode.Trilinear};
            var pixels=new Color32[128*128];
            for(int y=0;y<128;y++)for(int x=0;x<128;x++)
            {
                float u=x/128f,v=y/128f;
                float Periodic(float scale,float offset)=>Mathf.Lerp(Mathf.Lerp(Mathf.PerlinNoise(u*scale+offset,v*scale+offset),Mathf.PerlinNoise((u-1)*scale+offset,v*scale+offset),u),Mathf.Lerp(Mathf.PerlinNoise(u*scale+offset,(v-1)*scale+offset),Mathf.PerlinNoise((u-1)*scale+offset,(v-1)*scale+offset),u),v);
                pixels[y*128+x]=new Color(Periodic(6,23)*.7f+Periodic(14,11)*.3f,Periodic(22,41),0,1);
            }
            noise.SetPixels32(pixels);noise.Apply(true,true);resources.Add(noise);
            laserMaterial=Material(shader,noise,"Twin laser envelope",new Color(.22f,1.4f,2.1f,.75f),0);
            fireMaterial=Material(shader,noise,"Turbulent flame envelope",new Color(2.2f,.38f,.025f,.65f),1);
            coreMaterial=Material(shader,noise,"Hot fire core",new Color(2.3f,1.5f,.38f,.85f),.45f);
            for(int i=0;i<4;i++) lasers[i]=Line("Wing laser "+i,2,i%2==0?laserMaterial:coreMaterial,i%2==0?.16f:.045f);
            for(int i=0;i<4;i++) streams[i]=Line("Fire stream "+i,20,i==1?coreMaterial:fireMaterial,i==1?.19f:i==0?.85f:.21f);
            for(int i=4;i<streams.Length;i++)streams[i]=Line("Additional breath target "+(1+(i-4)/2)+" layer "+((i-4)%2),20,i%2==1?coreMaterial:fireMaterial,i%2==1?.19f:.85f);
            for(int i=0;i<2;i++) {rings[i]=Line("Reactor compression ring "+i,49,coreMaterial,.035f);rings[i].loop=false;}
            for(int i=0;i<sparks.Length;i++) sparks[i]=Line("Charging intake spark "+i,2,coreMaterial,.035f);
            var go=GameObject.CreatePrimitive(PrimitiveType.Sphere);go.name="Animated mouth reactor";go.transform.SetParent(transform,true);Release(go.GetComponent<Collider>());
            go.GetComponent<Renderer>().sharedMaterial=coreMaterial;go.GetComponent<Renderer>().shadowCastingMode=ShadowCastingMode.Off;
            orb=go.transform;objects.Add(go);configured=true;Clear();
        }
        Material Material(Shader shader,Texture noise,string name,Color tint,float flame)
        {var m=new Material(shader){name=name};m.SetTexture("_NoiseTex",noise);m.SetColor("_Tint",tint);m.SetFloat("_Flame",flame);resources.Add(m);return m;}
        LineRenderer Line(string name,int count,Material material,float width)
        {
            var go=new GameObject(name);go.transform.SetParent(transform,true);objects.Add(go);var line=go.AddComponent<LineRenderer>();
            line.sharedMaterial=material;line.positionCount=count;line.useWorldSpace=true;line.startWidth=width;line.endWidth=width;
            line.shadowCastingMode=ShadowCastingMode.Off;line.receiveShadows=false;line.numCapVertices=3;line.numCornerVertices=2;
            line.textureMode=LineTextureMode.Stretch;line.enabled=false;return line;
        }
        public void PulseLasers(Vector3 endLeft,Vector3 endRight)
        // Slightly overlap the .19s firing cadence so held fire reads as two
        // stable beams. This visual hold never delays or repeats hitscan damage.
        {if(!configured)return;laserEnds[0]=endLeft;laserEnds[1]=endRight;pulse=.23f;UpdateLasers();}
        void UpdateLasers()
        {
            for(int side=0;side<2;side++)for(int layer=0;layer<2;layer++)
            {var line=lasers[side*2+layer];line.enabled=pulse>0;if(!line.enabled)continue;line.SetPosition(0,(side==0?left:right).position);line.SetPosition(1,laserEnds[side]);}
        }
        public void Tick(float dt,BreathBurst burst,Vector3 endpoint,Vector3 forward,Vector3 up,bool reducedMotion)
        {
            singleEndpoint[0]=endpoint;Tick(dt,burst,singleEndpoint,forward,up,reducedMotion);
        }
        public void Tick(float dt,BreathBurst burst,IReadOnlyList<Vector3> endpoints,Vector3 forward,Vector3 up,bool reducedMotion)
        {
            if(!configured||dt<=0||float.IsNaN(dt)||float.IsInfinity(dt))return;phase+=dt;pulse=Mathf.Max(0,pulse-dt);UpdateLasers();
            fireMaterial.SetFloat("_Phase",phase);coreMaterial.SetFloat("_Phase",phase);
            int count=0;
            if(endpoints!=null)for(int i=0;i<endpoints.Count&&count<MaximumBeams;i++)if(Finite(endpoints[i]))beamEndpoints[count++]=endpoints[i];
            WindupActive=burst!=null&&burst.Stage=="windup";
            ActiveBeamCount=burst!=null&&burst.Stage=="beam"?count:0;BeamActive=ActiveBeamCount>0;
            Vector3 origin=mouth.position;
            Vector3 endpoint=count>0?beamEndpoints[0]:origin+forward;
            Vector3 direction=(endpoint-origin).sqrMagnitude>.001f?(endpoint-origin).normalized:forward;
            Basis(direction,up,out var side,out var vertical);
            orb.gameObject.SetActive(WindupActive);orb.position=origin;
            float charge=WindupActive?Mathf.Clamp01(burst.Progress):0;
            orb.localScale=Vector3.one*(.12f+charge*.42f)*(1+(!reducedMotion?Mathf.Sin(phase*31)*.06f:0));
            for(int ring=0;ring<rings.Length;ring++)
            {
                var line=rings[ring];line.enabled=WindupActive;if(!WindupActive)continue;
                float radius=Mathf.Lerp(1.1f,.27f,charge)*(ring==0?1:1.35f);
                Vector3 center=origin-direction*(ring*.3f);
                for(int i=0;i<line.positionCount;i++)
                {float a=i/(float)(line.positionCount-1)*Mathf.PI*2+(reducedMotion?0:phase*(ring==0?5:-4));line.SetPosition(i,center+side*Mathf.Cos(a)*radius+vertical*Mathf.Sin(a)*radius);}
            }
            for(int i=0;i<sparks.Length;i++)
            {
                var line=sparks[i];line.enabled=WindupActive;if(!WindupActive)continue;
                float t=Mathf.Repeat(charge*2+i*.173f,1),angle=i*2.39996f;
                Vector3 radial=(side*Mathf.Cos(angle)+vertical*Mathf.Sin(angle));
                Vector3 p=origin+radial*Mathf.Lerp(1.8f,.15f,t)-direction*(1-t)*.8f;
                line.SetPosition(0,p);line.SetPosition(1,p-radial*.18f);
            }
            for(int stream=0;stream<streams.Length;stream++)
            {
                int beam=stream<4?0:1+(stream-4)/2,layer=stream<4?stream:(stream-4)%2;
                var line=streams[stream];line.enabled=beam<ActiveBeamCount;if(!line.enabled)continue;
                endpoint=beamEndpoints[beam];direction=(endpoint-origin).sqrMagnitude>.001f?(endpoint-origin).normalized:forward;
                Basis(direction,up,out side,out vertical);
                float width=layer==0?.85f:layer==1?.19f:.21f;
                line.startWidth=width;line.endWidth=width*(layer==0?3.2f:layer==1?1.5f:2);
                for(int i=0;i<line.positionCount;i++)
                {
                    float t=i/(float)(line.positionCount-1),envelope=Mathf.Sin(t*Mathf.PI);
                    float a=t*27-phase*(reducedMotion?1:17)+stream*2.1f;
                    float amplitude=layer<2?.035f:.55f;
                    Vector3 offset=(side*Mathf.Sin(a)+vertical*Mathf.Cos(a*1.13f))*envelope*amplitude;
                    line.SetPosition(i,Vector3.Lerp(origin,endpoint,t)+offset);
                }
            }
        }
        static bool Finite(Vector3 p)=>!float.IsNaN(p.x)&&!float.IsInfinity(p.x)&&!float.IsNaN(p.y)&&!float.IsInfinity(p.y)&&!float.IsNaN(p.z)&&!float.IsInfinity(p.z);
        static void Basis(Vector3 direction,Vector3 up,out Vector3 side,out Vector3 vertical)
        {
            side=Vector3.Cross(up,direction).normalized;
            if(side.sqrMagnitude<.01f)side=Vector3.Cross(Mathf.Abs(direction.y)<.9f?Vector3.up:Vector3.right,direction).normalized;
            vertical=Vector3.Cross(direction,side).normalized;
        }
        public void Clear()
        {pulse=phase=0;ActiveBeamCount=0;Array.Clear(beamEndpoints,0,beamEndpoints.Length);WindupActive=BeamActive=false;foreach(var obj in objects)if(obj!=null){var line=obj.GetComponent<LineRenderer>();if(line!=null)line.enabled=false;}if(orb!=null)orb.gameObject.SetActive(false);}
        void OnDestroy(){foreach(var obj in objects)if(obj!=null)Release(obj);foreach(var item in resources)if(item!=null)Release(item);}
        static void Release(UnityEngine.Object item){if(item==null)return;if(Application.isPlaying)Destroy(item);else DestroyImmediate(item);}
    }
}
