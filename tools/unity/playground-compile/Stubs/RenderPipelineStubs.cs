// Compile-only shapes of the SRP Core and URP members the playground generator sets. Not shipped.
namespace UnityEngine.Rendering
{
    public class VolumeParameter<T> { public void Override(T value) { } }
    public class FloatParameter : VolumeParameter<float> { }
    public class MinFloatParameter : FloatParameter { }
    public class ClampedFloatParameter : FloatParameter { }
    public class VolumeComponent : ScriptableObject { }
    public class VolumeProfile : ScriptableObject
    {
        public bool TryGet<T>(out T component) where T : VolumeComponent { component = null; return false; }
        public T Add<T>(bool overrides = false) where T : VolumeComponent => null;
    }
    public class Volume : MonoBehaviour { public bool isGlobal; public VolumeProfile sharedProfile; }
}

namespace UnityEngine.Rendering.Universal
{
    public enum AntialiasingMode { None, FastApproximateAntialiasing, SubpixelMorphologicalAntiAliasing }
    public enum TonemappingMode { None, Neutral, ACES }
    public class TonemappingModeParameter : VolumeParameter<TonemappingMode> { }
    public class Tonemapping : VolumeComponent { public TonemappingModeParameter mode; }
    public class ColorAdjustments : VolumeComponent { public FloatParameter postExposure; public ClampedFloatParameter contrast, saturation; }
    public class Bloom : VolumeComponent { public MinFloatParameter threshold, intensity; public ClampedFloatParameter scatter; }
    public class Vignette : VolumeComponent { public ClampedFloatParameter intensity, smoothness; }
    public class ScriptableRendererData : ScriptableObject { }
    public class UniversalRendererData : ScriptableRendererData { }
    public class UniversalRenderPipelineAsset : RenderPipelineAsset
    {
        public float shadowDistance { get; set; }
        public int mainLightShadowmapResolution { get; set; }
        public int shadowCascadeCount { get; set; }
        public int msaaSampleCount { get; set; }
        public bool supportsHDR { get; set; }
        public int maxAdditionalLightsCount { get; set; }
        public override RenderPipeline CreatePipeline() => null;
    }
    public class UniversalAdditionalCameraData : MonoBehaviour { public bool renderPostProcessing; public AntialiasingMode antialiasing; }
    public static class CameraExtensions
    {
        public static UniversalAdditionalCameraData GetUniversalAdditionalCameraData(this Camera camera) => null;
    }
}
