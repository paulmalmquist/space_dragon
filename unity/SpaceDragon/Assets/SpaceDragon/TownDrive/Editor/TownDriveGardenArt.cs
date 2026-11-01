using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using SpaceDragon.TownDrive.UnityRuntime;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using Object = UnityEngine.Object;

namespace SpaceDragon.TownDrive.Editor
{
    public static partial class TownDriveProject
    {
        const string GardenFolder = Generated + "/GardenArt";
        [Serializable] sealed class GardenData { public GardenContext context; }
        [Serializable] sealed class GardenContext { public GardenLot[] lots; public GardenRoad[] roads; public GardenWater[] waters; }
        [Serializable] sealed class GardenLot { public float x, z, yaw, driveLength; public int seed; public bool compact; }
        [Serializable] sealed class GardenRoad { public float width; public GardenPointData[] points; }
        [Serializable] sealed class GardenWater { public GardenPointData[] points; }
        [Serializable] sealed class GardenPointData { public float x, z; }
        [Serializable] public sealed class TownDriveGardenEvidence
        {
            public string result, scope;
            public int sourceLots, plantedLots, beds, broadleafClumps, grassClumps, renderers, cells, triangles;
            public float maximumHeight, minimumRoadEdgeClearance;
        }
        sealed class GardenBatch
        {
            public readonly List<Vector3> positions = new List<Vector3>();
            public readonly List<Vector2> uv = new List<Vector2>();
            public readonly List<int> indices = new List<int>();
            public void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d, Vector2 ta, Vector2 tb, Vector2 tc, Vector2 td)
            {
                int i = positions.Count; positions.AddRange(new[] { a, b, c, d }); uv.AddRange(new[] { ta, tb, tc, td });
                indices.AddRange(new[] { i, i + 1, i + 2, i, i + 2, i + 3 });
            }
            public void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d) => Quad(a,b,c,d,Vector2.zero,Vector2.right,Vector2.one,Vector2.up);
        }

        /// <summary>Low ornamental planting inside existing estimated front-yard beds. No collider, traffic or save changes.</summary>
        static void ApplyGardenArt(GameObject world)
        {
            Folder(GardenFolder);
            string json = File.ReadAllText(DataPath);
            var context = JsonUtility.FromJson<GardenData>(json).context;
            if (context?.lots == null || context.lots.Length != 83 || context.roads == null || context.waters == null)
                throw new InvalidDataException("Garden art requires the preserved 83-lot mapped context.");
            var data = TownDriveJson.Parse(json);
            var route = new DriveRoute(data.route);
            var materials = CreateGardenMaterials();
            var batches = new SortedDictionary<string, GardenBatch>();
            var report = new TownDriveGardenEvidence { result = "Succeeded", sourceLots = context.lots.Length,
                minimumRoadEdgeClearance = float.PositiveInfinity,
                scope = "Original low ornamental geometry only, inside existing estimated residential bed footprints; no colliders or authoritative data changes." };
            GardenBatch Batch(GardenLot site, int material)
            {
                string key = Mathf.FloorToInt(site.x / 90) + "_" + Mathf.FloorToInt(site.z / 90) + ":" + material;
                if (!batches.TryGetValue(key, out var value)) batches.Add(key, value = new GardenBatch());
                return value;
            }
            foreach (var site in context.lots)
            {
                // Exact dimensions/random function from the retained development.home source.
                float width = (site.compact ? 14.8f : 17) + GardenRandom(site.seed) * (site.compact ? 1.7f : 3);
                float depth = (site.compact ? 11.5f : 13) + GardenRandom(site.seed + 4) * (site.compact ? 1.5f : 2);
                float front = -depth / 2, garageLeft = width * .27f - 3.12f;
                float walkCentre = -width * .29f;
                bool planted = false;
                // Trim the source bed before the existing garage driveway and entry path.
                foreach (int bed in new[] { 0, 1 })
                {
                    float sourceCentre = bed == 0 ? -width * .02f : -width * .43f;
                    float sourceWidth = bed == 0 ? 4.7f : 2.6f;
                    float left = sourceCentre - sourceWidth / 2 + .15f;
                    float right = Mathf.Min(sourceCentre + sourceWidth / 2 - .15f, garageLeft);
                    if (bed == 0) left = Mathf.Max(left, walkCentre + .97f);
                    else right = Mathf.Min(right, walkCentre - .97f);
                    if (right - left < 1) continue;
                    float centre = (left + right) / 2, z = front - 2.4f, halfDepth = .64f;
                    var corners = new[] { GardenPoint(site,left,.19f,z-halfDepth), GardenPoint(site,right,.19f,z-halfDepth),
                        GardenPoint(site,right,.19f,z+halfDepth), GardenPoint(site,left,.19f,z+halfDepth) };
                    if (corners.Any(p => !GardenClear(p, .3f, context, route, ref report.minimumRoadEdgeClearance))) continue;
                    // A thin top dressing and discreet inset stone border cover only the existing bed.
                    Batch(site,2).Quad(corners[0],corners[3],corners[2],corners[1]);
                    AddGardenEdge(Batch(site,3), site, left, right, z, halfDepth);
                    int count = Mathf.Max(2, Mathf.FloorToInt((right-left)/.68f));
                    for (int i = 0; i < count; i++)
                    {
                        int seed = site.seed + 4100 + bed * 131 + i * 11;
                        float x = Mathf.Lerp(left + .31f,right - .31f,(i+.5f)/count);
                        float zz = z + (GardenRandom(seed+1)-.5f)*.38f;
                        float height = .43f + GardenRandom(seed+2)*.18f;
                        var origin = GardenPoint(site,x,.205f,zz);
                        AddBroadleaf(Batch(site,i%3==0?1:0), origin, site.yaw, height, seed);
                        report.broadleafClumps++;
                        if (i % 2 == 0)
                        {
                            var tuft = GardenPoint(site,x,.205f,z-.45f);
                            AddGrassTuft(Batch(site,1),tuft,.22f+GardenRandom(seed+5)*.12f,seed+230);
                            report.grassClumps++;
                        }
                    }
                    report.beds++; planted=true;
                }
                if(planted)report.plantedLots++;
            }
            var parent = new GameObject("TownDrive.GardenArt"); parent.transform.SetParent(world.transform,false);
            foreach (var cell in batches.GroupBy(entry => entry.Key.Split(':')[0]))
            {
                var cellRoot = new GameObject("TownDrive.GardenCell."+cell.Key);cellRoot.transform.SetParent(parent.transform,false);
                var renderers = new List<Renderer>();
                foreach(var item in cell)
                {
                    int materialIndex = int.Parse(item.Key.Split(':')[1]);
                    var batch=item.Value;
                    var mesh=new Mesh { name="TownDrive.Garden."+cell.Key+"."+materialIndex,
                        indexFormat=batch.positions.Count>65535?IndexFormat.UInt32:IndexFormat.UInt16 };
                    mesh.SetVertices(batch.positions);mesh.SetUVs(0,batch.uv);mesh.SetTriangles(batch.indices,0);
                    mesh.RecalculateNormals();mesh.RecalculateTangents();mesh.RecalculateBounds();
                    if(mesh.bounds.max.y>.95f||mesh.bounds.min.y<.18f)throw new InvalidDataException("Garden detail exceeded its low bed envelope.");
                    report.maximumHeight=Mathf.Max(report.maximumHeight,mesh.bounds.max.y);report.triangles+=batch.indices.Count/3;
                    string path=GardenFolder+"/"+mesh.name+".asset";
                    var saved=AssetDatabase.LoadAssetAtPath<Mesh>(path);
                    if(saved==null){AssetDatabase.CreateAsset(mesh,path);saved=mesh;}else{EditorUtility.CopySerialized(mesh,saved);Object.DestroyImmediate(mesh);EditorUtility.SetDirty(saved);}
                    var node=new GameObject(mesh==null?saved.name:mesh.name);node.transform.SetParent(cellRoot.transform,false);
                    node.AddComponent<MeshFilter>().sharedMesh=saved;
                    var renderer=node.AddComponent<MeshRenderer>();renderer.sharedMaterial=materials[materialIndex];
                    renderer.shadowCastingMode=materialIndex<2?ShadowCastingMode.On:ShadowCastingMode.Off;
                    renderer.receiveShadows=true;renderers.Add(renderer);
                }
                ConfigureDistanceLods(cellRoot.AddComponent<LODGroup>(),new List<Renderer[]>{renderers.ToArray()},new List<float>{155});
                report.renderers+=renderers.Count;report.cells++;
            }
            if(report.plantedLots<50||report.beds<100||report.triangles>120000||report.renderers>160)
                throw new InvalidDataException("Garden art acceptance budget/count changed: "+JsonUtility.ToJson(report));
            Directory.CreateDirectory("Builds");File.WriteAllText("Builds/town-drive-garden-art-receipt.json",JsonUtility.ToJson(report,true));
            Debug.Log("TOWN_DRIVE_GARDEN_ART "+JsonUtility.ToJson(report));
        }

        static float GardenRandom(int seed)
        {
            double value=Math.Sin(seed*63.17+341.8)*9758.543;return(float)(value-Math.Floor(value));
        }
        static Vector3 GardenPoint(GardenLot site,float x,float y,float z)
        {
            float c=Mathf.Cos(site.yaw),s=Mathf.Sin(site.yaw);return new Vector3(site.x+c*x+s*z,y,site.z-s*x+c*z);
        }
        static bool GardenClear(Vector3 point,float radius,GardenContext context,DriveRoute route,ref float minimum)
        {
            var nearest=route.Nearest(point.x,point.z);var section=route.Data.sections[nearest.sectionIndex];
            float edge=(float)(nearest.distance-section.lanes*section.laneWidth-section.medianWidth/2);
            if(edge<2.4f+radius)return false;
            foreach(var road in context.roads)for(int i=1;i<road.points.Length;i++)
            {
                var a=road.points[i-1];var b=road.points[i];var ab=new Vector2(b.x-a.x,b.z-a.z);
                float t=Mathf.Clamp01(Vector2.Dot(new Vector2(point.x-a.x,point.z-a.z),ab)/Mathf.Max(.0001f,ab.sqrMagnitude));
                edge=Mathf.Min(edge,Vector2.Distance(new Vector2(point.x,point.z),new Vector2(a.x,a.z)+ab*t)-road.width/2);
                if(edge<2.4f+radius)return false;
            }
            foreach(var water in context.waters)
            {
                bool inside=false;for(int i=0,j=water.points.Length-1;i<water.points.Length;j=i++)
                {
                    var a=water.points[i];var b=water.points[j];
                    if((a.z>point.z)!=(b.z>point.z)&&point.x<(b.x-a.x)*(point.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
                }
                if(inside)return false;
            }
            minimum=Mathf.Min(minimum,edge);return true;
        }
        static void AddGardenEdge(GardenBatch batch,GardenLot site,float left,float right,float z,float halfDepth)
        {
            // Inset edge chips have individual variation; no continuous bright fence.
            int count=Mathf.CeilToInt((right-left)/.28f);
            for(int i=0;i<count;i++)for(int side=-1;side<=1;side+=2)
            {
                float x=Mathf.Lerp(left+.10f,right-.10f,(i+.5f)/count),yy=.205f+GardenRandom(site.seed+i+side+700)*.02f;
                float zz=z+side*(halfDepth-.045f),w=.09f+GardenRandom(site.seed+i+810)*.035f;
                var a=GardenPoint(site,x-w,yy,zz-.06f);var b=GardenPoint(site,x-w,yy+.045f,zz+.055f);
                var c=GardenPoint(site,x+w,yy+.04f,zz+.06f);var d=GardenPoint(site,x+w,yy,zz-.055f);
                batch.Quad(a,b,c,d);
            }
        }
        static void AddBroadleaf(GardenBatch batch,Vector3 origin,float yaw,float height,int seed)
        {
            for(int leaf=0;leaf<8;leaf++)
            {
                float angle=yaw+leaf*2.39996323f+GardenRandom(seed+leaf)*.3f;
                float length=.24f+GardenRandom(seed+leaf+61)*.14f;
                float width=.055f+GardenRandom(seed+leaf+86)*.035f;
                float start=height*(.13f+.42f*GardenRandom(seed+leaf+33));
                float rise=height*(.25f+.45f*GardenRandom(seed+leaf+52));
                var direction=new Vector3(Mathf.Sin(angle),0,Mathf.Cos(angle));var side=Vector3.Cross(Vector3.up,direction);
                var stem=origin+Vector3.up*start+direction*.035f;
                Vector3 Centre(float t)=>stem+direction*(length*t)+Vector3.up*(rise*t-.11f*t*t);
                Vector3 At(float t,float edge)=>Centre(t)+side*(Mathf.Sin(t*Mathf.PI)*width*edge)-Vector3.up*(Mathf.Sin(t*Mathf.PI)*width*.22f*Mathf.Abs(edge));
                for(int seg=0;seg<4;seg++)
                {
                    float a=seg/4f,b=(seg+1)/4f;
                    // Raised midrib and folded sides make actual leaf form, not crossed cards.
                    batch.Quad(At(a,-1),At(b,-1),At(b,0),At(a,0),new Vector2(0,a),new Vector2(0,b),new Vector2(.5f,b),new Vector2(.5f,a));
                    batch.Quad(At(a,0),At(b,0),At(b,1),At(a,1),new Vector2(.5f,a),new Vector2(.5f,b),new Vector2(1,b),new Vector2(1,a));
                }
            }
        }
        static void AddGrassTuft(GardenBatch batch,Vector3 origin,float height,int seed)
        {
            for(int blade=0;blade<10;blade++)
            {
                float angle=blade*2.39996323f+GardenRandom(seed)*6;
                var outward=new Vector3(Mathf.Sin(angle),0,Mathf.Cos(angle));var side=Vector3.Cross(Vector3.up,outward)*(.008f+GardenRandom(seed+blade)*.009f);
                var foot=origin+outward*(GardenRandom(seed+blade+10)*.045f);
                var mid=foot+Vector3.up*height*.65f+outward*.07f;
                var tip=foot+Vector3.up*height+outward*(.13f+GardenRandom(seed+blade+20)*.08f);
                batch.Quad(foot-side,foot+side,mid+side*.6f,mid-side*.6f);
                batch.Quad(mid-side*.6f,mid+side*.6f,tip,tip);
            }
        }
        static Material[] CreateGardenMaterials()
        {
            var shader=Shader.Find("Universal Render Pipeline/Lit")??throw new InvalidOperationException("URP/Lit is required for garden art.");
            var leaf=GardenTexture("leaf",256,true);var mulch=GardenTexture("mulch",128,false);
            var colors=new[]{new Color(.78f,.86f,.69f),new Color(.97f,1,.79f),Color.white,new Color(.43f,.42f,.35f)};
            var names=new[]{"Broadleaf","Grasses","Mulch","StoneEdge"};
            var result=new Material[4];
            for(int i=0;i<4;i++)
            {
                string path=GardenFolder+"/Garden."+names[i]+".mat";
                var material=AssetDatabase.LoadAssetAtPath<Material>(path);
                if(material==null){material=new Material(shader);AssetDatabase.CreateAsset(material,path);}else material.shader=shader;
                material.name="TownDrive.Garden."+names[i];material.SetColor("_BaseColor",colors[i]);
                material.SetTexture("_BaseMap",i<2?leaf:i==2?mulch:null);material.SetFloat("_Smoothness",i<2?.23f:.07f);
                material.SetFloat("_Metallic",0);material.SetFloat("_Cull",i<2?0:2);material.doubleSidedGI=i<2;
                material.enableInstancing=true;EditorUtility.SetDirty(material);result[i]=material;
            }
            return result;
        }
        static Texture2D GardenTexture(string id,int size,bool leaf)
        {
            string path=GardenFolder+"/"+id+"-original.png";
            var pixels=new Color32[size*size];
            for(int y=0;y<size;y++)for(int x=0;x<size;x++)
            {
                float u=x/(float)(size-1),v=y/(float)(size-1),noise=Mathf.PerlinNoise(u*29+13,v*31+5);
                Color color;
                if(leaf)
                {
                    float edge=Mathf.Abs(u-.5f)*2,vein=Mathf.Exp(-Mathf.Abs(u-.5f)*100)*.14f;
                    float minor=Mathf.Pow(Mathf.Max(0,Mathf.Cos((v-edge*.35f)*Mathf.PI*28)),16)*.035f;
                    float light=.88f+noise*.22f-edge*.16f+vein+minor;
                    color=new Color(.22f*light,.38f*light,.105f*light,1);
                }
                else
                {
                    float fiber=Mathf.PerlinNoise(u*8,v*50),light=.65f+noise*.4f+fiber*.23f;
                    color=new Color(.17f*light,.105f*light,.065f*light,1);
                }
                pixels[y*size+x]=color;
            }
            var texture=new Texture2D(size,size,TextureFormat.RGBA32,false);texture.SetPixels32(pixels);texture.Apply();
            byte[] png=texture.EncodeToPNG();Object.DestroyImmediate(texture);
            if(!File.Exists(path)||!File.ReadAllBytes(path).SequenceEqual(png))File.WriteAllBytes(path,png);
            AssetDatabase.ImportAsset(path,ImportAssetOptions.ForceSynchronousImport);
            var importer=(TextureImporter)AssetImporter.GetAtPath(path);
            importer.sRGBTexture=true;importer.mipmapEnabled=true;importer.wrapMode=TextureWrapMode.Repeat;
            importer.filterMode=FilterMode.Trilinear;importer.anisoLevel=4;importer.textureCompression=TextureImporterCompression.Compressed;
            importer.maxTextureSize=size;importer.SaveAndReimport();
            return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        }
    }
}
