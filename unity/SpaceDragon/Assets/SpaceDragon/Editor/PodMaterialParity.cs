using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace SpaceDragon.Editor
{
    [Serializable]
    public sealed class PodEmissionEvidence
    {
        public string material, generatedMaterial, shader;
        public float[] sourceFactor, importedFactor, effectiveFactor;
        public float sourceStrength;
        public int rendererSlots;
    }

    /// <summary>Preserves a glTF material extension that glTFast 6.20 explicitly reports unsupported.</summary>
    internal static class PodMaterialParity
    {
        [Serializable] sealed class SourceRoot { public SourceMaterial[] materials; }
        [Serializable] sealed class SourceMaterial { public string name; public float[] emissiveFactor; public SourceExtensions extensions; }
        [Serializable] sealed class SourceExtensions { public EmissiveStrength KHR_materials_emissive_strength; }
        [Serializable] sealed class EmissiveStrength { public float emissiveStrength = 1; }

        public static PodEmissionEvidence[] Apply(GameObject pod, string sourceGlb, string generatedFolder)
        {
            SourceRoot document;
            using (var stream = File.OpenRead(sourceGlb))
            using (var reader = new BinaryReader(stream, Encoding.UTF8))
            {
                if (stream.Length < 20 || reader.ReadUInt32() != 0x46546C67 || reader.ReadUInt32() != 2 || reader.ReadUInt32() != stream.Length)
                    throw new InvalidDataException("The pod source is not a valid GLB 2 container.");
                uint length = reader.ReadUInt32();
                if (reader.ReadUInt32() != 0x4E4F534A || length > stream.Length - stream.Position)
                    throw new InvalidDataException("The pod source is missing its bounded JSON chunk.");
                document = JsonUtility.FromJson<SourceRoot>(Encoding.UTF8.GetString(reader.ReadBytes(checked((int)length))));
            }
            var renderers = pod.GetComponentsInChildren<Renderer>(true);
            var importedMaterials = renderers.SelectMany(renderer => renderer.sharedMaterials).Where(material => material != null).Distinct().ToArray();
            var replacements = new Dictionary<Material, Material>();
            var evidence = new List<PodEmissionEvidence>();
            foreach (var source in document.materials ?? Array.Empty<SourceMaterial>())
            {
                var extension = source.extensions?.KHR_materials_emissive_strength;
                if (extension == null) continue;
                if (source.emissiveFactor == null || source.emissiveFactor.Length != 3 ||
                    float.IsNaN(extension.emissiveStrength) || float.IsInfinity(extension.emissiveStrength) || extension.emissiveStrength < 0)
                    throw new InvalidDataException("Invalid source emissive strength on " + source.name);
                var imported = importedMaterials.SingleOrDefault(material => material.name == source.name);
                if (imported == null || !imported.HasProperty("emissiveFactor"))
                    throw new InvalidDataException("The pinned glTFast shader/material changed for " + source.name);
                var path = generatedFolder + "/Pod-" + source.name + ".mat";
                var corrected = AssetDatabase.LoadAssetAtPath<Material>(path);
                if (corrected == null) { corrected = new Material(imported); AssetDatabase.CreateAsset(corrected, path); }
                // Always restore from the immutable imported subasset before applying the
                // source strength. A second Setup cannot multiply an earlier correction.
                EditorUtility.CopySerialized(imported, corrected);
                var before = imported.GetColor("emissiveFactor");
                var effective = source.emissiveFactor.Select(value => value * extension.emissiveStrength).ToArray();
                corrected.SetColor("emissiveFactor", new Color(effective[0], effective[1], effective[2], 1));
                corrected.EnableKeyword("_EMISSIVE");
                EditorUtility.SetDirty(corrected);
                replacements.Add(imported, corrected);
                evidence.Add(new PodEmissionEvidence { material = source.name, generatedMaterial = path, shader = corrected.shader.name,
                    sourceFactor = source.emissiveFactor, sourceStrength = extension.emissiveStrength,
                    importedFactor = new[] { before.r, before.g, before.b }, effectiveFactor = effective,
                    rendererSlots = renderers.Sum(renderer => renderer.sharedMaterials.Count(material => material == imported)) });
            }
            foreach (var renderer in renderers)
            {
                var materials = renderer.sharedMaterials;
                bool changed = false;
                for (int index = 0; index < materials.Length; index++)
                {
                    if (materials[index] != null && replacements.TryGetValue(materials[index], out var replacement))
                    { materials[index] = replacement; changed = true; }
                }
                if (!changed) continue;
                renderer.sharedMaterials = materials;
                PrefabUtility.RecordPrefabInstancePropertyModifications(renderer);
            }
            return evidence.ToArray();
        }
    }
}
