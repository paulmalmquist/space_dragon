using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using SpaceDragon.TownDrive.UnityRuntime;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using Object = UnityEngine.Object;

namespace SpaceDragon.TownDrive.Editor
{
    public static partial class TownDriveProject
    {
        public const string ReferenceArtInputs = Root + "/Art/v004";
        public const string ReferenceArtFolder = Generated + "/ReferenceArt";
        public const string ReferenceArtReceipt = "Builds/town-drive-reference-art-receipt.json";
        [Serializable] public sealed class TownDriveReferenceManifest
        {
            public int version;
            public string sourceReceipt, sourceReceiptSha256;
            public TownDriveReferenceModel[] models;
        }
        [Serializable] public sealed class TownDriveReferenceModel
        {
            public string id, path, sha256, nearNode, farNode;
            public long bytes;
            public int nearTriangles, farTriangles, materials, textures;
            public float sourceHeight, sourceWidth, sourceDepth;
        }
        [Serializable] public sealed class TownDriveReferenceEvidence
        {
            public string result, scope, inputManifestSha256, sourceManifestSha256, routeSha256, sourceReceiptSha256;
            public int palms, royalPalms, fanPalms, hedges, retainedParts, disabledParts, editorOnlyRollbackRoots, infillWalls, infillModules, cells, renderers, materials, sharedMeshes;
            public long nearTriangles, farTriangles;
            public float minimumGroundClearance, minimumInfillClearance;
            public ReferencePlacement[] placements;
            public ReferenceExistingOverlap[] existingContextOverlaps;
        }
        [Serializable] public sealed class ReferencePlacement
        {
            public string sourceId, modelId, cell, instanceName, sourceWall;
            public Vector3 position, sourceScale, appliedScale, sourceWallPosition;
            public Quaternion sourceRotation, appliedRotation;
            public bool infill;
            public float horizontalSafetyScale, trunkWidthScale, groundClearance;
        }
        [Serializable] public sealed class ReferenceExistingOverlap
        {
            public string sourceId;
            public Vector3 position;
            public float originalClearance, replacementClearance;
        }
        sealed class ReferenceMeshPart
        {
            public string name;
            public Mesh mesh;
            public int submesh;
            public Material material;
            public Matrix4x4 local;
        }
        sealed class ReferenceImportedModel
        {
            public TownDriveReferenceModel data;
            public ReferenceMeshPart[][] levels;
        }

        public static TownDriveReferenceManifest LoadReferenceArtManifest()
        {
            var manifest = JsonUtility.FromJson<TownDriveReferenceManifest>(File.ReadAllText(ReferenceArtInputs + "/reference-art.json"));
            var expected = new[] { "clipped-hedge", "fan-palm", "royal-palm" };
            if (manifest == null || manifest.version != 4 || manifest.models == null ||
                !manifest.models.Select(model => model.id).OrderBy(id => id).SequenceEqual(expected))
                throw new InvalidDataException("Expected the three reviewed v004 Blender model families.");
            if (HashFile(ReferenceInputPath(manifest.sourceReceipt)) != manifest.sourceReceiptSha256)
                throw new InvalidDataException("Blender source/license receipt hash differs.");
            foreach (var model in manifest.models)
            {
                string path = ReferenceInputPath(model.path);
                if (new FileInfo(path).Length != model.bytes || HashFile(path) != model.sha256 ||
                    model.sourceHeight <= 0 || model.sourceWidth <= 0 || model.sourceDepth <= 0 ||
                    model.nearTriangles <= 0 || model.farTriangles <= 0 || model.farTriangles >= model.nearTriangles / 2 ||
                    string.IsNullOrEmpty(model.nearNode) || string.IsNullOrEmpty(model.farNode))
                    throw new InvalidDataException("Unverified Blender runtime model: " + model.id);
            }
            return manifest;
        }

        public static string ReferenceInputPath(string relative)
        {
            if (string.IsNullOrEmpty(relative) || Path.IsPathRooted(relative)) throw new InvalidDataException("Relative v004 input path required.");
            string root = Path.GetFullPath(ReferenceArtInputs) + Path.DirectorySeparatorChar;
            string full = Path.GetFullPath(Path.Combine(ReferenceArtInputs, relative));
            if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Reference input escaped its owned folder.");
            return ReferenceArtInputs + "/" + relative.Replace('\\', '/');
        }

        /// <summary>Presentation-only Blender derivatives at preserved anchors; original assets remain recoverable.</summary>
        public static void ApplyReferenceArt(GameObject world)
        {
            var input = LoadReferenceArtManifest();
            var manifest = LoadManifest();
            var data = TownDriveJson.Parse(File.ReadAllText(DataPath));
            var route = new DriveRoute(data.route);
            var roads = ReferenceRoadCorridors(File.ReadAllText(DataPath));
            Folder(ReferenceArtFolder); Folder(ReferenceArtFolder + "/Materials");
            var materials = new Dictionary<string, Material>(StringComparer.Ordinal);
            var models = input.models.ToDictionary(model => model.id, model => ImportReferenceModel(model, materials));
            var sourceRoot = world.transform.Find("TownDrive.Vegetation") ?? throw new InvalidDataException("Original vegetation root missing.");
            var originals = sourceRoot.Cast<Transform>().ToDictionary(node => node.name, StringComparer.Ordinal);
            var palms = manifest.vegetationInstances.Where(part => part.assetId == "vegetation-palm" && part.meshName == "palm.near.2").ToArray();
            var hedges = manifest.vegetationInstances.Where(part => part.assetId == "vegetation-hedge").ToArray();
            if (palms.Length != 162 || hedges.Length != 207 || originals.Count != 1302) throw new InvalidDataException("Original vegetation inventory changed.");
            var evidence = new TownDriveReferenceEvidence { result = "Succeeded", inputManifestSha256 = HashFile(ReferenceArtInputs + "/reference-art.json"),
                sourceManifestSha256 = HashFile(ManifestPath), routeSha256 = HashFile(DataPath), sourceReceiptSha256 = input.sourceReceiptSha256,
                retainedParts = originals.Count, minimumGroundClearance = float.PositiveInfinity, minimumInfillClearance = float.PositiveInfinity,
                scope = "Blender-authored palm/hedge derivatives; original source parts and v003 crowns retained inactive and EditorOnly for Editor rollback. Five existing Hypoluxo wall segments support forty hedge infill modules. No source route, obstacle, collider or shared renderer change." };
            var placements = new List<ReferencePlacement>();
            var overlaps = new List<ReferenceExistingOverlap>();
            foreach (var source in palms.Concat(hedges))
            {
                bool palm = source.assetId == "vegetation-palm";
                var nearest = route.Nearest(source.position.x, source.position.z);
                string id = palm ? (source.parentChunk == "drive.home.neighborhood" || data.route.sections[nearest.sectionIndex].character == "neighborhood" ? "royal-palm" : "fan-palm") : "clipped-hedge";
                var model = models[id];
                var placement = new ReferencePlacement { sourceId = source.id, modelId = id, position = source.position,
                    sourceScale = source.scale, sourceRotation = source.rotationQuaternion, horizontalSafetyScale = 1, trunkWidthScale = 1,
                    appliedRotation = source.rotationQuaternion * (palm ? Quaternion.identity : Quaternion.Euler(0, 90, 0)),
                    appliedScale = palm ? source.scale * (12 / model.data.sourceHeight) : Vector3.Scale(source.scale,
                        new Vector3(3.11f / model.data.sourceWidth, 1.35f / model.data.sourceHeight, 1.10f / model.data.sourceDepth)) };
                placement.groundClearance = ReferenceGroundClearance(model, placement, roads);
                // Keep the anchor, but trim a replacement hedge's breadth if an existing narrow median demands it.
                while (!palm && placement.groundClearance < .12f && placement.horizontalSafetyScale > .55f)
                {
                    placement.horizontalSafetyScale *= .9f;
                    placement.appliedScale = Vector3.Scale(placement.appliedScale, new Vector3(.9f, 1, .9f));
                    placement.groundClearance = ReferenceGroundClearance(model, placement, roads);
                }
                if (placement.groundClearance < .1f)
                {
                    bool known = palm && IsExistingReferenceContextOverlap(source.position);
                    var trunk = manifest.vegetationInstances.SingleOrDefault(part => part.assetId == "vegetation-palm" && part.meshName == "palm.near.0" && part.position == source.position);
                    float oldClearance = known && trunk != null ? ReferenceOriginalGroundClearance(originals["TownDrive.PlantPart." + trunk.id], roads) : float.PositiveInfinity;
                    // At these two pre-existing context crossings, preserve the original
                    // low trunk footprint. Narrow only bark geometry, never the new crown.
                    // The imported low trunk cross-section at the first context crossing
                    // needs about .43 of the normalized width; .55 was insufficient.
                    while (known && placement.groundClearance < oldClearance - .005f && placement.trunkWidthScale > .35f)
                    {
                        placement.trunkWidthScale *= .9f;
                        placement.groundClearance = ReferenceGroundClearance(model, placement, roads);
                    }
                    if (!known || placement.groundClearance < oldClearance - .005f)
                        throw new InvalidDataException("Replacement vegetation entered additional road space: " + source.id + " clearance=" + placement.groundClearance + " original=" + oldClearance + " barkWidth=" + placement.trunkWidthScale);
                    overlaps.Add(new ReferenceExistingOverlap { sourceId = source.id, position = source.position, originalClearance = oldClearance, replacementClearance = placement.groundClearance });
                }
                AddReferencePlacement(model, placement, evidence); placements.Add(placement);
                evidence.minimumGroundClearance = Mathf.Min(evidence.minimumGroundClearance, placement.groundClearance);
                if (palm) { evidence.palms++; if (id == "royal-palm") evidence.royalPalms++; else evidence.fanPalms++; }
                else evidence.hedges++;
            }
            AddReferenceWallHedges(world, models["clipped-hedge"], route, roads, placements, evidence);
            foreach (var source in manifest.vegetationInstances.Where(part => part.assetId == "vegetation-palm" || part.assetId == "vegetation-hedge"))
            {
                var original = originals["TownDrive.PlantPart." + source.id].gameObject;
                original.SetActive(false); MarkReferenceRollbackEditorOnly(original);
                evidence.disabledParts++; evidence.editorOnlyRollbackRoots++;
            }
            var fallback = world.transform.Find("TownDrive.FoliageArt") ?? throw new InvalidDataException("v003 rollback crowns missing.");
            fallback.gameObject.SetActive(false); MarkReferenceRollbackEditorOnly(fallback.gameObject); evidence.editorOnlyRollbackRoots++;
            var previous = world.transform.Find("TownDrive.ReferenceArt"); if (previous != null) Object.DestroyImmediate(previous.gameObject);
            var root = new GameObject("TownDrive.ReferenceArt"); root.transform.SetParent(world.transform, false);
            foreach (var placement in placements)
            {
                // Share the twelve imported meshes across every plant. Baking world
                // vertices into cell meshes multiplied the native/player payload.
                // Keep these renderers non-static so build-time static batching
                // cannot silently recreate those duplicated meshes.
                placement.instanceName = "TownDrive.ReferencePlant." + evidence.cells.ToString("D4");
                var parent = new GameObject(placement.instanceName); parent.transform.SetParent(root.transform, false);
                parent.transform.localPosition = placement.position;
                parent.transform.localRotation = placement.appliedRotation;
                parent.transform.localScale = placement.appliedScale;
                var model = models[placement.modelId];
                var lods = new List<Renderer[]>();
                for (int level = 0; level < 2; level++)
                {
                    var levelRoot = new GameObject(level == 0 ? model.data.nearNode : model.data.farNode);
                    levelRoot.transform.SetParent(parent.transform, false);
                    var renderers = new List<Renderer>();
                    foreach (var part in model.levels[level])
                    {
                        var node = new GameObject(part.name); node.transform.SetParent(levelRoot.transform, false);
                        node.transform.localScale = part.mesh.name.Contains(".Trunk")
                            ? new Vector3(placement.trunkWidthScale, 1, placement.trunkWidthScale) : Vector3.one;
                        node.AddComponent<MeshFilter>().sharedMesh = part.mesh;
                        var renderer = node.AddComponent<MeshRenderer>(); renderer.sharedMaterial = part.material;
                        renderer.shadowCastingMode = level == 0 ? ShadowCastingMode.On : ShadowCastingMode.Off;
                        renderer.receiveShadows = true; renderers.Add(renderer); evidence.renderers++;
                    }
                    lods.Add(renderers.ToArray());
                }
                bool hedge = placement.modelId == "clipped-hedge";
                ConfigureDistanceLods(parent.AddComponent<LODGroup>(), lods, new List<float> { hedge ? 65 : 120, hedge ? 180 : 420 });
                evidence.cells++;
            }
            evidence.materials = materials.Count; evidence.placements = placements.ToArray(); evidence.existingContextOverlaps = overlaps.ToArray();
            evidence.sharedMeshes = root.GetComponentsInChildren<MeshFilter>(true).Select(filter => filter.sharedMesh).Distinct().Count();
            if (evidence.disabledParts != 855 || evidence.editorOnlyRollbackRoots != 856 || evidence.palms != 162 || evidence.hedges != 207 || evidence.infillWalls != 5 || evidence.infillModules != 40 ||
                evidence.cells != 409 || evidence.renderers != 1636 || evidence.sharedMeshes != 12 || evidence.nearTriangles > 2600000 || evidence.farTriangles > 650000 || materials.Count != 5)
                throw new InvalidDataException("Reference vegetation exceeded reviewed shared-geometry budget: " + JsonUtility.ToJson(evidence));
            File.WriteAllText(ReferenceArtReceipt, JsonUtility.ToJson(evidence, true));
            Debug.Log("TOWN_DRIVE_REFERENCE_ART " + JsonUtility.ToJson(evidence));
        }

        static void MarkReferenceRollbackEditorOnly(GameObject root)
        {
            // Scene-only presentation copies have no gameplay components. The
            // built-in tag strips this hierarchy during player build while the
            // Editor scene and source assets retain the complete rollback art.
            if (root.activeSelf || root.GetComponentsInChildren<Component>(true).Any(component =>
                !(component is Transform) && !(component is MeshFilter) && !(component is MeshRenderer) && !(component is LODGroup)))
                throw new InvalidDataException("Rollback art contains active content or non-presentation components: " + root.name);
            root.tag = "EditorOnly";
        }

        static ReferenceImportedModel ImportReferenceModel(TownDriveReferenceModel data, Dictionary<string, Material> materials)
        {
            string path = ReferenceInputPath(data.path); ConfigureGltfImport(path, false);
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path) ?? throw new InvalidDataException("Missing Blender prefab: " + data.id);
            var result = new ReferenceImportedModel { data = data, levels = new ReferenceMeshPart[2][] };
            for (int level = 0; level < 2; level++)
            {
                var group = FindUnique(prefab, level == 0 ? data.nearNode : data.farNode);
                if (TriangleCount(group.gameObject) != (level == 0 ? data.nearTriangles : data.farTriangles)) throw new InvalidDataException("Blender LOD triangle count changed: " + data.id);
                var bounds = LocalBounds(group.gameObject, prefab.transform);
                if (level == 0 && (Mathf.Abs(bounds.size.y - data.sourceHeight) > .02f || Mathf.Abs(bounds.size.x - data.sourceWidth) > .02f || Mathf.Abs(bounds.size.z - data.sourceDepth) > .02f || Mathf.Abs(bounds.min.y) > .03f))
                    throw new InvalidDataException("Blender dimensions/origin changed on import: " + data.id + " " + bounds);
                var parts = new List<ReferenceMeshPart>();
                foreach (var filter in group.GetComponentsInChildren<MeshFilter>(true))
                {
                    var renderer = filter.GetComponent<MeshRenderer>();
                    if (renderer == null || filter.sharedMesh == null || filter.sharedMesh.uv.Length != filter.sharedMesh.vertexCount || filter.sharedMesh.tangents.Length != filter.sharedMesh.vertexCount)
                        throw new InvalidDataException("Blender mesh lost textured tangent geometry: " + filter.name);
                    var local = prefab.transform.worldToLocalMatrix * filter.transform.localToWorldMatrix;
                    // The reviewed r05 exports bake geometry into identity nodes,
                    // with exactly one material per mesh. Reject import drift
                    // instead of dropping an authored transform or cloning a mesh.
                    if (filter.sharedMesh.subMeshCount != 1 || renderer.sharedMaterials.Length != 1 ||
                        Enumerable.Range(0, 16).Any(index => Mathf.Abs(local[index] - Matrix4x4.identity[index]) > .00001f) ||
                        AssetDatabase.GetAssetPath(filter.sharedMesh) != path)
                        throw new InvalidDataException("Shared Blender source mesh contract changed: " + filter.name);
                    for (int submesh = 0; submesh < filter.sharedMesh.subMeshCount; submesh++)
                    {
                        var original = renderer.sharedMaterials[submesh];
                        if (original == null || !SupportsTownDrivePipeline(original) || !original.GetTexturePropertyNames().Any(property => original.GetTexture(property) != null))
                            throw new InvalidDataException("Blender runtime material is not textured URP: " + filter.name);
                        if (!materials.TryGetValue(original.name, out var material))
                        {
                            string materialPath = ReferenceArtFolder + "/Materials/" + original.name + ".mat";
                            material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
                            if (material == null) { material = new Material(original); AssetDatabase.CreateAsset(material, materialPath); }
                            else EditorUtility.CopySerialized(original, material);
                            material.name = original.name; material.enableInstancing = true; EditorUtility.SetDirty(material); materials.Add(original.name, material);
                        }
                        parts.Add(new ReferenceMeshPart { name = filter.name, mesh = filter.sharedMesh, submesh = submesh, material = material, local = local });
                    }
                }
                if (parts.Count != 2) throw new InvalidDataException("Expected two bounded material parts per Blender LOD: " + data.id);
                result.levels[level] = parts.ToArray();
            }
            return result;
        }
        static void AddReferencePlacement(ReferenceImportedModel model, ReferencePlacement placement, TownDriveReferenceEvidence evidence)
        {
            bool hedge = placement.modelId == "clipped-hedge";
            placement.cell = (hedge ? "hedge." : "palm.") + Mathf.FloorToInt(placement.position.x / 160) + "." + Mathf.FloorToInt(placement.position.z / 160);
            evidence.nearTriangles += model.data.nearTriangles; evidence.farTriangles += model.data.farTriangles;
        }
        static Matrix4x4 ReferencePartMatrix(Matrix4x4 placementMatrix, ReferenceMeshPart part, ReferencePlacement placement)
            => placementMatrix * part.local * (part.mesh.name.Contains(".Trunk")
                ? Matrix4x4.Scale(new Vector3(placement.trunkWidthScale, 1, placement.trunkWidthScale)) : Matrix4x4.identity);

        static float ReferenceGroundClearance(ReferenceImportedModel model, ReferencePlacement placement, ReferenceRoadStrip[] roads)
        {
            var matrix = Matrix4x4.TRS(placement.position, placement.appliedRotation, placement.appliedScale);
            float clearance = float.PositiveInfinity;
            foreach (var part in model.levels.SelectMany(level => level))
            {
                var transform = ReferencePartMatrix(matrix, part, placement);
                var nearby = roads.Where(road => road.MayReach(placement.position, 20)).ToArray();
                foreach (var vertex in part.mesh.vertices)
                {
                    var point = transform.MultiplyPoint3x4(vertex); if (point.y > 2.4f) continue;
                    foreach (var road in nearby) clearance = Mathf.Min(clearance, road.Clearance(point));
                }
            }
            return clearance;
        }
        public static float ReferenceOriginalGroundClearance(Transform source, ReferenceRoadStrip[] roads)
        {
            float result = float.PositiveInfinity;
            var nearby = roads.Where(road => road.MayReach(source.position, 20)).ToArray();
            foreach (var renderer in source.GetComponent<LODGroup>().GetLODs()[0].renderers)
                foreach (var vertex in renderer.GetComponent<MeshFilter>().sharedMesh.vertices)
                { var point = renderer.transform.TransformPoint(vertex); if (point.y <= 2.4f) foreach (var road in nearby) result = Mathf.Min(result, road.Clearance(point)); }
            return result;
        }
        public static bool IsExistingReferenceContextOverlap(Vector3 position)
            => Vector3.Distance(position, new Vector3(-625.25299f, 0, -120.34629f)) < .01f || Vector3.Distance(position, new Vector3(-653.36607f, 0, 47.65371f)) < .01f;

        static void AddReferenceWallHedges(GameObject world, ReferenceImportedModel model, DriveRoute route, ReferenceRoadStrip[] roads,
            List<ReferencePlacement> placements, TownDriveReferenceEvidence evidence)
        {
            // The surface/roof pass deliberately renames the visible stucco material.
            // Resolve the immutable source node metadata instead of guessing by its
            // current presentation material. glTFast keeps EXT instance renderers
            // beneath this exact source node, five in the first Hypoluxo wall batch.
            var sourceAsset = LoadManifest().assets.Single(asset => asset.id == "road-chunk-006");
            var sourceNode = sourceAsset.nodeState.Single(node => node.materialName == "drive.pbr.boundary-wall");
            var sourceRoot = world.transform.Find("TownDrive.Asset." + sourceAsset.id)
                ?? throw new InvalidDataException("Original Hypoluxo source asset is missing.");
            var sourceGroup = FindUnique(sourceRoot.gameObject, sourceNode.name);
            var walls = sourceGroup.GetComponentsInChildren<MeshFilter>(true)
                .OrderBy(filter => route.Nearest(filter.transform.position.x, filter.transform.position.z).s).ToArray();
            foreach (var wall in walls)
            {
                if (wall.sharedMesh == null) throw new InvalidDataException("Hypoluxo source wall mesh is missing.");
                var size = Vector3.Scale(wall.sharedMesh.bounds.size, wall.transform.lossyScale);
                if (Vector3.Distance(new Vector3(Mathf.Abs(size.x), Mathf.Abs(size.y), Mathf.Abs(size.z)), new Vector3(.35f, 2.1f, 24.2f)) > .03f)
                    throw new InvalidDataException("Original Hypoluxo wall dimensions changed: " + wall.name + " " + size);
                var nearest = route.Nearest(wall.transform.position.x, wall.transform.position.z);
                if (route.Data.sections[nearest.sectionIndex].id != "leg-1")
                    throw new InvalidDataException("Original wall batch no longer lies on Hypoluxo: " + wall.name);
            }
            if (walls.Length != 5) throw new InvalidDataException("Expected the five original 24.2m Hypoluxo walls; found " + walls.Length);
            foreach (var wall in walls)
            {
                var center = wall.transform.TransformPoint(wall.sharedMesh.bounds.center);
                var nearest = route.Nearest(center.x, center.z); var onRoute = route.PointAtDistance(nearest.s);
                var roadward = new Vector3((float)onRoute.x - center.x, 0, (float)onRoute.z - center.z).normalized;
                var along = wall.transform.TransformVector(Vector3.forward).normalized;
                var rotation = Quaternion.LookRotation(Vector3.Cross(along, Vector3.up), Vector3.up);
                string sourceWall = AnimationUtility.CalculateTransformPath(wall.transform, world.transform);
                for (int index = 0; index < 8; index++)
                {
                    var position = center + along * (-10.5875f + index * 3.025f) + roadward * .85f; position.y = .01f;
                    var placement = new ReferencePlacement { sourceId = "infill." + evidence.infillWalls + "." + index, sourceWall = sourceWall,
                        sourceWallPosition = center, modelId = "clipped-hedge", infill = true, position = position, sourceScale = Vector3.one,
                        sourceRotation = rotation, appliedRotation = rotation, horizontalSafetyScale = 1, trunkWidthScale = 1,
                        appliedScale = new Vector3(3.10f / model.data.sourceWidth, 1.50f / model.data.sourceHeight, 1.10f / model.data.sourceDepth) };
                    placement.groundClearance = ReferenceGroundClearance(model, placement, roads);
                    if (placement.groundClearance < 2.4f) throw new InvalidDataException("Hypoluxo infill entered a road/sidewalk corridor: " + sourceWall);
                    evidence.minimumInfillClearance = Mathf.Min(evidence.minimumInfillClearance, placement.groundClearance);
                    AddReferencePlacement(model, placement, evidence); placements.Add(placement); evidence.infillModules++;
                }
                evidence.infillWalls++;
            }
        }

        [Serializable] sealed class ReferenceRoadEnvelope { public DriveRouteData route; public ReferenceContext context; }
        [Serializable] sealed class ReferenceContext { public ReferenceContextRoad[] roads; }
        [Serializable] sealed class ReferenceContextRoad { public float width; public ReferencePoint[] points; }
        [Serializable] sealed class ReferencePoint { public float x, z; }
        public struct ReferenceRoadStrip
        {
            public Vector2 a, b;
            public float offset, halfWidth;
            public bool MayReach(Vector3 point, float margin) => point.x >= Mathf.Min(a.x, b.x) - Mathf.Abs(offset) - halfWidth - margin && point.x <= Mathf.Max(a.x, b.x) + Mathf.Abs(offset) + halfWidth + margin
                && point.z >= Mathf.Min(a.y, b.y) - Mathf.Abs(offset) - halfWidth - margin && point.z <= Mathf.Max(a.y, b.y) + Mathf.Abs(offset) + halfWidth + margin;
            public float Clearance(Vector3 point)
            {
                var direction = b - a; float length = direction.magnitude; if (length < .00001f) return float.PositiveInfinity;
                direction /= length; var delta = new Vector2(point.x, point.z) - a;
                float along = Vector2.Dot(delta, direction) - length / 2;
                float across = Vector2.Dot(delta, new Vector2(-direction.y, direction.x)) - offset;
                var q = new Vector2(Mathf.Abs(along) - length / 2, Mathf.Abs(across) - halfWidth);
                return new Vector2(Mathf.Max(0, q.x), Mathf.Max(0, q.y)).magnitude + Mathf.Min(Mathf.Max(q.x, q.y), 0);
            }
        }
        public static ReferenceRoadStrip[] ReferenceRoadCorridors(string json)
        {
            var data = JsonUtility.FromJson<ReferenceRoadEnvelope>(json); var strips = new List<ReferenceRoadStrip>();
            foreach (var road in data.context.roads) for (int index = 1; index < road.points.Length; index++)
                strips.Add(new ReferenceRoadStrip { a = new Vector2(road.points[index - 1].x, road.points[index - 1].z), b = new Vector2(road.points[index].x, road.points[index].z), halfWidth = road.width / 2 });
            for (int index = 1; index < data.route.samples.Length; index++)
            {
                var a = data.route.samples[index - 1]; var b = data.route.samples[index];
                if (!data.route.visibleRoadSpans.Any(span => a.s >= span.fromS && a.s < span.toS)) continue;
                var section = data.route.sections[a.sectionIndex]; var first = new Vector2((float)a.x, (float)a.z); var second = new Vector2((float)b.x, (float)b.z);
                if (section.medianWidth == 0) strips.Add(new ReferenceRoadStrip { a = first, b = second, halfWidth = (float)(section.lanes * section.laneWidth) });
                else foreach (int side in new[] { -1, 1 }) strips.Add(new ReferenceRoadStrip { a = first, b = second,
                    offset = side * (float)(section.medianWidth / 2 + section.lanes * section.laneWidth / 2), halfWidth = (float)(section.lanes * section.laneWidth / 2) });
            }
            return strips.ToArray();
        }
    }
}
