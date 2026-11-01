using System;
using System.Collections.Generic;
using System.Globalization;
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
        public const string SurfaceArtRoot = Generated + "/SurfaceArt";
        public static TownDriveSurfaceArtEvidence LastSurfaceArtEvidence { get; private set; }

        /// <summary>
        /// Corrects stretched static scanned surfaces in native derivatives only.
        /// Source boxes map horizontal dimensions onto vertical UV edges; metre
        /// projection restores the photographed tile scale without touching shape.
        /// Vehicles, rigs, foliage, roofs, signs and original imports are excluded.
        /// </summary>
        public static void ApplySurfaceArt(GameObject world)
        {
            if (world == null) throw new ArgumentNullException(nameof(world));
            Folder(SurfaceArtRoot); Folder(SurfaceArtRoot + "/Meshes"); Folder(SurfaceArtRoot + "/Materials");
            var report = new TownDriveSurfaceArtEvidence();
            var materials = new Dictionary<Material, Material>();
            var meshes = new Dictionary<string, Mesh>();
            var records = new List<TownDriveSurfaceMeshEvidence>();
            foreach (var renderer in world.GetComponentsInChildren<MeshRenderer>(true))
            {
                var sourceMaterials = renderer.sharedMaterials;
                var tileMetres = sourceMaterials.Select(SurfaceTileMetres).ToArray();
                if (tileMetres.All(tile => tile <= 0)) continue;
                var filter = renderer.GetComponent<MeshFilter>();
                var source = filter != null ? filter.sharedMesh : null;
                if (source == null || sourceMaterials.Length != source.subMeshCount)
                    throw new InvalidDataException("Scanned surface material/submesh mismatch: " + renderer.name);
                if (Enumerable.Range(0, source.subMeshCount).Any(index => source.GetTopology(index) != MeshTopology.Triangles))
                    throw new InvalidDataException("Scanned surface unexpectedly uses non-triangle topology: " + renderer.name);
                if (!AssetDatabase.TryGetGUIDAndLocalFileIdentifier(source, out string sourceGuid, out long sourceFileId))
                    throw new InvalidDataException("Scanned surface is not a recoverable imported mesh: " + renderer.name);
                var matrix = renderer.transform.localToWorldMatrix;
                string key = sourceGuid + ":" + sourceFileId + ":" + string.Join(",", Enumerable.Range(0, 16)
                    .Select(index => matrix[index].ToString("R", CultureInfo.InvariantCulture))) + ":" +
                    string.Join(",", tileMetres.Select(value => value.ToString("R", CultureInfo.InvariantCulture)));
                if (!meshes.TryGetValue(key, out var derivative))
                {
                    var uv = ProjectSurfaceUv(source, matrix, tileMetres);
                    string label = SafeName(source.name);
                    if (label.Length > 64) label = label.Substring(0, 64);
                    string path = SurfaceArtRoot + "/Meshes/" + label + "-" + HashText(key).Substring(0, 16) + ".asset";
                    derivative = AssetDatabase.LoadAssetAtPath<Mesh>(path);
                    if (derivative == null) { derivative = Object.Instantiate(source); AssetDatabase.CreateAsset(derivative, path); }
                    else EditorUtility.CopySerialized(source, derivative);
                    derivative.name = source.name + ".surface-art";
                    derivative.uv = uv;
                    derivative.RecalculateTangents();
                    ValidateSurfaceGeometry(source, derivative);
                    EditorUtility.SetDirty(derivative);
                    meshes.Add(key, derivative);
                    records.Add(new TownDriveSurfaceMeshEvidence {
                        sourceAsset = AssetDatabase.GetAssetPath(source), sourceGuid = sourceGuid, sourceFileId = sourceFileId,
                        derivativeAsset = path, vertexCount = source.vertexCount,
                        triangles = Enumerable.Range(0, source.subMeshCount).Sum(index => (long)source.GetIndexCount(index) / 3),
                        tileMetres = tileMetres, worldMatrix = Enumerable.Range(0, 16).Select(index => matrix[index]).ToArray()
                    });
                }
                filter.sharedMesh = derivative;
                var resultMaterials = (Material[])sourceMaterials.Clone();
                for (int index = 0; index < sourceMaterials.Length; index++)
                {
                    if (tileMetres[index] <= 0) continue;
                    var original = sourceMaterials[index];
                    if (!materials.TryGetValue(original, out var result))
                    {
                        string identity = AssetDatabase.GetAssetPath(original) + ":" + original.name;
                        string path = SurfaceArtRoot + "/Materials/" + SafeName(original.name) + "-" + HashText(identity).Substring(0, 12) + ".mat";
                        result = AssetDatabase.LoadAssetAtPath<Material>(path);
                        if (result == null) { result = new Material(original); AssetDatabase.CreateAsset(result, path); }
                        else EditorUtility.CopySerialized(original, result);
                        result.name = original.name + ".surface-art";
                        // All maps share UV0 in physical metres. Clear the source
                        // KHR texture transform consistently, including normal/data
                        // maps, instead of changing only the colour map's scale.
                        foreach (var property in result.GetTexturePropertyNames())
                        {
                            result.SetTextureScale(property, Vector2.one);
                            result.SetTextureOffset(property, Vector2.zero);
                            if (result.HasProperty(property + "_Rotation")) result.SetVector(property + "_Rotation", Vector4.zero);
                            if (result.HasProperty(property + "_texCoord")) result.SetFloat(property + "_texCoord", 0);
                        }
                        result.enableInstancing = true;
                        EditorUtility.SetDirty(result);
                        materials.Add(original, result);
                    }
                    resultMaterials[index] = result;
                }
                renderer.sharedMaterials = resultMaterials;
                PrefabUtility.RecordPrefabInstancePropertyModifications(filter);
                PrefabUtility.RecordPrefabInstancePropertyModifications(renderer);
                report.renderers++;
            }
            report.meshes = records.ToArray();
            report.meshCount = records.Count;
            report.materialCount = materials.Count;
            report.vertices = records.Sum(record => (long)record.vertexCount);
            report.triangles = records.Sum(record => record.triangles);
            LastSurfaceArtEvidence = report;
            Directory.CreateDirectory("Builds");
            File.WriteAllText("Builds/town-drive-surface-art-receipt.json", JsonUtility.ToJson(report, true));
        }

        public static float SurfaceTileMetres(Material material)
        {
            if (material == null) return 0;
            // Exact family allowlist: no inferred material substitutions for any
            // vehicle, pedestrian, vegetation, sign or newly imported art.
            switch (material.name)
            {
                case "drive.pbr.asphalt": case "drive.pbr.wet-asphalt": return 2.08f;
                case "drive.pbr.concrete": case "drive.pbr.curb":
                case "drive.pbr.boundary-wall": case "drive.pbr.storefront":
                case "drive.development.stucco.0": case "drive.development.stucco.1": case "drive.development.stucco.2": return 2f;
                case "drive.pbr.grass": case "drive.pbr.median-grass": case "drive.pbr.terrain-grass": return 2.51f;
                default: return 0;
            }
        }

        public static Vector2[] ProjectSurfaceUv(Mesh source, Matrix4x4 localToWorld, float[] tileMetres)
        {
            var positions = source.vertices;
            var normals = source.normals;
            var uv = source.uv;
            if (normals.Length != positions.Length || uv.Length != positions.Length || tileMetres.Length != source.subMeshCount)
                throw new InvalidDataException("Scanned surface is missing its original normals/UVs: " + source.name);
            var ownership = new float[positions.Length];
            var selected = new bool[positions.Length];
            for (int submesh = 0; submesh < source.subMeshCount; submesh++)
            {
                foreach (int vertex in source.GetIndices(submesh))
                {
                    float tile = tileMetres[submesh];
                    if (selected[vertex] && ownership[vertex] != tile)
                        throw new InvalidDataException("A scanned surface shares vertices across incompatible material projections: " + source.name);
                    selected[vertex] = true; ownership[vertex] = tile;
                }
            }
            var normalMatrix = localToWorld.inverse.transpose;
            for (int vertex = 0; vertex < positions.Length; vertex++)
            {
                if (ownership[vertex] <= 0) continue;
                var position = localToWorld.MultiplyPoint3x4(positions[vertex]);
                var normal = normalMatrix.MultiplyVector(normals[vertex]).normalized;
                float tile = ownership[vertex];
                if (Mathf.Abs(normal.y) > .7071067f)
                    uv[vertex] = new Vector2(position.x / tile, position.z / tile);
                else
                {
                    // A façade's horizontal axis follows its actual normal rather
                    // than snapping to world X/Z. Height always remains vertical.
                    var horizontal = Vector3.Cross(Vector3.up, normal).normalized;
                    uv[vertex] = new Vector2(Vector3.Dot(position, horizontal) / tile, position.y / tile);
                }
                if (float.IsNaN(uv[vertex].x) || float.IsInfinity(uv[vertex].x) || float.IsNaN(uv[vertex].y) || float.IsInfinity(uv[vertex].y))
                    throw new InvalidDataException("Non-finite static surface UV: " + source.name);
            }
            return uv;
        }

        public static void ValidateSurfaceGeometry(Mesh source, Mesh derivative)
        {
            if (source.vertexCount != derivative.vertexCount || source.subMeshCount != derivative.subMeshCount ||
                !source.vertices.SequenceEqual(derivative.vertices) || !source.normals.SequenceEqual(derivative.normals) ||
                source.bounds != derivative.bounds || !source.colors32.SequenceEqual(derivative.colors32))
                throw new InvalidDataException("Surface correction changed physical geometry: " + source.name);
            for (int submesh = 0; submesh < source.subMeshCount; submesh++)
                if (source.GetTopology(submesh) != derivative.GetTopology(submesh) || !source.GetIndices(submesh).SequenceEqual(derivative.GetIndices(submesh)))
                    throw new InvalidDataException("Surface correction changed topology: " + source.name);
            if (derivative.tangents.Length != derivative.vertexCount)
                throw new InvalidDataException("Surface correction lacks rebuilt tangents: " + source.name);
        }
    }

    [Serializable] public sealed class TownDriveSurfaceArtEvidence
    {
        public string result = "PASS", scope = "Static scanned surfaces only; world-metre UVs and rebuilt tangents. Source geometry/imports unchanged.";
        public int renderers, meshCount, materialCount;
        public long vertices, triangles;
        public TownDriveSurfaceMeshEvidence[] meshes;
    }
    [Serializable] public sealed class TownDriveSurfaceMeshEvidence
    {
        public string sourceAsset, sourceGuid, derivativeAsset;
        public long sourceFileId, triangles;
        public int vertexCount;
        public float[] tileMetres, worldMatrix;
    }
}
