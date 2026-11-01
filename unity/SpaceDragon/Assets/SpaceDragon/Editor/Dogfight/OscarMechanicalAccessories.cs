using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using Object = UnityEngine.Object;

namespace SpaceDragon.Dogfight.Editor
{
    /// <summary>
    /// Additive, Editor-only Oscar armor intake. The accessory GLB carries the
    /// SAME rest skeleton but no animation; new armor has at most four influences.
    /// Only new renderer/mesh/material assets survive preparation. Their bones
    /// point at the existing Oscar rig; no second animation clock is introduced.
    /// Call at imported rest, after body weight restoration and before gameplay.
    /// Never applies scale/axis fixes or modifies the body mesh/material assets.
    /// </summary>
    public static class OscarMechanicalAccessories
    {
        const string Recipe = "oscar-surface-accessories-v2-four-weights";
        const float MatrixTolerance = .0001f;
        [Serializable] public sealed class AssetEvidence
        { public string path, sha256; public long bytes; }
        [Serializable] public sealed class RendererEvidence
        {
            public string node, mesh, generatedMesh, rootBone;
            public string[] bones, materials;
            public int vertices, submeshes, positiveInfluences, maximumInfluences;
            public long triangles;
            public float[] modelMatrix;
            public float maximumBindDifference, maximumRebindVertexDifferenceMetres;
        }
        [Serializable] public sealed class Evidence
        {
            public string recipe = Recipe, sourceSha256, unityVersion, generatedRoot;
            public int retainedBones, renderers, materialCount, vertices, positiveInfluences, maximumInfluences;
            public long triangles;
            public float maximumRestDifference;
            public RendererEvidence[] meshes;
            public AssetEvidence[] assets;
            public string scope = "One-to-four-weight accessory rest/hierarchy/bind validation and CPU BakeMesh rebind parity. Original body data is untouched. Authored-clip collision/appearance and player performance require separate review.";
        }
        [Serializable] sealed class Gltf
        { public AnimationDefinition[] animations; public ImageDefinition[] images; }
        [Serializable] sealed class AnimationDefinition { public string name; }
        [Serializable] sealed class ImageDefinition { public string name; }
        sealed class Prepared
        {
            public SkinnedMeshRenderer source, target;
            public Matrix4x4 matrix;
            public RendererEvidence evidence;
        }

        public static Evidence Prepare(GameObject dragon, GameObject importedAccessory,
            string sourceGlbPath, string expectedSha256, string generatedFolder)
        {
            if (dragon == null || importedAccessory == null || EditorUtility.IsPersistent(dragon))
                throw new ArgumentException("Pass the scene dragon and an imported accessory prefab/instance.");
            if (dragon == importedAccessory || importedAccessory.transform.IsChildOf(dragon.transform))
                throw new ArgumentException("The source accessory must be separate from the body hierarchy.");
            byte[] bytes = File.ReadAllBytes(sourceGlbPath);
            if (Hash(bytes) != expectedSha256) throw new InvalidDataException("Accessory GLB identity changed.");
            ValidateGlb(bytes);
            // The animated body retains glTFast's scene wrapper. The accessory
            // importer explicitly uses Always so both wrappers match; each has
            // the same normalized OscarAssetRoot below it. Inherit it only once.
            var accessoryRoot = importedAccessory.transform;
            var bodyRoot = dragon.transform;
            if (MatrixDifference(Matrix4x4.TRS(accessoryRoot.localPosition,accessoryRoot.localRotation,accessoryRoot.localScale),
                Matrix4x4.TRS(bodyRoot.localPosition,bodyRoot.localRotation,bodyRoot.localScale)) > MatrixTolerance)
                throw new InvalidDataException("Accessory and body source-root normalization differ.");
            string folder = generatedFolder.TrimEnd('/') + "/OscarAccessories/" + expectedSha256.Substring(0,16);
            string outputName = "OscarMechanicalAccessories." + expectedSha256.Substring(0,16);
            if (dragon.GetComponentsInChildren<Transform>(true).Any(t => t.name == outputName))
                throw new InvalidDataException("This dragon already has the selected accessory; do not duplicate it.");
            var originals = BoneMap(dragon);
            var originalBindposes = BindposeMap(dragon);
            var output = new GameObject(outputName);
            output.SetActive(false); output.transform.SetParent(dragon.transform, false);
            GameObject staging = null;
            bool succeeded = false;
            try
            {
                staging = Object.Instantiate(importedAccessory);
                staging.name = "OscarAccessory.ValidationOnly";
                staging.transform.SetParent(dragon.transform, false);
                staging.transform.localPosition = Vector3.zero;
                staging.transform.localRotation = Quaternion.identity;
                staging.transform.localScale = Vector3.one;
                staging.SetActive(false);
                if (staging.GetComponentsInChildren<Collider>(true).Length != 0
                    || staging.GetComponentsInChildren<Rigidbody>(true).Length != 0
                    || staging.GetComponentsInChildren<Camera>(true).Length != 0
                    || staging.GetComponentsInChildren<Light>(true).Length != 0)
                    throw new InvalidDataException("Accessory contains gameplay/presentation objects outside its render-only scope.");
                var skins = staging.GetComponentsInChildren<SkinnedMeshRenderer>(true);
                if (skins.Length == 0 || staging.GetComponentsInChildren<Renderer>(true).Length != skins.Length
                    || skins.Select(s => s.name).Distinct().Count() != skins.Length)
                    throw new InvalidDataException("Accessory requires uniquely named skinned renderers only.");
                var existingNames = new HashSet<string>(dragon.GetComponentsInChildren<Transform>(true)
                    .Where(t => !t.IsChildOf(staging.transform)).Select(t=>t.name),StringComparer.Ordinal);
                if (skins.Any(s=>existingNames.Contains(s.name)))
                    throw new InvalidDataException("Accessory renderer names collide with the existing dragon; use an accessory-specific prefix.");
                var addonBones = BoneMap(staging);
                if (!originals.Keys.OrderBy(x=>x,StringComparer.Ordinal).SequenceEqual(addonBones.Keys.OrderBy(x=>x,StringComparer.Ordinal)))
                    throw new InvalidDataException("Accessory joint set differs from the existing Oscar skeleton; retain every original joint.");
                float maximumRest = 0;
                foreach (var pair in addonBones)
                {
                    var original = originals[pair.Key];
                    if (pair.Value.parent?.name != original.parent?.name)
                        throw new InvalidDataException("Accessory changed joint parent: " + pair.Key);
                    float delta = MatrixDifference(Relative(staging.transform,pair.Value), Relative(dragon.transform,original));
                    maximumRest = Mathf.Max(maximumRest,delta);
                    if (delta > MatrixTolerance) throw new InvalidDataException("Accessory rest/scale/axis differs: " + pair.Key + " residual=" + delta);
                }
                var materials = skins.SelectMany(s=>s.sharedMaterials).Distinct().ToArray();
                if (materials.Any(m=>m==null) || materials.Select(m=>m.name).Distinct().Count()!=materials.Length)
                    throw new InvalidDataException("Accessory materials require non-null unique names.");
                var prepared = new List<Prepared>();
                foreach (var skin in skins)
                {
                    var mesh = skin.sharedMesh;
                    if (mesh == null || !mesh.isReadable || mesh.vertexCount == 0 || mesh.blendShapeCount != 0
                        || mesh.bindposes.Length != skin.bones.Length || mesh.subMeshCount != skin.sharedMaterials.Length)
                        throw new InvalidDataException("Accessory mesh is unreadable, incomplete or unexpectedly has morphs: " + skin.name);
                    var weightCounts = RequireBoundedWeights(skin);
                    Matrix4x4 modelMatrix = Relative(staging.transform,skin.transform);
                    float bindDifference = 0;
                    for (int i=0;i<skin.bones.Length;i++)
                    {
                        // Blender's GLB binds are model-space inverse joints,
                        // not inverseJoint*meshNode: glTF skinning excludes the
                        // skinned node transform. Compare the proven original
                        // imported bind directly; retain renderer TRS separately.
                        var expected = originalBindposes[skin.bones[i].name];
                        bindDifference = Mathf.Max(bindDifference,MatrixDifference(mesh.bindposes[i],expected));
                    }
                    if (bindDifference > MatrixTolerance)
                        throw new InvalidDataException("Accessory bindpose does not match exported rest: " + skin.name + " residual=" + bindDifference);
                    // Blender may omit optional skin.skeleton; installed glTFast
                    // then leaves rootBone null. Preserve that valid convention.
                    if (skin.rootBone != null && !originals.ContainsKey(skin.rootBone.name))
                        throw new InvalidDataException("Accessory rootBone must resolve to an original joint: " + skin.name);
                    var targetObject = new GameObject(skin.name);
                    targetObject.transform.SetParent(output.transform,false);
                    ApplyMatrix(targetObject.transform,modelMatrix);
                    var target = targetObject.AddComponent<SkinnedMeshRenderer>();
                    EditorUtility.CopySerialized(skin,target);
                    target.bones = skin.bones.Select(b=>originals[b.name]).ToArray();
                    target.rootBone = skin.rootBone != null ? originals[skin.rootBone.name] : null;
                    target.quality = SkinQuality.Auto; // Only the new armor uses <=4; original full weights remain untouched.
                    target.updateWhenOffscreen = true;
                    target.shadowCastingMode = ShadowCastingMode.On; target.receiveShadows = true;
                    float rebindError = CompareRestVertices(skin,staging.transform,target,dragon.transform);
                    if (rebindError > .0001f)
                        throw new InvalidDataException("Accessory changes shape after bone remapping: " + skin.name + " metres=" + rebindError);
                    long triangles=0;
                    for (int i=0;i<mesh.subMeshCount;i++)
                    {
                        if (mesh.GetTopology(i)!=MeshTopology.Triangles) throw new InvalidDataException("Accessory requires triangle primitives.");
                        triangles += mesh.GetIndexCount(i)/3;
                    }
                    var row = new RendererEvidence {node=skin.name,mesh=mesh.name,rootBone=target.rootBone != null ? target.rootBone.name : "",
                        bones=target.bones.Select(b=>b.name).ToArray(),vertices=mesh.vertexCount,submeshes=mesh.subMeshCount,triangles=triangles,
                        positiveInfluences=weightCounts.positive,maximumInfluences=weightCounts.maximum,
                        modelMatrix=Values(modelMatrix),maximumBindDifference=bindDifference,maximumRebindVertexDifferenceMetres=rebindError};
                    prepared.Add(new Prepared {source=skin,target=target,matrix=modelMatrix,evidence=row});
                }
                var result = new Evidence {sourceSha256=expectedSha256,unityVersion=Application.unityVersion,generatedRoot=folder,
                    retainedBones=originals.Count,renderers=prepared.Count,materialCount=materials.Length,
                    vertices=prepared.Sum(p=>p.evidence.vertices),triangles=prepared.Sum(p=>p.evidence.triangles),maximumRestDifference=maximumRest,
                    positiveInfluences=prepared.Sum(p=>p.evidence.positiveInfluences),maximumInfluences=prepared.Max(p=>p.evidence.maximumInfluences)};
                // Every hierarchy, bounded-weight, bind and rest-vertex check above
                // completes before the first persistent derivative is written.
                string receiptPath=folder+"/preparation.json";
                bool cached=AssetDatabase.IsValidFolder(folder);
                Evidence prior=null;
                if(cached)
                {
                    if(!File.Exists(receiptPath)) throw new InvalidDataException("Incomplete accessory cache; preserve it and choose/review a fresh revision.");
                    prior=JsonUtility.FromJson<Evidence>(File.ReadAllText(receiptPath));
                    if(prior==null || prior.recipe!=Recipe || prior.sourceSha256!=expectedSha256 || prior.unityVersion!=Application.unityVersion
                        || prior.generatedRoot!=folder || prior.assets==null || prior.meshes?.Length!=prepared.Count)
                        throw new InvalidDataException("Accessory derivative cache recipe/identity differs.");
                    foreach(var asset in prior.assets)
                        if(!asset.path.StartsWith(folder+"/",StringComparison.Ordinal) || !File.Exists(asset.path)
                            || new FileInfo(asset.path).Length!=asset.bytes || Hash(File.ReadAllBytes(asset.path))!=asset.sha256)
                            throw new InvalidDataException("Accessory derivative cache changed: "+asset.path);
                }
                else EnsureFolder(folder);
                var assetPaths=new List<string>(); var materialPaths=new Dictionary<Material,string>();
                var replacements=new Dictionary<Material,Material>();
                foreach(var material in materials.OrderBy(m=>m.name,StringComparer.Ordinal))
                {
                    string path=folder+"/material-"+Hash(Encoding.UTF8.GetBytes(material.name)).Substring(0,16)+".mat";
                    var clone=cached ? AssetDatabase.LoadAssetAtPath<Material>(path) : new Material(material);
                    if(clone==null) throw new InvalidDataException("Missing cached accessory material: "+path);
                    if(!cached) AssetDatabase.CreateAsset(clone,path);
                    replacements.Add(material,clone);materialPaths.Add(material,path);assetPaths.Add(path);
                }
                foreach(var item in prepared)
                {
                    string path=folder+"/mesh-"+Hash(Encoding.UTF8.GetBytes(item.source.name)).Substring(0,16)+".asset";
                    var mesh=cached ? AssetDatabase.LoadAssetAtPath<Mesh>(path) : Object.Instantiate(item.source.sharedMesh);
                    if(mesh==null) throw new InvalidDataException("Missing cached accessory mesh: "+path);
                    if(!cached) AssetDatabase.CreateAsset(mesh,path);
                    item.target.sharedMesh=mesh;
                    item.target.sharedMaterials=item.source.sharedMaterials.Select(m=>replacements[m]).ToArray();
                    item.evidence.generatedMesh=path;item.evidence.materials=item.source.sharedMaterials.Select(m=>materialPaths[m]).ToArray();
                    assetPaths.Add(path);
                }
                if(cached && !assetPaths.OrderBy(x=>x,StringComparer.Ordinal).SequenceEqual(prior.assets.Select(a=>a.path).OrderBy(x=>x,StringComparer.Ordinal)))
                    throw new InvalidDataException("Accessory cache asset inventory differs.");
                AssetDatabase.SaveAssets();
                result.meshes=prepared.Select(p=>p.evidence).ToArray();
                result.assets=assetPaths.Select(path=>new AssetEvidence {path=path,bytes=new FileInfo(path).Length,sha256=Hash(File.ReadAllBytes(path))}).ToArray();
                if(!cached) File.WriteAllText(receiptPath,JsonUtility.ToJson(result,true)+"\n",new UTF8Encoding(false));
                if(Hash(File.ReadAllBytes(sourceGlbPath))!=expectedSha256) throw new InvalidDataException("Accessory source changed during preparation.");
                output.SetActive(true); succeeded=true;
                Debug.Log("OSCAR_ACCESSORIES_REBOUND "+JsonUtility.ToJson(result));
                return result;
            }
            finally
            {
                // This destroys only our temporary imported instance/skeleton.
                // The original imported prefab and existing dragon are retained.
                if(staging!=null) Object.DestroyImmediate(staging);
                if(!succeeded) Object.DestroyImmediate(output);
            }
        }

        static Dictionary<string,Transform> BoneMap(GameObject model)
        {
            var bones=model.GetComponentsInChildren<SkinnedMeshRenderer>(true).SelectMany(s=>s.bones).Distinct().ToArray();
            if(bones.Length==0 || bones.Any(b=>b==null || !b.IsChildOf(model.transform)) || bones.Select(b=>b.name).Distinct().Count()!=bones.Length)
                throw new InvalidDataException("Accessory/base bone mapping is missing, ambiguous or outside its own hierarchy.");
            return bones.ToDictionary(b=>b.name,b=>b,StringComparer.Ordinal);
        }
        static Dictionary<string,Matrix4x4> BindposeMap(GameObject model)
        {
            var result=new Dictionary<string,Matrix4x4>(StringComparer.Ordinal);
            foreach(var skin in model.GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                var bindposes=skin.sharedMesh.bindposes;
                if(bindposes.Length!=skin.bones.Length) throw new InvalidDataException("Original body has incomplete binds.");
                for(int i=0;i<bindposes.Length;i++)
                {
                    string name=skin.bones[i].name;
                    if(result.TryGetValue(name,out var prior) && MatrixDifference(prior,bindposes[i])>MatrixTolerance)
                        throw new InvalidDataException("Original body bind convention differs between renderers: "+name);
                    result[name]=bindposes[i];
                }
            }
            return result;
        }
        static (int positive,int maximum) RequireBoundedWeights(SkinnedMeshRenderer skin)
        {
            // Mesh owns these NativeArray views; disposing them would release
            // memory belonging to the immutable imported mesh.
            var counts=skin.sharedMesh.GetBonesPerVertex();var weights=skin.sharedMesh.GetAllBoneWeights();
            if(counts.Length!=skin.sharedMesh.vertexCount)
                throw new InvalidDataException("Accessory weight vertex count differs: "+skin.name);
            int offset=0,total=0,maximum=0;
            for(int vertex=0;vertex<counts.Length;vertex++)
            {
                if(counts[vertex]<1 || counts[vertex]>4 || offset+counts[vertex]>weights.Length)
                    throw new InvalidDataException("Accessory must have1..4 stored influences: "+skin.name);
                float sum=0;int positive=0;var seen=new HashSet<int>();
                for(int i=0;i<counts[vertex];i++)
                {
                    var weight=weights[offset++];
                    if(weight.boneIndex<0 || weight.boneIndex>=skin.bones.Length || float.IsNaN(weight.weight)
                        || float.IsInfinity(weight.weight) || weight.weight<0 || weight.weight>1)
                        throw new InvalidDataException("Accessory has an invalid weight: "+skin.name);
                    sum+=weight.weight;
                    if(weight.weight>0)
                    {
                        if(!seen.Add(weight.boneIndex))throw new InvalidDataException("Duplicate positive accessory joint: "+skin.name);
                        positive++;
                    }
                }
                // Unity's native weight stream may quantize to16-bit; this
                // bound exceeds at most four half-quantum errors, not a trim.
                if(positive==0 || Mathf.Abs(sum-1)>.0001f)
                    throw new InvalidDataException("Accessory weights are not normalized: "+skin.name+" vertex "+vertex);
                total+=positive;maximum=Mathf.Max(maximum,positive);
            }
            if(offset!=weights.Length)throw new InvalidDataException("Accessory has unused weight data: "+skin.name);
            return (total,maximum);
        }
        static float CompareRestVertices(SkinnedMeshRenderer a,Transform ar,SkinnedMeshRenderer b,Transform br)
        {
            var am=new Mesh();var bm=new Mesh();
            try
            {
                // useScale=true compensates renderer scale in the local result;
                // the model-relative matrix below applies it exactly once.
                a.BakeMesh(am,true);b.BakeMesh(bm,true);
                var av=am.vertices;var bv=bm.vertices;
                if(av.Length!=bv.Length || av.Length==0) throw new InvalidDataException("Accessory bake is empty or changes vertex count.");
                Matrix4x4 at=Relative(ar,a.transform),bt=Relative(br,b.transform);float error=0;
                for(int i=0;i<av.Length;i++) error=Mathf.Max(error,Vector3.Distance(at.MultiplyPoint3x4(av[i]),bt.MultiplyPoint3x4(bv[i])));
                return error;
            }
            finally {Object.DestroyImmediate(am);Object.DestroyImmediate(bm);}
        }
        static Matrix4x4 Relative(Transform root,Transform node)=>root.worldToLocalMatrix*node.localToWorldMatrix;
        static float MatrixDifference(Matrix4x4 a,Matrix4x4 b)
        {
            float difference=0;
            for(int i=0;i<16;i++)
            {
                if(float.IsNaN(a[i]) || float.IsInfinity(a[i]) || float.IsNaN(b[i]) || float.IsInfinity(b[i]))
                    throw new InvalidDataException("Non-finite accessory transform.");
                difference=Mathf.Max(difference,Mathf.Abs(a[i]-b[i]));
            }
            return difference;
        }
        static void ApplyMatrix(Transform target,Matrix4x4 matrix)
        {
            Vector3 x=matrix.GetColumn(0),y=matrix.GetColumn(1),z=matrix.GetColumn(2);
            Vector3 scale=new Vector3(x.magnitude,y.magnitude,z.magnitude);
            if(scale.x<.000001f || scale.y<.000001f || scale.z<.000001f) throw new InvalidDataException("Accessory renderer has zero scale.");
            if(Vector3.Dot(Vector3.Cross(x,y),z)<0) scale.x=-scale.x;
            Quaternion rotation=Quaternion.LookRotation(z/scale.z,y/scale.y);
            Vector3 position=matrix.GetColumn(3);
            if(MatrixDifference(matrix,Matrix4x4.TRS(position,rotation,scale))>MatrixTolerance)
                throw new InvalidDataException("Accessory render transform contains shear; preserve a compatible authored mesh transform.");
            target.localPosition=position;target.localRotation=rotation;target.localScale=scale;
        }
        static float[] Values(Matrix4x4 matrix) {var result=new float[16];for(int i=0;i<16;i++)result[i]=matrix[i];return result;}
        static void ValidateGlb(byte[] bytes)
        {
            if(bytes.Length<28 || BitConverter.ToUInt32(bytes,0)!=0x46546c67 || BitConverter.ToUInt32(bytes,4)!=2
                || BitConverter.ToUInt32(bytes,8)!=bytes.Length || BitConverter.ToUInt32(bytes,16)!=0x4e4f534a)
                throw new InvalidDataException("Invalid accessory GLB header.");
            uint length=BitConverter.ToUInt32(bytes,12);
            if(length>bytes.Length-20) throw new InvalidDataException("Accessory JSON exceeds GLB.");
            var data=JsonUtility.FromJson<Gltf>(Encoding.UTF8.GetString(bytes,20,(int)length));
            if(data==null || data.animations?.Length>0 || data.images?.Length>0)
                throw new InvalidDataException("This accessory recipe accepts constant glTF materials and no animation/images; preserve body maps in the original GLB.");
        }
        static string Hash(byte[] bytes) {using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-","").ToLowerInvariant();}
        static void EnsureFolder(string path)
        {
            if(!path.StartsWith("Assets/",StringComparison.Ordinal) || path.Split('/').Any(p=>p==".." || p.Length==0))
                throw new InvalidDataException("Accessory derivatives must remain under an explicit Assets folder.");
            if(AssetDatabase.IsValidFolder(path))return;
            string parent=path.Substring(0,path.LastIndexOf('/'));
            if(parent!="Assets")EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent,path.Substring(path.LastIndexOf('/')+1));
        }
    }
}
