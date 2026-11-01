using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using UnityEditor;
using UnityEngine;
using UnityEngine.Experimental.Rendering;
using Object = UnityEngine.Object;

namespace SpaceDragon.Dogfight.Editor
{
    /// <summary>Optional Oscar-only BC7 derivative. Reads embedded PNG bytes;
    /// never edits the source GLB, imported textures, or imported materials.
    /// No GPU readback, shader changes, texture resizing or runtime compression.</summary>
    public static class OscarCompressedTextures
    {
        const string Recipe="oscar-bc7-v1-best-raw-png-same-mips";
        public static string SelectedMode
        {
            get
            {
                var value=Environment.GetEnvironmentVariable("SPACE_DRAGON_DOGFIGHT_TEXTURES");
                // The measured uncompressed player exceeded its512MiB heap while
                // deserializing textures. Keep that build and explicit source mode.
                if(string.IsNullOrEmpty(value)) return "bc7";
                if(value!="source" && value!="bc7") throw new InvalidDataException("SPACE_DRAGON_DOGFIGHT_TEXTURES must be source or bc7.");
                return value;
            }
        }
        [Serializable] sealed class Gltf
        {
            public BufferView[] bufferViews; public Image[] images;public TextureDefinition[] textures;public MaterialDefinition[] materials;
        }
        [Serializable] sealed class BufferView {public int buffer,byteOffset,byteLength;}
        [Serializable] sealed class Image {public int bufferView=-1;public string name,mimeType,uri;}
        [Serializable] sealed class TextureDefinition {public int source=-1;}
        [Serializable] sealed class TextureInfo {public int index=-1;}
        [Serializable] sealed class Pbr {public TextureInfo baseColorTexture,metallicRoughnessTexture;}
        [Serializable] sealed class MaterialDefinition
        {
            public string name; public Pbr pbrMetallicRoughness;
            public TextureInfo normalTexture,occlusionTexture,emissiveTexture;
        }
        // Match the installed glTFast parser's absence-aware second-pass pattern:
        // an object read into a string is empty when present, null when absent.
        // JsonUtility can otherwise invent non-null default nested objects.
        [Serializable] sealed class Presence {public MaterialPresence[] materials;}
        [Serializable] sealed class MaterialPresence
        {public string name,normalTexture,occlusionTexture,emissiveTexture;public PbrPresence pbrMetallicRoughness;}
        [Serializable] sealed class PbrPresence {public string baseColorTexture,metallicRoughnessTexture;}
        [Serializable] public sealed class TextureEvidence
        {
            public string key,recipe,unityVersion,imageName,pngSha256,sourceTextureName,sourceFormat,sourceGraphicsFormat;
            public string generatedAsset,derivedFormat,derivedGraphicsFormat,compressedPayloadSha256,serializedAssetSha256;
            public int sourceWidth,sourceHeight,sourceMipCount,derivedWidth,derivedHeight,derivedMipCount;
            public bool sourceSrgb,derivedSrgb,derivedReadable;
            public int filterMode,wrapU,wrapV,wrapW,anisoLevel;public float mipMapBias;
            public long pngBytes,sourceRgbaMipBytesEstimate,compressedPayloadBytes,bc7MipBytesExpected,serializedAssetBytes;
        }
        [Serializable] public sealed class BindingEvidence
        {public string material,property,imageName,sourcePngSha256,generatedTexture;public int gltfTextureIndex,imageIndex;}
        [Serializable] public sealed class Evidence
        {
            public string mode="bc7",recipe=Recipe,sourceGlbSha256,unityVersion;
            public int sourceMaterials,generatedMaterials,uniqueTextures;
            public long pngBytes,sourceRgbaMipBytesEstimate,compressedPayloadBytes,serializedTextureAssetBytes;
            public TextureEvidence[] textures;public BindingEvidence[] bindings;public string[] materialAssets;
            public string scope="Editor derivative only. Same image dimensions, mips, color spaces, samplers and material properties. BC7 is lossy; player appearance, format support, allocation, build stripping and load time need separate verification. Unsupported BC7 may expand to RGBA32.";
        }
        sealed class Binding
        {public string property;public Material material;public Texture2D imported;public int textureIndex,imageIndex;public Image image;public byte[] png;public string key,pngHash;public bool srgb;}
        sealed class PreparedTexture {public Texture2D texture;public TextureEvidence evidence;}
        static readonly string[] Properties={"baseColorTexture","metallicRoughnessTexture","normalTexture","occlusionTexture","emissiveTexture"};

        public static Evidence Prepare(GameObject model,string sourceGlbPath,string expectedSha256,string generatedRoot)
        {
            byte[] source=File.ReadAllBytes(sourceGlbPath);
            if(Hash(source)!=expectedSha256) throw new InvalidDataException("Selected GLB changed before texture preparation.");
            var gltf=ReadGlb(source,out int binaryOffset,out int binaryLength);
            if(gltf.images==null || gltf.textures==null || gltf.materials==null || gltf.bufferViews==null
                || gltf.materials.Any(value=>string.IsNullOrEmpty(value.name)) || gltf.materials.Select(value=>value.name).Distinct().Count()!=gltf.materials.Length)
                throw new InvalidDataException("Oscar GLB lacks unambiguous named materials/images.");
            var renderers=model.GetComponentsInChildren<Renderer>(true);
            var materials=renderers.SelectMany(renderer=>renderer.sharedMaterials).Where(value=>value!=null).Distinct().ToArray();
            if(materials.Length!=gltf.materials.Length || materials.Select(value=>value.name).Distinct().Count()!=materials.Length)
                throw new InvalidDataException("Oscar material count/name differs from its GLB.");
            var bindings=new List<Binding>();var imageBytes=new Dictionary<int,byte[]>();var mappedTextures=new Dictionary<Texture2D,int>();
            // Resolve every binding before the first generated asset write. An
            // unexpected map/property/name never silently receives another image.
            foreach(var material in materials)
            {
                var definition=gltf.materials.SingleOrDefault(value=>value.name==material.name);
                if(definition==null) throw new InvalidDataException("Unknown Oscar material: "+material.name);
                var infos=new[] {definition.pbrMetallicRoughness?.baseColorTexture,definition.pbrMetallicRoughness?.metallicRoughnessTexture,
                    definition.normalTexture,definition.occlusionTexture,definition.emissiveTexture};
                foreach(string property in material.GetTexturePropertyNames())
                    if(material.GetTexture(property)!=null && !Properties.Contains(property))
                        throw new InvalidDataException("Unmapped Oscar texture property: "+material.name+"/"+property);
                for(int slot=0;slot<Properties.Length;slot++)
                {
                    string property=Properties[slot];var info=infos[slot];
                    var actual=material.HasProperty(property)?material.GetTexture(property):null;
                    if(info==null)
                    {
                        if(actual!=null) throw new InvalidDataException("Material has an authored map absent from GLB: "+material.name+"/"+property);
                        continue;
                    }
                    if(!(actual is Texture2D imported) || info.index<0 || info.index>=gltf.textures.Length)
                        throw new InvalidDataException("Missing/invalid imported Oscar map: "+material.name+"/"+property
                            +" gltfIndex="+info.index+" hasProperty="+material.HasProperty(property)+" actualType="+(actual!=null?actual.GetType().FullName:"null"));
                    int imageIndex=gltf.textures[info.index].source;
                    if(imageIndex<0 || imageIndex>=gltf.images.Length) throw new InvalidDataException("Invalid embedded image index.");
                    var image=gltf.images[imageIndex];
                    if(string.IsNullOrEmpty(image.name) || imported.name!=image.name || gltf.images.Count(value=>value.name==image.name)!=1
                        || image.mimeType!="image/png" || !string.IsNullOrEmpty(image.uri))
                        throw new InvalidDataException("Ambiguous/non-PNG Oscar image mapping: "+material.name+"/"+property+" imported="+imported.name+" image="+image.name);
                    if(mappedTextures.TryGetValue(imported,out int prior) && prior!=imageIndex)
                        throw new InvalidDataException("An imported texture resolves to multiple GLB images.");
                    mappedTextures[imported]=imageIndex;
                    if(!imageBytes.TryGetValue(imageIndex,out var png))
                    {
                        if(image.bufferView<0 || image.bufferView>=gltf.bufferViews.Length) throw new InvalidDataException("Image bufferView missing.");
                        var view=gltf.bufferViews[image.bufferView];
                        if(view.buffer!=0 || view.byteOffset<0 || view.byteLength<=0 || (long)view.byteOffset+view.byteLength>binaryLength)
                            throw new InvalidDataException("PNG exceeds GLB binary range.");
                        png=new byte[view.byteLength];Buffer.BlockCopy(source,binaryOffset+view.byteOffset,png,0,png.Length);imageBytes.Add(imageIndex,png);
                    }
                    RequirePngSize(png,imported.width,imported.height);
                    bool srgb=GraphicsFormatUtility.IsSRGBFormat(imported.graphicsFormat);
                    bool expectedSrgb=property=="baseColorTexture" || property=="emissiveTexture";
                    if(srgb!=expectedSrgb) throw new InvalidDataException("Unexpected Oscar texture color space: "+material.name+"/"+property);
                    if(imported.width%4!=0 || imported.height%4!=0 || !Mathf.IsPowerOfTwo(imported.width) || !Mathf.IsPowerOfTwo(imported.height))
                        throw new InvalidDataException("This bounded BC7 recipe requires power-of-two dimensions divisible by four.");
                    string pngHash=Hash(png);
                    string settings=string.Join("|",Recipe,Application.unityVersion,pngHash,srgb,imported.width,imported.height,imported.mipmapCount,
                        (int)imported.filterMode,(int)imported.wrapModeU,(int)imported.wrapModeV,(int)imported.wrapModeW,imported.anisoLevel,imported.mipMapBias.ToString("R",System.Globalization.CultureInfo.InvariantCulture));
                    bindings.Add(new Binding {property=property,material=material,imported=imported,textureIndex=info.index,imageIndex=imageIndex,
                        image=image,png=png,pngHash=pngHash,srgb=srgb,key=Hash(Encoding.UTF8.GetBytes(settings))});
                }
            }
            if(bindings.Count==0) throw new InvalidDataException("No mapped Oscar texture inputs.");
            string folder=generatedRoot+"/OscarBC7/"+expectedSha256.Substring(0,16);EnsureFolder(folder);
            var textures=new Dictionary<string,PreparedTexture>();
            foreach(var binding in bindings)
                if(!textures.ContainsKey(binding.key)) textures.Add(binding.key,PrepareTexture(binding,folder));
            var replacements=new Dictionary<Material,Material>();var materialAssets=new List<string>();
            for(int i=0;i<materials.Length;i++)
            {
                var original=materials[i];string identity=Hash(Encoding.UTF8.GetBytes(Recipe+"|"+Application.unityVersion+"|"+original.name));
                string path=folder+"/material-"+identity.Substring(0,32)+".mat";
                var derivative=AssetDatabase.LoadAssetAtPath<Material>(path);
                if(derivative==null) {derivative=new Material(original);AssetDatabase.CreateAsset(derivative,path);}
                EditorUtility.CopySerialized(original,derivative);
                // Preserve all colors, factors, keywords, texture transforms and
                // source shader. Only replace the previously verified map slots.
                foreach(var binding in bindings.Where(value=>value.material==original)) derivative.SetTexture(binding.property,textures[binding.key].texture);
                EditorUtility.SetDirty(derivative);replacements.Add(original,derivative);materialAssets.Add(path);
            }
            AssetDatabase.SaveAssets();
            foreach(var renderer in renderers)
            {
                var slots=renderer.sharedMaterials;for(int i=0;i<slots.Length;i++) if(slots[i]!=null) slots[i]=replacements[slots[i]];
                renderer.sharedMaterials=slots;PrefabUtility.RecordPrefabInstancePropertyModifications(renderer);
            }
            var measurements=textures.Values.Select(value=>value.evidence).OrderBy(value=>value.key,StringComparer.Ordinal).ToArray();
            var evidence=new Evidence {sourceGlbSha256=expectedSha256,unityVersion=Application.unityVersion,sourceMaterials=materials.Length,generatedMaterials=replacements.Count,
                uniqueTextures=measurements.Length,textures=measurements,materialAssets=materialAssets.ToArray(),
                pngBytes=measurements.Sum(value=>value.pngBytes),sourceRgbaMipBytesEstimate=measurements.Sum(value=>value.sourceRgbaMipBytesEstimate),
                compressedPayloadBytes=measurements.Sum(value=>value.compressedPayloadBytes),serializedTextureAssetBytes=measurements.Sum(value=>value.serializedAssetBytes),
                bindings=bindings.Select(value=>new BindingEvidence {material=value.material.name,property=value.property,imageName=value.image.name,
                    gltfTextureIndex=value.textureIndex,imageIndex=value.imageIndex,sourcePngSha256=value.pngHash,generatedTexture=textures[value.key].evidence.generatedAsset}).ToArray()};
            if(Hash(File.ReadAllBytes(sourceGlbPath))!=expectedSha256) throw new InvalidDataException("Immutable GLB changed during derivative preparation.");
            Debug.Log("OSCAR_BC7_DERIVATIVES_PREPARED "+JsonUtility.ToJson(evidence));return evidence;
        }
        static PreparedTexture PrepareTexture(Binding binding,string folder)
        {
            string assetPath=folder+"/texture-"+binding.key.Substring(0,32)+".asset",receiptPath=assetPath+".json";
            var prior=AssetDatabase.LoadAssetAtPath<Texture2D>(assetPath);
            if(prior!=null || File.Exists(receiptPath))
            {
                if(prior==null || !File.Exists(receiptPath)) throw new InvalidDataException("Incomplete BC7 derivative cache; preserve it and review before regenerating: "+assetPath);
                var receipt=JsonUtility.FromJson<TextureEvidence>(File.ReadAllText(receiptPath));
                if(receipt?.key!=binding.key || receipt.recipe!=Recipe || receipt.pngSha256!=binding.pngHash || receipt.generatedAsset!=assetPath
                    || receipt.serializedAssetBytes!=new FileInfo(assetPath).Length || receipt.serializedAssetSha256!=Hash(File.ReadAllBytes(assetPath)))
                    throw new InvalidDataException("BC7 derivative cache identity changed: "+assetPath);
                RequireTexture(prior,binding,true);
                return new PreparedTexture {texture=prior,evidence=receipt};
            }
            var source=binding.imported;
            var texture=new Texture2D(source.width,source.height,TextureFormat.RGBA32,source.mipmapCount>1,!binding.srgb) {name=source.name+".BC7"};
            bool saved=false;
            try
            {
                if(!ImageConversion.LoadImage(texture,binding.png,false)) throw new InvalidDataException("PNG decode failed: "+binding.image.name);
                texture.filterMode=source.filterMode;texture.wrapModeU=source.wrapModeU;texture.wrapModeV=source.wrapModeV;texture.wrapModeW=source.wrapModeW;
                texture.anisoLevel=source.anisoLevel;texture.mipMapBias=source.mipMapBias;
                texture.Apply(source.mipmapCount>1,false);
                if(texture.width!=source.width || texture.height!=source.height || texture.mipmapCount!=source.mipmapCount
                    || GraphicsFormatUtility.IsSRGBFormat(texture.graphicsFormat)!=binding.srgb)
                    throw new InvalidDataException("PNG decode/mip generation changed source dimensions or color space.");
                // No NormalMap importer: glTFast reads raw R/G and reconstructs Z.
                // https://docs.unity.com/en-us/engine/6000.6/script-reference/unityeditor/editorutility/compresstexture
                EditorUtility.CompressTexture(texture,TextureFormat.BC7,TextureCompressionQuality.Best);
                RequireTexture(texture,binding,false); // API can silently leave a failed compression unchanged.
                byte[] payload=texture.GetRawTextureData<byte>().ToArray();
                long expectedBytes=MipBytes(texture.width,texture.height,texture.mipmapCount,true);
                if(payload.LongLength!=expectedBytes) throw new InvalidDataException("BC7 mip payload size differs from 16 bytes per4x4 block.");
                var receipt=new TextureEvidence {key=binding.key,recipe=Recipe,unityVersion=Application.unityVersion,imageName=binding.image.name,pngSha256=binding.pngHash,
                    sourceTextureName=source.name,sourceFormat=source.format.ToString(),sourceGraphicsFormat=source.graphicsFormat.ToString(),sourceWidth=source.width,sourceHeight=source.height,
                    sourceMipCount=source.mipmapCount,sourceSrgb=binding.srgb,pngBytes=binding.png.LongLength,sourceRgbaMipBytesEstimate=MipBytes(source.width,source.height,source.mipmapCount,false),
                    generatedAsset=assetPath,derivedFormat=texture.format.ToString(),derivedGraphicsFormat=texture.graphicsFormat.ToString(),derivedWidth=texture.width,derivedHeight=texture.height,
                    derivedMipCount=texture.mipmapCount,derivedSrgb=GraphicsFormatUtility.IsSRGBFormat(texture.graphicsFormat),compressedPayloadBytes=payload.LongLength,
                    compressedPayloadSha256=Hash(payload),bc7MipBytesExpected=expectedBytes,filterMode=(int)source.filterMode,wrapU=(int)source.wrapModeU,wrapV=(int)source.wrapModeV,
                    wrapW=(int)source.wrapModeW,anisoLevel=source.anisoLevel,mipMapBias=source.mipMapBias};
                texture.Apply(false,true); // Keep mips; no runtime CPU-readable duplicate.
                RequireTexture(texture,binding,true);receipt.derivedReadable=texture.isReadable;
                AssetDatabase.CreateAsset(texture,assetPath);saved=true;AssetDatabase.SaveAssets();
                receipt.serializedAssetBytes=new FileInfo(assetPath).Length;receipt.serializedAssetSha256=Hash(File.ReadAllBytes(assetPath));
                if(receipt.serializedAssetBytes<payload.LongLength) throw new InvalidDataException("Serialized BC7 texture unexpectedly lacks its compressed payload.");
                File.WriteAllText(receiptPath,JsonUtility.ToJson(receipt,true)+"\n");
                return new PreparedTexture {texture=texture,evidence=receipt};
            }
            finally {if(!saved) Object.DestroyImmediate(texture);}
        }
        static void RequireTexture(Texture2D texture,Binding source,bool nonReadable)
        {
            var original=source.imported;
            if(texture.format!=TextureFormat.BC7 || texture.width!=original.width || texture.height!=original.height || texture.mipmapCount!=original.mipmapCount
                || GraphicsFormatUtility.IsSRGBFormat(texture.graphicsFormat)!=source.srgb || (nonReadable && texture.isReadable)
                || texture.filterMode!=original.filterMode || texture.wrapModeU!=original.wrapModeU || texture.wrapModeV!=original.wrapModeV || texture.wrapModeW!=original.wrapModeW
                || texture.anisoLevel!=original.anisoLevel || Mathf.Abs(texture.mipMapBias-original.mipMapBias)>.000001f)
                throw new InvalidDataException("BC7 derivative format/dimensions/color space/mips/sampler differ from source: "+source.image.name);
        }
        static Gltf ReadGlb(byte[] data,out int binaryOffset,out int binaryLength)
        {
            binaryOffset=binaryLength=0;
            if(!BitConverter.IsLittleEndian || data.Length<28 || BitConverter.ToUInt32(data,0)!=0x46546c67 || BitConverter.ToUInt32(data,4)!=2 || BitConverter.ToUInt32(data,8)!=data.Length)
                throw new InvalidDataException("Expected self-contained GLB2.");
            Gltf gltf=null;
            for(int offset=12;offset<data.Length;)
            {
                if(offset+8>data.Length) throw new InvalidDataException("Truncated GLB chunk.");
                uint length=BitConverter.ToUInt32(data,offset),type=BitConverter.ToUInt32(data,offset+4);
                if(length>int.MaxValue || length%4!=0 || (long)offset+8+length>data.Length) throw new InvalidDataException("Invalid GLB chunk size.");
                if(type==0x4e4f534a && gltf==null && offset==12) gltf=ParseGltfJson(Encoding.UTF8.GetString(data,offset+8,(int)length));
                else if(type==0x004e4942 && gltf!=null && binaryLength==0) {binaryOffset=offset+8;binaryLength=(int)length;}
                else throw new InvalidDataException("Unexpected GLB chunk order/type.");
                offset+=8+(int)length;
            }
            if(gltf==null || binaryLength==0) throw new InvalidDataException("GLB lacks JSON/BIN chunks.");return gltf;
        }
        static Gltf ParseGltfJson(string json)
        {
            var gltf=JsonUtility.FromJson<Gltf>(json);var presence=JsonUtility.FromJson<Presence>(json);
            if(gltf?.materials==null || presence?.materials?.Length!=gltf.materials.Length)
                throw new InvalidDataException("Cannot establish optional material-map presence.");
            for(int i=0;i<gltf.materials.Length;i++)
            {
                var m=gltf.materials[i];var p=presence.materials[i];
                if(p==null || m==null || p.name!=m.name) throw new InvalidDataException("Material presence pass differs from source order.");
                if(p.normalTexture==null) m.normalTexture=null;
                if(p.occlusionTexture==null) m.occlusionTexture=null;
                if(p.emissiveTexture==null) m.emissiveTexture=null;
                if(m.pbrMetallicRoughness!=null)
                {
                    if(p.pbrMetallicRoughness?.baseColorTexture==null) m.pbrMetallicRoughness.baseColorTexture=null;
                    if(p.pbrMetallicRoughness?.metallicRoughnessTexture==null) m.pbrMetallicRoughness.metallicRoughnessTexture=null;
                }
            }
            return gltf;
        }
        /// <summary>Read-only intake diagnostic; absent maps are -1, index0 is a real map.</summary>
        public static int[] InspectTextureReferences(string json,string materialName)
        {
            var m=ParseGltfJson(json).materials.Single(value=>value.name==materialName);
            return new[] {m.pbrMetallicRoughness?.baseColorTexture?.index??-1,m.pbrMetallicRoughness?.metallicRoughnessTexture?.index??-1,
                m.normalTexture?.index??-1,m.occlusionTexture?.index??-1,m.emissiveTexture?.index??-1};
        }
        static void RequirePngSize(byte[] png,int width,int height)
        {
            byte[] signature={137,80,78,71,13,10,26,10};
            if(png.Length<33 || !png.Take(8).SequenceEqual(signature) || Encoding.ASCII.GetString(png,12,4)!="IHDR"
                || BigEndian(png,16)!=width || BigEndian(png,20)!=height) throw new InvalidDataException("Embedded PNG dimensions do not match imported texture.");
        }
        static uint BigEndian(byte[] value,int i) => (uint)value[i]<<24 | (uint)value[i+1]<<16 | (uint)value[i+2]<<8 | value[i+3];
        static long MipBytes(int width,int height,int levels,bool compressed)
        {
            long size=0;for(int level=0;level<levels;level++) {size+=compressed?(long)((width+3)/4)*((height+3)/4)*16:(long)width*height*4;width=Math.Max(1,width/2);height=Math.Max(1,height/2);}return size;
        }
        static string Hash(byte[] bytes) {using(var sha=SHA256.Create()) return string.Concat(sha.ComputeHash(bytes).Select(value=>value.ToString("x2")));}
        static void EnsureFolder(string folder)
        {
            if(AssetDatabase.IsValidFolder(folder)) return;
            string parent=Path.GetDirectoryName(folder).Replace('\\','/');EnsureFolder(parent);AssetDatabase.CreateFolder(parent,Path.GetFileName(folder));
        }
    }
}
