using System;
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace SpaceDragon.TownDrive.Editor
{
    public static partial class TownDriveProject
    {
        const string DaylightPath = "Assets/SpaceDragon/Imported/daylight.hdr";

        static void ConfigureLighting()
        {
            // The scene's owned pipeline is active only inside Setup's scope;
            // its component selects the same serialized asset during play.
            if (GraphicsSettings.currentRenderPipeline != AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelinePath))
                throw new InvalidOperationException("Town Drive's owned Universal render pipeline scope is not active.");
            var cube = AssetDatabase.LoadAssetAtPath<Cubemap>(DaylightPath);
            if (cube == null) throw new FileNotFoundException("The shared daylight HDR must already be imported as a cubemap.", DaylightPath);
            var sun = new GameObject("TownDrive.Daylight.Sun").AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.transform.rotation = Quaternion.LookRotation(new Vector3(-.55f, -.85f, -.38f));
            sun.color = new Color(1, .95f, .84f);
            sun.intensity = 2.1f;
            sun.shadows = LightShadows.Soft;
            sun.GetUniversalAdditionalLightData().usePipelineSettings = true;
            RenderSettings.sun = sun;

            var skyPath = Generated + "/DaylightSky.mat";
            var sky = AssetDatabase.LoadAssetAtPath<Material>(skyPath);
            if (sky == null)
            {
                var shader = Shader.Find("Skybox/Cubemap") ?? throw new InvalidOperationException("Cubemap sky shader is unavailable.");
                sky = new Material(shader);
                AssetDatabase.CreateAsset(sky, skyPath);
            }
            sky.SetTexture("_Tex", cube);
            sky.SetFloat("_Exposure", .6f);
            sky.SetFloat("_Rotation", 270);
            EditorUtility.SetDirty(sky);
            RenderSettings.skybox = sky;
            RenderSettings.ambientMode = AmbientMode.Skybox;
            RenderSettings.ambientIntensity = .6f;
            RenderSettings.defaultReflectionMode = DefaultReflectionMode.Custom;
            RenderSettings.customReflectionTexture = cube;
            RenderSettings.reflectionIntensity = .6f;
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogColor = new Color(.72f, .77f, .79f);
            RenderSettings.fogStartDistance = 210;
            RenderSettings.fogEndDistance = 420;

            // One source-sky capture on load, never a continuously refreshed
            // scene reflection. The immutable cubemap remains the fallback.
            var reflection = new GameObject("TownDrive.Daylight.SkyReflectionOnce").AddComponent<ReflectionProbe>();
            reflection.mode = ReflectionProbeMode.Realtime;
            reflection.refreshMode = ReflectionProbeRefreshMode.OnAwake;
            reflection.timeSlicingMode = ReflectionProbeTimeSlicingMode.NoTimeSlicing;
            reflection.cullingMask = 0;
            reflection.clearFlags = ReflectionProbeClearFlags.Skybox;
            reflection.resolution = 128;
            reflection.hdr = true;
            reflection.size = new Vector3(12000, 400, 12000);
            reflection.blendDistance = 0;
            reflection.boxProjection = false;
            reflection.intensity = 1;

            var profilePath = Generated + "/DaylightVolume.asset";
            var profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(profilePath);
            if (profile == null) { profile = ScriptableObject.CreateInstance<VolumeProfile>(); AssetDatabase.CreateAsset(profile, profilePath); }
            Component<Tonemapping>(profile).mode.Override(TonemappingMode.ACES);
            var grade = Component<ColorAdjustments>(profile);
            grade.postExposure.Override(1);
            grade.contrast.Override(13);
            var volume = new GameObject("TownDrive.Daylight.Grade").AddComponent<Volume>();
            volume.isGlobal = true;
            volume.sharedProfile = profile;
            EditorUtility.SetDirty(profile);
        }

        static T Component<T>(VolumeProfile profile) where T : VolumeComponent
        {
            if (profile.TryGet<T>(out var existing)) return existing;
            var component = profile.Add<T>(true);
            AssetDatabase.AddObjectToAsset(component, profile);
            return component;
        }
    }
}
