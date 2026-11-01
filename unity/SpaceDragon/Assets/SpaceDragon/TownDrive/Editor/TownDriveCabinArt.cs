using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using SpaceDragon.TownDrive.Runtime;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using Object = UnityEngine.Object;

namespace SpaceDragon.TownDrive.Editor
{
    public static partial class TownDriveProject
    {
        public const string CabinArtRoot = Generated + "/CabinArt";
        [Serializable] public sealed class CabinArtReceipt
        {
            public string result = "Succeeded", scope = "Original procedural leather/plastic/textile microstructure and live rear-camera-style mirror. Source geometry and driving state retained.";
            public int renderers, materials;
            public TownDriveSurfaceMeshEvidence[] meshes;
        }

        public static void ApplyCabinArt(GameObject player, Camera mainCamera)
        {
            Folder(CabinArtRoot); Folder(CabinArtRoot + "/Meshes");
            foreach (string grain in new[] { "leather", "plastic", "textile" }) PrepareCabinGrain(grain);
            var materials = new Dictionary<string, Material>();
            var records = new List<TownDriveSurfaceMeshEvidence>();
            int changed = 0;
            foreach (var renderer in player.GetComponentsInChildren<MeshRenderer>(true))
            {
                var originals = renderer.sharedMaterials;
                var filter = renderer.GetComponent<MeshFilter>();
                if (filter == null || originals.Length == 0) continue;
                var tiles = originals.Select(CabinTile).ToArray();
                if (tiles.All(tile => tile == 0)) continue;
                var source = filter.sharedMesh;
                if (source == null || source.subMeshCount != tiles.Length) throw new InvalidDataException("Cabin material/mesh mismatch.");
                if (!AssetDatabase.TryGetGUIDAndLocalFileIdentifier(source, out string guid, out long localId)) throw new InvalidDataException("Cabin source is not persistent.");
                var matrix = player.transform.worldToLocalMatrix * renderer.transform.localToWorldMatrix;
                string path = CabinArtRoot + "/Meshes/" + HashText(guid + ":" + localId + ":" + renderer.name).Substring(0, 20) + ".asset";
                var mesh = AssetDatabase.LoadAssetAtPath<Mesh>(path);
                if (mesh == null) { mesh = Object.Instantiate(source); AssetDatabase.CreateAsset(mesh, path); }
                else EditorUtility.CopySerialized(source, mesh);
                mesh.name = "TownDrive.CabinGrain." + renderer.name;
                mesh.uv = ProjectSurfaceUv(source, matrix, tiles); mesh.RecalculateTangents();
                ValidateSurfaceGeometry(source, mesh); EditorUtility.SetDirty(mesh); filter.sharedMesh = mesh;
                var output = (Material[])originals.Clone();
                for (int i = 0; i < output.Length; i++)
                {
                    if (tiles[i] == 0) continue;
                    string name = originals[i].name;
                    if (!materials.TryGetValue(name, out var material)) { material = CabinMaterial(name); materials.Add(name, material); }
                    output[i] = material;
                }
                renderer.sharedMaterials = output; changed++;
                PrefabUtility.RecordPrefabInstancePropertyModifications(filter); PrefabUtility.RecordPrefabInstancePropertyModifications(renderer);
                records.Add(new TownDriveSurfaceMeshEvidence { sourceAsset = AssetDatabase.GetAssetPath(source), sourceGuid = guid, sourceFileId = localId,
                    derivativeAsset = path, vertexCount = source.vertexCount, triangles = source.triangles.Length / 3, tileMetres = tiles });
            }

            var mirror = new GameObject("TownDrive.RearViewSurface"); mirror.transform.SetParent(player.transform, false);
            mirror.transform.localPosition = new Vector3(0, 1.55f, 1.018f);
            var mirrorMesh = new Mesh { name = "TownDrive.RoundedRearViewSurface" };
            var positions = new List<Vector3> { Vector3.zero }; var uv = new List<Vector2> { new Vector2(.5f, .5f) }; var indices = new List<int>();
            const float w = .125f, h = .032f, radius = .009f;
            for (int corner = 0; corner < 4; corner++) for (int step = 0; step <= 5; step++)
            {
                float angle = (corner * 90 + step * 18) * Mathf.Deg2Rad;
                float x = (corner == 0 || corner == 3 ? w - radius : -w + radius) + Mathf.Cos(angle) * radius;
                float y = (corner < 2 ? h - radius : -h + radius) + Mathf.Sin(angle) * radius;
                positions.Add(new Vector3(x, y, 0)); uv.Add(new Vector2(1 - (x + w) / (2 * w), (y + h) / (2 * h)));
            }
            for (int i = 1; i < positions.Count; i++) { indices.Add(0); indices.Add(i == positions.Count - 1 ? 1 : i + 1); indices.Add(i); }
            mirrorMesh.SetVertices(positions); mirrorMesh.SetUVs(0, uv); mirrorMesh.SetTriangles(indices, 0); mirrorMesh.RecalculateNormals(); mirrorMesh.RecalculateBounds();
            string meshPath = CabinArtRoot + "/RearViewSurface.asset";
            var persisted = AssetDatabase.LoadAssetAtPath<Mesh>(meshPath);
            if (persisted == null) { AssetDatabase.CreateAsset(mirrorMesh, meshPath); persisted = mirrorMesh; }
            else { EditorUtility.CopySerialized(mirrorMesh, persisted); Object.DestroyImmediate(mirrorMesh); EditorUtility.SetDirty(persisted); }
            mirror.AddComponent<MeshFilter>().sharedMesh = persisted;
            var surface = mirror.AddComponent<MeshRenderer>(); surface.shadowCastingMode = ShadowCastingMode.Off; surface.receiveShadows = false;
            string materialPath = CabinArtRoot + "/RearViewSurface.mat";
            var mirrorMaterial = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
            if (mirrorMaterial == null) { mirrorMaterial = new Material(Shader.Find("Universal Render Pipeline/Unlit")); AssetDatabase.CreateAsset(mirrorMaterial, materialPath); }
            mirrorMaterial.name = "TownDrive.LiveRearView"; mirrorMaterial.SetColor("_BaseColor", Color.white); EditorUtility.SetDirty(mirrorMaterial);
            surface.sharedMaterial = mirrorMaterial; surface.enabled = false;
            player.AddComponent<TownDriveRearView>().Configure(player.transform, mainCamera, surface);
            Directory.CreateDirectory("Builds");
            File.WriteAllText("Builds/town-drive-cabin-art-receipt.json", JsonUtility.ToJson(new CabinArtReceipt { renderers = changed, materials = materials.Count, meshes = records.ToArray() }, true));
        }

        static float CabinTile(Material material)
        {
            if (material == null) return 0;
            string name = material.name;
            if (name.StartsWith("drive.car.warm-gray-leather", StringComparison.Ordinal)) return .14f;
            if (name.StartsWith("drive.car.soft-touch-dashboard", StringComparison.Ordinal)) return .10f;
            if (new[] { "drive.car.seat-inserts", "drive.car.ivory-headliner", "drive.car.floor-carpet" }.Any(prefix => name.StartsWith(prefix, StringComparison.Ordinal))) return .20f;
            return 0;
        }
        static Material CabinMaterial(string original)
        {
            string grain = original.Contains("leather") ? "leather" : original.Contains("dashboard") ? "plastic" : "textile";
            Color tint = original.Contains("leather") ? new Color(.56f,.52f,.46f) : original.Contains("dashboard") ? new Color(.105f,.115f,.125f) :
                original.Contains("headliner") ? new Color(.66f,.64f,.59f) : original.Contains("carpet") ? new Color(.07f,.075f,.08f) : new Color(.34f,.31f,.27f);
            string path = CabinArtRoot + "/" + SafeName(original) + ".mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null) { material = new Material(Shader.Find("Universal Render Pipeline/Lit")); AssetDatabase.CreateAsset(material, path); }
            material.name = original + ".cabin-art";
            material.SetColor("_BaseColor", tint); material.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(CabinArtRoot + "/" + grain + "-color.png"));
            material.SetTexture("_BumpMap", AssetDatabase.LoadAssetAtPath<Texture2D>(CabinArtRoot + "/" + grain + "-normal.png"));
            material.SetFloat("_BumpScale", .38f); material.SetFloat("_Metallic", 0); material.SetFloat("_Smoothness", grain == "leather" ? .32f : grain == "plastic" ? .24f : .10f);
            material.SetFloat("_Cull", 0); material.EnableKeyword("_NORMALMAP"); EditorUtility.SetDirty(material); return material;
        }

        static void PrepareCabinGrain(string grain)
        {
            const int size = 256; var height = new float[size * size]; int cells = grain == "plastic" ? 94 : 64;
            for (int y = 0; y < size; y++) for (int x = 0; x < size; x++)
            {
                float u = (float)x / size, v = (float)y / size;
                if (grain == "textile") { height[y * size + x] = .5f + .18f * Mathf.Sin(u * 64 * 2 * Mathf.PI) + .18f * Mathf.Sin(v * 64 * 2 * Mathf.PI); continue; }
                float gx = u * cells, gy = v * cells, first = 10, second = 10;
                int ix = Mathf.FloorToInt(gx), iy = Mathf.FloorToInt(gy);
                for (int oy = -1; oy <= 1; oy++) for (int ox = -1; ox <= 1; ox++)
                {
                    uint seed = unchecked((uint)(((ix + ox + cells) % cells) * 73856093 ^ ((iy + oy + cells) % cells) * 19349663));
                    float rx = (seed & 1023) / 1024f, ry = ((seed >> 10) & 1023) / 1024f;
                    float d = new Vector2(ix + ox + rx - gx, iy + oy + ry - gy).sqrMagnitude;
                    if (d < first) { second = first; first = d; } else if (d < second) second = d;
                }
                height[y * size + x] = .28f + .65f * Mathf.SmoothStep(0, 1, Mathf.Clamp01((Mathf.Sqrt(second) - Mathf.Sqrt(first)) * 3));
            }
            foreach (string channel in new[] { "color", "normal" })
            {
                var texture = new Texture2D(size, size, TextureFormat.RGBA32, false, channel == "normal"); var pixels = new Color[size * size];
                for (int y = 0; y < size; y++) for (int x = 0; x < size; x++)
                {
                    float value = height[y * size + x];
                    if (channel == "color") { float shade = .90f + .10f * value; pixels[y * size + x] = new Color(shade, shade, shade, 1); }
                    else { float dx = height[y * size + (x + 1) % size] - height[y * size + (x + size - 1) % size]; float dy = height[((y + 1) % size) * size + x] - height[((y + size - 1) % size) * size + x]; var n = new Vector3(-dx * .65f, -dy * .65f, 1).normalized; pixels[y * size + x] = new Color(n.x * .5f + .5f, n.y * .5f + .5f, n.z * .5f + .5f, 1); }
                }
                texture.SetPixels(pixels); texture.Apply(); string path = CabinArtRoot + "/" + grain + "-" + channel + ".png"; File.WriteAllBytes(path, texture.EncodeToPNG()); Object.DestroyImmediate(texture);
                AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceSynchronousImport); var importer = (TextureImporter)AssetImporter.GetAtPath(path);
                importer.textureType = channel == "normal" ? TextureImporterType.NormalMap : TextureImporterType.Default; importer.sRGBTexture = channel == "color";
                importer.mipmapEnabled = true; importer.wrapMode = TextureWrapMode.Repeat; importer.anisoLevel = 8; importer.maxTextureSize = size; importer.textureCompression = TextureImporterCompression.CompressedHQ; importer.SaveAndReimport();
            }
        }
    }
}
