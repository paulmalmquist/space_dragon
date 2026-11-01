using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using Unity.Collections;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using Object = UnityEngine.Object;

namespace SpaceDragon.Dogfight.Editor
{
    /// <summary>Editor-only repair for glTFast's four-influence importer. The
    /// immutable GLB keeps every authored influence; measured binary sidecars
    /// restore them to separate Mesh assets only after mapping and pose checks.
    /// No sidecar or restoration component is included in the player.</summary>
    public static class OscarFullWeightMeshes
    {
        public const string MetadataPath = DogfightProject.Root + "/Editor/oscar-fullweights-v001.json";
        [Serializable] public sealed class Range { public int byteOffset, count, componentType; }
        [Serializable] public sealed class Binary { public string file, sha256; public long bytes; }
        [Serializable] public sealed class MeshRecord
        {
            public string nodeName, meshName;
            public int primitiveIndex, vertexCount, texcoordSet;
            public Range positions, normals, texcoords, indices, bonesPerVertex, jointIndices, weights;
        }
        [Serializable] public sealed class PoseMesh { public string nodeName; public int[] vertexIndices; public float[] positions; }
        [Serializable] public sealed class PoseSample { public string clip, space; public float timeSeconds; public PoseMesh[] meshes; }
        [Serializable] public sealed class Manifest
        {
            public int schemaVersion; public string sourceSha256;
            public Binary binary; public string[] jointNames; public float[] inverseBindMatrices;
            public MeshRecord[] meshes; public PoseSample[] poseSamples;
        }
        [Serializable] public sealed class MeshEvidence
        {
            public string nodeName, importedMesh, generatedMesh;
            public int vertices, influences, maximumInfluences;
            public int positiveReadbackInfluences, zeroReadbackInfluences;
            public float maximumWeightReadbackDifference;
        }
        [Serializable] public sealed class Evidence
        {
            public string metadataSha256, binarySha256, sourceSha256;
            public MeshEvidence[] meshes;
            public int sampledPoses, sampledVertices;
            public float maximumPoseDifferenceMetres;
            public string scope = "Editor full-weight mapping, Mesh readback and sampled BakeMesh parity; player GPU execution/performance remain separate checks.";
        }
        [Serializable] sealed class WeightReadbackDiagnostic
        {
            public string mesh, sourceWeightFormat, readbackWeightFormat;
            public int vertex, bone, flattenedIndex;
            public float maximumDifference, allowedDifference, expectedWeight, actualWeight, expectedVertexSum, actualVertexSum;
            public WeightSample[] expectedVertex, actualVertex;
        }
        [Serializable] sealed class WeightSample {public int bone;public float weight;}
        [Serializable] sealed class PoseBoneDiagnostic
        {
            public string name,parent;public int index;public float weight;
            public Vector3 localPosition,localScale;public Quaternion localRotation;
            public float[] worldMatrix,bindPose;
        }
        [Serializable] sealed class PoseDiagnostic
        {
            public string mesh,node,clip,rootBone;public float seconds,errorMetres;
            public int vertex,clipBindingCount;public string[] firstClipBindings;
            public Vector3 expected,bakedLocal,actual,rendererLossyScale,modelLossyScale,meshVertex,cpuSkinModel,bakedWithoutCompensationLocal,bakedWithoutCompensationModel;
            public float cpuSkinErrorMetres,bakedWithoutCompensationErrorMetres;
            public bool primaryBakeUsesScaleCompensation=true;
            public float[] rendererWorld,modelWorld,toModel,rootBoneWorld;
            public PoseBoneDiagnostic[] influences;
        }
        struct Rest
        {
            public Transform node; public Vector3 position, scale; public Quaternion rotation;
            public void Apply() { node.localPosition=position; node.localRotation=rotation; node.localScale=scale; }
        }
        sealed class Prepared
        {
            public SkinnedMeshRenderer renderer; public Mesh original, clone;
            public SkinQuality quality; public MeshEvidence evidence;
            public byte[] counts; public BoneWeight1[] weights; public MeshRecord row;
        }

        public static Evidence Restore(GameObject model, AnimationClip[] clips, string sourceSha256, string generatedFolder)
        {
            byte[] metadata=File.ReadAllBytes(MetadataPath);
            var manifest=JsonUtility.FromJson<Manifest>(System.Text.Encoding.UTF8.GetString(metadata));
            if (manifest?.schemaVersion!=1 || manifest.sourceSha256!=sourceSha256 || manifest.binary==null
                || manifest.binary.file!="oscar-fullweights-v001.bytes" || manifest.binary.bytes<=0 || manifest.binary.bytes>268435456)
                throw new InvalidDataException("Invalid Oscar full-weight sidecar identity.");
            byte[] binary=File.ReadAllBytes(Path.Combine(Path.GetDirectoryName(MetadataPath),manifest.binary.file));
            if (binary.LongLength!=manifest.binary.bytes || Hash(binary)!=manifest.binary.sha256)
                throw new InvalidDataException("Oscar full-weight binary changed after intake.");
            ValidateManifest(manifest);
            var nodes=model.GetComponentsInChildren<Transform>(true);
            var renderers=model.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            if (renderers.Length!=manifest.meshes.Length) throw new InvalidDataException("Oscar renderer/sidecar count differs.");
            var prepared=new List<Prepared>();
            bool succeeded=false;
            try
            {
                // All mappings and in-memory readbacks pass before any asset write.
                foreach (var row in manifest.meshes)
                {
                    var matches=nodes.Where(node=>node.name==row.nodeName).ToArray();
                    if(matches.Length!=1) throw new InvalidDataException("Expected one Oscar render node: "+row.nodeName);
                    var skin=matches[0].GetComponent<SkinnedMeshRenderer>();
                    if(skin==null || prepared.Any(item=>item.renderer==skin))
                        throw new InvalidDataException("Oscar primitive is not on its measured node: "+row.nodeName);
                    ValidateMapping(skin,row,manifest,binary);
                    DecodeWeights(row,manifest.jointNames.Length,binary,out var counts,out var weights);
                    var clone=CreateWeightedClone(skin.sharedMesh,counts,weights,out float difference);
                    int positive=0,zero=0;var readback=clone.GetAllBoneWeights();
                    for(int i=0;i<readback.Length;i++) {if(readback[i].weight>0) positive++;else if(readback[i].weight==0) zero++;}
                    prepared.Add(new Prepared {renderer=skin,original=skin.sharedMesh,quality=skin.quality,clone=clone,
                        row=row,counts=counts,weights=weights,evidence=new MeshEvidence {nodeName=row.nodeName,importedMesh=skin.sharedMesh.name,
                            vertices=row.vertexCount,influences=weights.Length,maximumInfluences=counts.Max(value=>(int)value),
                            positiveReadbackInfluences=positive,zeroReadbackInfluences=zero,maximumWeightReadbackDifference=difference}});
                }
                foreach(var item in prepared) { item.renderer.sharedMesh=item.clone; item.renderer.quality=SkinQuality.Auto; }
                var result=new Evidence {metadataSha256=Hash(metadata),binarySha256=Hash(binary),sourceSha256=sourceSha256};
                result.meshes=prepared.Select(item=>item.evidence).ToArray();
                Debug.Log("OSCAR_FULL_WEIGHT_READBACK_PASS "+JsonUtility.ToJson(result));
                ValidatePoses(model,clips,manifest,prepared,result);
                string folder=generatedFolder+"/OscarFullWeights/"+Hash(metadata).Substring(0,16);
                EnsureFolder(folder);
                for(int i=0;i<prepared.Count;i++)
                {
                    var item=prepared[i]; string assetPath=folder+"/mesh-"+i.ToString("D3")+".asset";
                    var existing=AssetDatabase.LoadAssetAtPath<Mesh>(assetPath);
                    if(existing!=null)
                    {
                        // A previous generated derivative is reusable only if its
                        // complete mapping and all weights still match this input.
                        var original=item.renderer.sharedMesh; item.renderer.sharedMesh=existing;
                        try { ValidateMapping(item.renderer,item.row,manifest,binary); VerifyReadback(existing,item.counts,item.weights); }
                        catch { item.renderer.sharedMesh=original; throw; }
                        Object.DestroyImmediate(item.clone); item.clone=null;
                    }
                    else
                    {
                        item.clone.name="Oscar.fullweights."+item.row.meshName;
                        AssetDatabase.CreateAsset(item.clone,assetPath);
                        item.renderer.sharedMesh=item.clone; item.clone=null;
                    }
                    item.evidence.generatedMesh=assetPath;
                    PrefabUtility.RecordPrefabInstancePropertyModifications(item.renderer);
                }
                result.meshes=prepared.Select(item=>item.evidence).ToArray();
                succeeded=true;
                return result;
            }
            finally
            {
                foreach(var item in prepared)
                {
                    if(!succeeded) { item.renderer.sharedMesh=item.original; item.renderer.quality=item.quality; }
                    if(item.clone!=null) Object.DestroyImmediate(item.clone);
                }
            }
        }

        static void ValidateManifest(Manifest manifest)
        {
            if(!BitConverter.IsLittleEndian || manifest.jointNames==null || manifest.jointNames.Length==0 || manifest.jointNames.Length>65535
                || manifest.jointNames.Any(string.IsNullOrEmpty) || manifest.jointNames.Distinct().Count()!=manifest.jointNames.Length
                || manifest.inverseBindMatrices?.Length!=manifest.jointNames.Length*16 || manifest.inverseBindMatrices.Any(value=>!Finite(value))
                || manifest.meshes==null || manifest.meshes.Length==0 || manifest.meshes.Length>1024
                || manifest.meshes.Any(row=>row==null || string.IsNullOrEmpty(row.nodeName) || string.IsNullOrEmpty(row.meshName))
                || manifest.meshes.Select(row=>row.nodeName).Distinct().Count()!=manifest.meshes.Length)
                throw new InvalidDataException("Invalid Oscar full-weight layout.");
        }
        static void ValidateMapping(SkinnedMeshRenderer skin,MeshRecord row,Manifest manifest,byte[] data)
        {
            var mesh=skin.sharedMesh;
            if(mesh==null || !mesh.isReadable || row.primitiveIndex!=0 || row.texcoordSet!=0 || row.vertexCount<=0 || row.vertexCount>2000000
                || mesh.vertexCount!=row.vertexCount || mesh.subMeshCount!=1 || skin.bones.Length!=manifest.jointNames.Length
                || !skin.bones.Select(bone=>bone!=null?bone.name:"").SequenceEqual(manifest.jointNames))
                throw new InvalidDataException("Oscar mesh/bone mapping differs: "+row.nodeName);
            var sourcePositions=Floats(data,row.positions,checked(row.vertexCount*3));
            var sourceNormals=Floats(data,row.normals,checked(row.vertexCount*3));
            var sourceUvs=Floats(data,row.texcoords,checked(row.vertexCount*2));
            var vertices=mesh.vertices; var normals=mesh.normals; var uv=mesh.uv;
            if(normals.Length!=row.vertexCount || uv.Length!=row.vertexCount) throw new InvalidDataException("Oscar imported attributes missing.");
            for(int i=0;i<row.vertexCount;i++)
                if(Vector3.Distance(vertices[i],new Vector3(-sourcePositions[i*3],sourcePositions[i*3+1],sourcePositions[i*3+2]))>.00001f
                    || Vector3.Distance(normals[i],new Vector3(-sourceNormals[i*3],sourceNormals[i*3+1],sourceNormals[i*3+2]))>.00002f
                    || Vector2.Distance(uv[i],new Vector2(sourceUvs[i*2],1-sourceUvs[i*2+1]))>.00002f)
                    throw new InvalidDataException("Oscar imported vertex order/attribute differs: "+row.nodeName+" vertex "+i);
            var triangles=mesh.GetIndices(0);
            RequireRange(data,row.indices,4,5125,triangles.Length);
            if(triangles.Length%3!=0) throw new InvalidDataException("Oscar needs indexed triangles.");
            for(int i=0;i<triangles.Length;i++)
            {
                int source=i-i%3+(i%3==0?0:3-i%3);
                if((uint)triangles[i]!=BitConverter.ToUInt32(data,row.indices.byteOffset+source*4))
                    throw new InvalidDataException("Oscar imported triangle/vertex ordering differs: "+row.nodeName);
            }
            var binds=mesh.bindposes;
            if(binds.Length!=manifest.jointNames.Length) throw new InvalidDataException("Oscar bind count differs.");
            var mirror=Matrix4x4.Scale(new Vector3(-1,1,1));
            for(int bone=0;bone<binds.Length;bone++)
            {
                var source=new Matrix4x4(); for(int i=0;i<16;i++) source[i]=manifest.inverseBindMatrices[bone*16+i];
                var expected=mirror*source*mirror;
                for(int i=0;i<16;i++) if(!Finite(binds[bone][i]) || Mathf.Abs(binds[bone][i]-expected[i])>.00001f)
                    throw new InvalidDataException("Oscar inverse bind differs: "+manifest.jointNames[bone]);
            }
        }
        static void DecodeWeights(MeshRecord row,int boneCount,byte[] data,out byte[] counts,out BoneWeight1[] weights)
        {
            RequireRange(data,row.bonesPerVertex,1,5121,row.vertexCount);
            counts=new byte[row.vertexCount]; Buffer.BlockCopy(data,row.bonesPerVertex.byteOffset,counts,0,counts.Length);
            int total=counts.Sum(value=>(int)value);
            RequireRange(data,row.jointIndices,2,5123,total); var values=Floats(data,row.weights,total);
            weights=new BoneWeight1[total]; int cursor=0;
            foreach(byte count in counts)
            {
                if(count==0) throw new InvalidDataException("Oscar has an unweighted vertex.");
                float sum=0,previous=float.PositiveInfinity; var unique=new HashSet<int>();
                for(int j=0;j<count;j++,cursor++)
                {
                    int bone=BitConverter.ToUInt16(data,row.jointIndices.byteOffset+cursor*2); float value=values[cursor];
                    if(bone>=boneCount || !unique.Add(bone) || value<=0 || value>1 || value>previous+1e-7f)
                        throw new InvalidDataException("Oscar full weights must be unique, positive and descending.");
                    weights[cursor]=new BoneWeight1 {boneIndex=bone,weight=value}; sum+=value; previous=value;
                }
                if(Mathf.Abs(sum-1)>.0002f) throw new InvalidDataException("Oscar full weights do not sum to one.");
            }
        }
        // Public for an isolated synthetic regression; never mutates source.
        public static Mesh CreateWeightedClone(Mesh source,byte[] counts,BoneWeight1[] weights,out float difference)
        {
            if(source==null || counts==null || weights==null || source.vertexCount!=counts.Length
                || counts.Sum(value=>(int)value)!=weights.Length || counts.Any(value=>value==0))
                throw new InvalidDataException("Invalid full-weight clone input.");
            // glTFast interleaves its four Float32 weights with the old joint
            // stream. Unity 6000.6 reports unsupported Float32 -> UNorm16
            // conversion if SetBoneWeights rewrites that copied stream. Copy
            // geometry into a new Mesh without any old skin stream instead.
            var clone=CopyGeometry(source);
            try
            {
                using(var nativeCounts=new NativeArray<byte>(counts,Allocator.Temp))
                using(var nativeWeights=new NativeArray<BoneWeight1>(weights,Allocator.Temp)) clone.SetBoneWeights(nativeCounts,nativeWeights);
                difference=VerifyReadback(clone,counts,weights,source.HasVertexAttribute(VertexAttribute.BlendWeight)
                    ? source.GetVertexAttributeFormat(VertexAttribute.BlendWeight).ToString() : "absent"); return clone;
            }
            catch { Object.DestroyImmediate(clone); throw; }
        }
        static Mesh CopyGeometry(Mesh source)
        {
            var mesh=new Mesh {name=source.name,indexFormat=source.indexFormat};
            try
            {
                mesh.vertices=source.vertices;
                if(source.HasVertexAttribute(VertexAttribute.Normal)) mesh.normals=source.normals;
                if(source.HasVertexAttribute(VertexAttribute.Tangent)) mesh.tangents=source.tangents;
                if(source.HasVertexAttribute(VertexAttribute.Color)) mesh.colors=source.colors;
                for(int channel=0;channel<8;channel++)
                {
                    var attribute=(VertexAttribute)((int)VertexAttribute.TexCoord0+channel);
                    if(!source.HasVertexAttribute(attribute)) continue;
                    int dimension=source.GetVertexAttributeDimension(attribute);
                    if(dimension==2) {var uv=new List<Vector2>();source.GetUVs(channel,uv);mesh.SetUVs(channel,uv);}
                    else if(dimension==3) {var uv=new List<Vector3>();source.GetUVs(channel,uv);mesh.SetUVs(channel,uv);}
                    else if(dimension==4) {var uv=new List<Vector4>();source.GetUVs(channel,uv);mesh.SetUVs(channel,uv);}
                    else throw new InvalidDataException("Unsupported source UV dimension; do not silently discard it.");
                }
                mesh.subMeshCount=source.subMeshCount;
                for(int submesh=0;submesh<source.subMeshCount;submesh++) mesh.SetIndices(source.GetIndices(submesh),source.GetTopology(submesh),submesh,false);
                mesh.bindposes=source.bindposes; mesh.bounds=source.bounds;
                if(source.blendShapeCount>0)
                {
                    var positions=new Vector3[source.vertexCount];var normals=new Vector3[source.vertexCount];var tangents=new Vector3[source.vertexCount];
                    for(int shape=0;shape<source.blendShapeCount;shape++) for(int frame=0;frame<source.GetBlendShapeFrameCount(shape);frame++)
                    {
                        source.GetBlendShapeFrameVertices(shape,frame,positions,normals,tangents);
                        mesh.AddBlendShapeFrame(source.GetBlendShapeName(shape),source.GetBlendShapeFrameWeight(shape,frame),positions,normals,tangents);
                    }
                }
                return mesh;
            }
            catch {Object.DestroyImmediate(mesh);throw;}
        }
        static float VerifyReadback(Mesh mesh,byte[] counts,BoneWeight1[] weights,string sourceWeightFormat="saved derivative")
        {
            // These NativeArrays are views owned by Mesh; do not dispose them.
            var actualCounts=mesh.GetBonesPerVertex(); var actual=mesh.GetAllBoneWeights();
            if(actualCounts.Length!=counts.Length || actual.Length!=weights.Length) throw new InvalidDataException("Unity dropped full skin influences.");
            var format=mesh.GetVertexAttributeFormat(VertexAttribute.BlendWeight);
            if(format!=VertexAttributeFormat.UNorm16 && format!=VertexAttributeFormat.Float32)
                throw new InvalidDataException("Unreviewed Unity weight storage precision: "+format);
            // Unity 6000.6 SetBoneWeights stores UNorm16 weights; measured output
            // rounds N-1 weights and assigns the normalization remainder to a
            // component chosen by its layout (observed first for four weights,
            // last for eight). Each rounded component contributes <= half a
            // 16-bit step; any component may accumulate (N-1) half-steps.
            // Add one float32 epsilon per operation plus the input sum residual.
            // Counts/joints stay exact, and the separate 1 mm pose gate remains.
            // https://docs.unity.com/en-us/engine/6000.6/script-reference/unityengine/mesh/setboneweights
            const double floatEpsilon=1.1920928955078125e-7;
            double halfStep=format==VertexAttributeFormat.UNorm16 ? .5/65535 : 0;
            int cursor=0; float maximum=0;
            for(int vertex=0;vertex<counts.Length;vertex++)
            {
                if(actualCounts[vertex]!=counts[vertex]) throw new InvalidDataException("Unity changed influences per vertex.");
                int start=cursor,count=counts[vertex];double sourceSum=0,actualSum=0;
                var expected=new Dictionary<int,float>();
                for(int i=0;i<count;i++) {expected.Add(weights[start+i].boneIndex,weights[start+i].weight);sourceSum+=weights[start+i].weight;actualSum+=actual[start+i].weight;}
                double sumResidual=Math.Abs(sourceSum-1);
                if(Math.Abs(actualSum-1)>count*floatEpsilon)
                    throw new InvalidDataException("Unity skin normalization changed: "+mesh.name+" vertex "+vertex+" sourceSum="+sourceSum.ToString("R")+" actualSum="+actualSum.ToString("R"));
                for(int i=0;i<count;i++,cursor++)
                {
                    var value=actual[cursor];
                    if(!expected.TryGetValue(value.boneIndex,out float weight) || !Finite(value.weight) || value.weight<0)
                        throw new InvalidDataException("Unity changed a skin joint index or produced an invalid weight.");
                    float difference=Mathf.Abs(value.weight-weight);
                    maximum=Mathf.Max(maximum,difference);
                    double allowed=(count-1)*(halfStep+floatEpsilon)+sumResidual+floatEpsilon;
                    if(difference>allowed)
                    {
                        var expectedVertex=new BoneWeight1[count];var actualVertex=new BoneWeight1[count];
                        Array.Copy(weights,start,expectedVertex,0,count);for(int j=0;j<count;j++) actualVertex[j]=actual[start+j];
                        var details=new WeightReadbackDiagnostic {mesh=mesh.name,sourceWeightFormat=sourceWeightFormat,readbackWeightFormat=format.ToString(),
                            vertex=vertex,bone=value.boneIndex,flattenedIndex=cursor,maximumDifference=difference,allowedDifference=(float)allowed,
                            expectedWeight=weight,actualWeight=value.weight,
                            expectedVertex=expectedVertex.Select(item=>new WeightSample {bone=item.boneIndex,weight=item.weight}).ToArray(),
                            actualVertex=actualVertex.Select(item=>new WeightSample {bone=item.boneIndex,weight=item.weight}).ToArray(),
                            expectedVertexSum=(float)sourceSum,actualVertexSum=(float)actualSum};
                        throw new InvalidDataException("Unity skin weight readback exceeded per-vertex normalized precision: "+JsonUtility.ToJson(details));
                    }
                    expected.Remove(value.boneIndex);
                }
            }
            return maximum;
        }
        static void ValidatePoses(GameObject model,AnimationClip[] clips,Manifest manifest,List<Prepared> prepared,Evidence evidence)
        {
            if(manifest.poseSamples==null || manifest.poseSamples.Length<4 || manifest.poseSamples.Length>32)
                throw new InvalidDataException("Oscar needs measured full-weight animation pose samples.");
            var rest=model.GetComponentsInChildren<Transform>(true).Select(node=>new Rest {node=node,position=node.localPosition,rotation=node.localRotation,scale=node.localScale}).ToArray();
            try
            {
                foreach(var sample in manifest.poseSamples)
                {
                    if(sample.space!="gltf-scene-world" || !Finite(sample.timeSeconds) || sample.meshes?.Length!=prepared.Count)
                        throw new InvalidDataException("Invalid Oscar reference pose layout.");
                    var clip=clips.SingleOrDefault(value=>value.name==sample.clip);
                    if(clip==null || sample.timeSeconds<0 || sample.timeSeconds>clip.length+.002f) throw new InvalidDataException("Invalid Oscar reference clip time.");
                    foreach(var item in rest) item.Apply();
                    clip.SampleAnimation(model,sample.timeSeconds);
                    foreach(var item in prepared)
                    {
                        var expected=sample.meshes.SingleOrDefault(value=>value.nodeName==item.row.nodeName);
                        if(expected?.vertexIndices==null || expected.vertexIndices.Length==0 || expected.positions?.Length!=expected.vertexIndices.Length*3)
                            throw new InvalidDataException("Missing Oscar pose sample mesh: "+item.row.nodeName);
                        var baked=new Mesh();
                        try
                        {
                            // Unity 6000.6 true compensates renderer scale; these
                            // mesh-local positions can then use localToWorld once.
                            item.renderer.BakeMesh(baked,true); var vertices=baked.vertices;
                            var toModel=model.transform.worldToLocalMatrix*item.renderer.transform.localToWorldMatrix;
                            for(int i=0;i<expected.vertexIndices.Length;i++)
                            {
                                int index=expected.vertexIndices[i];
                                if(index<0 || index>=vertices.Length) throw new InvalidDataException("Oscar pose sample vertex out of range.");
                                var reference=new Vector3(-expected.positions[i*3],expected.positions[i*3+1],expected.positions[i*3+2]);
                                float error=Vector3.Distance(toModel.MultiplyPoint3x4(vertices[index]),reference);
                                if(!Finite(error) || error>.001f)
                                    throw new InvalidDataException("Oscar full-weight pose mismatch: "+JsonUtility.ToJson(PoseDetails(model,clip,sample.timeSeconds,item,index,vertices[index],reference,toModel,error)));
                                evidence.maximumPoseDifferenceMetres=Mathf.Max(evidence.maximumPoseDifferenceMetres,error); evidence.sampledVertices++;
                            }
                        }
                        finally { Object.DestroyImmediate(baked); }
                    }
                    evidence.sampledPoses++;
                }
            }
            finally { foreach(var item in rest) item.Apply(); }
        }
        static PoseDiagnostic PoseDetails(GameObject model,AnimationClip clip,float seconds,Prepared item,int vertex,Vector3 baked,Vector3 reference,Matrix4x4 toModel,float error)
        {
            var skin=item.renderer;var mesh=skin.sharedMesh;var p=mesh.vertices[vertex];
            int start=0;for(int i=0;i<vertex;i++) start+=item.counts[i];
            var weights=mesh.GetAllBoneWeights();var bones=skin.bones;var binds=mesh.bindposes;
            var influences=new PoseBoneDiagnostic[item.counts[vertex]];Vector3 cpuWorld=Vector3.zero;
            for(int i=0;i<influences.Length;i++)
            {
                var w=weights[start+i];var bone=bones[w.boneIndex];
                cpuWorld+=(bone.localToWorldMatrix*binds[w.boneIndex]).MultiplyPoint3x4(p)*w.weight;
                influences[i]=new PoseBoneDiagnostic {index=w.boneIndex,weight=w.weight,name=bone.name,parent=bone.parent!=null?bone.parent.name:"",
                    localPosition=bone.localPosition,localRotation=bone.localRotation,localScale=bone.localScale,
                    worldMatrix=MatrixValues(bone.localToWorldMatrix),bindPose=MatrixValues(binds[w.boneIndex])};
            }
            var cpu=model.transform.InverseTransformPoint(cpuWorld);var bindings=AnimationUtility.GetCurveBindings(clip);
            var details=new PoseDiagnostic {mesh=mesh.name,node=item.row.nodeName,clip=clip.name,seconds=seconds,vertex=vertex,errorMetres=error,
                expected=reference,bakedLocal=baked,actual=toModel.MultiplyPoint3x4(baked),meshVertex=p,cpuSkinModel=cpu,cpuSkinErrorMetres=Vector3.Distance(cpu,reference),
                rendererLossyScale=skin.transform.lossyScale,modelLossyScale=model.transform.lossyScale,rendererWorld=MatrixValues(skin.transform.localToWorldMatrix),
                modelWorld=MatrixValues(model.transform.localToWorldMatrix),toModel=MatrixValues(toModel),rootBone=skin.rootBone!=null?skin.rootBone.name:"",
                rootBoneWorld=skin.rootBone!=null?MatrixValues(skin.rootBone.localToWorldMatrix):null,influences=influences,
                clipBindingCount=bindings.Length,firstClipBindings=bindings.Take(12).Select(binding=>binding.path+" : "+binding.propertyName).ToArray()};
            var scaled=new Mesh();
            try {skin.BakeMesh(scaled,false);details.bakedWithoutCompensationLocal=scaled.vertices[vertex];details.bakedWithoutCompensationModel=toModel.MultiplyPoint3x4(details.bakedWithoutCompensationLocal);
                details.bakedWithoutCompensationErrorMetres=Vector3.Distance(details.bakedWithoutCompensationModel,reference);}
            finally {Object.DestroyImmediate(scaled);}
            return details;
        }
        static float[] MatrixValues(Matrix4x4 matrix) {var result=new float[16];for(int i=0;i<16;i++) result[i]=matrix[i];return result;}
        static float[] Floats(byte[] data,Range range,int count)
        {
            RequireRange(data,range,4,5126,count); var result=new float[count];
            Buffer.BlockCopy(data,range.byteOffset,result,0,checked(count*4));
            if(result.Any(value=>!Finite(value))) throw new InvalidDataException("Nonfinite Oscar sidecar data."); return result;
        }
        static void RequireRange(byte[] data,Range range,int width,int type,int count)
        {
            if(range==null || range.byteOffset<0 || range.count!=count || count<=0 || range.componentType!=type
                || range.byteOffset%width!=0 || (long)range.byteOffset+(long)count*width>data.LongLength)
                throw new InvalidDataException("Oscar sidecar range/type exceeds binary.");
        }
        static bool Finite(float value) => !float.IsNaN(value)&&!float.IsInfinity(value);
        static string Hash(byte[] data) { using(var sha=SHA256.Create()) return string.Concat(sha.ComputeHash(data).Select(value=>value.ToString("x2"))); }
        static void EnsureFolder(string path)
        {
            if(AssetDatabase.IsValidFolder(path)) return;
            string parent=Path.GetDirectoryName(path).Replace('\\','/'); EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent,Path.GetFileName(path));
        }
    }
}
