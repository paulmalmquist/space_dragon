using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace SpaceDragon.Editor
{
    /// <summary>Local derivative preserving a source glTF extension unsupported by glTFast 6.20.</summary>
    internal static class GltfEmissionParity
    {
        [Serializable] public sealed class Evidence
        {
            public string material, shader, generatedMaterial;
            public float strength;
            public float[] sourceFactor, effectiveFactor;
            public int slots;
        }
        [Serializable] sealed class SourceMaterial { public string name; public float[] emissiveFactor; }
        [Serializable] sealed class Strength { public float emissiveStrength = 1; }
        [Serializable] sealed class StringValue { public string value; }

        public static Evidence[] Apply(GameObject instance, string glbPath, string outputFolder)
        {
            string sourceJson;
            using (var stream = File.OpenRead(glbPath))
            using (var reader = new BinaryReader(stream, Encoding.UTF8))
            {
                if (stream.Length < 20 || reader.ReadUInt32() != 0x46546C67 || reader.ReadUInt32() != 2 || reader.ReadUInt32() != stream.Length)
                    throw new InvalidDataException("Expected a bounded GLB2 container: " + glbPath);
                var length = reader.ReadUInt32();
                if (reader.ReadUInt32() != 0x4E4F534A || length > stream.Length - stream.Position)
                    throw new InvalidDataException("Missing GLB JSON: " + glbPath);
                sourceJson = Encoding.UTF8.GetString(reader.ReadBytes(checked((int)length)));
            }
            var renderers = instance.GetComponentsInChildren<Renderer>(true);
            var materials = renderers.SelectMany(r => r.sharedMaterials).Where(m => m != null).Distinct().ToArray();
            var replacements = new Dictionary<Material, Material>();
            var evidence = new List<Evidence>();
            foreach (var materialJson in ArrayValues(Property(sourceJson, "materials")))
            {
                // JsonUtility creates nested inline classes for absent members when a
                // sibling extension exists. Test actual JSON membership before decoding;
                // a clearcoat-only material must retain its immutable imported material.
                var extensionJson = Property(Property(materialJson, "extensions"), "KHR_materials_emissive_strength");
                if (extensionJson == null) continue;
                var definition = JsonUtility.FromJson<SourceMaterial>(materialJson);
                var extension = new Strength();
                JsonUtility.FromJsonOverwrite(extensionJson, extension); // glTF default strength is 1.
                if (Property(materialJson, "emissiveFactor") == null) definition.emissiveFactor = new float[3]; // glTF default is black.
                if (definition.emissiveFactor == null || definition.emissiveFactor.Length != 3 ||
                    float.IsNaN(extension.emissiveStrength) || float.IsInfinity(extension.emissiveStrength) || extension.emissiveStrength < 0)
                    throw new InvalidDataException("Invalid source emissive extension: " + definition.name);
                var imported = materials.SingleOrDefault(m => m.name == definition.name);
                if (imported == null || !imported.HasProperty("emissiveFactor"))
                    throw new InvalidDataException("Pinned importer changed emissive material: " + definition.name);
                var output = outputFolder + "/Dragon-" + definition.name.Replace('/', '-') + ".mat";
                var corrected = AssetDatabase.LoadAssetAtPath<Material>(output);
                if (corrected == null) { corrected = new Material(imported); AssetDatabase.CreateAsset(corrected, output); }
                // Reset from immutable imported subasset on every Setup; never multiply a prior correction.
                EditorUtility.CopySerialized(imported, corrected);
                var rgb = definition.emissiveFactor.Select(value => value * extension.emissiveStrength).ToArray();
                corrected.SetColor("emissiveFactor", new Color(rgb[0], rgb[1], rgb[2], 1));
                corrected.EnableKeyword("_EMISSIVE");
                EditorUtility.SetDirty(corrected);
                replacements.Add(imported, corrected);
                evidence.Add(new Evidence { material = definition.name, shader = corrected.shader.name,
                    generatedMaterial = output, strength = extension.emissiveStrength, sourceFactor = definition.emissiveFactor,
                    effectiveFactor = rgb, slots = renderers.Sum(r => r.sharedMaterials.Count(m => m == imported)) });
            }
            foreach (var renderer in renderers)
            {
                var slots = renderer.sharedMaterials;
                bool changed = false;
                for (int i = 0; i < slots.Length; i++)
                    if (slots[i] != null && replacements.TryGetValue(slots[i], out var replacement)) { slots[i] = replacement; changed = true; }
                if (!changed) continue;
                renderer.sharedMaterials = slots;
                PrefabUtility.RecordPrefabInstancePropertyModifications(renderer);
            }
            return evidence.ToArray();
        }

        // Small structural slicer: strings and nested values are skipped as units,
        // never searched with a regex. JsonUtility still decodes typed values and
        // escaped member names; this layer only retains absent-vs-present semantics.
        static int White(string json, int index) { while (index < json.Length && char.IsWhiteSpace(json[index])) index++; return index; }
        static int StringEnd(string json, int index)
        {
            if (json[index++] != '"') throw new InvalidDataException("Expected JSON string.");
            while (index < json.Length)
            {
                char c = json[index++];
                if (c == '\\') { index++; continue; }
                if (c == '"') return index;
            }
            throw new InvalidDataException("Unclosed JSON string.");
        }
        static int ValueEnd(string json, int index)
        {
            index = White(json, index);
            if (index >= json.Length) throw new InvalidDataException("Missing JSON value.");
            if (json[index] == '"') return StringEnd(json, index);
            if (json[index] == '{' || json[index] == '[')
            {
                var ends = new Stack<char>();
                ends.Push(json[index++] == '{' ? '}' : ']');
                while (index < json.Length && ends.Count > 0)
                {
                    char c = json[index];
                    if (c == '"') { index = StringEnd(json, index); continue; }
                    index++;
                    if (c == '{' || c == '[') ends.Push(c == '{' ? '}' : ']');
                    else if (c == '}' || c == ']') { if (ends.Pop() != c) throw new InvalidDataException("Mismatched JSON container."); }
                }
                if (ends.Count > 0) throw new InvalidDataException("Unclosed JSON container.");
                return index;
            }
            int start = index;
            while (index < json.Length && json[index] != ',' && json[index] != '}' && json[index] != ']' && !char.IsWhiteSpace(json[index])) index++;
            if (index == start) throw new InvalidDataException("Empty JSON value.");
            return index;
        }
        static string Property(string json, string name)
        {
            if (json == null) return null;
            int index = White(json, 0);
            if (index >= json.Length || json[index++] != '{') throw new InvalidDataException("Expected JSON object.");
            string found = null;
            while ((index = White(json, index)) < json.Length && json[index] != '}')
            {
                int end = StringEnd(json, index);
                var key = JsonUtility.FromJson<StringValue>("{\"value\":" + json.Substring(index, end - index) + "}").value;
                index = White(json, end);
                if (index >= json.Length || json[index++] != ':') throw new InvalidDataException("Missing JSON member colon.");
                int start = White(json, index); end = ValueEnd(json, start);
                if (key == name) { if (found != null) throw new InvalidDataException("Duplicate JSON member " + name); found = json.Substring(start, end - start); }
                index = White(json, end);
                if (index < json.Length && json[index] == ',') index++;
                else if (index >= json.Length || json[index] != '}') throw new InvalidDataException("Missing JSON member delimiter.");
            }
            return found;
        }
        static IEnumerable<string> ArrayValues(string json)
        {
            if (json == null) yield break;
            int index = White(json, 0);
            if (index >= json.Length || json[index++] != '[') throw new InvalidDataException("Expected JSON array.");
            while ((index = White(json, index)) < json.Length && json[index] != ']')
            {
                int end = ValueEnd(json, index); yield return json.Substring(index, end - index);
                index = White(json, end);
                if (index < json.Length && json[index] == ',') index++;
                else if (index >= json.Length || json[index] != ']') throw new InvalidDataException("Missing JSON array delimiter.");
            }
        }
    }
}
