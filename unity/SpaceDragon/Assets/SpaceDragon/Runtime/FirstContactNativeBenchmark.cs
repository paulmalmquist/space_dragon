using UnityEngine;
#if UNITY_STANDALONE_WIN && !UNITY_EDITOR
using System;
using System.Collections;
using System.IO;
using UnityEngine.Rendering;
#endif

namespace SpaceDragon.FirstContact
{
    /// <summary>Explicit, local standalone benchmark. No automatic behavior in normal launches or Web builds.</summary>
    public sealed class FirstContactNativeBenchmark : MonoBehaviour
    {
#if UNITY_STANDALONE_WIN && !UNITY_EDITOR
        private const string Flag = "--space-dragon-benchmark";
        private const double SampleSeconds = 10;
        private static readonly string[] Arguments = Environment.GetCommandLineArgs();
        public static bool Requested => Array.IndexOf(Arguments, Flag) >= 0;
        private string outputFolder;
        private readonly Report report = new Report();

        [Serializable]
        private sealed class Report
        {
            public string result;
            public string scope = "Native Windows candidate, fixed arrival camera, 10-second run with a 300-frame rolling window and warmup exclusion. Not sustained gameplay, human review, or a browser result.";
            public string capturedUtc;
            public string operatingSystem;
            public string processor;
            public bool batchMode;
            public int targetFrameRate;
            public int vSyncCount;
            public double requestedRunSeconds = SampleSeconds;
            public double observedRunSeconds;
            public string persistence = "Disabled: no candidate checkpoint reads, writes, or rewards in this explicit benchmark run.";
            public string screenshot = "NOT CAPTURED";
            public string failure;
            public FirstContactRuntimeSnapshot snapshot;
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void StartRequestedBenchmark()
        {
            if (!Requested) return;
            new GameObject("FirstContact.ExplicitNativeBenchmark").AddComponent<FirstContactNativeBenchmark>();
        }

        private IEnumerator Start()
        {
            int flagIndex = Array.IndexOf(Arguments, Flag);
            bool validArguments = true;
            try
            {
                if (flagIndex < 0 || flagIndex + 1 >= Arguments.Length)
                    throw new ArgumentException("The benchmark flag requires an existing absolute output folder.");
                string supplied = Arguments[flagIndex + 1];
                if (!Path.IsPathFullyQualified(supplied) || !Directory.Exists(supplied))
                    throw new ArgumentException("The benchmark output must be an existing absolute folder.");
                outputFolder = Path.GetFullPath(supplied);
                if (File.Exists(Path.Combine(outputFolder, "native-arrival-measurements.json")) || File.Exists(Path.Combine(outputFolder, "native-arrival.png")))
                    throw new IOException("Benchmark output already exists. Select a fresh task folder to preserve the earlier run.");
            }
            catch (Exception error)
            {
                Debug.LogError("SPACE_DRAGON_NATIVE_BENCHMARK_ARGUMENT_ERROR " + error.Message);
                Application.Quit(2);
                validArguments = false;
            }
            if (!validArguments) yield break;

            Application.runInBackground = true;
            Application.targetFrameRate = 60;
            report.capturedUtc = DateTime.UtcNow.ToString("O");
            report.operatingSystem = SystemInfo.operatingSystem;
            report.processor = SystemInfo.processorType;
            report.batchMode = Application.isBatchMode;
            report.targetFrameRate = Application.targetFrameRate;
            report.vSyncCount = QualitySettings.vSyncCount;
            if (SystemInfo.graphicsDeviceType == GraphicsDeviceType.Null)
            {
                FinishFailure("A real graphics device is required; -nographics cannot benchmark rendering.");
                yield break;
            }

            var experience = FindFirstObjectByType<FirstContactExperience>();
            if (experience == null)
            {
                FinishFailure("The First Contact candidate component is missing.");
                yield break;
            }
            double readyDeadline = Time.realtimeSinceStartupAsDouble + 60;
            while (!experience.IsVisualReady && Time.realtimeSinceStartupAsDouble < readyDeadline) yield return null;
            if (!experience.IsVisualReady)
            {
                report.snapshot = JsonUtility.FromJson<FirstContactRuntimeSnapshot>(experience.CaptureSnapshotJson());
                FinishFailure("The scene and its single reflection capture did not become ready within 60 seconds.");
                yield break;
            }

            experience.SetPaused(false);
            experience.SetBenchmarkMode("arrival");
            // Let the changed camera submit before starting a fresh, explicitly warmup-filtered sample.
            yield return null;
            experience.ResetMeasurement();
            double sampleStarted = Time.realtimeSinceStartupAsDouble;
            while (Time.realtimeSinceStartupAsDouble - sampleStarted < SampleSeconds) yield return null;
            report.observedRunSeconds = Time.realtimeSinceStartupAsDouble - sampleStarted;
            report.snapshot = JsonUtility.FromJson<FirstContactRuntimeSnapshot>(experience.CaptureSnapshotJson());
            if (report.snapshot == null || !report.snapshot.ready || report.snapshot.paused || report.snapshot.performance == null ||
                report.snapshot.performance.frames == null || report.snapshot.performance.frames.sampleCount < 30)
            {
                FinishFailure("The sample was unready, paused, or contained fewer than 30 measured frames.");
                yield break;
            }
            if (report.snapshot.podRewardCount != 0 || report.snapshot.podOpened)
            {
                FinishFailure("Benchmark isolation failed: this run must not load or grant pod progress.");
                yield break;
            }

            // This is a standalone Player, where end-of-frame coroutines run in batch mode.
            // Readback occurs after the saved measurement snapshot and cannot inflate its frame statistics.
            yield return new WaitForEndOfFrame();
            CaptureScreenshot();
            report.result = "PASS: bounded native measurement recorded";
            WriteReportAndQuit(0);
        }

        private void CaptureScreenshot()
        {
            Texture2D capture = null;
            RenderTexture previous = RenderTexture.active;
            try
            {
                RenderTexture.active = null;
                capture = new Texture2D(Screen.width, Screen.height, TextureFormat.RGB24, false);
                capture.ReadPixels(new Rect(0, 0, Screen.width, Screen.height), 0, 0, false);
                capture.Apply(false);
                byte[] png = ImageConversion.EncodeToPNG(capture);
                using (var file = new FileStream(Path.Combine(outputFolder, "native-arrival.png"), FileMode.CreateNew, FileAccess.Write))
                    file.Write(png, 0, png.Length);
                report.screenshot = "native-arrival.png; captured after the measurement interval";
            }
            catch (Exception error) { report.screenshot = "NOT CAPTURED: " + error.Message; }
            finally
            {
                RenderTexture.active = previous;
                if (capture != null) Destroy(capture);
            }
        }

        private void FinishFailure(string reason)
        {
            report.result = "FAIL";
            report.failure = reason;
            WriteReportAndQuit(3);
        }

        private void WriteReportAndQuit(int exitCode)
        {
            try
            {
                string filePath = Path.Combine(outputFolder, "native-arrival-measurements.json");
                using (var file = new StreamWriter(new FileStream(filePath, FileMode.CreateNew, FileAccess.Write)))
                    file.Write(JsonUtility.ToJson(report, true));
                Debug.Log("SPACE_DRAGON_NATIVE_BENCHMARK " + report.result + " " + filePath);
            }
            catch (Exception error)
            {
                Debug.LogError("SPACE_DRAGON_NATIVE_BENCHMARK_WRITE_ERROR " + error.Message);
                exitCode = 4;
            }
            Application.Quit(exitCode);
        }
#else
        public static bool Requested => false;
#endif
    }
}
