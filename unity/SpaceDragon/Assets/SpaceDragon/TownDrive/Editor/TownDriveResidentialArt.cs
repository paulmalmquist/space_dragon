using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using Object = UnityEngine.Object;

namespace SpaceDragon.TownDrive.Editor
{
    public static partial class TownDriveProject
    {
        public const string ResidentialArtFolder = Generated + "/ResidentialArt";
        [Serializable] sealed class ResidentialEnvelope { public ResidentialContext context = null; }
        [Serializable] sealed class ResidentialContext { public ResidentialLot[] lots = null; }
        [Serializable] sealed class ResidentialLot { public float x = 0, z = 0, yaw = 0; public int seed = 0; public bool compact = false; }
        [Serializable] public sealed class TownDriveResidentialEvidence
        {
            public string result, scope, routeSha256;
            public int sourceLots, facades, windowFrames, garagePanels, porchTrims, roofCaps, renderers, cells, triangles;
            public int[] paletteUse;
            public float minimumHeight, maximumHeight;
        }
        sealed class ResidentialBatch
        {
            public readonly List<Vector3> points = new List<Vector3>();
            public readonly List<Vector2> uv = new List<Vector2>();
            public readonly List<int> indices = new List<int>();
            public void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d)
            {
                int start = points.Count; points.AddRange(new[] {a,b,c,d});
                uv.AddRange(new[] {Vector2.zero,Vector2.right,Vector2.one,Vector2.up});
                indices.AddRange(new[] {start,start+1,start+2,start,start+2,start+3});
            }
        }

        /// <summary>Original facade relief on the existing 83 houses. No footprint, collider or authoritative state changes.</summary>
        public static void ApplyResidentialArt(GameObject world)
        {
            Folder(ResidentialArtFolder);
            var envelope = JsonUtility.FromJson<ResidentialEnvelope>(File.ReadAllText(DataPath));
            var lots = envelope?.context?.lots;
            if (lots == null || lots.Length != 83) throw new InvalidDataException("Residential art requires the preserved 83 mapped lots.");
            var originalMeshes = world.GetComponentsInChildren<MeshFilter>(true).ToDictionary(filter=>filter,filter=>filter.sharedMesh);
            var originalTransforms = originalMeshes.Keys.ToDictionary(filter=>filter,filter=>filter.transform.localToWorldMatrix);
            var materials = ResidentialMaterials();
            var batches = new SortedDictionary<string,ResidentialBatch>();
            var report = new TownDriveResidentialEvidence { result="Succeeded", sourceLots=lots.Length,
                routeSha256=HashFile(DataPath), paletteUse=new int[3], minimumHeight=float.PositiveInfinity,
                scope="Original garage/window/porch/gutter/ridge relief at unchanged mapped house anchors; no new colliders, obstacles or game state." };
            ResidentialBatch Batch(ResidentialLot site,int material)
            {
                string key=Mathf.FloorToInt(site.x/130)+"_"+Mathf.FloorToInt(site.z/130)+":"+material;
                if(!batches.TryGetValue(key,out var found))batches.Add(key,found=new ResidentialBatch());
                return found;
            }
            foreach(var site in lots)
            {
                // Identical deterministic dimensions to development.home; additions sit on those surfaces.
                float width=(site.compact?14.8f:17)+ResidentialRandom(site.seed)*(site.compact?1.7f:3);
                float depth=(site.compact?11.5f:13)+ResidentialRandom(site.seed+4)*(site.compact?1.5f:2);
                float height=3.6f+ResidentialRandom(site.seed+3)*.8f, front=-depth/2;
                int palette=Mathf.Min(2,Mathf.FloorToInt(ResidentialRandom(site.seed+112)*3));
                int accent=palette; report.paletteUse[palette]++;
                var trim=Batch(site,0); var finish=Batch(site,accent); var dark=Batch(site,3);
                float garageX=width*.27f;

                // Raised panel relief replaces the visual blank rectangle, without moving its door plane.
                ResidentialQuad(finish,site,new Vector3(garageX-2.64f,.20f,front-.17f),new Vector3(garageX-2.64f,2.9f,front-.17f),
                    new Vector3(garageX+2.64f,2.9f,front-.17f),new Vector3(garageX+2.64f,.20f,front-.17f));
                int columns=ResidentialRandom(site.seed+113)>.48f?3:2;
                for(int row=0;row<4;row++)for(int column=0;column<columns;column++)
                {
                    float pw=5.10f/columns-.12f, ph=.52f;
                    float x=garageX-2.55f+(column+.5f)*5.10f/columns,y=.47f+row*.66f;
                    ResidentialPanel(finish,site,x,y,front-.19f,pw,ph,.075f,.055f);report.garagePanels++;
                }
                // Small paired handles and a proper perimeter jamb read at driver-eye height.
                ResidentialBox(dark,site,garageX-.13f,1.48f,front-.255f,.045f,.22f,.035f);
                ResidentialBox(dark,site,garageX+.13f,1.48f,front-.255f,.045f,.22f,.035f);
                for(int side=-1;side<=1;side+=2)ResidentialBox(trim,site,garageX+side*2.79f,1.56f,front-.19f,.19f,3.08f,.24f);
                ResidentialBox(trim,site,garageX,3.04f,front-.19f,5.77f,.18f,.24f);

                void Window(ResidentialLot face,float x,float z,float w,bool shutters)
                {
                    // The glass remains recessed behind the chamfered outer surround.
                    ResidentialFrame(trim,face,x,2.03f,z-.092f,w+.28f,1.78f,.14f,.07f);
                    ResidentialBox(trim,face,x,1.15f,z-.16f,w+.42f,.11f,.39f);report.windowFrames++;
                    if(!shutters)return;
                    for(int side=-1;side<=1;side+=2)
                    {
                        float sx=x+side*(w/2+.29f);
                        ResidentialPanel(finish,face,sx,2.03f,z-.13f,.35f,1.5f,.045f,.025f);
                        for(int slat=0;slat<6;slat++)
                        {
                            float y=1.44f+slat*.235f;
                            ResidentialQuad(finish,face,new Vector3(sx-.13f,y,z-.17f),new Vector3(sx-.13f,y+.17f,z-.20f),
                                new Vector3(sx+.13f,y+.17f,z-.20f),new Vector3(sx+.13f,y,z-.17f));
                        }
                    }
                }
                Window(site,-width*.03f,front-.06f,1.7f,true);
                Window(site,-width*.41f,front-.06f,1.3f,false);
                foreach(int side in new[]{-1,1})
                {
                    Vector3 origin=ResidentialPoint(site,side*width/2,0,0);
                    var wall=new ResidentialLot{x=origin.x,z=origin.z,yaw=site.yaw-side*Mathf.PI/2,seed=site.seed};
                    Window(wall,-3.6f,-.035f,1.8f,false);Window(wall,2.9f,-.035f,1.8f,false);
                }

                // Framed porch fascia and column plinths/capitals strengthen the entrance silhouette.
                int porchFinish=ResidentialRandom(site.seed+117)>.65f?accent:0;
                var porch=Batch(site,porchFinish);
                ResidentialBox(porch,site,-width*.29f,3.085f,front-3.225f,6.4f,.255f,.18f);
                ResidentialBox(trim,site,-width*.29f,2.94f,front-3.25f,6.46f,.065f,.22f);
                foreach(float x in new[]{-width*.43f,-width*.14f})
                {
                    ResidentialBox(porch,site,x,1.64f,front-2.8f,.32f,2.63f,.32f);
                    ResidentialBox(trim,site,x,.34f,front-2.8f,.43f,.20f,.43f);
                    ResidentialBox(trim,site,x,2.89f,front-2.8f,.43f,.16f,.43f);
                }
                report.porchTrims++;

                // Open metal gutters have folded faces, plus two wall-hugging downspouts.
                float eave=height+.24f;
                foreach(int side in new[]{-1,1})
                {
                    float z=side*(depth/2+.60f),length=width+1.22f;
                    ResidentialGutterQuad(trim,site,new Vector3(-length/2,eave-.08f,z),new Vector3(length/2,eave-.08f,z),
                        new Vector3(length/2,eave+.03f,z+side*.10f),new Vector3(-length/2,eave+.03f,z+side*.10f));
                    ResidentialGutterQuad(trim,site,new Vector3(-length/2,eave-.08f,z-side*.13f),new Vector3(length/2,eave-.08f,z-side*.13f),
                        new Vector3(length/2,eave-.08f,z),new Vector3(-length/2,eave-.08f,z));
                }
                foreach(int side in new[]{-1,1})
                {
                    float x=side*(width/2-.12f);
                    ResidentialBox(trim,site,x,(eave-.45f)/2+.33f,front-.16f,.12f,eave-.45f,.14f);
                    ResidentialBox(trim,site,x,eave-.18f,front-.35f,.12f,.14f,.48f);
                }
                // Short overlapping curved ridge caps retain the hip roof silhouette and catch real light.
                int roofFinish=Mathf.FloorToInt(ResidentialRandom(site.seed+41)*3)==1?2:4;
                float ridgeWidth=(width+1.1f)*.45f;int caps=Mathf.CeilToInt(ridgeWidth/.43f);
                for(int cap=0;cap<caps;cap++)
                {
                    float x0=-ridgeWidth/2+cap*ridgeWidth/caps,x1=x0+ridgeWidth/caps+.025f;
                    for(int arc=0;arc<4;arc++)
                    {
                        float a=arc*Mathf.PI/4,b=(arc+1)*Mathf.PI/4,baseY=eave+1.83f;
                        ResidentialQuad(Batch(site,roofFinish),site,new Vector3(x0,baseY+Mathf.Sin(a)*.115f,Mathf.Cos(a)*.145f),
                            new Vector3(x1,baseY+Mathf.Sin(a)*.115f,Mathf.Cos(a)*.145f),new Vector3(x1,baseY+Mathf.Sin(b)*.115f,Mathf.Cos(b)*.145f),
                            new Vector3(x0,baseY+Mathf.Sin(b)*.115f,Mathf.Cos(b)*.145f));
                    }
                    report.roofCaps++;
                }
                report.facades++;
            }
            var root=new GameObject("TownDrive.ResidentialArt");root.transform.SetParent(world.transform,false);
            foreach(var cell in batches.GroupBy(pair=>pair.Key.Split(':')[0]))
            {
                var cellRoot=new GameObject("TownDrive.ResidentialCell."+cell.Key);cellRoot.transform.SetParent(root.transform,false);
                var renderers=new List<Renderer>();
                foreach(var item in cell)
                {
                    int material=int.Parse(item.Key.Split(':')[1]);var batch=item.Value;
                    var mesh=new Mesh{name="TownDrive.Residential."+cell.Key+"."+material,indexFormat=batch.points.Count>65535?IndexFormat.UInt32:IndexFormat.UInt16};
                    mesh.SetVertices(batch.points);mesh.SetUVs(0,batch.uv);mesh.SetTriangles(batch.indices,0);
                    mesh.RecalculateNormals();mesh.RecalculateTangents();mesh.RecalculateBounds();
                    report.minimumHeight=Mathf.Min(report.minimumHeight,mesh.bounds.min.y);report.maximumHeight=Mathf.Max(report.maximumHeight,mesh.bounds.max.y);
                    report.triangles+=batch.indices.Count/3;
                    string path=ResidentialArtFolder+"/"+mesh.name+".asset";
                    var saved=AssetDatabase.LoadAssetAtPath<Mesh>(path);
                    if(saved==null){AssetDatabase.CreateAsset(mesh,path);saved=mesh;}
                    else{EditorUtility.CopySerialized(mesh,saved);Object.DestroyImmediate(mesh);EditorUtility.SetDirty(saved);}
                    var node=new GameObject(saved.name);node.transform.SetParent(cellRoot.transform,false);node.AddComponent<MeshFilter>().sharedMesh=saved;
                    var renderer=node.AddComponent<MeshRenderer>();renderer.sharedMaterial=materials[material];
                    renderer.shadowCastingMode=ShadowCastingMode.On;renderer.receiveShadows=true;renderers.Add(renderer);
                }
                ConfigureDistanceLods(cellRoot.AddComponent<LODGroup>(),new List<Renderer[]>{renderers.ToArray()},new List<float>{150});
                report.renderers+=renderers.Count;report.cells++;
            }
            if(originalMeshes.Any(pair=>pair.Key.sharedMesh!=pair.Value||pair.Key.transform.localToWorldMatrix!=originalTransforms[pair.Key]))
                throw new InvalidDataException("Residential art changed existing source geometry or placement.");
            if(report.facades!=83||report.renderers>=100||report.triangles>=60000||report.minimumHeight<.01f||report.maximumHeight>6.7f)
                throw new InvalidDataException("Residential art exceeded its footprint/detail budget: "+JsonUtility.ToJson(report));
            Directory.CreateDirectory("Builds");File.WriteAllText("Builds/town-drive-residential-art-receipt.json",JsonUtility.ToJson(report,true));
            Debug.Log("TOWN_DRIVE_RESIDENTIAL_ART "+JsonUtility.ToJson(report));
        }

        static float ResidentialRandom(int seed){double value=Math.Sin(seed*63.17+341.8)*9758.543;return(float)(value-Math.Floor(value));}
        static Vector3 ResidentialPoint(ResidentialLot site,float x,float y,float z)
        {float c=Mathf.Cos(site.yaw),s=Mathf.Sin(site.yaw);return new Vector3(site.x+c*x+s*z,y,site.z-s*x+c*z);}
        static void ResidentialQuad(ResidentialBatch batch,ResidentialLot site,Vector3 a,Vector3 b,Vector3 c,Vector3 d)
            =>batch.Quad(ResidentialPoint(site,a.x,a.y,a.z),ResidentialPoint(site,b.x,b.y,b.z),ResidentialPoint(site,c.x,c.y,c.z),ResidentialPoint(site,d.x,d.y,d.z));
        static void ResidentialGutterQuad(ResidentialBatch batch,ResidentialLot site,Vector3 a,Vector3 b,Vector3 c,Vector3 d)
        {
            // Folded sheet metal is visible from the street underneath and the raised chase view above.
            ResidentialQuad(batch,site,a,b,c,d);ResidentialQuad(batch,site,d,c,b,a);
        }
        static void ResidentialBox(ResidentialBatch batch,ResidentialLot site,float x,float y,float z,float w,float h,float d)
        {
            float a=x-w/2,b=x+w/2,l=y-h/2,u=y+h/2,f=z-d/2,r=z+d/2;
            ResidentialQuad(batch,site,new Vector3(a,l,f),new Vector3(a,u,f),new Vector3(b,u,f),new Vector3(b,l,f));
            ResidentialQuad(batch,site,new Vector3(b,l,r),new Vector3(b,u,r),new Vector3(a,u,r),new Vector3(a,l,r));
            ResidentialQuad(batch,site,new Vector3(a,l,r),new Vector3(a,u,r),new Vector3(a,u,f),new Vector3(a,l,f));
            ResidentialQuad(batch,site,new Vector3(b,l,f),new Vector3(b,u,f),new Vector3(b,u,r),new Vector3(b,l,r));
            ResidentialQuad(batch,site,new Vector3(a,u,f),new Vector3(a,u,r),new Vector3(b,u,r),new Vector3(b,u,f));
            ResidentialQuad(batch,site,new Vector3(a,l,r),new Vector3(a,l,f),new Vector3(b,l,f),new Vector3(b,l,r));
        }
        static void ResidentialFrame(ResidentialBatch batch,ResidentialLot site,float x,float y,float z,float w,float h,float border,float relief)
        {
            float a=x-w/2,b=x+w/2,l=y-h/2,u=y+h/2,aa=a+border,bb=b-border,ll=l+border,uu=u-border,inner=z-relief;
            ResidentialQuad(batch,site,new Vector3(a,l,z),new Vector3(a,u,z),new Vector3(aa,uu,inner),new Vector3(aa,ll,inner));
            ResidentialQuad(batch,site,new Vector3(a,u,z),new Vector3(b,u,z),new Vector3(bb,uu,inner),new Vector3(aa,uu,inner));
            ResidentialQuad(batch,site,new Vector3(b,u,z),new Vector3(b,l,z),new Vector3(bb,ll,inner),new Vector3(bb,uu,inner));
            ResidentialQuad(batch,site,new Vector3(b,l,z),new Vector3(a,l,z),new Vector3(aa,ll,inner),new Vector3(bb,ll,inner));
        }
        static void ResidentialPanel(ResidentialBatch batch,ResidentialLot site,float x,float y,float z,float w,float h,float border,float relief)
        {
            ResidentialFrame(batch,site,x,y,z,w,h,border,relief);
            float a=x-w/2+border,b=x+w/2-border,l=y-h/2+border,u=y+h/2-border;
            ResidentialQuad(batch,site,new Vector3(a,l,z-relief),new Vector3(a,u,z-relief),new Vector3(b,u,z-relief),new Vector3(b,l,z-relief));
        }
        static Material[] ResidentialMaterials()
        {
            var colors=new[]{new Color(.82f,.80f,.73f),new Color(.29f,.40f,.40f),new Color(.42f,.43f,.39f),new Color(.19f,.20f,.18f),new Color(.57f,.30f,.18f)};
            var names=new[]{"WarmIvory","CoastalBlue","WeatheredSage","BronzeHardware","ClayRidge"};
            var shader=Shader.Find("Universal Render Pipeline/Lit")??throw new InvalidOperationException("URP/Lit is required for residential art.");
            var result=new Material[names.Length];
            for(int i=0;i<result.Length;i++)
            {
                string path=ResidentialArtFolder+"/"+names[i]+".mat";var material=AssetDatabase.LoadAssetAtPath<Material>(path);
                if(material==null){material=new Material(shader);AssetDatabase.CreateAsset(material,path);}else material.shader=shader;
                material.name="TownDrive.Residential."+names[i];material.SetColor("_BaseColor",colors[i]);material.SetFloat("_Metallic",i==3?.22f:.02f);
                material.SetFloat("_Smoothness",i==3?.29f:.26f);material.enableInstancing=true;EditorUtility.SetDirty(material);result[i]=material;
            }
            return result;
        }
    }
}
