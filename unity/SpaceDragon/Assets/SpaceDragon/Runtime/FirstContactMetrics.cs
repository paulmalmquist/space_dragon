using System;
using Unity.Profiling;
using UnityEngine;

namespace SpaceDragon.FirstContact
{
    [Serializable]
    public sealed class ContactMetricsSnapshot
    {
        public ContactFrameStatistics frames;
        public bool drawCallsAvailable;
        public long previousCompletedFrameDrawCalls;
        public bool memoryAvailable;
        public long unityTotalUsedMemoryBytes;
        public string memoryScope = "Unity Total Used Memory counter; not browser process, GPU memory, or JS heap";
        public int screenWidth;
        public int screenHeight;
        public int cameraPixelWidth;
        public int cameraPixelHeight;
        public string renderer;
        public string graphicsApi;
        public string unityVersion;
        public string platform;
    }

    public sealed class FirstContactMetrics : IDisposable
    {
        private readonly ContactFrameSampler sampler = new ContactFrameSampler();
        private ProfilerRecorder draws;
        private ProfilerRecorder memory;

        public FirstContactMetrics()
        {
            // These counters are optional on browser/release targets. Unsupported means unavailable, never zero usage.
            try { draws = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Draw Calls Count", 1); } catch (Exception) { }
            try { memory = ProfilerRecorder.StartNew(ProfilerCategory.Memory, "Total Used Memory", 1); } catch (Exception) { }
        }

        public void Record() => sampler.Record(Time.realtimeSinceStartupAsDouble);
        public void Reset() => sampler.Reset();
        public void SetPaused(bool value) => sampler.SetPaused(value);

        public ContactMetricsSnapshot Snapshot(Camera camera) => new ContactMetricsSnapshot
        {
            frames = sampler.Snapshot(),
            drawCallsAvailable = draws.Valid && draws.IsRunning,
            previousCompletedFrameDrawCalls = draws.Valid && draws.IsRunning ? draws.LastValue : -1,
            memoryAvailable = memory.Valid && memory.IsRunning,
            unityTotalUsedMemoryBytes = memory.Valid && memory.IsRunning ? memory.LastValue : -1,
            screenWidth = Screen.width,
            screenHeight = Screen.height,
            cameraPixelWidth = camera != null ? camera.pixelWidth : 0,
            cameraPixelHeight = camera != null ? camera.pixelHeight : 0,
            renderer = SystemInfo.graphicsDeviceName,
            graphicsApi = SystemInfo.graphicsDeviceType.ToString(),
            unityVersion = Application.unityVersion,
            platform = Application.platform.ToString()
        };

        public void Dispose()
        {
            if (draws.Valid) draws.Dispose();
            if (memory.Valid) memory.Dispose();
        }
    }
}
