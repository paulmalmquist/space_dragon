using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace SpaceDragon.TownDrive.Editor
{
    public static partial class TownDriveProject
    {
        public const string ArtInputs = Root + "/Art/v002";
        public const string RoofArt = Generated + "/RoofArt";
        public static int ArtRoofMeshes { get; private set; }
        public static int ArtWallRenderers { get; private set; }

        [Serializable] sealed class ArtProvenance { public TownDriveSceneFile[] files; }
        public static void VerifyArtInputs()
        {
            var receipt = JsonUtility.FromJson<ArtProvenance>(File.ReadAllText(ArtInputs + "/provenance.json"));
            if (receipt?.files == null || receipt.files.Length != 9) throw new InvalidDataException("Expected nine prepared scanned maps.");
            string root = Path.GetFullPath(ArtInputs) + Path.DirectorySeparatorChar;
            foreach (var entry in receipt.files)
            {
                string path = Path.GetFullPath(Path.Combine(ArtInputs,entry.path));
                if (!path.StartsWith(root,StringComparison.OrdinalIgnoreCase) || !File.Exists(path) ||
                    new FileInfo(path).Length != entry.bytes || HashFile(path) != entry.sha256)
                    throw new InvalidDataException("Scanned surface input differs: " + entry.path);
            }
        }

        // New native derivatives: the browser exports remain exact rollback inputs.
        public static void ApplyRoofAndWallArt(GameObject world)
        {
            Folder(RoofArt); Folder(RoofArt + "/Meshes");
            ArtRoofMeshes = 0; ArtWallRenderers = 0;
            var clay = ScannedArtMaterial("RoofClay", "clay_roof_tiles_02", Color.white, .85f);
            var pale = ScannedArtMaterial("RoofPale", "clay_roof_tiles_02", new Color(.94f,.86f,.75f), .85f);
            var grey = ScannedArtMaterial("RoofGrey", "grey_roof_tiles_02", Color.white, .8f);
            var walls = new[] {
                ScannedArtMaterial("StuccoIvory", "white_stucco", new Color(.86f,.82f,.73f), .55f),
                ScannedArtMaterial("StuccoSage", "white_stucco", new Color(.70f,.77f,.73f), .55f),
                ScannedArtMaterial("StuccoSand", "white_stucco", new Color(.83f,.75f,.67f), .55f) };
            int meshId = 0;
            foreach (var renderer in world.GetComponentsInChildren<MeshRenderer>(true))
            {
                var materials = renderer.sharedMaterials;
                bool changed = false, roof = false; float tileMetres = 2.5f;
                for (int i=0;i<materials.Length;i++)
                {
                    var source = materials[i]; if (source == null) continue;
                    string name = source.name;
                    if (name.StartsWith("drive.development.") && name.Contains("roof"))
                    {
                        roof = changed = true;
                        bool isGrey = name.Contains("grey-roof"); tileMetres = isGrey ? 1.5f : 2.5f;
                        materials[i] = isGrey ? grey : name.Contains("pale-clay") ? pale : clay;
                    }
                    else if (name.StartsWith("drive.development.stucco.") || name.StartsWith("drive.pbr.storefront") || name.StartsWith("drive.pbr.boundary-wall"))
                    {
                        int variant = name.Contains("stucco.1") ? 1 : name.Contains("stucco.2") ? 2 : 0;
                        materials[i] = walls[variant]; changed = true; ArtWallRenderers++;
                    }
                }
                if (changed) { renderer.sharedMaterials = materials; PrefabUtility.RecordPrefabInstancePropertyModifications(renderer); }
                if (!roof) continue;
                var filter = renderer.GetComponent<MeshFilter>();
                if (filter == null || filter.sharedMesh == null) throw new InvalidDataException("Roof mesh missing.");
                if (materials.Length != 1) throw new InvalidDataException("Review new mixed-material roof before UV projection.");
                var original = filter.sharedMesh; var derived = UnityEngine.Object.Instantiate(original);
                derived.name = "TownDrive.Roof.Surface." + meshId;
                var vertices = derived.vertices; var normals = derived.normals; var uv = new Vector2[vertices.Length];
                var normalMatrix = renderer.transform.localToWorldMatrix.inverse.transpose;
                for (int i=0;i<vertices.Length;i++)
                {
                    Vector3 p = renderer.transform.TransformPoint(vertices[i]);
                    Vector3 n = normalMatrix.MultiplyVector(normals[i]).normalized;
                    Vector3 right = Vector3.Cross(Vector3.up,n);
                    if (right.sqrMagnitude < .001f) right = Vector3.right;
                    right.Normalize(); Vector3 slope = Vector3.Cross(n,right).normalized;
                    uv[i] = new Vector2(Vector3.Dot(p,right),Vector3.Dot(p,slope))/tileMetres;
                }
                derived.uv = uv; derived.RecalculateTangents();
                var path = RoofArt + "/Meshes/roof-" + (meshId++).ToString("D3") + ".asset";
                var existing = AssetDatabase.LoadAssetAtPath<Mesh>(path);
                if (existing == null) { AssetDatabase.CreateAsset(derived,path); existing = derived; }
                else { EditorUtility.CopySerialized(derived,existing); UnityEngine.Object.DestroyImmediate(derived); EditorUtility.SetDirty(existing); }
                filter.sharedMesh = existing; PrefabUtility.RecordPrefabInstancePropertyModifications(filter); ArtRoofMeshes++;
            }
            if (ArtRoofMeshes < 20 || ArtWallRenderers < 20) throw new InvalidDataException("Detailed residential art was not bound to the mapped world.");
        }

        static Material ScannedArtMaterial(string name, string scan, Color tint, float normalStrength)
        {
            var path = RoofArt + "/" + name + ".mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? throw new InvalidDataException("URP Lit missing.");
            if (material == null) { material = new Material(shader); AssetDatabase.CreateAsset(material,path); }
            material.shader = shader; material.name = "TownDrive.Art." + name; material.enableInstancing = true;
            material.SetTexture("_BaseMap", ArtTexture(scan,"albedo",true,false));
            material.SetTexture("_BumpMap", ArtTexture(scan,"normal",false,true));
            var mask = ArtTexture(scan,"mask",false,false);
            material.SetTexture("_MetallicGlossMap",mask); material.SetTexture("_OcclusionMap",mask);
            material.SetColor("_BaseColor",tint); material.SetFloat("_BumpScale",normalStrength);
            material.SetFloat("_Metallic",0); material.SetFloat("_Smoothness",1);
            material.SetFloat("_OcclusionStrength",.75f); material.SetFloat("_SmoothnessTextureChannel",0);
            material.EnableKeyword("_NORMALMAP"); material.EnableKeyword("_METALLICSPECGLOSSMAP"); material.EnableKeyword("_OCCLUSIONMAP");
            material.DisableKeyword("_SMOOTHNESS_TEXTURE_ALBEDO_CHANNEL_A");
            material.SetTextureScale("_BaseMap",Vector2.one); EditorUtility.SetDirty(material); return material;
        }

        static Texture2D ArtTexture(string scan,string channel,bool srgb,bool normal)
        {
            string path = ArtInputs + "/" + scan + "/" + channel + ".png";
            var importer = AssetImporter.GetAtPath(path) as TextureImporter ?? throw new FileNotFoundException("Prepared CC0 art input missing.",path);
            var type = normal ? TextureImporterType.NormalMap : TextureImporterType.Default;
            if (importer.textureType != type || importer.sRGBTexture != srgb || !importer.mipmapEnabled || importer.anisoLevel != 8 || importer.wrapMode != TextureWrapMode.Repeat ||
                importer.maxTextureSize != 1024 || importer.textureCompression != TextureImporterCompression.CompressedHQ)
            {
                importer.textureType = type; importer.sRGBTexture = srgb; importer.mipmapEnabled = true;
                importer.wrapMode = TextureWrapMode.Repeat; importer.anisoLevel = 8; importer.maxTextureSize = 1024;
                importer.textureCompression = TextureImporterCompression.CompressedHQ; importer.SaveAndReimport();
            }
            return AssetDatabase.LoadAssetAtPath<Texture2D>(path) ?? throw new InvalidDataException("Texture did not import: " + path);
        }
    }
}
