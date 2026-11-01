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
        public const string FoliageArtFolder = Generated + "/FoliageArt";
        public const string FoliageArtReceipt = "Builds/town-drive-foliage-art-receipt.json";
        [Serializable] public sealed class TownDriveFoliageEvidence
        {
            public string result, scope, manifestSha256, leafTextureSha256;
            public int palms, retainedParts, replacedParts, cells, renderers, nearTriangles, farTriangles;
            public float minimumCrownHeight;
            public FoliageAnchor[] anchors;
        }
        [Serializable] public sealed class FoliageAnchor
        {
            public string sourceId, cell;
            public Vector3 position, scale;
            public Quaternion rotation;
        }
        sealed class PalmBatch
        {
            public readonly List<Vector3> positions = new List<Vector3>();
            public readonly List<Vector2> uv = new List<Vector2>();
            public readonly List<int> triangles = new List<int>();
            public void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d, Vector2 ta, Vector2 tb, Vector2 tc, Vector2 td)
            {
                int index = positions.Count;
                positions.AddRange(new[] { a,b,c,d }); uv.AddRange(new[] { ta,tb,tc,td });
                triangles.AddRange(new[] { index,index+2,index+1,index,index+3,index+2 });
            }
            public void Append(PalmBatch source, Matrix4x4 matrix)
            {
                int offset=positions.Count;
                positions.AddRange(source.positions.Select(matrix.MultiplyPoint3x4)); uv.AddRange(source.uv);
                triangles.AddRange(source.triangles.Select(index=>index+offset));
            }
            public Mesh Mesh(string name)
            {
                var mesh=new Mesh { name=name, indexFormat=positions.Count>65535?IndexFormat.UInt32:IndexFormat.UInt16 };
                mesh.SetVertices(positions); mesh.SetUVs(0,uv); mesh.SetTriangles(triangles,0);
                mesh.RecalculateNormals(); mesh.RecalculateTangents(); mesh.RecalculateBounds(); return mesh;
            }
        }

        /// <summary>Full pinnate crowns at existing palm anchors. Source trunks, fruit and hidden leaf geometry remain recoverable.</summary>
        static void ApplyFoliageArt(GameObject world)
        {
            Folder(FoliageArtFolder);
            var manifest=LoadManifest();
            var crowns=manifest.vegetationInstances.Where(part=>part.assetId=="vegetation-palm" && part.meshName=="palm.near.2").ToArray();
            if(crowns.Length!=162)throw new InvalidDataException("Palm anchor inventory changed; review foliage authoring before regenerating.");
            var originalRoot=world.transform.Find("TownDrive.Vegetation") ?? throw new InvalidDataException("Original vegetation root missing.");
            var originals=originalRoot.Cast<Transform>().ToDictionary(node=>node.name,StringComparer.Ordinal);
            var evidence=new TownDriveFoliageEvidence { result="Succeeded",manifestSha256=HashFile(ManifestPath),
                palms=crowns.Length,retainedParts=originals.Count,minimumCrownHeight=float.PositiveInfinity,
                scope="Original opaque leaf geometry is retained inactive; full curved pinnate crowns replace only the two palm leaf parts. Existing trunk/fruit/anchors, road data and collisions are unchanged." };
            foreach(var part in manifest.vegetationInstances.Where(part=>part.assetId=="vegetation-palm" && (part.meshName=="palm.near.2"||part.meshName=="palm.near.3")))
            {
                if(!originals.TryGetValue("TownDrive.PlantPart."+part.id,out var original))throw new InvalidDataException("Palm source part missing: "+part.id);
                // Disable the group, not the source asset or its authored tiers.
                // Its LOD contract and all original geometry remain serialized.
                original.gameObject.SetActive(false); evidence.replacedParts++;
            }
            var near=new SortedDictionary<string,PalmBatch>(); var far=new SortedDictionary<string,PalmBatch>();
            var anchors=new List<FoliageAnchor>();
            foreach(var crown in crowns)
            {
                string cell=Mathf.FloorToInt(crown.position.x/160)+"_"+Mathf.FloorToInt(crown.position.z/160);
                if(!near.ContainsKey(cell)){near.Add(cell,new PalmBatch());far.Add(cell,new PalmBatch());}
                var matrix=Matrix4x4.TRS(crown.position,crown.rotationQuaternion,crown.scale);
                int seed=PalmSeed(crown.id);
                near[cell].Append(PalmCrown(seed,false),matrix);far[cell].Append(PalmCrown(seed,true),matrix);
                anchors.Add(new FoliageAnchor {sourceId=crown.id,cell=cell,position=crown.position,scale=crown.scale,rotation=crown.rotationQuaternion});
            }
            var material=PalmMaterial();
            evidence.leafTextureSha256=HashFile(FoliageArtFolder+"/pinnate-leaf.png");
            var root=new GameObject("TownDrive.FoliageArt");root.transform.SetParent(world.transform,false);
            foreach(var item in near)
            {
                var cell=new GameObject("TownDrive.PalmCell."+item.Key);cell.transform.SetParent(root.transform,false);
                var levels=new List<Renderer[]>();
                foreach(bool distant in new[]{false,true})
                {
                    var batch=distant?far[item.Key]:item.Value;
                    string name="TownDrive.Palm."+item.Key+(distant?".far":".near");
                    var mesh=batch.Mesh(name);evidence.minimumCrownHeight=Mathf.Min(evidence.minimumCrownHeight,mesh.bounds.min.y);
                    if(distant)evidence.farTriangles+=batch.triangles.Count/3;else evidence.nearTriangles+=batch.triangles.Count/3;
                    string path=FoliageArtFolder+"/"+name+".asset";
                    var saved=AssetDatabase.LoadAssetAtPath<Mesh>(path);
                    if(saved==null){AssetDatabase.CreateAsset(mesh,path);saved=mesh;}
                    else{EditorUtility.CopySerialized(mesh,saved);Object.DestroyImmediate(mesh);EditorUtility.SetDirty(saved);}
                    var node=new GameObject(name);node.transform.SetParent(cell.transform,false);node.AddComponent<MeshFilter>().sharedMesh=saved;
                    var renderer=node.AddComponent<MeshRenderer>();renderer.sharedMaterial=material;
                    renderer.shadowCastingMode=distant?ShadowCastingMode.Off:ShadowCastingMode.On;renderer.receiveShadows=true;
                    levels.Add(new Renderer[]{renderer});evidence.renderers++;
                }
                ConfigureDistanceLods(cell.AddComponent<LODGroup>(),levels,new List<float>{180,420});evidence.cells++;
            }
            evidence.anchors=anchors.ToArray();
            if(evidence.replacedParts!=324||evidence.renderers>=80||evidence.nearTriangles+evidence.farTriangles>150000||evidence.minimumCrownHeight<4.1f)
                throw new InvalidDataException("Palm crown appearance/clearance budget changed: "+JsonUtility.ToJson(evidence));
            Directory.CreateDirectory("Builds");File.WriteAllText(FoliageArtReceipt,JsonUtility.ToJson(evidence,true));
            Debug.Log("TOWN_DRIVE_FOLIAGE_ART "+JsonUtility.ToJson(evidence));
        }

        // Public only for editor shape acceptance; no runtime scene mutation.
        public static Mesh CreatePalmCrownForReview(int seed,bool distant)=>PalmCrown(seed,distant).Mesh("Palm crown review");

        static PalmBatch PalmCrown(int seed,bool distant)
        {
            var batch=new PalmBatch();
            // Seven hanging mature fronds, five spreading middle fronds and two
            // upright new fronds. Unequal rings avoid an umbrella silhouette.
            for(int frond=0;frond<14;frond++)
            {
                bool lower=frond<7,upper=frond>=12;
                int ringIndex=lower?frond:(upper?frond-12:frond-7),ringCount=lower?7:(upper?2:5);
                float angle=(ringIndex/(float)ringCount)*Mathf.PI*2+(lower?0:(upper?1.1f:.45f))+(PalmNoise(seed+frond*7)-.5f)*.22f;
                float length=(lower?3.25f:(upper?2.15f:3.0f))*(.94f+PalmNoise(seed+frond*7+1)*.12f);
                float lift=lower?.52f:(upper?3.1f:1.4f),droop=lower?2.25f:(upper?1.45f:2.0f);
                var forward=new Vector3(Mathf.Cos(angle),0,Mathf.Sin(angle));
                var side=new Vector3(-forward.z,0,forward.x);
                Vector3 Spine(float t)=>new Vector3(0,10.15f,0)+forward*(length*t)+side*(Mathf.Sin(t*Mathf.PI)*.10f*(PalmNoise(seed+frond*7+2)-.5f))+Vector3.up*(lift*t-droop*t*t);
                int tone=(seed+frond)%4;if(tone<0)tone+=4;
                Vector2 Uv(float x,float y)=>new Vector2(x,(tone+.04f+y*.92f)/4);
                if(distant)
                {
                    // Wide, curved solid silhouette at distance. It retains the
                    // same frond tips/arches without subpixel leaflet aliasing.
                    for(int segment=0;segment<4;segment++)
                    {
                        float t0=segment/4f,t1=(segment+1)/4f;
                        float w0=Mathf.Max(.008f,Mathf.Pow(Mathf.Max(0,Mathf.Sin(t0*Mathf.PI)),.7f)*.56f);
                        float w1=Mathf.Max(.008f,Mathf.Pow(Mathf.Max(0,Mathf.Sin(t1*Mathf.PI)),.7f)*.56f);
                        batch.Quad(Spine(t0)-side*w0,Spine(t1)-side*w1,Spine(t1)+side*w1,Spine(t0)+side*w0,Uv(0,t0),Uv(0,t1),Uv(1,t1),Uv(1,t0));
                    }
                    continue;
                }
                for(int segment=0;segment<4;segment++)
                {
                    float t0=segment/4f,t1=(segment+1)/4f,w0=.025f*(1-t0)+.006f,w1=.025f*(1-t1)+.006f;
                    batch.Quad(Spine(t0)-side*w0,Spine(t1)-side*w1,Spine(t1)+side*w1,Spine(t0)+side*w0,Uv(.44f,t0),Uv(.44f,t1),Uv(.56f,t1),Uv(.56f,t0));
                }
                for(int pair=0;pair<12;pair++)foreach(int sign in new[]{-1,1})
                {
                    float t=.12f+(pair+.5f)/12*.84f+(sign>0?.009f:0);
                    float reach=Mathf.Pow(Mathf.Sin(t*Mathf.PI),.62f)*(.76f+PalmNoise(seed+frond*43+pair*3)*.17f);
                    float halfWidth=.064f+PalmNoise(seed+frond*19+pair)*.023f;
                    Vector3 basePoint=Spine(t),axis=(side*sign+forward*.42f).normalized;
                    var cross=new Vector3(-axis.z,0,axis.x);
                    var middle=basePoint+axis*(reach*.46f)+Vector3.up*.025f;
                    var tip=basePoint+axis*reach+forward*.12f-Vector3.up*(reach*.26f);
                    // A tapered nonplanar kite gives a sharp botanical tip and
                    // two softly different lit faces, not a billboard rectangle.
                    batch.Quad(basePoint,middle-cross*halfWidth,tip,middle+cross*halfWidth,Uv(.5f,0),Uv(0,.46f),Uv(.5f,1),Uv(1,.46f));
                }
            }
            return batch;
        }
        static int PalmSeed(string value){unchecked{uint hash=2166136261;foreach(char c in value)hash=(hash^c)*16777619;return(int)(hash&0x7fffffff);}}
        static float PalmNoise(int seed){double n=Math.Sin(seed*.014781+57.12)*43758.5453;return(float)(n-Math.Floor(n));}
        static Material PalmMaterial()
        {
            const int size=256;var pixels=new Color32[size*size];
            var tones=new[]{new Color(.20f,.35f,.075f),new Color(.24f,.40f,.09f),new Color(.18f,.31f,.065f),new Color(.29f,.42f,.105f)};
            for(int y=0;y<size;y++)for(int x=0;x<size;x++)
            {
                float u=x/(float)(size-1),v=(y%64)/63f;
                float midrib=Mathf.Exp(-Mathf.Abs(u-.5f)*85)*.17f;
                float veins=Mathf.Sin(v*195+Mathf.Abs(u-.5f)*35)*.025f;
                float fine=(PalmNoise(y*size+x)-.5f)*.045f;
                float light=.88f+v*.13f+midrib+veins+fine;
                Color pixel=tones[y/64]*light;pixel.a=1;pixels[y*size+x]=pixel;
            }
            var texture=new Texture2D(size,size,TextureFormat.RGBA32,false);texture.SetPixels32(pixels);texture.Apply();
            string texturePath=FoliageArtFolder+"/pinnate-leaf.png";var bytes=texture.EncodeToPNG();Object.DestroyImmediate(texture);
            if(!File.Exists(texturePath)||!File.ReadAllBytes(texturePath).SequenceEqual(bytes))File.WriteAllBytes(texturePath,bytes);
            AssetDatabase.ImportAsset(texturePath,ImportAssetOptions.ForceSynchronousImport);
            var importer=(TextureImporter)AssetImporter.GetAtPath(texturePath);
            importer.textureType=TextureImporterType.Default;importer.sRGBTexture=true;importer.mipmapEnabled=true;
            importer.wrapMode=TextureWrapMode.Clamp;importer.anisoLevel=4;importer.maxTextureSize=size;importer.textureCompression=TextureImporterCompression.CompressedHQ;importer.SaveAndReimport();
            string path=FoliageArtFolder+"/pinnate-leaf.mat";
            var material=AssetDatabase.LoadAssetAtPath<Material>(path);
            if(material==null){material=new Material(Shader.Find("Universal Render Pipeline/Lit"));AssetDatabase.CreateAsset(material,path);}
            material.name="TownDrive.Foliage.PinnateLeaf";material.SetTexture("_BaseMap",AssetDatabase.LoadAssetAtPath<Texture2D>(texturePath));
            material.SetColor("_BaseColor",Color.white);material.SetFloat("_Metallic",0);material.SetFloat("_Smoothness",.24f);
            material.SetFloat("_Cull",(float)CullMode.Off);material.SetFloat("_AlphaClip",0);material.SetFloat("_Surface",0);
            material.enableInstancing=true;material.doubleSidedGI=true;EditorUtility.SetDirty(material);return material;
        }
    }
}
