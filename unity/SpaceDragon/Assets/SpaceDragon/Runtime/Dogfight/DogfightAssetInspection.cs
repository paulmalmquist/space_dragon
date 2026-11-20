using System;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

namespace SpaceDragon.Dogfight
{
    /// <summary>
    /// Explicit development URL mode: ?inspect=dragon. Creates an isolated neutral
    /// scene from the selected imported asset before encounter Start executes.
    /// Normal Dogfight startup is untouched; this mode never runs combat or saves.
    /// </summary>
    public sealed class DogfightAssetInspection : MonoBehaviour
    {
#if DEVELOPMENT_BUILD || UNITY_EDITOR
        GameObject inspected;
        Camera cameraView;
        Cubemap reflection;
        VolumeProfile inspectionGrade;
        WingPropulsion wingPropulsion;
        string selectedView;
        string selectedPresentation = "source";
        string rigProfile;
        bool Oscar => rigProfile == "oscar-creativo-flight";
        float frameTotal, framePeak;
        int frames;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void OpenRequestedInspection()
        {
            if (Query("inspect") != "dragon") return;
            var originalScene = SceneManager.GetActiveScene();
            if (originalScene.name != "Dogfight") return;
            var encounter = UnityEngine.Object.FindFirstObjectByType<DogfightEncounter>();
            var source = encounter != null && encounter.ImportedDragon != null ? encounter.ImportedDragon.gameObject : null;
            if (source == null) { Debug.LogError("Dragon inspection cannot find the selected imported asset."); return; }

            var clone = Instantiate(source);
            clone.name = source.name + ".Inspection";
            clone.transform.SetParent(null, false);
            clone.transform.SetPositionAndRotation(Vector3.zero, Quaternion.identity);
            clone.transform.localScale = Vector3.one;
            // Inspect the unanimated flight bind pose, matching the Blender still.
            foreach (var animator in clone.GetComponentsInChildren<Animator>(true)) animator.enabled = false;
            foreach (var animation in clone.GetComponentsInChildren<Animation>(true)) animation.enabled = false;
            foreach (var renderer in clone.GetComponentsInChildren<SkinnedMeshRenderer>(true)) renderer.updateWhenOffscreen = true;
            var scene = SceneManager.CreateScene("Dogfight.NeutralAssetInspection");
            SceneManager.MoveGameObjectToScene(clone, scene);
            SceneManager.SetActiveScene(scene);
            // The clone already lives in the new scene. Deactivate old roots now
            // so no encounter/AI/HUD Start runs while asynchronous unload finishes.
            foreach (var root in originalScene.GetRootGameObjects()) root.SetActive(false);
            var host = new GameObject("DogfightEncounter").AddComponent<DogfightAssetInspection>();
            host.inspected = clone;
            host.rigProfile = encounter.DragonProfileId;
            host.selectedView = Query("inspectionview");
            if (Query("presentation") == "spacecraft") host.ConfigureSpacecraftInspection();
            host.ConfigureScene();
            SceneManager.UnloadSceneAsync(originalScene);
        }

        void ConfigureSpacecraftInspection()
        {
            if (!Oscar)
            {
                Debug.LogWarning("Spacecraft inspection requires the measured Oscar asset; retaining source presentation.");
                return;
            }
            Transform left = null, right = null;
            foreach (var node in inspected.GetComponentsInChildren<Transform>(true))
            {
                if (node.name == "socket_wing_l") left = node;
                else if (node.name == "socket_wing_r") right = node;
            }
            wingPropulsion = new WingPropulsion(inspected.transform,left,right);
            selectedPresentation = "spacecraft";
            // Deliberately no DragonPresentation/flight clock here: compare the
            // imported bind/rest pose to the source still. The material/nozzle
            // adapter is identical to gameplay, with static cruise exhaust.
        }

        static string Query(string key)
        {
            if (!Uri.TryCreate(Application.absoluteURL, UriKind.Absolute, out var url)) return "";
            foreach (var part in url.Query.TrimStart('?').Split('&'))
            {
                var pair = part.Split(new[] { '=' }, 2);
                if (pair.Length == 2 && Uri.UnescapeDataString(pair[0]) == key) return Uri.UnescapeDataString(pair[1]);
            }
            return "";
        }

        void ConfigureScene()
        {
            RenderSettings.skybox = null; RenderSettings.fog = false;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(.30f,.32f,.36f);
            RenderSettings.ambientEquatorColor = new Color(.18f,.19f,.21f);
            RenderSettings.ambientGroundColor = new Color(.075f,.075f,.085f);
            RenderSettings.ambientIntensity = 1;
            if (Oscar)
            {
                // Match the reference's uniform (.30,.32,.36) world at strength
                // .45 instead of inventing bright overhead reflection panels.
                RenderSettings.ambientMode = AmbientMode.Flat;
                RenderSettings.ambientLight = new Color(.30f,.32f,.36f) * .45f;
            }
            reflection = new Cubemap(16, TextureFormat.RGBAHalf, false) { name = "Inspection neutral reflection", wrapMode = TextureWrapMode.Clamp };
            for (int face = 0; face < 6; face++)
            {
                float value = face == (int)CubemapFace.PositiveY ? .65f : face == (int)CubemapFace.NegativeY ? .10f : .30f;
                var pixels = new Color[16*16];
                for (int i = 0; i < pixels.Length; i++) pixels[i] = Oscar
                    ? new Color(.30f * .45f,.32f * .45f,.36f * .45f,1) : new Color(value,value,value,1);
                reflection.SetPixels(pixels, (CubemapFace)face);
            }
            reflection.Apply(false, true);
            RenderSettings.defaultReflectionMode = DefaultReflectionMode.Custom;
            RenderSettings.customReflectionTexture = reflection; RenderSettings.reflectionIntensity = Oscar ? 1 : .75f;
            Directional("Inspection key", new Vector3(-5,8,-5), 2.1f, Color.white, true);
            Directional("Inspection fill", new Vector3(5,3,-1), .55f, new Color(.88f,.93f,1), false);
            Directional("Inspection rim", new Vector3(1,5,6), 1.2f, Color.white, false);

            cameraView = new GameObject("Inspection.Camera.50mm").AddComponent<Camera>();
            cameraView.tag = "MainCamera"; cameraView.clearFlags = CameraClearFlags.SolidColor;
            // Camera colors are authored in sRGB. Use the source-world radiance
            // here too; the old dark backdrop becomes nearly black under ACES
            // and hides the silhouette rather than helping inspection.
            cameraView.backgroundColor = Oscar
                ? new Color(.30f * .45f,.32f * .45f,.36f * .45f).gamma
                : new Color(.105f,.115f,.135f);
            cameraView.nearClipPlane = .05f; cameraView.farClipPlane = 200;
            cameraView.allowHDR = true; cameraView.allowMSAA = true;
            cameraView.usePhysicalProperties = true; cameraView.sensorSize = new Vector2(36,24);
            cameraView.focalLength = 50; cameraView.gateFit = Camera.GateFitMode.Vertical;
            if (Oscar)
            {
                // Blender's AgX reference compresses highlights. ACES is the
                // available URP approximation, not an AgX/pixel-parity claim.
                // No bloom, vignette or gameplay grade hides the surface here.
                inspectionGrade = ScriptableObject.CreateInstance<VolumeProfile>();
                inspectionGrade.Add<Tonemapping>(true).mode.Override(TonemappingMode.ACES);
                var grade = new GameObject("Inspection.highlight-rolloff.ACES").AddComponent<Volume>();
                grade.isGlobal = true; grade.sharedProfile = inspectionGrade;
                cameraView.GetUniversalAdditionalCameraData().renderPostProcessing = true;
            }
            Vector3 position;
            switch (selectedView)
            {
                case "front": position = new Vector3(0,2,Oscar ? 16 : -16); break;
                case "side": position = new Vector3(-16,3,0); break;
                case "rear": position = new Vector3(0,3,Oscar ? -16 : 16); break;
                default:
                    selectedView = "blender-neutral";
                    // Blender (10,12,6), target (0,0,.1), 50 mm on36 mm sensor.
                    // Blender +Y nose -> glTF -Z; glTFast mirrors source X.
                    // The inspection clone intentionally has no gameplay Y180 basis.
                    position = new Vector3(-10,6,Oscar ? 12 : -12); break;
            }
            cameraView.transform.SetPositionAndRotation(position, Quaternion.identity);
            cameraView.transform.LookAt(new Vector3(0,.1f,0));
            Application.targetFrameRate = 60;
            Debug.Log("SPACE_DRAGON_INSPECTION_READY " + inspected.name + " view=" + selectedView
                + " presentation=" + selectedPresentation + "; pose=imported bind/rest (no flight animation)"
                + "; use1200x800 capture for matching Blender framing; neutral lighting is an approximation, not Cycles parity.");
        }

        static void Directional(string name, Vector3 position, float intensity, Color color, bool shadows)
        {
            var light = new GameObject(name).AddComponent<Light>();
            light.type = LightType.Directional; light.color = color; light.intensity = intensity;
            light.transform.position = position; light.transform.LookAt(Vector3.zero);
            light.shadows = shadows ? LightShadows.Soft : LightShadows.None;
            light.shadowBias = .03f; light.shadowNormalBias = .12f;
        }

        void Update() { frames++; frameTotal += Time.unscaledDeltaTime; framePeak = Mathf.Max(framePeak, Time.unscaledDeltaTime); }
        [Serializable] sealed class InspectionSnapshot
        {
            public string mode, view, model, lighting, sourceCamera, graphics, device, rigProfile, presentation, pose;
            public bool combatActive, savesWritten;
            public int width, height, renderers, skinnedRenderers, frameSamples, wingMaterialCount, propulsionTriangles;
            public long modelTriangles;
            public float frameMeanMs, framePeakMs, focalLength, verticalFov;
            public Vector3 cameraPosition, cameraTarget;
        }
        // Same local browser bridge as Dogfight; no normal encounter API changes.
        public void ResetMeasurement() { frames = 0; frameTotal = framePeak = 0; }
        public void RequestSnapshot()
        {
            if (inspected == null || cameraView == null) return;
            long triangles = 0;
            foreach (var mesh in inspected.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                for (int i = 0; i < mesh.sharedMesh.subMeshCount; i++) triangles += mesh.sharedMesh.GetIndexCount(i) / 3;
            foreach (var mesh in inspected.GetComponentsInChildren<MeshFilter>(true))
                if (mesh.sharedMesh != null) for (int i=0;i<mesh.sharedMesh.subMeshCount;i++) triangles += mesh.sharedMesh.GetIndexCount(i)/3;
            var snapshot = new InspectionSnapshot { mode = "asset-inspection", view = selectedView, model = inspected.name, rigProfile = rigProfile,
                presentation = selectedPresentation, pose = "Imported bind/rest pose; no animation or gameplay timers; spacecraft exhaust is static cruise",
                wingMaterialCount = wingPropulsion?.WingMaterialCount ?? 0, propulsionTriangles = wingPropulsion?.Triangles ?? 0,
                graphics = SystemInfo.graphicsDeviceType.ToString(), device = SystemInfo.graphicsDeviceName,
                combatActive = false, savesWritten = false, lighting = Oscar
                    ? "Oscar neutral-v002: source-world radiance approximation and ACES highlight rolloff; no gameplay sky/fog/bloom; not AgX parity"
                    : "Neutral real-time studio approximation; no gameplay sky, fog or postprocessing",
                sourceCamera = Oscar ? "Blender (10,-12,6), target(0,0,.1),50mm/36x24mm; matching capture1200x800" : "Blender (10,12,6), target(0,0,.1),50mm/36x24mm; matching capture1200x800", width = Screen.width, height = Screen.height,
                renderers = inspected.GetComponentsInChildren<Renderer>(true).Length, skinnedRenderers = inspected.GetComponentsInChildren<SkinnedMeshRenderer>(true).Length,
                modelTriangles = triangles, frameSamples = frames, frameMeanMs = frames > 0 ? frameTotal/frames*1000 : 0, framePeakMs = framePeak*1000,
                focalLength = cameraView.focalLength, verticalFov = cameraView.fieldOfView, cameraPosition = cameraView.transform.position, cameraTarget = new Vector3(0,.1f,0) };
#if UNITY_WEBGL && !UNITY_EDITOR
            SD_DogfightSnapshot(JsonUtility.ToJson(snapshot));
#endif
        }
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] static extern void SD_DogfightSnapshot(string json);
#endif
        void OnDestroy()
        {
            wingPropulsion?.Dispose(); wingPropulsion = null;
            if (reflection != null) Destroy(reflection);
            if (inspectionGrade != null)
            {
                foreach (var component in inspectionGrade.components) Destroy(component);
                Destroy(inspectionGrade);
            }
        }
#endif
    }
}
