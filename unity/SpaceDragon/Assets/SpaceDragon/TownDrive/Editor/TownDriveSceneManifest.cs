using System;
using UnityEngine;

namespace SpaceDragon.TownDrive.Editor
{
    [Serializable] public sealed class TownDriveSceneManifest
    {
        public int schemaVersion;
        public string units, sourceCoordinates, exporter, sourceRevision;
        public TownDriveSceneAsset[] assets;
        public TownDrivePedestrianAsset[] pedestrianAssets;
        public TownDriveSceneMaterial[] materials;
        public TownDriveVegetationInstance[] vegetationInstances;
        public TownDriveParkedVehicle[] parkedVehicles;
        public DriveObstacle[] obstacles;
        public TownDriveSceneMinivan minivan;
        public TownDriveSceneAnchor[] anchors;
        public TownDriveSceneFile[] files;
    }
    [Serializable] public sealed class TownDrivePedestrianAsset
    {
        public string id, path, sourcePath, provenancePath, clipName, sha256, sourceSha256;
        public long bytes;
        public int appearance, meshCount, primitiveCount, skinCount, jointCount, animationCount, accessorCount, textureCount;
    }
    [Serializable] public sealed class TownDriveSceneAsset
    {
        public string id, kind, path, rootName, sha256;
        public int sourceMeshCount, sourceTriangles, expectedImportedMeshCount, expectedImportedTriangleCount, gltfMeshes, gltfNodes, externalTextureCount, chunkIndex;
        public long bytes;
        public double fromS, toS;
        public string[] requiredNodes, materialNames, extensionsUsed;
        public TownDriveNodeState[] nodeState;
    }
    [Serializable] public sealed class TownDriveNodeState
    {
        public string name, materialName;
        public bool enabled, visible, castShadow;
        public TownDrivePartLod[] lods;
    }
    [Serializable] public sealed class TownDrivePartLod { public float distance; public string meshName; }
    [Serializable] public sealed class TownDriveVegetationInstance
    {
        public string id, assetId, meshName, parentChunk;
        public Vector3 position, scale;
        public Quaternion rotationQuaternion;
        public TownDrivePartLod[] lods;
    }
    [Serializable] public sealed class TownDriveParkedVehicle
    { public string id, kind, lod; public float x, z, yaw, speed; public int colorIndex, direction; public bool braking; }
    [Serializable] public sealed class TownDriveSceneMaterial
    {
        public string name, alphaMode;
        public Color baseColor, emissiveFactor;
        public float metallic, roughness, emissiveStrength, alphaCutoff, normalScale;
        public bool doubleSided, unlit, disableDepthWrite, normalInvertX, normalInvertY, castShadow;
        public TownDriveSceneTexture[] textures;
    }
    [Serializable] public sealed class TownDriveSceneTexture
    { public string slot, path; public float uScale, vScale, uOffset, vOffset, rotation, normalScale; public int texCoord; }
    [Serializable] public sealed class TownDriveSceneMinivan
    {
        public string rootName, wheelSteerPrefix, wheelSpinPrefix, steeringWheelName;
        public Vector3 driverEye, forward;
        public string[] nodes;
        public TownDriveVehicleDimensions dimensions;
    }
    [Serializable] public sealed class TownDriveVehicleDimensions
    { public float length, width, height, wheelbase, tyreRadius; }
    [Serializable] public sealed class TownDriveSceneAnchor
    { public string name, assetId, scope; public Vector3 position; }
    [Serializable] public sealed class TownDriveSceneFile { public string path, sha256; public long bytes; }
    [Serializable] public sealed class TownDriveSceneReceipt
    {
        public string artSourceSha256;
        public int artRoofMeshes, artWallRenderers;
        public string result, unityVersion, scene, createdUtc, sourceRevision, sourceFingerprint, manifestSha256, coordinateBasis, triangleScope, minivanBoundsScope, pipelinePath, rendererPath;
        public int assets, vegetationParts, vegetationLodGroups, parkedVehicles, trafficTemplates, pedestrianTemplates, pedestrianClips,
            contextRoads, contextWaters, estimatedContextLots, junctions, closures, sceneObstacles, materialCount, texturedMaterials,
            minivanMeshes, wheelSteerNodes, wheelSpinNodes;
        public long triangles;
        public Vector3 minivanBounds, minivanRenderedBounds, driverEye;
        public TownDriveAssetEvidence[] importedAssets;
        public TownDriveAnchorEvidence[] anchors;
        public TownDriveMaterialEvidence[] materials;
        public string[] sharedConfigurationDifferences;
    }
    [Serializable] public sealed class TownDriveAssetEvidence
    { public string id, path, sha256; public int meshes, sourceMeshes, expectedImportedMeshes, normalMappedMeshes; public long triangles, sourceTriangles, expectedImportedTriangles; }
    [Serializable] public sealed class TownDriveAnchorEvidence
    { public string name, assetId; public Vector3 expected, imported; public float errorMetres; }
    [Serializable] public sealed class TownDriveMaterialEvidence
    { public string name, shader, assetPath, alphaMode; public int textureCount, renderQueue; public bool doubleSided, castsShadow; public Color emissiveFactor; }
}
