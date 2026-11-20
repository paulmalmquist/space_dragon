using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace SpaceDragon.Dogfight.Editor
{
    // Decorative environment artwork. Rocks are local; planet imagery is a pinned NASA derivative.
    // See assets/source/environments/near-orbit-nasa-v001 for source, recipe and credits.
    // All geometry here is decorative. Encounter placement/collision and tuning are untouched.
    internal static class DogfightEnvironmentArt
    {
        const string Folder = DogfightProject.Generated + "/EnvironmentArt";

        static float Noise(Vector3 p)
        {
            return (Mathf.PerlinNoise(p.x + 31, p.y + 17) + Mathf.PerlinNoise(p.y + 73, p.z + 29)
                + Mathf.PerlinNoise(p.z + 11, p.x + 59)) / 3f;
        }
        static Vector3 Sphere(float u, float v)
        {
            float a = u * Mathf.PI * 2, b = v * Mathf.PI;
            return new Vector3(Mathf.Sin(b) * Mathf.Cos(a), Mathf.Cos(b), Mathf.Sin(b) * Mathf.Sin(a));
        }
        static Texture2D Write(string name, Color[] pixels, int width, int height, bool linear = false, bool normal = false, int maxSize = 1024, bool repeatV = false, int anisotropy = 1)
        {
            Directory.CreateDirectory(Folder);
            var image = new Texture2D(width, height, TextureFormat.RGBA32, false, linear);
            image.SetPixels(pixels); image.Apply();
            string path = Folder + "/" + name + ".png";
            File.WriteAllBytes(path, image.EncodeToPNG()); Object.DestroyImmediate(image);
            AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceSynchronousImport);
            var importer = (TextureImporter)AssetImporter.GetAtPath(path);
            importer.textureType = normal ? TextureImporterType.NormalMap : TextureImporterType.Default;
            importer.sRGBTexture = !linear && !normal; importer.mipmapEnabled = true;
            importer.wrapModeU = TextureWrapMode.Repeat; importer.wrapModeV = repeatV ? TextureWrapMode.Repeat : TextureWrapMode.Clamp;
            importer.anisoLevel = Mathf.Max(anisotropy, repeatV ? 4 : 1);
            importer.textureCompression = TextureImporterCompression.Compressed; importer.maxTextureSize = maxSize;
            importer.SaveAndReimport(); return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        }

        public static void Rock(Material material)
        {
            const int size = 512;
            var height = new float[size * size]; var color = new Color[height.Length];
            var mask = new Color[height.Length]; var normal = new Color[height.Length];
            // Spherical sampling closes the longitudinal seam and avoids stretched polar noise.
            for (int y = 0; y < size; y++) for (int x = 0; x < size; x++)
            {
                int i = y * size + x; Vector3 p = Sphere((float)x / (size - 1), (float)y / (size - 1));
                float broad = Noise(p * 3.2f), medium = Noise(p * 19), grain = Noise(p * 91);
                float vein = Mathf.Pow(Mathf.Clamp01(1 - Mathf.Abs(Noise(p * 8) - .5f) * 32), 3);
                float pits = Mathf.SmoothStep(0, 1, Mathf.Clamp01((.44f - medium) * 7));
                height[i] = broad * .45f + medium * .32f + grain * .1f - pits * .22f - vein * .06f;
                color[i] = Color.Lerp(new Color(.10f,.105f,.11f), new Color(.43f,.38f,.31f), Mathf.Clamp01(broad * .8f + grain * .35f));
                color[i] *= 1 - pits * .28f - vein * .18f;
                // URP metallic R, occlusion G, smoothness A. Dry regolith, not polished metal.
                mask[i] = new Color(0, 1 - pits * .35f, 0, .13f + grain * .14f);
            }
            for (int y = 0; y < size; y++) for (int x = 0; x < size; x++)
            {
                int left = (x + size - 1) % size, right = (x + 1) % size;
                float dx = height[y * size + right] - height[y * size + left];
                float dy = height[Mathf.Min(size - 1,y + 1) * size + x] - height[Mathf.Max(0,y - 1) * size + x];
                Vector3 n = new Vector3(-dx * 6, -dy * 6, 1).normalized;
                normal[y * size + x] = new Color(n.x * .5f + .5f, n.y * .5f + .5f, n.z * .5f + .5f);
            }
            material.SetTexture("_BaseMap", Write("regolith-color-v001", color, size, size));
            material.SetColor("_BaseColor", Color.white);
            material.SetTexture("_BumpMap", Write("regolith-normal-v001", normal, size, size, true, true));
            material.SetFloat("_BumpScale", .85f); material.EnableKeyword("_NORMALMAP");
            var packed = Write("regolith-mask-v001", mask, size, size, true);
            material.SetTexture("_MetallicGlossMap", packed); material.EnableKeyword("_METALLICSPECGLOSSMAP");
            material.SetFloat("_Smoothness", 1); material.SetTexture("_OcclusionMap", packed);
            material.SetFloat("_OcclusionStrength", .6f); material.EnableKeyword("_OCCLUSIONMAP");
            EditorUtility.SetDirty(material);
        }

        public static void Planet(GameObject planet, Material surface)
        {
            // Satellite macro geography with a detailed regional crop: bounded imagery,
            // three sphere draws, no raymarch, displacement, terrain physics or network.
            surface.shader = Shader.Find("SpaceDragon/Dogfight/Near Orbit Surface") ?? throw new InvalidDataException("Near Orbit Surface shader is missing.");
            surface.SetTexture("_BaseMap", SatelliteTexture("earth-global-color-land-v001",2048,true,false));
            surface.SetTexture("_RegionMap",SatelliteTexture("earth-regional-color-land-v001",4096,true,true));
            surface.SetTexture("_TerrainMap",SatelliteTexture("earth-regional-relief-v001",2048,false,true));
            surface.SetVector("_RegionUv",new Vector4(156f/360,36f/180,72f/360,36f/180));
            var clouds = SatelliteTexture("earth-cloud-density-slopes-v001",4096,false,false);
            var cloudDetail = CloudDetail();
            surface.SetTexture("_CloudMap",clouds); surface.SetTexture("_CloudDetailMap",cloudDetail);
            surface.SetFloat("_CloudRepeat",128);
            surface.SetFloat("_CloudHeight",140); surface.SetFloat("_PlanetRadius",26000);
            surface.SetColor("_HazeColor",new Color(.13f,.23f,.32f));
            // Compose the visible cap around 36N/12E. The detailed crop contains the
            // entire camera-visible horizon. Geographic north maps to world +Z.
            // This Earth reference is visual scenery, not a new canonical destination.
            Vector3 location = Sphere(192f/360,54f/180);
            float longitude = 192f/360*Mathf.PI*2, colatitude=54f/180*Mathf.PI;
            Vector3 north = new Vector3(-Mathf.Cos(colatitude)*Mathf.Cos(longitude),Mathf.Sin(colatitude),-Mathf.Cos(colatitude)*Mathf.Sin(longitude));
            planet.transform.rotation = Quaternion.Inverse(Quaternion.LookRotation(north,location));
            Mesh horizonMesh = HorizonMesh();
            planet.GetComponent<MeshFilter>().sharedMesh = horizonMesh;
            var backdrop = planet.AddComponent<NearOrbitBackdrop>(); backdrop.CameraOffset = planet.transform.position;
            CreateClouds(planet.transform,horizonMesh,clouds,cloudDetail);
            CreateAtmosphere(planet.transform, horizonMesh);
            const int segments = 512, radial = 256, angular = 128;
            var ringPixels = new Color[radial * angular];
            Quaternion ringRotation = Quaternion.Euler(27, 0, 0);
            Vector3 towardSun = Quaternion.Inverse(planet.transform.rotation * ringRotation) * -RenderSettings.sun.transform.forward;
            for (int row = 0; row < angular; row++) for (int i = 0; i < radial; i++)
            {
                float r = (float)i / (radial - 1);
                float grain = Mathf.PerlinNoise(r * 110, 8);
                float alpha = (r > .57f && r < .64f) || grain < .28f || r < .02f || r > .98f ? 0 : 1;
                float angle = (float)row / (angular - 1) * Mathf.PI * 2;
                Vector3 point = new Vector3(Mathf.Cos(angle), 0, Mathf.Sin(angle)) * Mathf.Lerp(.63f, 1.15f, r);
                float along = Vector3.Dot(-point, towardSun);
                float separation = (point + towardSun * along).magnitude;
                // Fixed scenery: bake only the planet's soft shadow into the ring derivative.
                // No runtime lights, transparent sorting or distant shadow cascades are required.
                float shade = along > 0 ? Mathf.Lerp(.14f, 1, Mathf.SmoothStep(0, 1, (separation - .46f) / .08f)) : 1;
                float variation = .86f + Noise(point * 35) * .2f;
                Color tint = new Color(.26f + grain * .24f, .24f + grain * .22f, .21f + grain * .19f) * shade * variation;
                tint.a = alpha; ringPixels[row * radial + i] = tint;
            }
            string materialPath = Folder + "/Planet rings.mat";
            var ringMaterial = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
            if (ringMaterial == null) { ringMaterial = new Material(Shader.Find("Universal Render Pipeline/Lit")); AssetDatabase.CreateAsset(ringMaterial, materialPath); }
            ringMaterial.SetTexture("_BaseMap", Write("ring-bands-v001", ringPixels, radial, angular));
            ringMaterial.SetColor("_BaseColor", Color.white); ringMaterial.SetFloat("_Smoothness", .08f);
            ringMaterial.SetFloat("_Cull", 0); ringMaterial.SetFloat("_AlphaClip", 1); ringMaterial.SetFloat("_Cutoff", .45f);
            ringMaterial.EnableKeyword("_ALPHATEST_ON"); ringMaterial.renderQueue = 2450;
            var vertices = new Vector3[(segments + 1) * 2]; var uv = new Vector2[vertices.Length]; var triangles = new int[segments * 6];
            for (int i = 0; i <= segments; i++)
            {
                float a = (float)i / segments * Mathf.PI * 2;
                Vector3 direction = new Vector3(Mathf.Cos(a), 0, Mathf.Sin(a));
                vertices[i * 2] = direction * .63f; vertices[i * 2 + 1] = direction * 1.15f;
                uv[i * 2] = new Vector2(0,(float)i / segments); uv[i * 2 + 1] = new Vector2(1,(float)i / segments);
                if (i == segments) continue;
                int t = i * 6, b = i * 2;
                triangles[t] = b; triangles[t + 1] = b + 2; triangles[t + 2] = b + 1;
                triangles[t + 3] = b + 1; triangles[t + 4] = b + 2; triangles[t + 5] = b + 3;
            }
            string meshPath = Folder + "/Planet rings.asset";
            var mesh = AssetDatabase.LoadAssetAtPath<Mesh>(meshPath);
            if (mesh == null) { mesh = new Mesh(); AssetDatabase.CreateAsset(mesh, meshPath); } else mesh.Clear();
            mesh.vertices = vertices; mesh.uv = uv; mesh.triangles = triangles; mesh.RecalculateNormals(); mesh.RecalculateBounds();
            var rings = new GameObject("Planet rings.visual-only", typeof(MeshFilter), typeof(MeshRenderer));
            rings.transform.SetParent(planet.transform, false); rings.transform.localRotation = ringRotation;
            rings.GetComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = rings.GetComponent<MeshRenderer>(); renderer.sharedMaterial = ringMaterial;
            renderer.shadowCastingMode = ShadowCastingMode.Off; renderer.receiveShadows = false;
            // Retain the prior ring artwork for distant planetary compositions. At this
            // altitude its alpha-cut strands became intrusive aliased arches in browser review.
            renderer.enabled = false;
            EditorUtility.SetDirty(mesh); EditorUtility.SetDirty(ringMaterial); EditorUtility.SetDirty(surface);
        }

        static float PeriodicNoise(float u, float v, float frequency, Vector2 seed)
        {
            // Four shifted fields blend with zero-derivative weights at both tile edges.
            // Values and first derivatives match across U/V; no painted seam or edge fade.
            float x = u * frequency + seed.x, y = v * frequency + seed.y;
            float sx = u * u * (3 - 2 * u), sy = v * v * (3 - 2 * v);
            float top = Mathf.Lerp(Mathf.PerlinNoise(x, y), Mathf.PerlinNoise(x - frequency, y), sx);
            float bottom = Mathf.Lerp(Mathf.PerlinNoise(x, y - frequency), Mathf.PerlinNoise(x - frequency, y - frequency), sx);
            return Mathf.Lerp(top, bottom, sy);
        }

        static Texture2D CloudDetail()
        {
            const int size = 512;
            var heights = new float[size * size]; var packed = new Color[heights.Length];
            for (int y = 0; y < size; y++) for (int x = 0; x < size; x++)
            {
                float u = (float)x / (size - 1), v = (float)y / (size - 1);
                float coarse = PeriodicNoise(u, v, 5, new Vector2(17, 23));
                float medium = PeriodicNoise(u, v, 13, new Vector2(41, 71));
                float curl = PeriodicNoise(u, v, 29, new Vector2(83, 37));
                // Broad billows with restrained secondary curls; omit grain-frequency noise.
                heights[y * size + x] = Mathf.SmoothStep(.13f, .86f, coarse * .58f + medium * .29f + curl * .13f);
            }
            for (int y = 0; y < size; y++) for (int x = 0; x < size; x++)
            {
                int left = x == 0 ? size - 2 : x - 1, right = x == size - 1 ? 1 : x + 1;
                int below = y == 0 ? size - 2 : y - 1, above = y == size - 1 ? 1 : y + 1;
                float h = heights[y * size + x];
                float du = (heights[y * size + right] - heights[y * size + left]) * 20;
                float dv = (heights[above * size + x] - heights[below * size + x]) * 20;
                float cavity = Mathf.Clamp01((.48f - h) * 2);
                // R height, GB signed tangent slopes, A shallow cavity density. One shader read.
                packed[y * size + x] = new Color(h, Mathf.Clamp01(du * .5f + .5f), Mathf.Clamp01(dv * .5f + .5f), cavity);
            }
            return Write("cloud-billows-v002", packed, size, size, true, maxSize: size, repeatV: true, anisotropy:8);
        }

        static Texture2D SatelliteTexture(string name,int maxSize,bool srgb,bool region)
        {
            string path="Assets/SpaceDragon/Dogfight/Imported/PlanetSatellite-v001/"+name+".png";
            if(!File.Exists(path)) throw new FileNotFoundException("Prepare the pinned NASA derivatives with tools/prepare_near_orbit_satellite.py before building.",path);
            AssetDatabase.ImportAsset(path,ImportAssetOptions.ForceSynchronousImport);
            var importer=(TextureImporter)AssetImporter.GetAtPath(path);
            importer.textureType=TextureImporterType.Default;
            importer.sRGBTexture=srgb; importer.alphaSource=TextureImporterAlphaSource.FromInput;
            importer.alphaIsTransparency=false; importer.mipmapEnabled=true; importer.isReadable=false;
            importer.wrapModeU=region?TextureWrapMode.Clamp:TextureWrapMode.Repeat;
            importer.wrapModeV=TextureWrapMode.Clamp; importer.anisoLevel=8;
            importer.npotScale=TextureImporterNPOTScale.None;
            importer.maxTextureSize=maxSize; importer.textureCompression=TextureImporterCompression.CompressedHQ;
            // The current Lenovo/Chrome build already verifies BC7 for Oscar. Keep a
            // bounded desktop target; a mobile build needs its own ASTC/ETC decision.
            foreach(string platform in new[]{"Standalone","WebGL"})
                importer.SetPlatformTextureSettings(new TextureImporterPlatformSettings{
                    name=platform,overridden=true,maxTextureSize=maxSize,
                    format=TextureImporterFormat.BC7,textureCompression=TextureImporterCompression.CompressedHQ,
                    compressionQuality=80});
            importer.SaveAndReimport();
            return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        }

        static void CreateClouds(Transform planet,Mesh mesh,Texture2D atlas,Texture2D detail)
        {
            const string path=Folder+"/Near orbit clouds.satellite-v001.mat";
            var material=AssetDatabase.LoadAssetAtPath<Material>(path);
            if(material==null)
            {
                material=new Material(Shader.Find("SpaceDragon/Dogfight/Near Orbit Clouds") ?? throw new InvalidDataException("Near Orbit Clouds shader is missing."));
                AssetDatabase.CreateAsset(material,path);
            }
            material.SetTexture("_CloudMap",atlas); material.SetTexture("_CloudDetailMap",detail);
            material.SetFloat("_CloudRepeat",128); material.SetColor("_HazeColor",new Color(.13f,.23f,.32f));
            var shell=new GameObject("Cloud layer.140m.visual-only",typeof(MeshFilter),typeof(MeshRenderer));
            shell.transform.SetParent(planet,false); shell.transform.localScale=Vector3.one*(1+140f/26000);
            shell.GetComponent<MeshFilter>().sharedMesh=mesh;
            var renderer=shell.GetComponent<MeshRenderer>();renderer.sharedMaterial=material;
            renderer.shadowCastingMode=ShadowCastingMode.Off;renderer.receiveShadows=false;
            EditorUtility.SetDirty(material);
        }

        static float Storm(float u, float v, float centerU, float centerV)
        {
            float du = Mathf.Repeat(u - centerU + .5f, 1) - .5f;
            float x = du / .035f, y = (v - centerV) / .015f;
            float radius2 = x * x + y * y;
            if (radius2 > 9) return 0;
            float angle = Mathf.Atan2(y, x) + Mathf.Exp(-radius2 * .35f) * 4;
            return Mathf.Sin(angle * 2 + Mathf.Sqrt(radius2) * 9) * Mathf.Exp(-radius2 * .6f);
        }

        static Mesh HorizonMesh()
        {
            const int longitude = 128, latitude = 64;
            var vertices = new Vector3[(longitude + 1) * (latitude + 1)];
            var normals = new Vector3[vertices.Length]; var uv = new Vector2[vertices.Length]; var tangents = new Vector4[vertices.Length];
            var triangles = new int[longitude * latitude * 6];
            for (int y = 0; y <= latitude; y++) for (int x = 0; x <= longitude; x++)
            {
                int i = y * (longitude + 1) + x;
                uv[i] = new Vector2((float)x / longitude, (float)y / latitude);
                normals[i] = Sphere(uv[i].x, uv[i].y); vertices[i] = normals[i] * .5f;
                float angle = uv[i].x * Mathf.PI * 2;
                tangents[i] = new Vector4(-Mathf.Sin(angle), 0, Mathf.Cos(angle), 1);
                if (x == longitude || y == latitude) continue;
                int t = (y * longitude + x) * 6, below = i + longitude + 1;
                triangles[t] = i; triangles[t + 1] = i + 1; triangles[t + 2] = below;
                triangles[t + 3] = i + 1; triangles[t + 4] = below + 1; triangles[t + 5] = below;
            }
            string path = Folder + "/Near orbit horizon.asset";
            var mesh = AssetDatabase.LoadAssetAtPath<Mesh>(path);
            if (mesh == null) { mesh = new Mesh(); AssetDatabase.CreateAsset(mesh, path); } else mesh.Clear();
            mesh.name = "Near orbit 128x64 smooth horizon";
            mesh.vertices = vertices; mesh.normals = normals; mesh.tangents = tangents; mesh.uv = uv; mesh.triangles = triangles; mesh.RecalculateBounds();
            EditorUtility.SetDirty(mesh); return mesh;
        }

        static void CreateAtmosphere(Transform planet, Mesh mesh)
        {
            string path = Folder + "/Near orbit atmosphere.mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                material = new Material(Shader.Find("SpaceDragon/Dogfight/Near Orbit Atmosphere") ?? throw new InvalidDataException("Near Orbit Atmosphere shader is missing."));
                AssetDatabase.CreateAsset(material, path);
            }
            material.SetColor("_AtmosphereColor", new Color(.16f,.31f,.46f));
            material.SetFloat("_PlanetRadius", 26000); material.SetFloat("_AtmosphereRadius", 26208); material.SetFloat("_Density", .36f);
            var shell = new GameObject("Atmospheric limb.visual-only", typeof(MeshFilter), typeof(MeshRenderer));
            shell.transform.SetParent(planet, false); shell.transform.localScale = Vector3.one * 1.008f;
            shell.GetComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = shell.GetComponent<MeshRenderer>(); renderer.sharedMaterial = material;
            renderer.shadowCastingMode = ShadowCastingMode.Off; renderer.receiveShadows = false;
            EditorUtility.SetDirty(material);
        }
    }
}
