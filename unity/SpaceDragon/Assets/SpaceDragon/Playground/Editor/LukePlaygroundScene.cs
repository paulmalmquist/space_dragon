using System;
using System.Collections.Generic;
using System.IO;
using SpaceDragon.Traversal;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using Object = UnityEngine.Object;

namespace SpaceDragon.Playground.Editor
{
    // World drawing for Luke's Playground. Every shape is derived from the level data, so the
    // picture cannot disagree with the collision. Nothing here has a collider: the engine-free
    // session owns movement.
    public static partial class LukePlaygroundProject
    {
        static int lightCount;
        static float F(double value) => (float)value;

        sealed class Palette
        {
            public readonly Material grass = Textured("Play-grass", "grass", new Color(0.62f, 0.74f, 0.56f), 0.32f, 0.32f);
            public readonly Material asphalt = Lit("Play-asphalt", new Color(0.085f, 0.09f, 0.1f), 0.28f);
            public readonly Material paint = Lit("Play-road-paint", new Color(0.78f, 0.76f, 0.66f), 0.2f);
            public readonly Material concrete = Textured("Play-concrete", "concrete", new Color(0.82f, 0.82f, 0.8f), 0.45f, 0.45f);
            public readonly Material floor = Textured("Play-floor-wood", "wood", new Color(0.86f, 0.68f, 0.5f), 0.7f, 0.7f);
            public readonly Material deckWood = Textured("Play-deck-wood", "wood", new Color(0.62f, 0.5f, 0.4f), 0.55f, 0.55f);
            public readonly Material fence = Textured("Play-fence-wood", "wood", new Color(0.9f, 0.88f, 0.84f), 0.6f, 0.6f);
            public readonly Material playWood = Textured("Play-playset-wood", "wood", new Color(0.94f, 0.72f, 0.46f), 0.8f, 0.8f);
            public readonly Material wallHome = Textured("Play-wall-home", "plaster", new Color(0.93f, 0.9f, 0.84f), 0.4f, 0.4f);
            public readonly Material wallCoral = Textured("Play-wall-coral", "plaster", new Color(0.88f, 0.64f, 0.54f), 0.4f, 0.4f);
            public readonly Material wallSage = Textured("Play-wall-sage", "plaster", new Color(0.64f, 0.72f, 0.62f), 0.4f, 0.4f);
            public readonly Material wallSand = Textured("Play-wall-sand", "plaster", new Color(0.86f, 0.78f, 0.62f), 0.4f, 0.4f);
            public readonly Material wallSky = Textured("Play-wall-sky", "plaster", new Color(0.62f, 0.74f, 0.82f), 0.4f, 0.4f);
            public readonly Material roof = Lit("Play-roof", new Color(0.17f, 0.18f, 0.21f), 0.32f);
            public readonly Material trim = Lit("Play-trim", new Color(0.93f, 0.93f, 0.9f), 0.35f);
            public readonly Material door = Textured("Play-door-wood", "wood", new Color(0.42f, 0.26f, 0.18f), 0.9f, 0.9f);
            public readonly Material sand = Lit("Play-sand", new Color(0.78f, 0.7f, 0.52f), 0.12f);
            public readonly Material hedge = Lit("Play-hedge", new Color(0.09f, 0.22f, 0.1f), 0.12f);
            public readonly Material palmBark = Textured("Play-palm-bark", "wood", new Color(0.5f, 0.42f, 0.34f), 1.4f, 0.5f);
            public readonly Material oakBark = Textured("Play-oak-bark", "wood", new Color(0.3f, 0.24f, 0.2f), 1.2f, 0.4f);
            public readonly Material palmLeaf = Lit("Play-palm-leaf", new Color(0.12f, 0.33f, 0.14f), 0.3f);
            public readonly Material oakLeaf = Lit("Play-oak-leaf", new Color(0.08f, 0.2f, 0.09f), 0.1f);
            public readonly Material metal = Lit("Play-metal", new Color(0.46f, 0.48f, 0.5f), 0.62f, 0.85f);
            public readonly Material darkMetal = Lit("Play-dark-metal", new Color(0.1f, 0.11f, 0.13f), 0.55f, 0.7f);
            public readonly Material slide = Lit("Play-slide-plastic", new Color(0.95f, 0.72f, 0.1f), 0.78f);
            public readonly Material redPlastic = Lit("Play-red-plastic", new Color(0.82f, 0.16f, 0.12f), 0.7f);
            public readonly Material bluePad = Lit("Play-blue-pad", new Color(0.1f, 0.3f, 0.72f), 0.5f);
            public readonly Material rubber = Lit("Play-rubber", new Color(0.03f, 0.03f, 0.035f), 0.3f);
            public readonly Material sofa = Lit("Play-sofa-fabric", new Color(0.36f, 0.45f, 0.5f), 0.12f);
            public readonly Material cushion = Lit("Play-cushion", new Color(0.86f, 0.82f, 0.74f), 0.1f);
            public readonly Material rug = Lit("Play-rug", new Color(0.62f, 0.2f, 0.17f), 0.06f);
            public readonly Material glass = Lit("Play-glass", new Color(0.03f, 0.05f, 0.07f), 0.94f, 0.2f);
            public readonly Material water = Lit("Play-water", new Color(0.012f, 0.045f, 0.07f), 0.95f, 0.1f);
            public readonly Material windowWarm = Glow("Play-window-warm", new Color(1, 0.74f, 0.42f), 1.7f);
            public readonly Material windowNight = Glow("Play-window-night", new Color(0.2f, 0.34f, 0.6f), 0.55f);
            public readonly Material lampGlow = Glow("Play-lamp-glow", new Color(1, 0.86f, 0.62f), 4.2f);
            public readonly Material screenGlow = Glow("Play-screen-glow", new Color(0.62f, 0.86f, 1), 1.9f);
            public readonly Material beacon = Glow("Play-beacon", new Color(1, 0.2f, 0.14f), 3);
            public readonly Material farLight = Glow("Play-far-light", new Color(1, 0.8f, 0.52f), 2.6f);
            public readonly Material sparkGlow = Glow("Play-spark", new Color(1, 0.82f, 0.36f), 3.4f);
            public readonly Material tetherGlow = Glow("Play-tether", new Color(0.36f, 0.9f, 1), 3.2f);
            public readonly Material perchGlow = Glow("Play-perch", new Color(1, 0.76f, 0.26f), 3);
            public readonly Material reticleGlow = Glow("Play-reticle", new Color(0.8f, 1, 1), 4);

            public Material Wall(string palette) =>
                palette == "coral" ? wallCoral : palette == "sage" ? wallSage : palette == "sand" ? wallSand : palette == "sky" ? wallSky : wallHome;
        }

        // ---------- Materials ----------
        static Material Lit(string name, Color color, float smoothness, float metallic = 0)
        {
            string path = MaterialFolder + "/" + name + ".mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                var shader = Shader.Find("Universal Render Pipeline/Lit");
                if (shader == null) throw new InvalidOperationException("URP/Lit shader is missing; resolve the pinned URP package.");
                material = new Material(shader);
                AssetDatabase.CreateAsset(material, path);
            }
            material.SetColor("_BaseColor", color);
            material.SetFloat("_Smoothness", smoothness);
            material.SetFloat("_Metallic", metallic);
            EditorUtility.SetDirty(material);
            return material;
        }

        /// <summary>A prepared surface. Tiling is in repeats per metre; meshes carry UVs in metres.</summary>
        static Material Textured(string name, string source, Color tint, float perMetreU, float perMetreV)
        {
            var material = Lit(name, tint, 1);
            Texture2D Load(string channel)
            {
                string path = Surfaces + "/" + source + "-" + channel + ".png";
                return AssetDatabase.LoadAssetAtPath<Texture2D>(path) ?? throw new FileNotFoundException("Missing prepared surface channel.", path);
            }
            material.SetTexture("_BaseMap", Load("albedo"));
            material.SetTexture("_BumpMap", Load("normal"));
            material.SetTexture("_MetallicGlossMap", Load("metallic-smoothness"));
            material.SetFloat("_BumpScale", 0.5f);
            material.EnableKeyword("_NORMALMAP");
            material.EnableKeyword("_METALLICSPECGLOSSMAP");
            foreach (string property in new[] { "_BaseMap", "_BumpMap", "_MetallicGlossMap" }) material.SetTextureScale(property, new Vector2(perMetreU, perMetreV));
            EditorUtility.SetDirty(material);
            return material;
        }

        /// <summary>Unlit and brighter than white, so the bloom pass turns it into light.</summary>
        static Material Glow(string name, Color color, float intensity)
        {
            string path = MaterialFolder + "/" + name + ".mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                var shader = Shader.Find("Universal Render Pipeline/Unlit");
                if (shader == null) throw new InvalidOperationException("URP/Unlit shader is missing; resolve the pinned URP package.");
                material = new Material(shader);
                AssetDatabase.CreateAsset(material, path);
            }
            material.SetColor("_BaseColor", new Color(color.r * intensity, color.g * intensity, color.b * intensity, 1));
            EditorUtility.SetDirty(material);
            return material;
        }

        // ---------- Shapes ----------
        static GameObject Shape(string name, Mesh mesh, Material material, Transform parent, bool shadows = true)
        {
            var shape = new GameObject(name);
            shape.transform.SetParent(parent, false);
            shape.AddComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = shape.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = shadows ? ShadowCastingMode.On : ShadowCastingMode.Off;
            GameObjectUtility.SetStaticEditorFlags(shape, StaticEditorFlags.BatchingStatic | StaticEditorFlags.ReflectionProbeStatic);
            return shape;
        }

        /// <summary>A prism between two corners whose top may slope along x or z. UVs are in metres.</summary>
        static Mesh PrismMesh(Vector3 min, Vector3 max, bool sloped, bool alongX, float atMin, float atMax)
        {
            float lowA = sloped ? atMin : max.y, lowB = sloped ? atMax : max.y;
            // Corner heights: index 0..3 = (minX,minZ) (maxX,minZ) (maxX,maxZ) (minX,maxZ).
            float[] top = alongX ? new[] { lowA, lowB, lowB, lowA } : new[] { lowA, lowA, lowB, lowB };
            Vector3[] foot = { new Vector3(min.x, min.y, min.z), new Vector3(max.x, min.y, min.z), new Vector3(max.x, min.y, max.z), new Vector3(min.x, min.y, max.z) };
            var head = new Vector3[4];
            for (int index = 0; index < 4; index++) head[index] = new Vector3(foot[index].x, top[index], foot[index].z);
            var vertices = new List<Vector3>(); var uvs = new List<Vector2>(); var triangles = new List<int>();
            void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d, Func<Vector3, Vector2> uv)
            {
                int start = vertices.Count;
                vertices.Add(a); vertices.Add(b); vertices.Add(c); vertices.Add(d);
                uvs.Add(uv(a)); uvs.Add(uv(b)); uvs.Add(uv(c)); uvs.Add(uv(d));
                triangles.Add(start); triangles.Add(start + 1); triangles.Add(start + 2);
                triangles.Add(start); triangles.Add(start + 2); triangles.Add(start + 3);
            }
            Vector2 Flat(Vector3 p) => new Vector2(p.x, p.z);
            Vector2 SideX(Vector3 p) => new Vector2(p.x, p.y);
            Vector2 SideZ(Vector3 p) => new Vector2(p.z, p.y);
            Quad(head[0], head[3], head[2], head[1], Flat);   // top, facing up
            Quad(foot[0], foot[1], foot[2], foot[3], Flat);   // bottom, facing down
            Quad(foot[0], head[0], head[1], foot[1], SideX);  // z = min
            Quad(foot[2], head[2], head[3], foot[3], SideX);  // z = max
            Quad(foot[1], head[1], head[2], foot[2], SideZ);  // x = max
            Quad(foot[3], head[3], head[0], foot[0], SideZ);  // x = min
            var mesh = new Mesh { name = "Playground.prism" };
            mesh.SetVertices(vertices);
            mesh.SetUVs(0, uvs);
            mesh.SetTriangles(triangles, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateTangents();
            mesh.RecalculateBounds();
            return mesh;
        }

        static GameObject Block(string name, Vector3 min, Vector3 max, Material material, Transform parent, bool shadows = true) =>
            Shape(name, PrismMesh(min, max, false, true, 0, 0), material, parent, shadows);

        static GameObject Block(string name, double minX, double maxX, double minY, double maxY, double minZ, double maxZ, Material material, Transform parent, bool shadows = true) =>
            Block(name, new Vector3(F(minX), F(minY), F(minZ)), new Vector3(F(maxX), F(maxY), F(maxZ)), material, parent, shadows);

        static GameObject Wedge(string name, Solid solid, Material material, Transform parent) =>
            Shape(name, PrismMesh(new Vector3(F(solid.minX), F(solid.minY), F(solid.minZ)), new Vector3(F(solid.maxX), F(solid.maxY), F(solid.maxZ)),
                solid.hasSlope, solid.slopeAlongX, F(solid.slopeAtMin), F(solid.slopeAtMax)), material, parent);

        static GameObject Primitive(PrimitiveType type, string name, Material material, Transform parent, bool shadows)
        {
            var shape = GameObject.CreatePrimitive(type);
            shape.name = name;
            var collider = shape.GetComponent<Collider>();
            if (collider != null) Object.DestroyImmediate(collider);
            shape.transform.SetParent(parent, false);
            var renderer = shape.GetComponent<Renderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = shadows ? ShadowCastingMode.On : ShadowCastingMode.Off;
            GameObjectUtility.SetStaticEditorFlags(shape, StaticEditorFlags.BatchingStatic | StaticEditorFlags.ReflectionProbeStatic);
            return shape;
        }

        /// <summary>A round bar between two points.</summary>
        static GameObject Bar(string name, Vector3 from, Vector3 to, float radius, Material material, Transform parent, bool shadows = true)
        {
            var bar = Primitive(PrimitiveType.Cylinder, name, material, parent, shadows);
            Vector3 along = to - from;
            bar.transform.position = (from + to) * 0.5f;
            if (along.sqrMagnitude > 1e-8f) bar.transform.rotation = Quaternion.FromToRotation(Vector3.up, along.normalized);
            bar.transform.localScale = new Vector3(radius * 2, along.magnitude * 0.5f, radius * 2);
            return bar;
        }

        static GameObject Ball(string name, Vector3 centre, Vector3 size, Material material, Transform parent, bool shadows = true)
        {
            var ball = Primitive(PrimitiveType.Sphere, name, material, parent, shadows);
            ball.transform.position = centre;
            ball.transform.localScale = size;
            return ball;
        }

        static void Lamp(string name, Vector3 position, Color color, float intensity, float range, Transform parent)
        {
            var light = new GameObject(name).AddComponent<Light>();
            light.transform.SetParent(parent, false);
            light.type = LightType.Point;
            light.transform.position = position;
            light.color = color;
            light.intensity = intensity;
            light.range = range;
            light.shadows = LightShadows.None;
            lightCount++;
        }

        static GameObject Ring(string name, float radius, float width, Material material, Transform parent)
        {
            var line = new GameObject(name).AddComponent<LineRenderer>();
            line.transform.SetParent(parent, false);
            const int points = 28;
            line.useWorldSpace = false;
            line.loop = true;
            line.positionCount = points;
            for (int index = 0; index < points; index++)
            {
                float angle = index * Mathf.PI * 2 / points;
                line.SetPosition(index, new Vector3(Mathf.Cos(angle) * radius, Mathf.Sin(angle) * radius, 0));
            }
            line.startWidth = width;
            line.endWidth = width;
            line.sharedMaterial = material;
            line.shadowCastingMode = ShadowCastingMode.Off;
            line.receiveShadows = false;
            return line.gameObject;
        }

        static Mesh DiamondMesh()
        {
            Vector3[] corners = { Vector3.up, Vector3.down, Vector3.right * 0.62f, Vector3.forward * 0.62f, Vector3.left * 0.62f, Vector3.back * 0.62f };
            int[,] faces = { { 0, 3, 2 }, { 0, 4, 3 }, { 0, 5, 4 }, { 0, 2, 5 }, { 1, 2, 3 }, { 1, 3, 4 }, { 1, 4, 5 }, { 1, 5, 2 } };
            var vertices = new List<Vector3>(); var triangles = new List<int>();
            for (int face = 0; face < 8; face++) for (int corner = 0; corner < 3; corner++) { triangles.Add(vertices.Count); vertices.Add(corners[faces[face, corner]]); }
            var mesh = new Mesh { name = "Playground.spark" };
            mesh.SetVertices(vertices);
            mesh.SetTriangles(triangles, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }

        /// <summary>One palm frond along +z: rises, then droops; a shallow V so it catches light. Drawn on both sides.</summary>
        static Mesh FrondMesh()
        {
            const int rings = 9;
            var vertices = new List<Vector3>(); var triangles = new List<int>();
            for (int ring = 0; ring < rings; ring++)
            {
                float t = ring / (float)(rings - 1);
                float z = t, y = 0.2f * Mathf.Sin(t * Mathf.PI * 0.85f) - 0.62f * t * t;
                float half = 0.17f * Mathf.Sin(Mathf.PI * (0.06f + 0.94f * t)) * (1 - 0.25f * t);
                vertices.Add(new Vector3(-half, y - 0.035f, z)); vertices.Add(new Vector3(0, y, z)); vertices.Add(new Vector3(half, y - 0.035f, z));
            }
            for (int ring = 0; ring < rings - 1; ring++)
            {
                int a = ring * 3, b = a + 3;
                foreach (int offset in new[] { 0, 1 })
                {
                    triangles.Add(a + offset); triangles.Add(b + offset); triangles.Add(b + offset + 1);
                    triangles.Add(a + offset); triangles.Add(b + offset + 1); triangles.Add(a + offset + 1);
                }
            }
            // Duplicate with reversed winding so the underside is drawn too.
            int count = vertices.Count, indices = triangles.Count;
            for (int index = 0; index < count; index++) vertices.Add(vertices[index]);
            for (int index = 0; index < indices; index += 3) { triangles.Add(triangles[index] + count); triangles.Add(triangles[index + 2] + count); triangles.Add(triangles[index + 1] + count); }
            var mesh = new Mesh { name = "Playground.frond" };
            mesh.SetVertices(vertices);
            mesh.SetTriangles(triangles, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }

        // ---------- Ground, street and lake ----------
        static void BuildGround(Transform parent, Palette m)
        {
            lightCount = 0;
            var ground = new GameObject("Ground").transform;
            ground.SetParent(parent, false);
            float shore = F(HomeBlockScenery.ShoreX);
            // Tiles keep each piece within reach of only its nearby lights.
            for (float x = -72; x < shore - 0.01f; x += 11.125f)
                for (float z = -72; z < 71.9f; z += 12)
                    Block("Grass", x, Mathf.Min(shore, x + 11.125f), -0.5f, 0, z, z + 12, m.grass, ground, false);
            for (float z = -75; z < 74.9f; z += 15)
            {
                Block("Street", -30, -22, -0.2f, 0.015f, z, z + 15, m.asphalt, ground, false);
                Block("Street.line", -26.06f, -25.94f, 0, 0.02f, z + 2, z + 6.5f, m.paint, ground, false);
            }
            Block("Driveway", -22, -17.5f, -0.1f, 0.02f, 3.4f, 7.6f, m.concrete, ground, false);
            Block("Front-walk", -22, -17.5f, -0.1f, 0.02f, -0.6f, 0.6f, m.concrete, ground, false);
            Block("Seawall", shore - 0.25f, shore + 0.05f, -1.5f, 0.025f, -60, 60, m.concrete, ground); // Flush with the lawn: the level has no kerb here.
            for (float z = -120; z < 119.9f; z += 40) Block("Lake", shore, 180, -1.4f, -0.25f, z, z + 40, m.water, ground, false);
            // Lights of the far shore.
            uint seed = 20261115;
            for (int index = 0; index < 46; index++)
            {
                seed = unchecked(seed * 1664525u + 1013904223u); float a = (seed >> 8) / 16777216f;
                seed = unchecked(seed * 1664525u + 1013904223u); float b = (seed >> 8) / 16777216f;
                seed = unchecked(seed * 1664525u + 1013904223u); float c = (seed >> 8) / 16777216f;
                Ball("Far-light", new Vector3(150 + a * 30, 0.8f + b * 5, -115 + c * 230), Vector3.one * (0.5f + b * 0.5f), m.farLight, ground, false);
            }
        }

        // ---------- Everything the hero can touch ----------
        static HouseSpec HouseOf(string solidId)
        {
            foreach (var house in HomeBlockScenery.Houses) if (solidId.StartsWith(house.id + "-", StringComparison.Ordinal)) return house;
            return HomeBlockScenery.Houses[0];
        }

        static void BuildSolids(TraversalWorld world, Transform parent, Palette m, SetupEvidence evidence)
        {
            var root = new GameObject("Solids").transform;
            root.SetParent(parent, false);
            foreach (var solid in world.solids)
            {
                string id = solid.id;
                var min = new Vector3(F(solid.minX), F(solid.minY), F(solid.minZ));
                var max = new Vector3(F(solid.maxX), F(solid.maxY), F(solid.maxZ));
                if (solid.kind == "trunk" || id.StartsWith("playset-", StringComparison.Ordinal)) continue; // Drawn with their scenery below.
                if (id == "computer-desk" || id == "sofa" || id == "trampoline" || id == "pod") continue;    // Drawn as furniture below.
                if (solid.kind == "roof") Wedge(id, solid, m.roof, root);
                else if (id == "home-floor") Block(id, min, max, m.floor, root);
                else if (id == "patio") Block(id, min, max, m.concrete, root);
                else if (id == "trampoline-step") Block(id, min, max, m.playWood, root);
                else if (id == "sandbar") Block(id, min, max, m.sand, root);
                else if (solid.kind == "deck") { if (solid.hasSlope) Wedge(id, solid, m.deckWood, root); else Block(id, min, max, m.deckWood, root); }
                else if (solid.kind == "fence") Fence(id, min, max, m, root);
                else if (id.StartsWith("hedge-", StringComparison.Ordinal)) Block(id, min, max, m.hedge, root);
                else if (id.StartsWith("car-", StringComparison.Ordinal)) Car(id, min, max, m, root);
                else if (id == "garage") Garage(min, max, m, root);
                else Block(id, min, max, solid.house ? m.wallHome : m.Wall(HouseOf(id).palette), root);
            }
            Pod(root, m, evidence);
            Trampoline(root, m);
        }

        static void Fence(string id, Vector3 min, Vector3 max, Palette m, Transform parent)
        {
            Block(id, new Vector3(min.x, 0.06f, min.z), new Vector3(max.x, max.y - 0.06f, max.z), m.fence, parent);
            bool alongX = max.x - min.x > max.z - min.z;
            float length = alongX ? max.x - min.x : max.z - min.z;
            int posts = Mathf.Max(2, Mathf.RoundToInt(length / 1.7f) + 1);
            for (int index = 0; index < posts; index++)
            {
                float t = index / (float)(posts - 1);
                float x = alongX ? Mathf.Lerp(min.x, max.x, t) : (min.x + max.x) * 0.5f, z = alongX ? (min.z + max.z) * 0.5f : Mathf.Lerp(min.z, max.z, t);
                Block(id + ".post", new Vector3(x - 0.07f, 0, z - 0.07f), new Vector3(x + 0.07f, max.y + 0.08f, z + 0.07f), m.trim, parent);
            }
        }

        static void Car(string id, Vector3 min, Vector3 max, Palette m, Transform parent)
        {
            Color paint = Color.gray;
            foreach (var car in HomeBlockScenery.Cars) if (car.id == id) ColorUtility.TryParseHtmlString(car.color, out paint);
            var body = Lit("Play-" + id + "-paint", paint, 0.82f, 0.35f);
            bool alongX = max.x - min.x > max.z - min.z;
            Vector3 size = max - min, centre = (min + max) * 0.5f;
            float length = alongX ? size.x : size.z, width = alongX ? size.z : size.x;
            Vector3 Local(float along, float up, float across) => alongX ? new Vector3(centre.x + along, up, centre.z + across) : new Vector3(centre.x + across, up, centre.z + along);
            void Part(string name, float a0, float a1, float y0, float y1, float halfWidth, Material material)
            {
                Vector3 a = Local(a0, y0, -halfWidth), b = Local(a1, y1, halfWidth);
                Block(id + "." + name, Vector3.Min(a, b), Vector3.Max(a, b), material, parent);
            }
            Part("body", -length * 0.5f, length * 0.5f, 0.3f, 0.86f, width * 0.5f, body);
            Part("cabin", -length * 0.2f, length * 0.24f, 0.86f, max.y - 0.03f, width * 0.44f, m.glass);
            Part("roof", -length * 0.16f, length * 0.2f, max.y - 0.05f, max.y, width * 0.42f, body);
            Part("lamps", length * 0.5f - 0.03f, length * 0.5f + 0.01f, 0.56f, 0.72f, width * 0.42f, m.windowWarm);
            foreach (float along in new[] { -length * 0.32f, length * 0.32f })
                foreach (float side in new[] { -1f, 1f })
                {
                    Vector3 hub = Local(along, 0.32f, side * (width * 0.5f - 0.1f));
                    Vector3 axle = alongX ? Vector3.forward : Vector3.right;
                    Bar(id + ".wheel", hub - axle * 0.11f, hub + axle * 0.11f, 0.32f, m.rubber, parent);
                }
        }

        static void Garage(Vector3 min, Vector3 max, Palette m, Transform parent)
        {
            Block("garage", min, max, m.wallHome, parent);
            Block("garage.cap", new Vector3(min.x - 0.12f, max.y, min.z - 0.12f), new Vector3(max.x + 0.12f, max.y + 0.1f, max.z + 0.12f), m.trim, parent);
            Block("garage.door", new Vector3(min.x + 0.5f, 0.02f, min.z - 0.04f), new Vector3(max.x - 0.5f, 2.3f, min.z), m.trim, parent);
            Ball("garage.light", new Vector3((min.x + max.x) * 0.5f, 2.62f, min.z - 0.12f), Vector3.one * 0.16f, m.lampGlow, parent, false);
            Lamp("garage.light.source", new Vector3((min.x + max.x) * 0.5f, 2.5f, min.z - 0.7f), new Color(1, 0.84f, 0.62f), 9, 8, parent);
        }

        static void Pod(Transform parent, Palette m, SetupEvidence evidence)
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(PodPath);
            if (prefab != null)
            {
                var pod = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
                pod.name = "pod";
                pod.transform.SetParent(parent, false);
                pod.transform.position = new Vector3(3.5f, 0.01f, 0);
                foreach (var animator in pod.GetComponentsInChildren<Animator>(true)) animator.enabled = false;
                evidence.podAssetUsed = true;
            }
            else
            {
                Block("pod", 2.65, 4.35, 0, 2.2, -0.85, 0.85, m.darkMetal, parent);
                Block("pod.seam", 2.63, 4.37, 1.02, 1.1, -0.87, 0.87, m.tetherGlow, parent, false);
            }
            Lamp("pod.light", new Vector3(3.5f, 1.5f, -1.2f), new Color(0.2f, 0.72f, 1), 7, 7, parent);
        }

        static void Trampoline(Transform parent, Palette m)
        {
            float x = F((HomeBlockScenery.TrampolineMinX + HomeBlockScenery.TrampolineMaxX) * 0.5), z = F((HomeBlockScenery.TrampolineMinZ + HomeBlockScenery.TrampolineMaxZ) * 0.5);
            float radius = F((HomeBlockScenery.TrampolineMaxX - HomeBlockScenery.TrampolineMinX) * 0.5), top = F(HomeBlockScenery.TrampolineTop);
            Bar("trampoline.mat", new Vector3(x, top - 0.03f, z), new Vector3(x, top, z), radius - 0.16f, m.rubber, parent);
            const int pads = 16;
            for (int index = 0; index < pads; index++)
            {
                float a = index * Mathf.PI * 2 / pads, b = (index + 1) * Mathf.PI * 2 / pads;
                Bar("trampoline.pad", new Vector3(x + Mathf.Cos(a) * (radius - 0.08f), top, z + Mathf.Sin(a) * (radius - 0.08f)),
                    new Vector3(x + Mathf.Cos(b) * (radius - 0.08f), top, z + Mathf.Sin(b) * (radius - 0.08f)), 0.085f, m.bluePad, parent);
            }
            for (int index = 0; index < 6; index++)
            {
                float a = index * Mathf.PI / 3 + 0.3f;
                var foot = new Vector3(x + Mathf.Cos(a) * (radius - 0.06f), 0, z + Mathf.Sin(a) * (radius - 0.06f));
                Bar("trampoline.leg", foot, foot + Vector3.up * (top - 0.05f), 0.03f, m.metal, parent);
            }
        }

        // ---------- Lamps, poles, trees, houses' faces ----------
        static void BuildScenery(Transform parent, Palette m)
        {
            var root = new GameObject("Scenery").transform;
            root.SetParent(parent, false);
            foreach (var lamp in HomeBlockScenery.Lamps)
            {
                var foot = new Vector3(F(lamp.x), lamp.floor > 0 ? -1.5f : 0, F(lamp.z));
                var top = new Vector3(F(lamp.x), F(lamp.height), F(lamp.z));
                var head = new Vector3(F(lamp.x + lamp.armX), F(lamp.height) - 0.2f, F(lamp.z + lamp.armZ));
                Bar(lamp.id + ".post", foot, top, 0.075f, m.darkMetal, root);
                Bar(lamp.id + ".arm", top - Vector3.up * 0.15f, head + Vector3.up * 0.12f, 0.05f, m.darkMetal, root);
                Ball(lamp.id + ".head", head - Vector3.up * 0.16f, new Vector3(0.5f, 0.2f, 0.5f), m.lampGlow, root, false);
                Lamp(lamp.id + ".light", head - Vector3.up * 0.7f, new Color(1, 0.84f, 0.6f), 30, 17, root);
            }
            Vector3? previousWire = null;
            foreach (var pole in HomeBlockScenery.Poles)
            {
                var top = new Vector3(F(pole.x), F(pole.height), F(pole.z));
                var arm = new Vector3(F(pole.armX), 0, F(pole.armZ));
                Bar(pole.id + ".post", new Vector3(F(pole.x), 0, F(pole.z)), top, 0.14f, m.oakBark, root);
                Bar(pole.id + ".arm", top - Vector3.up * 0.3f - arm, top - Vector3.up * 0.3f + arm, 0.06f, m.oakBark, root);
                var wire = top - Vector3.up * 0.22f + arm * 0.9f;
                if (previousWire.HasValue)
                {
                    Bar(pole.id + ".wire-a", previousWire.Value, wire, 0.014f, m.rubber, root, false);
                    Bar(pole.id + ".wire-b", previousWire.Value - arm * 1.8f, wire - arm * 1.8f, 0.014f, m.rubber, root, false);
                }
                previousWire = wire;
            }
            foreach (var piling in HomeBlockScenery.Pilings)
            {
                var top = new Vector3(F(piling.x), F(piling.height), F(piling.z));
                Bar(piling.id + ".post", new Vector3(F(piling.x), -1.5f, F(piling.z)), top, 0.24f, m.oakBark, root);
                Bar(piling.id + ".arm", top - Vector3.up * 0.25f, new Vector3(F(piling.x + piling.armX), F(piling.height) - 0.2f, F(piling.z + piling.armZ)), 0.07f, m.oakBark, root);
            }
            var frond = FrondMesh();
            foreach (var palm in HomeBlockScenery.Palms) Palm(palm, frond, m, root);
            foreach (var tree in HomeBlockScenery.Trees) Oak(tree, m, root);
            foreach (var mast in HomeBlockScenery.RoofMasts)
            {
                var top = new Vector3(F(mast.x), F(mast.height), F(mast.z));
                Bar(mast.id + ".pole", new Vector3(F(mast.x), F(mast.ridge) - 0.1f, F(mast.z)), top, 0.035f, m.metal, root);
                Ball(mast.id + ".beacon", top + Vector3.up * 0.08f, Vector3.one * 0.14f, m.beacon, root, false);
            }
            var mastTop = new Vector3(F(HomeBlockScenery.DockMastPostX), F(HomeBlockScenery.DockMastHeight), F(HomeBlockScenery.DockMastPostZ));
            Bar("dock-mast.post", new Vector3(mastTop.x, F(HomeBlockScenery.DockDeck), mastTop.z), mastTop, 0.12f, m.metal, root);
            Bar("dock-mast.boom", mastTop - Vector3.up * 0.2f, new Vector3(F(HomeBlockScenery.DockMastX), F(HomeBlockScenery.DockMastHeight), F(HomeBlockScenery.DockMastZ)), 0.06f, m.metal, root);
            Ball("dock-mast.beacon", mastTop + Vector3.up * 0.1f, Vector3.one * 0.16f, m.beacon, root, false);
            // Dock legs.
            for (float x = F(HomeBlockScenery.DockMinX) + 1; x < F(HomeBlockScenery.DockEndMaxX); x += 4.4f)
                foreach (float side in new[] { -1f, 1f })
                {
                    float half = x > F(HomeBlockScenery.DockMaxX) ? F(HomeBlockScenery.DockEndHalfWidth) : F(HomeBlockScenery.DockHalfWidth);
                    Bar("dock.leg", new Vector3(x, -1.5f, side * (half - 0.15f)), new Vector3(x, F(HomeBlockScenery.DockDeck) - 0.2f, side * (half - 0.15f)), 0.11f, m.oakBark, root);
                }
            foreach (var house in HomeBlockScenery.Houses) HouseFace(house, m, root, true);
            foreach (var house in HomeBlockScenery.BackdropHouses)
            {
                Block(house.id + ".walls", house.minX, house.maxX, 0, house.wall, house.minZ, house.maxZ, m.Wall(house.palette), root);
                foreach (var roof in RoofSolids(house)) Wedge(roof.id, roof, m.roof, root);
                HouseFace(house, m, root, false);
            }
        }

        static void Palm(PalmSpec palm, Mesh frond, Palette m, Transform parent)
        {
            var foot = new Vector3(F(palm.x), 0, F(palm.z));
            var crown = new Vector3(F(palm.x + palm.leanX), F(palm.height), F(palm.z + palm.leanZ));
            var bend = new Vector3(foot.x, crown.y * 0.62f, foot.z);
            const int pieces = 6;
            Vector3 previous = foot;
            for (int index = 1; index <= pieces; index++)
            {
                float t = index / (float)pieces, u = 1 - t;
                Vector3 point = u * u * foot + 2 * u * t * bend + t * t * crown;
                Bar(palm.id + ".trunk", previous - (point - previous).normalized * 0.04f, point, Mathf.Lerp(0.2f, 0.12f, t), m.palmBark, parent);
                previous = point;
            }
            Ball(palm.id + ".heart", crown, Vector3.one * 0.5f, m.palmBark, parent);
            const int fronds = 12;
            for (int index = 0; index < fronds; index++)
            {
                var leaf = Shape(palm.id + ".frond", frond, m.palmLeaf, parent);
                float droop = index % 3 == 0 ? 18 : index % 3 == 1 ? -8 : 34;
                leaf.transform.position = crown + Vector3.up * 0.12f;
                leaf.transform.rotation = Quaternion.Euler(droop, index * 360f / fronds + (index % 2) * 9, 0);
                float length = 3.1f + (index % 4) * 0.28f;
                leaf.transform.localScale = new Vector3(length * 1.5f, length, length);
            }
        }

        static void Oak(TreeSpec tree, Palette m, Transform parent)
        {
            var foot = new Vector3(F(tree.x), 0, F(tree.z));
            var fork = new Vector3(F(tree.x), F(tree.height - tree.crown), F(tree.z));
            var limb = new Vector3(F(tree.x + tree.limbX), F(tree.height) - 0.6f, F(tree.z + tree.limbZ));
            Bar(tree.id + ".trunk", foot, fork + Vector3.up * 0.4f, 0.38f, m.oakBark, parent);
            Bar(tree.id + ".limb", fork, limb, 0.15f, m.oakBark, parent);
            Bar(tree.id + ".limb-b", fork, fork + new Vector3(-F(tree.limbX) - 1.4f, 2.2f, -F(tree.limbZ) * 0.6f), 0.13f, m.oakBark, parent);
            float crown = F(tree.crown);
            Vector3 centre = fork + Vector3.up * (crown * 0.62f);
            Vector3[] offsets = { Vector3.zero, new Vector3(0.6f, 0.1f, 0.25f), new Vector3(-0.55f, 0.05f, 0.35f), new Vector3(0.2f, 0.15f, -0.6f), new Vector3(-0.3f, -0.1f, -0.5f),
                new Vector3(0.1f, 0.5f, 0.1f), new Vector3(0.55f, -0.25f, -0.35f), new Vector3(-0.6f, -0.2f, -0.1f), new Vector3(0, -0.3f, 0.6f) };
            for (int index = 0; index < offsets.Length; index++)
            {
                float size = crown * (index == 0 ? 1.25f : 0.78f + (index % 3) * 0.1f);
                Ball(tree.id + ".canopy", centre + offsets[index] * crown, new Vector3(size, size * 0.72f, size), m.oakLeaf, parent);
            }
        }

        /// <summary>Two planar prisms meeting at the ridge, as in src/game/traversal/home-block.ts.</summary>
        static Solid[] RoofSolids(HouseSpec house)
        {
            double o = house.overhang, baseHeight = house.wall + HomeBlockScenery.RoofThickness;
            double low = house.ridgeAlongX ? house.minZ : house.minX, high = house.ridgeAlongX ? house.maxZ : house.maxX, mid = (low + high) / 2;
            double pitch = (house.ridge - baseHeight) / (mid - low), edge = baseHeight - o * pitch, minY = edge - HomeBlockScenery.RoofThickness;
            Solid Half(string suffix, double from, double to, double atMin, double atMax)
            {
                var roof = new Solid { id = house.id + suffix, kind = "roof", minY = minY, maxY = house.ridge, hasSlope = true, slopeAlongX = !house.ridgeAlongX, slopeAtMin = atMin, slopeAtMax = atMax };
                if (house.ridgeAlongX) { roof.minX = house.minX - o; roof.maxX = house.maxX + o; roof.minZ = from; roof.maxZ = to; }
                else { roof.minZ = house.minZ - o; roof.maxZ = house.maxZ + o; roof.minX = from; roof.maxX = to; }
                return roof;
            }
            return new[] { Half("-roof-a", low - o, mid, edge, house.ridge), Half("-roof-b", mid, high + o, house.ridge, edge) };
        }

        /// <summary>Windows and a door on the outside of a house. Some windows are lit, some are dark.</summary>
        static void HouseFace(HouseSpec house, Palette m, Transform parent, bool nearby)
        {
            float minX = F(house.minX), maxX = F(house.maxX), minZ = F(house.minZ), maxZ = F(house.maxZ);
            int index = 0;
            void Window(bool onX, float fixedAt, float along, float outward)
            {
                // The player's own doorway is on the east wall of the living room; keep that span clear.
                if (house.home && onX && outward > 0 && along > -2.2f && along < 2.2f) return;
                Material pane = (index++ * 7 + house.id.Length) % 3 == 0 ? m.glass : m.windowWarm;
                Vector3 centre = onX ? new Vector3(fixedAt + outward * 0.03f, 1.55f, along) : new Vector3(along, 1.55f, fixedAt + outward * 0.03f);
                Vector3 half = onX ? new Vector3(0.025f, 0.6f, 0.7f) : new Vector3(0.7f, 0.6f, 0.025f);
                Vector3 frame = onX ? new Vector3(0.015f, 0.68f, 0.78f) : new Vector3(0.78f, 0.68f, 0.015f);
                Block(house.id + ".window-frame", centre - frame, centre + frame, m.trim, parent, false);
                Vector3 push = onX ? new Vector3(outward * 0.02f, 0, 0) : new Vector3(0, 0, outward * 0.02f);
                Block(house.id + ".window", centre - half + push, centre + half + push, pane, parent, false);
            }
            for (float z = minZ + 1.8f; z < maxZ - 1.2f; z += 3.1f) { Window(true, minX, z, -1); Window(true, maxX, z, 1); }
            for (float x = minX + 2; x < maxX - 1.4f; x += 3.4f) { Window(false, minZ, x, -1); Window(false, maxZ, x, 1); }
            // Front door toward the street.
            float doorZ = (minZ + maxZ) * 0.5f - 1.4f;
            Block(house.id + ".door", new Vector3(minX - 0.05f, 0, doorZ - 0.5f), new Vector3(minX, 2.1f, doorZ + 0.5f), m.door, parent, false);
            if (!nearby) return;
            Ball(house.id + ".porch-lamp", new Vector3(minX - 0.16f, 2.35f, doorZ + 0.9f), Vector3.one * 0.15f, m.lampGlow, parent, false);
            Lamp(house.id + ".porch-light", new Vector3(minX - 0.8f, 2.2f, doorZ + 0.9f), new Color(1, 0.8f, 0.56f), 8, 7, parent);
        }

        // ---------- The playset: Luke's tower, slide and monkey bars ----------
        static void BuildPlayset(Transform parent, Palette m)
        {
            var root = new GameObject("Playset").transform;
            root.SetParent(parent, false);
            var world = LukePlaygroundData.Create();
            Solid Find(string id) { foreach (var solid in world.solids) if (solid.id == id) return solid; throw new InvalidDataException("Level is missing " + id); }
            var ramp = Find("playset-ramp"); var deck = Find("playset-deck"); var slide = Find("playset-slide"); var bars = Find("playset-bars");
            float top = F(deck.maxY);

            Wedge("playset-ramp", ramp, m.playWood, root);
            for (int cleat = 1; cleat <= 6; cleat++)
            {
                float t = cleat / 7f, x = Mathf.Lerp(F(ramp.minX), F(ramp.maxX), t), y = top * t;
                Block("playset-ramp.cleat", new Vector3(x - 0.04f, y, F(ramp.minZ) + 0.12f), new Vector3(x + 0.04f, y + 0.05f, F(ramp.maxZ) - 0.12f), m.redPlastic, root);
            }
            Block("playset-deck", new Vector3(F(deck.minX), F(deck.minY), F(deck.minZ)), new Vector3(F(deck.maxX), top, F(deck.maxZ)), m.playWood, root);
            // Corner posts and a canopy frame; rails only on the closed south side.
            foreach (float x in new[] { F(deck.minX) + 0.07f, F(deck.maxX) - 0.07f })
                foreach (float z in new[] { F(deck.minZ) + 0.07f, F(deck.maxZ) - 0.07f })
                    Block("playset-deck.post", new Vector3(x - 0.06f, 0, z - 0.06f), new Vector3(x + 0.06f, top + 1.9f, z + 0.06f), m.playWood, root);
            float south = F(deck.minZ) + 0.07f;
            foreach (float height in new[] { 0.45f, 0.9f })
                Bar("playset-deck.rail", new Vector3(F(deck.minX), top + height, south), new Vector3(F(deck.maxX), top + height, south), 0.035f, m.redPlastic, root);
            foreach (float z in new[] { F(deck.minZ) + 0.07f, F(deck.maxZ) - 0.07f })
                Bar("playset-deck.beam", new Vector3(F(deck.minX), top + 1.86f, z), new Vector3(F(deck.maxX), top + 1.86f, z), 0.05f, m.playWood, root);

            Wedge("playset-slide", slide, m.slide, root);
            foreach (float z in new[] { F(slide.minZ), F(slide.maxZ) })
                Bar("playset-slide.lip", new Vector3(F(slide.minX), top + 0.14f, z), new Vector3(F(slide.maxX), F(slide.slopeAtMax) + 0.14f, z), 0.05f, m.slide, root);

            float barTop = F(bars.maxY) - 0.05f;
            foreach (float z in new[] { F(bars.minZ) + 0.05f, F(bars.maxZ) - 0.05f })
            {
                Bar("playset-bars.rail", new Vector3(F(bars.minX), barTop, z), new Vector3(F(bars.maxX), barTop, z), 0.05f, m.metal, root);
                foreach (float x in new[] { F(bars.minX) + 0.06f, F(bars.maxX) - 0.06f })
                    Bar("playset-bars.leg", new Vector3(x, 0, z + (z < F(bars.minZ) + 0.2f ? -0.35f : 0.35f)), new Vector3(x, barTop, z), 0.045f, m.metal, root);
            }
            for (float x = F(bars.minX) + 0.17f; x < F(bars.maxX) - 0.1f; x += 0.34f)
                Bar("playset-bars.rung", new Vector3(x, barTop, F(bars.minZ) + 0.05f), new Vector3(x, barTop, F(bars.maxZ) - 0.05f), 0.028f, m.metal, root);

            var mastFoot = new Vector3(F(LukePlaygroundData.PlaysetMastX), top, F(LukePlaygroundData.PlaysetMastZ));
            var mastTop = new Vector3(mastFoot.x, F(LukePlaygroundData.PlaysetMastHeight), mastFoot.z);
            Bar("playset-mast", mastFoot, mastTop, 0.035f, m.metal, root);
            Block("playset-mast.flag", mastTop + new Vector3(0.03f, -0.62f, -0.01f), mastTop + new Vector3(0.78f, -0.14f, 0.01f), m.redPlastic, root);

            var box = LukePlaygroundData.PlaysetSandbox;
            float rim = F(box.height);
            Block("sandbox.sand", box.minX + 0.08, box.maxX - 0.08, 0, rim * 0.6, box.minZ + 0.08, box.maxZ - 0.08, m.sand, root, false);
            Block("sandbox.rim-w", box.minX, box.minX + 0.08, 0, rim, box.minZ, box.maxZ, m.playWood, root);
            Block("sandbox.rim-e", box.maxX - 0.08, box.maxX, 0, rim, box.minZ, box.maxZ, m.playWood, root);
            Block("sandbox.rim-s", box.minX, box.maxX, 0, rim, box.minZ, box.minZ + 0.08, m.playWood, root);
            Block("sandbox.rim-n", box.minX, box.maxX, 0, rim, box.maxZ - 0.08, box.maxZ, m.playWood, root);
            Lamp("playset.light", new Vector3(F(deck.minX) + 0.8f, top + 1.7f, F(deck.maxZ) - 0.6f), new Color(1, 0.82f, 0.56f), 10, 9, root);
            Ball("playset.lantern", new Vector3(F(deck.minX) + 0.8f, top + 1.76f, F(deck.maxZ) - 0.6f), Vector3.one * 0.16f, m.lampGlow, root, false);
        }

        // ---------- The living room ----------
        static void BuildInterior(Transform parent, Palette m)
        {
            var root = new GameObject("Living-room").transform;
            root.SetParent(parent, false);
            float floor = F(HomeBlockScenery.HomeFloor);
            // A pale ceiling just under the roof's dark underside; well above the hero's head.
            Block("room.ceiling", -7.4, -0.6, 2.5, 2.56, -2.9, 2.9, m.trim, root, false);
            // Desk and screen (collision: computer-desk).
            Block("desk.top", -5.3, -2.7, floor + 0.72, floor + 0.77, 0.45, 1.55, m.deckWood, root);
            Block("desk.side-w", -5.3, -5.24, floor, floor + 0.72, 0.5, 1.5, m.deckWood, root);
            Block("desk.side-e", -2.76, -2.7, floor, floor + 0.72, 0.5, 1.5, m.deckWood, root);
            Block("desk.screen-back", -4.6, -3.4, floor + 0.86, floor + 1.18, 1.3, 1.345, m.darkMetal, root);
            Block("desk.screen", -4.56, -3.44, floor + 0.89, floor + 1.15, 1.285, 1.3, m.screenGlow, root, false);
            Block("desk.screen-foot", -4.1, -3.9, floor + 0.77, floor + 0.87, 1.28, 1.36, m.darkMetal, root);
            Block("desk.keys", -4.3, -3.7, floor + 0.77, floor + 0.79, 0.78, 0.98, m.darkMetal, root, false);
            Lamp("desk.screen-light", new Vector3(-4, floor + 1.05f, 0.7f), new Color(0.6f, 0.82f, 1), 2.4f, 4, root);
            // Sofa against the south wall (collision: sofa).
            Block("sofa.base", -6, -3.2, floor, floor + 0.42, -2.35, -1.25, m.sofa, root);
            Block("sofa.back", -6, -3.2, floor + 0.42, floor + 1.02, -2.35, -2.05, m.sofa, root);
            Block("sofa.arm-w", -6, -5.76, floor + 0.42, floor + 0.7, -2.05, -1.25, m.sofa, root);
            Block("sofa.arm-e", -3.44, -3.2, floor + 0.42, floor + 0.7, -2.05, -1.25, m.sofa, root);
            Block("sofa.seat-a", -5.72, -4.64, floor + 0.42, floor + 0.54, -2.03, -1.29, m.cushion, root);
            Block("sofa.seat-b", -4.56, -3.48, floor + 0.42, floor + 0.54, -2.03, -1.29, m.cushion, root);
            Block("rug", -6, -2.2, floor, floor + 0.012, -1.05, 0.25, m.rug, root, false);
            // Night shows through two framed panes on the south wall; a picture hangs by the desk.
            foreach (float x in new[] { -6.4f, -2.1f })
            {
                Block("room.window-frame", new Vector3(x - 0.62f, 0.95f, -2.9f), new Vector3(x + 0.62f, 2.15f, -2.875f), m.trim, root, false);
                Block("room.window", new Vector3(x - 0.54f, 1.03f, -2.875f), new Vector3(x + 0.54f, 2.07f, -2.865f), m.windowNight, root, false);
            }
            Block("room.picture", new Vector3(-7.4f, 1.3f, -0.9f), new Vector3(-7.375f, 2, 0.1f), m.door, root, false);
            Block("room.picture-art", new Vector3(-7.375f, 1.36f, -0.84f), new Vector3(-7.365f, 1.94f, 0.04f), m.wallSky, root, false);
            // Ceiling lamp and a floor lamp by the sofa.
            Ball("room.ceiling-lamp", new Vector3(-4, 2.44f, 0), new Vector3(0.5f, 0.12f, 0.5f), m.lampGlow, root, false);
            Lamp("room.ceiling-light", new Vector3(-4, 2.15f, 0), new Color(1, 0.86f, 0.68f), 16, 9, root);
            Bar("room.floor-lamp", new Vector3(-6.7f, floor, -2.3f), new Vector3(-6.7f, floor + 1.5f, -2.3f), 0.025f, m.darkMetal, root);
            Ball("room.floor-lamp-shade", new Vector3(-6.7f, floor + 1.58f, -2.3f), new Vector3(0.36f, 0.3f, 0.36f), m.lampGlow, root, false);
            Lamp("room.floor-light", new Vector3(-6.5f, floor + 1.5f, -2.1f), new Color(1, 0.78f, 0.5f), 7, 6, root);
            // Patio light over the doorway.
            Ball("patio.lamp", new Vector3(-0.28f, 2.55f, 0), Vector3.one * 0.16f, m.lampGlow, root, false);
            Lamp("patio.light", new Vector3(0.5f, 2.4f, 0), new Color(1, 0.84f, 0.62f), 10, 8, root);
        }

        // ---------- Sky, light and grade ----------
        static T Graded<T>(VolumeProfile profile) where T : VolumeComponent
        {
            if (profile.TryGet<T>(out var component)) return component;
            component = profile.Add<T>(true);
            AssetDatabase.AddObjectToAsset(component, profile);
            return component;
        }

        static bool BuildLighting(Palette m)
        {
            var moon = new GameObject("Playground.moon").AddComponent<Light>();
            moon.type = LightType.Directional;
            moon.transform.rotation = Quaternion.LookRotation(new Vector3(-0.82f, -0.62f, 0.3f));
            moon.color = new Color(0.7f, 0.82f, 1);
            moon.intensity = 1.25f;
            moon.shadows = LightShadows.Soft;
            moon.shadowBias = 0.035f;
            moon.shadowNormalBias = 0.12f;
            RenderSettings.sun = moon;

            var cube = AssetDatabase.LoadAssetAtPath<Cubemap>(SkyPath);
            string skyPath = MaterialFolder + "/Play-sky.mat";
            var sky = AssetDatabase.LoadAssetAtPath<Material>(skyPath);
            var skyShader = Shader.Find(cube != null ? "Skybox/Cubemap" : "Skybox/Procedural");
            if (sky == null) { sky = new Material(skyShader); AssetDatabase.CreateAsset(sky, skyPath); }
            else sky.shader = skyShader;
            if (cube != null)
            {
                sky.SetTexture("_Tex", cube);
                sky.SetColor("_Tint", new Color(0.42f, 0.5f, 0.72f));
                sky.SetFloat("_Exposure", 0.3f);
                sky.SetFloat("_Rotation", 270);
                RenderSettings.defaultReflectionMode = DefaultReflectionMode.Custom;
#if SPACE_DRAGON_REFERENCE_2021
                // Only for tools/unity/playground-compile: its public 2021 reference assemblies predate the property below.
                RenderSettings.customReflection = cube;
#else
                RenderSettings.customReflectionTexture = cube;
#endif
                RenderSettings.reflectionIntensity = 0.34f;
            }
            else
            {
                sky.SetFloat("_SunSize", 0.02f);
                sky.SetFloat("_AtmosphereThickness", 0.5f);
                sky.SetColor("_SkyTint", new Color(0.08f, 0.12f, 0.24f));
                sky.SetColor("_GroundColor", new Color(0.02f, 0.03f, 0.04f));
                sky.SetFloat("_Exposure", 0.28f);
            }
            EditorUtility.SetDirty(sky);
            RenderSettings.skybox = sky;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.14f, 0.19f, 0.29f);
            RenderSettings.ambientEquatorColor = new Color(0.07f, 0.095f, 0.13f);
            RenderSettings.ambientGroundColor = new Color(0.03f, 0.036f, 0.042f);
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = 28;
            RenderSettings.fogEndDistance = 190;
            RenderSettings.fogColor = new Color(0.02f, 0.04f, 0.065f);

            string profilePath = Generated + "/PlaygroundNight.asset";
            var profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(profilePath);
            if (profile == null) { profile = ScriptableObject.CreateInstance<VolumeProfile>(); AssetDatabase.CreateAsset(profile, profilePath); }
            Graded<Tonemapping>(profile).mode.Override(TonemappingMode.ACES);
            var grade = Graded<ColorAdjustments>(profile);
            grade.postExposure.Override(0.55f);
            grade.contrast.Override(14);
            grade.saturation.Override(6);
            var bloom = Graded<Bloom>(profile);
            bloom.threshold.Override(1);
            bloom.intensity.Override(0.34f);
            bloom.scatter.Override(0.62f);
            var vignette = Graded<Vignette>(profile);
            vignette.intensity.Override(0.2f);
            vignette.smoothness.Override(0.5f);
            var volume = new GameObject("Playground.graded-volume").AddComponent<Volume>();
            volume.isGlobal = true;
            volume.sharedProfile = profile;
            EditorUtility.SetDirty(profile);
            return cube != null;
        }
    }
}
