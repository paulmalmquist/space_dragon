using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;
using Object = UnityEngine.Object;

namespace SpaceDragon.TownDrive.Editor
{
    public static partial class TownDriveProject
    {
        public static Mesh[] Meshes(GameObject root) => root.GetComponentsInChildren<MeshFilter>(true).Select(filter => filter.sharedMesh)
            .Concat(root.GetComponentsInChildren<SkinnedMeshRenderer>(true).Select(renderer => renderer.sharedMesh)).Where(mesh => mesh != null).ToArray();
        public static long TriangleCount(GameObject root) => Meshes(root).Sum(mesh => Enumerable.Range(0, mesh.subMeshCount)
            .Where(index => mesh.GetTopology(index) == MeshTopology.Triangles).Sum(index => (long)mesh.GetIndexCount(index) / 3));
        public static Transform FindUnique(GameObject root, string name)
        {
            var found = root.GetComponentsInChildren<Transform>(true).Where(node => node.name == name).ToArray();
            if (found.Length != 1) throw new InvalidDataException("Expected exactly one " + name + " in " + root.name + "; found " + found.Length);
            return found[0];
        }
        static void ValidateAsset(GameObject prefab, TownDriveSceneAsset asset)
        {
            var names = new HashSet<string>(prefab.GetComponentsInChildren<Transform>(true).Select(node => node.name));
            foreach (string name in asset.requiredNodes ?? Array.Empty<string>())
                if (!names.Contains(name))
                {
                    string diagnostic = WriteImportDiagnostic(prefab, asset);
                    throw new InvalidDataException("Imported asset " + asset.id + " lost node " + name + "; actual hierarchy: " + diagnostic);
                }
            long triangles = TriangleCount(prefab);
            if (asset.expectedImportedMeshCount <= 0 || asset.expectedImportedTriangleCount <= 0)
                throw new InvalidDataException("Missing glTF instancing-expanded import expectations for " + asset.id);
            if (triangles != asset.expectedImportedTriangleCount || Meshes(prefab).Length != asset.expectedImportedMeshCount)
                throw new InvalidDataException("Imported geometry differs for " + asset.id + ": " + Meshes(prefab).Length + "/" + asset.expectedImportedMeshCount + " meshes, " + triangles + "/" + asset.expectedImportedTriangleCount + " triangles.");
            if (triangles <= 0) throw new InvalidDataException("Empty detailed asset: " + asset.id);
        }

        [Serializable] sealed class ImportNodeEvidence
        { public string name, path; public Vector3 position, scale; public Quaternion rotation; public int renderers, descendantRenderers; public bool active; }
        [Serializable] sealed class ImportHierarchyEvidence
        { public string asset, prefabName; public int transformCount; public string[] requiredNodes; public ImportNodeEvidence[] nodes; }
        static string WriteImportDiagnostic(GameObject prefab, TownDriveSceneAsset asset)
        {
            var transforms = prefab.GetComponentsInChildren<Transform>(true);
            string path = "Builds/town-drive-import-" + SafeName(asset.id) + ".json";
            var diagnostic = new ImportHierarchyEvidence { asset = asset.path, prefabName = prefab.name, transformCount = transforms.Length,
                requiredNodes = asset.requiredNodes, nodes = transforms.Take(4000).Select(node => new ImportNodeEvidence {
                    name = node.name, path = UnityEditor.AnimationUtility.CalculateTransformPath(node, prefab.transform),
                    position = node.localPosition, rotation = node.localRotation, scale = node.localScale,
                    renderers = node.GetComponents<Renderer>().Length, descendantRenderers = node.GetComponentsInChildren<Renderer>(true).Length,
                    active = node.gameObject.activeSelf }).ToArray() };
            Directory.CreateDirectory("Builds");
            File.WriteAllText(path, JsonUtility.ToJson(diagnostic, true));
            Debug.LogWarning("TOWN_DRIVE_IMPORT_HIERARCHY " + path + "; root=" + prefab.name + "; nodes=" + transforms.Length);
            return path;
        }

        public static int ValidateNormalMappedMeshes(GameObject root, HashSet<string> normalMappedMaterials)
        {
            int count = 0;
            foreach (var renderer in root.GetComponentsInChildren<Renderer>(true))
            {
                if (!renderer.sharedMaterials.Any(material => material != null && normalMappedMaterials.Contains(material.name))) continue;
                var mesh = renderer is SkinnedMeshRenderer skin ? skin.sharedMesh : renderer.GetComponent<MeshFilter>()?.sharedMesh;
                if (mesh == null || !mesh.HasVertexAttribute(VertexAttribute.Normal) || !mesh.HasVertexAttribute(VertexAttribute.Tangent) || !mesh.HasVertexAttribute(VertexAttribute.TexCoord0))
                    throw new InvalidDataException("Normal-mapped mesh lacks normals/tangents/UV0 after glTFast import: " + renderer.name);
                // The pinned importer generates absent glTF tangents from the
                // normal-map requirement. Verify the resulting per-vertex data;
                // never mutate its immutable mesh subasset in this generator.
                if (mesh.tangents.Length != mesh.vertexCount)
                    throw new InvalidDataException("Imported tangent count differs from vertex count: " + renderer.name);
                count++;
            }
            return count;
        }

        static TownDriveAnchorEvidence[] ValidateAnchors(TownDriveSceneManifest manifest, Dictionary<string, GameObject> instances)
        {
            var evidence = new List<TownDriveAnchorEvidence>();
            foreach (var anchor in manifest.anchors)
            {
                string assetId = string.IsNullOrEmpty(anchor.assetId) ? "minivan-detailed" : anchor.assetId;
                var root = instances[assetId];
                var point = root.transform.InverseTransformPoint(FindUnique(root, anchor.name).position);
                float error = Vector3.Distance(anchor.position, point);
                if (error > .015f) throw new InvalidDataException("Imported coordinate basis/position differs at " + anchor.name + ": " + error + " metres.");
                evidence.Add(new TownDriveAnchorEvidence { name = anchor.name, assetId = assetId, expected = anchor.position, imported = point, errorMetres = error });
            }
            foreach (string required in new[] { "TownDrive.Axis.Origin", "TownDrive.Axis.East", "TownDrive.Axis.North", "TownDrive.World.Spawn", "TownDrive.World.GreenIslandWinston", "TownDrive.World.GateHypoluxo" })
                if (!evidence.Any(anchor => anchor.name == required)) throw new InvalidDataException("Missing importer coordinate proof: " + required);
            return evidence.ToArray();
        }

        static void ValidateMinivan(TownDriveSceneManifest manifest, GameObject player, Bounds bounds)
        {
            var names = player.GetComponentsInChildren<Transform>(true);
            foreach (string name in manifest.minivan.nodes ?? Array.Empty<string>()) FindUnique(player, name);
            if (names.Count(node => node.name.StartsWith(manifest.minivan.wheelSteerPrefix, StringComparison.Ordinal)) != 4 ||
                names.Count(node => node.name.StartsWith(manifest.minivan.wheelSpinPrefix, StringComparison.Ordinal)) != 4)
                throw new InvalidDataException("Detailed minivan must retain four steering and four wheel-spin pivots.");
            FindUnique(player, manifest.minivan.steeringWheelName);
            var eye = player.transform.InverseTransformPoint(FindUnique(player, "TownDrive.DriverEye").position);
            if (Vector3.Distance(eye, manifest.minivan.driverEye) > .002f || manifest.minivan.forward != Vector3.forward)
                throw new InvalidDataException("Minivan driver side/eye/forward contract changed during import.");
            if (!names.Any(node => node.name.StartsWith("drive.car.cabin-detail", StringComparison.Ordinal)) || Meshes(player).Length < 40)
                throw new InvalidDataException("Detailed cabin geometry is missing.");
            var dimensions = manifest.minivan.dimensions;
            // Full rendered bounds include mirrors and trim; the reference body
            // width is not a claim about mirror-to-mirror width.
            if (Mathf.Abs(bounds.size.z - dimensions.length) > .3f || bounds.size.x < dimensions.width - .15f || bounds.size.x > dimensions.width + .6f ||
                Mathf.Abs(bounds.size.y - dimensions.height) > .3f)
                throw new InvalidDataException("Minivan silhouette/scale differs: " + bounds.size);
        }

        public static Bounds LocalBounds(GameObject root, Transform relativeTo)
            => BoundsFromFilters(root.GetComponentsInChildren<MeshFilter>(true), relativeTo);

        public static Bounds MinivanPhysicalBounds(GameObject root, Transform relativeTo)
        {
            // The exported contact-shadow card is 2.60 m wide, wider than the
            // 2.43 m mirror-to-mirror vehicle. It is a ground lighting effect,
            // not part of the vehicle silhouette or a reason to relax scale checks.
            var footprint = FindUnique(root, "drive.car.occlusion-footprint");
            var footprintBounds = LocalBounds(footprint.gameObject, relativeTo);
            if (Vector3.Distance(footprintBounds.size, new Vector3(2.6f, 0, 5.2f)) > .002f ||
                Vector3.Distance(footprintBounds.center, new Vector3(0, .035f, 0)) > .002f)
                throw new InvalidDataException("Minivan contact-shadow geometry or transform differs: " + footprintBounds);
            return BoundsFromFilters(root.GetComponentsInChildren<MeshFilter>(true)
                .Where(filter => !filter.transform.IsChildOf(footprint)), relativeTo);
        }

        static Bounds BoundsFromFilters(IEnumerable<MeshFilter> filters, Transform relativeTo)
        {
            Bounds bounds = default; bool started = false;
            foreach (var filter in filters)
            {
                if (filter.sharedMesh == null) continue;
                var source = filter.sharedMesh.bounds;
                foreach (int x in new[] { -1, 1 }) foreach (int y in new[] { -1, 1 }) foreach (int z in new[] { -1, 1 })
                {
                    var local = source.center + Vector3.Scale(source.extents, new Vector3(x, y, z));
                    var point = relativeTo.InverseTransformPoint(filter.transform.TransformPoint(local));
                    if (!started) { bounds = new Bounds(point, Vector3.zero); started = true; } else bounds.Encapsulate(point);
                }
            }
            if (!started) throw new InvalidDataException("No mesh bounds found relative to " + relativeTo.name);
            return bounds;
        }

        static void CreateVegetationPart(TownDriveVegetationInstance placement, GameObject template, Transform parent)
        {
            var instance = new GameObject("TownDrive.PlantPart." + placement.id);
            instance.transform.SetParent(parent, false);
            instance.transform.SetPositionAndRotation(placement.position, placement.rotationQuaternion);
            instance.transform.localScale = placement.scale;
            var levels = new List<Renderer[]>(); var distances = new List<float>();
            string meshName = placement.meshName;
            foreach (var lod in placement.lods ?? Array.Empty<TownDrivePartLod>())
            {
                if (string.IsNullOrEmpty(meshName)) break;
                levels.Add(ClonePart(template, meshName, instance.transform, levels.Count > 0));
                distances.Add(lod.distance);
                meshName = lod.meshName;
            }
            if (levels.Count == 0 || !string.IsNullOrEmpty(meshName))
            { levels.Add(ClonePart(template, meshName, instance.transform, levels.Count > 0)); distances.Add(390); }
            ConfigureDistanceLods(instance.AddComponent<LODGroup>(), levels, distances);
        }

        static Renderer[] ClonePart(GameObject template, string name, Transform parent, bool distant)
        {
            var part = FindUnique(template, name);
            // The asset preparer has already baked the source node matrix into
            // vertices. Keep the prepared part's identity geometry plus the
            // instance's original world TRS, including widened palm foliage.
            var relative = template.transform.worldToLocalMatrix * part.localToWorldMatrix;
            for (int index = 0; index < 16; index++)
                if (Mathf.Abs(relative[index] - Matrix4x4.identity[index]) > .0001f)
                    throw new InvalidDataException("Prepared vegetation part is not at identity: " + name);
            var clone = Object.Instantiate(part.gameObject, parent, false);
            clone.name = name;
            clone.transform.localPosition = Vector3.zero;
            clone.transform.localRotation = Quaternion.identity;
            clone.transform.localScale = Vector3.one;
            clone.SetActive(true);
            var renderers = clone.GetComponentsInChildren<Renderer>(true);
            if (renderers.Length == 0) throw new InvalidDataException("Missing vegetation silhouette: " + name);
            foreach (var renderer in renderers) { renderer.enabled = true; if (distant) renderer.shadowCastingMode = ShadowCastingMode.Off; }
            return renderers;
        }

        static void ConfigureAuthoredLods(GameObject root, TownDriveSceneAsset asset)
        {
            foreach (var states in (asset.nodeState ?? Array.Empty<TownDriveNodeState>()).GroupBy(state => state.name))
            {
                var state = states.First();
                if (states.All(candidate => candidate.lods == null || candidate.lods.Length == 0)) continue;
                // Several mapped-lot cells deliberately reuse the same batch
                // name. Only share a contract when every source occurrence has
                // identical transitions, and account for every imported node.
                string contract = LodContract(state.lods);
                if (states.Any(candidate => LodContract(candidate.lods) != contract))
                    throw LodFailure(root, asset, "Same-named source nodes have different LOD contracts: " + state.name);
                var nearMatches = AuthoredMatches(root.transform, state.name);
                if (nearMatches.Length != states.Count())
                    throw LodFailure(root, asset, "Source/imported LOD node count differs for " + state.name + ": " + states.Count() + "/" + nearMatches.Length);
                foreach (var near in nearMatches)
                {
                    var levels = new List<Renderer[]>(); var distances = new List<float>();
                    Transform node = near;
                    foreach (var lod in state.lods)
                    {
                        if (node == null) break;
                        node.gameObject.SetActive(true);
                        var renderers = node.GetComponentsInChildren<Renderer>(true);
                        foreach (var renderer in renderers) renderer.enabled = true;
                        levels.Add(renderers); distances.Add(lod.distance);
                        node = string.IsNullOrEmpty(lod.meshName) ? null : ResolveScopedLod(root, asset, near, lod.meshName);
                    }
                    if (node != null)
                    { node.gameObject.SetActive(true); levels.Add(node.GetComponentsInChildren<Renderer>(true)); distances.Add(390); }
                    string sourcePath = UnityEditor.AnimationUtility.CalculateTransformPath(near, root.transform);
                    var group = new GameObject("TownDrive.AuthoredLOD." + state.name + "." + HashText(sourcePath).Substring(0, 10));
                    group.transform.SetParent(root.transform, false);
                    ConfigureDistanceLods(group.AddComponent<LODGroup>(), levels, distances);
                }
            }
        }

        static string LodContract(TownDrivePartLod[] lods) => string.Join("|", (lods ?? Array.Empty<TownDrivePartLod>())
            .Select(lod => lod.distance.ToString("R", System.Globalization.CultureInfo.InvariantCulture) + ":" + lod.meshName));

        static Transform[] AuthoredMatches(Transform scope, string name)
        {
            var matches = scope.GetComponentsInChildren<Transform>(true).Where(node => node.name == name).ToArray();
            // Multiple primitive children can retain their source node's name.
            // The authored ancestor owns all those renderers, never a random
            // matching primitive or a sibling in a different mapped lot.
            return matches.Where(node => !matches.Any(other => other != node && node.IsChildOf(other))).ToArray();
        }

        static Transform ResolveScopedLod(GameObject root, TownDriveSceneAsset asset, Transform near, string name)
        {
            for (var scope = near.parent; scope != null; scope = scope.parent)
            {
                var matches = AuthoredMatches(scope, name);
                if (matches.Length == 1) return matches[0];
                if (matches.Length > 1) throw LodFailure(root, asset, "Ambiguous LOD target " + name + " below " + UnityEditor.AnimationUtility.CalculateTransformPath(scope, root.transform));
                if (scope == root.transform) break;
            }
            throw LodFailure(root, asset, "Missing scoped LOD target " + name + " for " + near.name);
        }

        static InvalidDataException LodFailure(GameObject root, TownDriveSceneAsset asset, string reason) =>
            new InvalidDataException(reason + "; asset=" + asset.id + "; actual hierarchy: " + WriteImportDiagnostic(root, asset));

        static void ConfigureDistanceLods(LODGroup group, List<Renderer[]> renderers, List<float> distances)
        {
            if (renderers.Count == 0 || renderers.Any(level => level.Length == 0)) throw new InvalidDataException("LOD group has an empty geometry tier.");
            group.fadeMode = LODFadeMode.None;
            group.animateCrossFading = false;
            group.SetLODs(renderers.Select((level, index) => new LOD(.5f / (index + 1), level)).ToArray());
            group.RecalculateBounds();
            float worldSize = group.size * Mathf.Max(Mathf.Abs(group.transform.lossyScale.x), Mathf.Abs(group.transform.lossyScale.y), Mathf.Abs(group.transform.lossyScale.z));
            float previous = 1;
            var levels = new LOD[renderers.Count];
            for (int index = 0; index < levels.Length; index++)
            {
                float height = Mathf.Clamp(worldSize / (2 * Mathf.Tan(31 * Mathf.Deg2Rad) * distances[index]), .00001f, previous - .00001f);
                levels[index] = new LOD(height, renderers[index]); previous = height;
            }
            group.SetLODs(levels);
        }
    }
}
