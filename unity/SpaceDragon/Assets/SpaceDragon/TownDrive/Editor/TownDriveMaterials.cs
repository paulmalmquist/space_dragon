using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace SpaceDragon.TownDrive.Editor
{
    public static partial class TownDriveProject
    {
        static void ConfigureTextureImports(TownDriveSceneManifest manifest)
        {
            foreach (var usage in manifest.materials.SelectMany(material => material.textures ?? Array.Empty<TownDriveSceneTexture>()).GroupBy(texture => texture.path))
            {
                bool normal = usage.Any(texture => texture.slot == "normal");
                bool color = usage.Any(texture => texture.slot == "baseColor" || texture.slot == "emissive");
                bool data = usage.Any(texture => texture.slot == "metallicRoughness" || texture.slot == "metallicSmoothness" || texture.slot == "occlusion");
                if ((normal && (color || data)) || (color && data)) throw new InvalidDataException("One PNG is used in incompatible color spaces: " + usage.Key);
                string path = ImportedPath(usage.Key);
                var importer = AssetImporter.GetAtPath(path) as TextureImporter;
                if (importer == null) throw new FileNotFoundException("Missing prepared texture importer.", path);
                var textureType = normal ? TextureImporterType.NormalMap : TextureImporterType.Default;
                bool changed = importer.textureType != textureType || importer.sRGBTexture != color || !importer.mipmapEnabled ||
                    importer.alphaSource != TextureImporterAlphaSource.FromInput || importer.alphaIsTransparency != color ||
                    importer.wrapMode != TextureWrapMode.Repeat || importer.anisoLevel != 4 || importer.maxTextureSize != 2048;
                if (!changed) continue;
                importer.textureType = textureType;
                importer.sRGBTexture = color;
                importer.mipmapEnabled = true;
                importer.alphaSource = TextureImporterAlphaSource.FromInput;
                importer.alphaIsTransparency = color;
                importer.wrapMode = TextureWrapMode.Repeat;
                importer.anisoLevel = 4;
                importer.maxTextureSize = 2048;
                // Image orientation and KHR_texture_transform are already in the
                // official export. Never guess another Y flip for signs/cabins.
                importer.SaveAndReimport();
            }
        }

        static void ConfigureGltfImport(string path, bool animated)
        {
            // Setup refreshed changed files synchronously. Reimport only absent
            // prefabs or changed importer settings; still validate every asset.
            if (AssetImporter.GetAtPath(path) == null || AssetDatabase.LoadAssetAtPath<GameObject>(path) == null)
                AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceSynchronousImport);
            var importer = AssetImporter.GetAtPath(path);
            if (importer == null || !importer.GetType().FullName.Contains("GLTFast"))
                throw new InvalidDataException("The pinned glTFast importer did not claim " + path);
            var settings = new SerializedObject(importer);
            Required(settings, "importSettings.animationMethod").intValue = animated ? 2 : 0;
            Required(settings, "importSettings.nodeNameMethod").intValue = 1;
            Required(settings, "importSettings.generateMipMaps").boolValue = true;
            Required(settings, "instantiationSettings.skinUpdateWhenOffscreen").boolValue = false;
            // Unity names the main prefab asset after its file. Keep an importer
            // scene wrapper so a single authored root is never that renamed
            // object (and its wheel/cabin paths remain real imported children).
            var sceneCreation = Required(settings, "instantiationSettings.sceneObjectCreation");
            int always = Array.IndexOf(sceneCreation.enumNames, nameof(GLTFast.SceneObjectCreation.Always));
            if (always < 0) throw new InvalidOperationException("Pinned glTFast no longer exposes SceneObjectCreation.Always.");
            sceneCreation.enumValueIndex = always;
            bool settingsChanged = settings.ApplyModifiedPropertiesWithoutUndo();
            // Assets first discovered while this shared project used the built-in
            // pipeline have cached incompatible shaders even with identical .meta
            // settings. Reimport them under the verified scoped URP generator.
            if (settingsChanged || !ImportedMaterialsUseUrp(path)) importer.SaveAndReimport();
            if (AssetDatabase.LoadAssetAtPath<GameObject>(path) == null)
                throw new InvalidDataException("glTFast produced no prefab for " + path + ". " + GltfImportReport(path));
            if (!ImportedMaterialsUseUrp(path))
                throw new InvalidDataException("glTFast did not import Universal pipeline materials for " + path + ": " +
                    string.Join(", ", AssetDatabase.LoadAllAssetsAtPath(path).OfType<Material>().Select(material => material.name + "=" + material.shader?.name)));
        }

        static string GltfImportReport(string path)
        {
            var importer = AssetImporter.GetAtPath(path);
            if (importer == null) return "Importer metadata is absent.";
            var report = new SerializedObject(importer).FindProperty("reportItems");
            if (report == null || !report.isArray || report.arraySize == 0) return "Importer stored no diagnostic items.";
            var messages = new List<string>();
            for (int index = 0; index < Math.Min(report.arraySize, 32); index++)
            {
                var item = report.GetArrayElementAtIndex(index);
                var type = (LogType)item.FindPropertyRelative("type").intValue;
                var code = (GLTFast.Logging.LogCode)item.FindPropertyRelative("code").intValue;
                var parts = item.FindPropertyRelative("messages");
                var values = Enumerable.Range(0, parts.arraySize).Select(part => parts.GetArrayElementAtIndex(part).stringValue).ToArray();
                string message = GLTFast.Logging.LogMessages.GetFullMessage(code, values);
                messages.Add(type + " [" + code + "]: " + (message.Length > 1024 ? message.Substring(0, 1024) : message));
            }
            return "Importer report (" + report.arraySize + " items): " + string.Join("; ", messages);
        }

        static SerializedProperty Required(SerializedObject owner, string path) =>
            owner.FindProperty(path) ?? throw new InvalidOperationException("Pinned glTFast property changed: " + path);

        sealed class MaterialCopies
        {
            readonly Dictionary<string, TownDriveSceneMaterial> definitions;
            readonly Dictionary<string, Material> copies = new Dictionary<string, Material>();
            readonly Dictionary<string, Material> parkedPaints = new Dictionary<string, Material>();
            readonly List<TownDriveMaterialEvidence> evidence = new List<TownDriveMaterialEvidence>();
            static readonly string[] Paints = { "#e6e8e5", "#27323c", "#a5a9ad", "#792629", "#284756", "#b4aa91", "#d8dce2", "#38483a" };
            public TownDriveMaterialEvidence[] Evidence => evidence.ToArray();
            public MaterialCopies(TownDriveSceneManifest manifest)
            { definitions = manifest.materials.ToDictionary(material => material.name); }

            public void ApplyParkedAppearance(GameObject root, int colorIndex, bool braking)
            {
                int index = ((colorIndex % Paints.Length) + Paints.Length) % Paints.Length;
                ColorUtility.TryParseHtmlString(Paints[index], out var color);
                foreach (var renderer in root.GetComponentsInChildren<Renderer>(true))
                {
                    var slots = renderer.sharedMaterials;
                    for (int slot = 0; slot < slots.Length; slot++)
                    {
                        var source = slots[slot];
                        if (source.name.StartsWith("drive.traffic.paint", StringComparison.Ordinal))
                        {
                            string key = source.name + ".parked-palette-" + index;
                            if (!parkedPaints.TryGetValue(key, out var paint))
                            {
                                string path = Generated + "/Materials/" + SafeName(key) + "-" + HashText(key).Substring(0, 10) + ".mat";
                                paint = AssetDatabase.LoadAssetAtPath<Material>(path);
                                if (paint == null) { paint = new Material(source); AssetDatabase.CreateAsset(paint, path); }
                                EditorUtility.CopySerialized(source, paint); paint.name = key; paint.enableInstancing = true;
                                // Native glTFast ShaderGraph expects gamma base
                                // factors, matching its material generator.
                                if (paint.HasProperty("baseColorFactor")) paint.SetColor("baseColorFactor", color);
                                foreach (string property in new[] { "_BaseColor", "_Color" }) if (paint.HasProperty(property)) paint.SetColor(property, color.linear);
                                EditorUtility.SetDirty(paint); parkedPaints.Add(key, paint);
                                evidence.Add(new TownDriveMaterialEvidence { name = key, assetPath = path, shader = paint.shader.name,
                                    alphaMode = "OPAQUE", doubleSided = true, castsShadow = true, renderQueue = paint.renderQueue,
                                    textureCount = paint.GetTexturePropertyNames().Count(property => paint.GetTexture(property) != null) });
                            }
                            // Property blocks do not survive saved scene assets;
                            // eight shared derivatives preserve parked colors.
                            slots[slot] = paint;
                        }
                        if (source.name.StartsWith("drive.traffic.brake", StringComparison.Ordinal) && slots.Length == 1) renderer.enabled = braking;
                    }
                    renderer.sharedMaterials = slots;
                }
            }

            public void Apply(GameObject root, TownDriveSceneAsset asset = null)
            {
                var states = (asset?.nodeState ?? Array.Empty<TownDriveNodeState>()).GroupBy(state => state.name).ToDictionary(group => group.Key, group => group.First());
                foreach (var renderer in root.GetComponentsInChildren<Renderer>(true))
                {
                    var materials = renderer.sharedMaterials;
                    bool castsShadow = true;
                    for (int i = 0; i < materials.Length; i++)
                    {
                        var imported = materials[i] ?? throw new InvalidDataException("Imported renderer has an empty material: " + renderer.name);
                        // The unchanged rig assets have their own native materials;
                        // no guessed substitutions or duplicate color conversion.
                        if (!definitions.TryGetValue(imported.name, out var definition)) continue;
                        if (!copies.TryGetValue(definition.name, out var copy))
                        {
                            string path = Generated + "/Materials/" + SafeName(definition.name) + "-" + HashText(definition.name).Substring(0, 10) + ".mat";
                            copy = AssetDatabase.LoadAssetAtPath<Material>(path);
                            if (copy == null) { copy = new Material(imported); AssetDatabase.CreateAsset(copy, path); }
                            // Reset from the immutable imported subasset on every
                            // Setup: emissive strength is applied exactly once.
                            EditorUtility.CopySerialized(imported, copy);
                            copy.name = definition.name;
                            copy.enableInstancing = true;
                            Color emission = new Color(definition.emissiveFactor.r * definition.emissiveStrength,
                                definition.emissiveFactor.g * definition.emissiveStrength, definition.emissiveFactor.b * definition.emissiveStrength, 1);
                            if (copy.HasProperty("emissiveFactor"))
                            {
                                copy.SetColor("emissiveFactor", emission);
                                if (emission.r > 0 || emission.g > 0 || emission.b > 0) copy.EnableKeyword("_EMISSIVE");
                            }
                            if (definition.name.StartsWith("drive.street-name-material.", StringComparison.Ordinal))
                            {
                                // Babylon 9.33 Standard's default fragment path
                                // multiplies its .24 emission by the diffuse map.
                                // glTF emission is additive: bind the same map in
                                // this native derivative to preserve green/text,
                                // while retaining the imported lit PBR material.
                                if ((definition.textures ?? Array.Empty<TownDriveSceneTexture>()).Count(texture => texture.slot == "baseColor") != 1 ||
                                    definition.textures.Any(texture => texture.slot == "emissive") ||
                                    !copy.HasProperty("baseColorTexture") || !copy.HasProperty("emissiveTexture") || copy.GetTexture("baseColorTexture") == null)
                                    throw new InvalidDataException("Street sign texture-modulated emission contract changed: " + definition.name);
                                copy.SetTexture("emissiveTexture", copy.GetTexture("baseColorTexture"));
                                copy.SetTextureScale("emissiveTexture", copy.GetTextureScale("baseColorTexture"));
                                copy.SetTextureOffset("emissiveTexture", copy.GetTextureOffset("baseColorTexture"));
                                copy.SetVector("emissiveTexture_Rotation", copy.GetVector("baseColorTexture_Rotation"));
                                copy.SetFloat("emissiveTexture_texCoord", copy.GetFloat("baseColorTexture_texCoord"));
                                copy.EnableKeyword("_EMISSIVE");
                            }
                            if (definition.disableDepthWrite && copy.HasProperty("_ZWrite")) copy.SetFloat("_ZWrite", 0);
                            if (!definition.castShadow || definition.alphaMode == "BLEND")
                            {
                                // URP's ShaderGraph material postprocessor derives
                                // this real LightMode pass from _CastShadows on
                                // asset reload. Persist both, or it re-enables the
                                // pass after our generated .mat is imported.
                                if (!copy.HasProperty("_CastShadows"))
                                    throw new InvalidDataException("URP shader lacks persistent shadow control: " + definition.name + " / " + copy.shader.name);
                                copy.SetFloat("_CastShadows", 0);
                                copy.SetShaderPassEnabled("ShadowCaster", false);
                            }
                            if (copy.shader == null || copy.shader.name == "Hidden/InternalErrorShader") throw new InvalidDataException("Missing imported material shader: " + definition.name);
                            if (definition.alphaMode == "BLEND" && copy.renderQueue < (int)RenderQueue.Transparent)
                                throw new InvalidDataException("Transparent source lost its render queue: " + definition.name);
                            foreach (var texture in definition.textures ?? Array.Empty<TownDriveSceneTexture>())
                            {
                                string property = TextureProperty(texture.slot);
                                if (property != null && (!copy.HasProperty(property) || copy.GetTexture(property) == null))
                                    throw new InvalidDataException("Material lost " + texture.slot + " texture: " + definition.name);
                            }
                            EditorUtility.SetDirty(copy);
                            copies.Add(definition.name, copy);
                            evidence.Add(new TownDriveMaterialEvidence { name = definition.name, shader = copy.shader.name,
                                assetPath = path, alphaMode = definition.alphaMode, doubleSided = definition.doubleSided,
                                castsShadow = definition.castShadow && definition.alphaMode != "BLEND", renderQueue = copy.renderQueue,
                                emissiveFactor = emission, textureCount = copy.GetTexturePropertyNames().Count(property => copy.GetTexture(property) != null) });
                        }
                        materials[i] = copy;
                        if (!definition.castShadow || definition.alphaMode == "BLEND") castsShadow = false;
                    }
                    // EXT_mesh_gpu_instancing creates renderer children named
                    // mesh_iN beneath the named source node. Its source shadow
                    // flag belongs to that ancestor, not the generated suffix.
                    for (var node = renderer.transform; node != null; node = node.parent)
                    {
                        if (states.TryGetValue(node.name, out var state)) { if (!state.castShadow) castsShadow = false; break; }
                        if (node == root.transform) break;
                    }
                    // The exported utility wires retain glTF LINES topology.
                    // WebGPU forbids depth bias for line/point pipelines, while
                    // URP's shadow pass applies it. Keep those meshes visible in
                    // the normal pass and exclude only their shadow rendering.
                    var mesh = renderer is SkinnedMeshRenderer skin ? skin.sharedMesh : renderer.GetComponent<MeshFilter>()?.sharedMesh;
                    if (mesh != null && Enumerable.Range(0, mesh.subMeshCount).Any(index => mesh.GetTopology(index) != MeshTopology.Triangles))
                        castsShadow = false;
                    renderer.sharedMaterials = materials;
                    renderer.shadowCastingMode = castsShadow ? ShadowCastingMode.On : ShadowCastingMode.Off;
                    renderer.receiveShadows = true;
                    PrefabUtility.RecordPrefabInstancePropertyModifications(renderer);
                }
            }

            static string TextureProperty(string slot)
            {
                switch (slot)
                {
                    case "baseColor": return "baseColorTexture";
                    case "normal": return "normalTexture";
                    case "metallicRoughness": return "metallicRoughnessTexture";
                    case "emissive": return "emissiveTexture";
                    case "occlusion": return "occlusionTexture";
                    // This derivative is available for later URP/Lit consumers;
                    // native glTFast materials keep the original G/B packing.
                    default: return null;
                }
            }
        }
    }
}
