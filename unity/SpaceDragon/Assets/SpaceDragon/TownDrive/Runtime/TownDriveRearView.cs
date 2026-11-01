using System;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace SpaceDragon.TownDrive.Runtime
{
    /// <summary>
    /// A bounded rear-camera-style mirror. It observes the scene after presentation;
    /// it never advances the simulation or changes the shared renderer configuration.
    /// </summary>
    public sealed class TownDriveRearView : MonoBehaviour
    {
        public const int TextureWidth = 320;
        public const int TextureHeight = 86;
        public const double CaptureInterval = 1.0 / 6.0;
        public static readonly Vector3 CameraLocalPosition = new Vector3(0, 1.45f, -2.70f);

        [SerializeField] private Transform player;
        [SerializeField] private Camera mainCamera;
        [SerializeField] private MeshRenderer surface;
        private readonly Plane[] viewPlanes = new Plane[6];
        private Camera captureCamera;
        private RenderTexture texture;
        private Material originalMaterial;
        private Material displayMaterial;
        private UniversalRenderPipeline.SingleCameraRequest request;
        private bool supportChecked;
        private double nextCaptureAt;

        public int Captures { get; private set; }
        public bool Active { get; private set; }
        public bool Supported { get; private set; }
        public double LastCaptureMilliseconds { get; private set; }
        public Vector3 CapturePosition => captureCamera != null ? captureCamera.transform.position :
            player != null ? player.TransformPoint(CameraLocalPosition) : Vector3.zero;

        public void Configure(Transform car, Camera viewCamera, MeshRenderer mirrorSurface)
        {
            ReleaseResources();
            player = car;
            mainCamera = viewCamera;
            surface = mirrorSurface;
            Captures = 0;
            LastCaptureMilliseconds = 0;
            Active = false;
            Supported = false;
            supportChecked = false;
            nextCaptureAt = 0;
        }

        /// <summary>Call once after car, camera and population presentation have their final pose.</summary>
        public void Tick(bool cabin, bool paused)
        {
            Active = false;
            // The generated overlay starts hidden. Cabin presentation owns its
            // visibility; a pause keeps the last image without issuing a capture.
            if (surface != null) surface.enabled = cabin && isActiveAndEnabled;
            if (!isActiveAndEnabled || !cabin || paused) return;
            if (player == null || mainCamera == null || surface == null)
                throw new InvalidOperationException("Town Drive rear view is missing its player, camera or mirror surface.");
            if (!surface.enabled || !surface.gameObject.activeInHierarchy) return;
            GeometryUtility.CalculateFrustumPlanes(mainCamera, viewPlanes);
            if (!GeometryUtility.TestPlanesAABB(viewPlanes, surface.bounds)) return;
            if (!EnsureResources()) return;
            Active = true;
            double now = Time.realtimeSinceStartupAsDouble;
            if (now < nextCaptureAt) return;
            // A slow frame never queues a burst of missed mirror captures.
            nextCaptureAt = now + CaptureInterval;
            captureCamera.cullingMask = mainCamera.cullingMask;
            captureCamera.transform.SetPositionAndRotation(player.TransformPoint(CameraLocalPosition),
                player.rotation * Quaternion.Euler(0, 180, 0));
            double started = Time.realtimeSinceStartupAsDouble;
            RenderPipeline.SubmitRenderRequest(captureCamera, request);
            LastCaptureMilliseconds = (Time.realtimeSinceStartupAsDouble - started) * 1000;
            Captures++;
        }

        private bool EnsureResources()
        {
            if (supportChecked) return Supported;
            // Start can precede creation of the active SRP. Retry on the next ordinary
            // presentation frame without treating that startup state as unsupported.
            if (RenderPipelineManager.currentPipeline == null) return false;
            if (surface.sharedMaterial == null || !surface.sharedMaterial.HasProperty("_BaseMap"))
                throw new InvalidOperationException("Town Drive rear view requires its persisted URP display material.");

            var cameraObject = new GameObject("TownDrive.RearViewCamera") { hideFlags = HideFlags.DontSave };
            captureCamera = cameraObject.AddComponent<Camera>();
            captureCamera.enabled = false;
            captureCamera.clearFlags = CameraClearFlags.Skybox;
            captureCamera.nearClipPlane = .15f;
            captureCamera.farClipPlane = 100f;
            captureCamera.fieldOfView = 28f;
            captureCamera.aspect = (float)TextureWidth / TextureHeight;
            captureCamera.allowHDR = false;
            captureCamera.allowMSAA = false;
            captureCamera.allowDynamicResolution = false;
            captureCamera.useOcclusionCulling = true;
            var data = cameraObject.AddComponent<UniversalAdditionalCameraData>();
            data.renderType = CameraRenderType.Base;
            data.renderShadows = false;
            data.renderPostProcessing = false;
            data.antialiasing = AntialiasingMode.None;
            data.requiresDepthOption = CameraOverrideOption.Off;
            data.requiresColorOption = CameraOverrideOption.Off;
            data.volumeLayerMask = 0;

            texture = new RenderTexture(TextureWidth, TextureHeight, 16, RenderTextureFormat.ARGB32,
                RenderTextureReadWrite.Default)
            {
                name = "TownDrive rear camera view",
                hideFlags = HideFlags.DontSave,
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                antiAliasing = 1,
                useMipMap = false,
                autoGenerateMips = false
            };
            if (!texture.Create()) throw new InvalidOperationException("Town Drive rear-view texture could not be created.");
            request = new UniversalRenderPipeline.SingleCameraRequest { destination = texture };
            Supported = RenderPipeline.SupportsRenderRequest(captureCamera, request);
            supportChecked = true;
            if (!Supported)
            {
                Debug.LogWarning("Town Drive rear view is unavailable on the active render pipeline; original mirror material retained.", this);
                ReleaseResources();
                return false;
            }
            originalMaterial = surface.sharedMaterial;
            displayMaterial = new Material(originalMaterial)
            {
                name = "TownDrive live rear-view display",
                hideFlags = HideFlags.DontSave
            };
            displayMaterial.SetTexture("_BaseMap", texture);
            // The authored overlay UVs already reverse horizontal image direction.
            displayMaterial.SetTextureScale("_BaseMap", Vector2.one);
            displayMaterial.SetTextureOffset("_BaseMap", Vector2.zero);
            surface.sharedMaterial = displayMaterial;
            return true;
        }

        private void OnDisable() { Active = false; }
        private void OnDestroy() { ReleaseResources(); }
        private void ReleaseResources()
        {
            Active = false;
            if (surface != null && displayMaterial != null && surface.sharedMaterial == displayMaterial)
                surface.sharedMaterial = originalMaterial;
            if (captureCamera != null) DestroyOwned(captureCamera.gameObject);
            if (texture != null) { texture.Release(); DestroyOwned(texture); }
            if (displayMaterial != null) DestroyOwned(displayMaterial);
            captureCamera = null;
            texture = null;
            displayMaterial = null;
            originalMaterial = null;
            request = null;
        }

        private static void DestroyOwned(UnityEngine.Object value)
        {
            if (Application.isPlaying) Destroy(value);
            else DestroyImmediate(value);
        }
    }
}
