using System;
using System.Collections.Generic;
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
        public const string RoadArtFolder = Generated + "/RoadArt";
        public const string RoadArtReceipt = "Builds/town-drive-road-art-receipt.json";
        public const float RoadPaintHeight = .030f;
        [Serializable] sealed class RoadArtData { public DriveRouteData route = null; public RoadArtJunction[] junctions = null; }
        [Serializable] sealed class RoadArtJunction { public string id = null; public float x = 0, z = 0, radius = 0; }
        [Serializable] public sealed class RoadPaintStroke
        {
            public string id, color;
            public double fromS, toS;
            public float offset, width;
            public Vector3[] points;
        }
        [Serializable] public sealed class TownDriveRoadEvidence
        {
            public string result, routeSha256, scope, reference;
            public int hiddenSourceRenderers, strokes, renderers, triangles;
            public float paintHeight;
            public RoadPaintStroke[] markings;
        }
        sealed class RoadPaintBatch
        {
            public readonly List<Vector3> points = new List<Vector3>();
            public readonly List<Vector2> uv = new List<Vector2>();
            public readonly List<int> indices = new List<int>();
            public void Segment(Vector3 a, Vector3 b, Vector3 c, Vector3 d)
            {
                int first = points.Count; points.AddRange(new[] { a, b, c, d });
                foreach (var point in new[] { a, b, c, d }) uv.Add(new Vector2(point.x, point.z) * 6.25f);
                indices.AddRange(new[] { first, first + 2, first + 1, first + 1, first + 2, first + 3 });
            }
        }

        /// <summary>
        /// Presentation-only paint correction from IMG_5754. All imported meshes,
        /// transforms and road/collision state remain recoverable and unchanged.
        /// </summary>
        public static void ApplyRoadArt(GameObject world)
        {
            if (world == null) throw new ArgumentNullException(nameof(world));
            Folder(RoadArtFolder);
            var previous = world.transform.Find("TownDrive.RoadArt");
            if (previous != null) Object.DestroyImmediate(previous.gameObject);
            var original = world.GetComponentsInChildren<MeshFilter>(true).ToDictionary(filter => filter, filter => filter.sharedMesh);
            var data = JsonUtility.FromJson<RoadArtData>(File.ReadAllText(DataPath));
            if (data?.route == null || data.junctions == null) throw new InvalidDataException("Road art requires the unchanged mapped route and junctions.");
            var report = new TownDriveRoadEvidence {
                result = "Succeeded", routeSha256 = HashFile(DataPath), paintHeight = RoadPaintHeight,
                reference = "IMG_5754: 00:10-00:30 unmarked residential road; 00:35 short marked stop/splitter approach; 00:55-01:15 Winston/gate guidance; 02:15 and 04:15 divided-road lane/median treatment.",
                scope = "Reference-led paint only. Local extents are conservative approximations on the preserved mapped route; arterial outer-loop compression remains. Original paint stays inactive and recoverable in the Editor but is excluded from player builds. Source meshes, route, obstacles and saves are unchanged."
            };
            foreach (var renderer in world.GetComponentsInChildren<MeshRenderer>(true))
            {
                if (!IsOriginalRoadPaint(renderer)) continue;
                // Only visual leaf objects may leave the player. Keep every source
                // mesh/transform available for Editor rollback and inventory, while
                // Unity's built-in EditorOnly tag strips superseded build payload.
                var node = renderer.gameObject;
                if (node.transform.childCount != 0 || node.GetComponents<Component>().Any(component =>
                    !(component is Transform) && !(component is MeshFilter) && !(component is MeshRenderer)))
                    throw new InvalidDataException("Original road paint is no longer a presentation-only leaf: " + node.name);
                node.SetActive(false); node.tag = "EditorOnly"; report.hiddenSourceRenderers++;
            }
            if (report.hiddenSourceRenderers < 100) throw new InvalidDataException("Expected the original imported road-paint instances.");
            var strokes = BuildRoadPaintPlan(data);
            var batches = new SortedDictionary<string, RoadPaintBatch>();
            foreach (var stroke in strokes)
            {
                var vertices = JoinedPaintVertices(stroke.points, stroke.offset, stroke.width);
                for (int i = 0; i < stroke.points.Length - 1; i++)
                {
                    var midpoint = (stroke.points[i] + stroke.points[i + 1]) * .5f;
                    string key = stroke.color + "." + Mathf.FloorToInt(midpoint.x / 140) + "." + Mathf.FloorToInt(midpoint.z / 140);
                    if (!batches.TryGetValue(key, out var batch)) batches.Add(key, batch = new RoadPaintBatch());
                    batch.Segment(vertices[2 * i], vertices[2 * i + 1], vertices[2 * i + 2], vertices[2 * i + 3]);
                }
            }
            var root = new GameObject("TownDrive.RoadArt"); root.transform.SetParent(world.transform, false);
            var white = RoadPaintMaterial("white", new Color(.84f, .84f, .80f).linear);
            var yellow = RoadPaintMaterial("yellow", new Color(.88f, .72f, .16f).linear);
            foreach (var pair in batches)
            {
                var batch = pair.Value;
                var mesh = new Mesh { name = "TownDrive.RoadPaint." + pair.Key, indexFormat = IndexFormat.UInt32 };
                mesh.SetVertices(batch.points); mesh.SetUVs(0, batch.uv); mesh.SetTriangles(batch.indices, 0);
                mesh.SetNormals(Enumerable.Repeat(Vector3.up, batch.points.Count).ToList()); mesh.RecalculateBounds(); mesh.RecalculateTangents();
                string path = RoadArtFolder + "/" + pair.Key + ".asset";
                var persisted = AssetDatabase.LoadAssetAtPath<Mesh>(path);
                if (persisted == null) { persisted = mesh; AssetDatabase.CreateAsset(persisted, path); }
                else { EditorUtility.CopySerialized(mesh, persisted); Object.DestroyImmediate(mesh); EditorUtility.SetDirty(persisted); }
                var node = new GameObject("TownDrive.RoadPaint." + pair.Key); node.transform.SetParent(root.transform, false);
                node.AddComponent<MeshFilter>().sharedMesh = persisted;
                var renderer = node.AddComponent<MeshRenderer>(); renderer.sharedMaterial = pair.Key.StartsWith("white.") ? white : yellow;
                renderer.shadowCastingMode = ShadowCastingMode.Off; renderer.receiveShadows = true;
                renderer.lightProbeUsage = LightProbeUsage.Off; renderer.reflectionProbeUsage = ReflectionProbeUsage.Off;
                report.renderers++; report.triangles += batch.indices.Count / 3;
            }
            report.markings = strokes.ToArray(); report.strokes = strokes.Count;
            foreach (var pair in original) if (pair.Key.sharedMesh != pair.Value) throw new InvalidDataException("Road art mutated a source mesh.");
            if (report.renderers > 80 || report.triangles > 30000) throw new InvalidDataException("Road paint batching exceeded its local review envelope.");
            Directory.CreateDirectory("Builds"); File.WriteAllText(RoadArtReceipt, JsonUtility.ToJson(report, true));
            Debug.Log("TOWN_DRIVE_ROAD_ART " + report.hiddenSourceRenderers + " source paint renderers hidden; " + report.renderers + " joined paint batches.");
        }

        /// <summary>Only low, narrow road stripes; leave white buildings, lamps, stop bars and crosswalks intact.</summary>
        public static bool IsOriginalRoadPaint(MeshRenderer renderer)
        {
            if (renderer == null) return false;
            Transform source = renderer.transform;
            while (source != null && !source.name.StartsWith("drive.chunk.") && !source.name.StartsWith("drive.home.context.")) source = source.parent;
            if (source == null) return false;
            string name = source.name;
            if (name.StartsWith("drive.home.context."))
                return renderer.sharedMaterials.Any(material => material != null && material.name.StartsWith("drive.pbr.paint-yellow"));
            if (name.Contains(".edge-line.") || name.Contains(".median-edge.")) return true;
            bool yellow = name.Contains(".box.drive.pbr.paint-yellow"), white = name.Contains(".box.drive.pbr.paint-white");
            if (!yellow && !white) return false;
            var filter = renderer.GetComponent<MeshFilter>();
            if (filter == null || filter.sharedMesh == null) return false;
            var bounds = filter.sharedMesh.bounds;
            float minimumY = float.PositiveInfinity, maximumY = float.NegativeInfinity;
            foreach (int x in new[] { -1, 1 }) foreach (int y in new[] { -1, 1 }) foreach (int z in new[] { -1, 1 })
            {
                float height = renderer.transform.TransformPoint(bounds.center + Vector3.Scale(bounds.extents, new Vector3(x, y, z))).y;
                minimumY = Mathf.Min(minimumY, height); maximumY = Mathf.Max(maximumY, height);
            }
            if (minimumY < -.01f || maximumY > .085f) return false;
            var size = filter.sharedMesh.bounds.size;
            float across = renderer.transform.TransformVector(new Vector3(size.x, 0, 0)).magnitude;
            float along = renderer.transform.TransformVector(new Vector3(0, 0, size.z)).magnitude;
            return yellow || (across <= .20f && along >= .10f);
        }

        static List<RoadPaintStroke> BuildRoadPaintPlan(RoadArtData data)
        {
            var route = new DriveRoute(data.route); var result = new List<RoadPaintStroke>();
            var greenTurn = data.route.turns.Single(turn => turn.id == "green-island-terrace");
            var highwayTurn = data.route.turns.Single(turn => turn.id == "terrace-hypoluxo");
            // The court and ordinary Green Island stretch are unmarked in the film.
            // A short local approach treatment begins before the stop/splitter;
            // Winston's centerline continues toward the gate, then becomes a
            // single guide beside the gate island. These extents are estimates.
            foreach (float side in new[] { -.11f, .11f })
            {
                Add("green-island-stop-approach", "yellow", greenTurn.approachS - 32, greenTurn.approachS - 2, side, .10f);
                Add("winston-gate-approach", "yellow", greenTurn.exitS + 4, data.route.gateS - 14, side, .10f);
            }
            Add("gate-island-guide", "yellow", data.route.gateS - 14, highwayTurn.approachS - 2, -.11f, .10f);
            for (int index = 1; index <= 4; index++)
            {
                var section = data.route.sections[index];
                foreach (int side in new[] { -1, 1 })
                {
                    Add(section.id + "-median", "yellow", section.startS, section.endS, side * (float)(section.medianWidth / 2 + .14), .12f);
                    Add(section.id + "-edge", "white", section.startS, section.endS, side * (float)(DriveRoute.RoadHalfWidth(section) - .55), .13f);
                    for (int lane = 1; lane < section.lanes; lane++)
                    {
                        float offset = side * (float)(section.medianWidth / 2 + section.laneWidth * lane);
                        for (double start = Math.Ceiling(section.startS / 12) * 12; start < section.endS; start += 12)
                            Add(section.id + "-lane-" + lane, "white", start, Math.Min(start + 4.5, section.endS), offset, .13f);
                    }
                }
            }
            return result;

            void Add(string id, string color, double from, double to, float offset, float width)
            {
                var distances = new SortedSet<double> { from, to };
                for (double s = from + 2; s < to; s += 2) distances.Add(s);
                foreach (var sample in data.route.samples) if (sample.s > from && sample.s < to) distances.Add(sample.s);
                var samples = distances.Select(s => route.PointAtDistance(s)).ToArray();
                var run = new List<Vector3>(); double runFrom = 0, runTo = 0;
                for (int i = 1; i < samples.Length; i++)
                {
                    var a = samples[i - 1]; var b = samples[i];
                    if (Math.Abs(a.x - b.x) + Math.Abs(a.z - b.z) < .001) continue;
                    // Match the existing junction pavement exclusion, plus a small
                    // paint margin. A strip never bridges a turning intersection.
                    bool clear = !data.junctions.Any(junction =>
                    {
                        double dx = b.x - a.x, dz = b.z - a.z;
                        double t = Math.Max(0, Math.Min(1, ((junction.x - a.x) * dx + (junction.z - a.z) * dz) / (dx * dx + dz * dz)));
                        return Math.Pow(a.x + t * dx - junction.x, 2) + Math.Pow(a.z + t * dz - junction.z, 2) < Math.Pow(junction.radius + .35f, 2);
                    });
                    if (clear)
                    {
                        if (run.Count == 0) { runFrom = a.s; run.Add(new Vector3((float)a.x, RoadPaintHeight, (float)a.z)); }
                        run.Add(new Vector3((float)b.x, RoadPaintHeight, (float)b.z)); runTo = b.s;
                    }
                    else Flush();
                }
                Flush();
                void Flush()
                {
                    if (run.Count > 1) result.Add(new RoadPaintStroke { id = id, color = color, fromS = runFrom, toS = runTo, offset = offset, width = width, points = run.ToArray() });
                    run.Clear();
                }
            }
        }

        // Shared vertices and mitered normals prevent the overlapping, rotated
        // twelve-metre boxes that made the original yellow lines visibly crooked.
        public static Vector3[] JoinedPaintVertices(Vector3[] points, float offset, float width)
        {
            if (points == null || points.Length < 2 || width <= 0) throw new ArgumentException("A paint ribbon requires a positive width and at least two points.");
            var vertices = new Vector3[points.Length * 2];
            for (int i = 0; i < points.Length; i++)
            {
                var before = points[i == 0 ? 1 : i] - points[i == 0 ? 0 : i - 1]; before.y = 0; before.Normalize();
                var after = points[i == points.Length - 1 ? i : i + 1] - points[i == points.Length - 1 ? i - 1 : i]; after.y = 0; after.Normalize();
                if (before.sqrMagnitude < .5f || after.sqrMagnitude < .5f) throw new ArgumentException("Paint ribbon contains duplicate points.");
                var normalBefore = new Vector3(before.z, 0, -before.x); var normalAfter = new Vector3(after.z, 0, -after.x);
                var miter = (normalBefore + normalAfter).normalized;
                float denominator = Vector3.Dot(miter, normalAfter);
                if (denominator < .5f) throw new ArgumentException("Paint ribbon has an unsupported sharp reversal.");
                var basis = miter / denominator; var center = new Vector3(points[i].x, RoadPaintHeight, points[i].z);
                vertices[i * 2] = center + basis * (offset - width / 2);
                vertices[i * 2 + 1] = center + basis * (offset + width / 2);
            }
            return vertices;
        }

        static Material RoadPaintMaterial(string label, Color color)
        {
            string path = RoadArtFolder + "/" + label + ".mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null) { material = new Material(Shader.Find("Universal Render Pipeline/Lit")); AssetDatabase.CreateAsset(material, path); }
            material.name = "TownDrive.RoadPaint." + label;
            material.SetColor("_BaseColor", color); material.SetFloat("_Metallic", 0); material.SetFloat("_Smoothness", .12f);
            material.SetFloat("_Cull", (float)CullMode.Back); material.enableInstancing = true; EditorUtility.SetDirty(material); return material;
        }
    }
}
