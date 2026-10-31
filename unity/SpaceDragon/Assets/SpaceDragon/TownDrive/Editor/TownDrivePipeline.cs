using System;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace SpaceDragon.TownDrive.Editor
{
    public static partial class TownDriveProject
    {
        public const string PipelinePath = Generated + "/TownDriveURP.asset";
        public const string RendererPath = Generated + "/TownDriveRenderer.asset";
        const string BasePipelinePath = "Assets/SpaceDragon/Generated/FirstContactURP.asset";

        static UniversalRenderPipelineAsset PreparePipeline()
        {
            var source = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(BasePipelinePath)
                ?? throw new FileNotFoundException("The existing URP foundation asset is missing.", BasePipelinePath);
            var sourceSettings = new SerializedObject(source);
            var sourceRenderers = Required(sourceSettings, "m_RendererDataList");
            if (sourceRenderers.arraySize != 1 || !(sourceRenderers.GetArrayElementAtIndex(0).objectReferenceValue is UniversalRendererData rendererSource))
                throw new InvalidDataException("Expected one existing Universal renderer in the immutable base pipeline.");
            if (rendererSource.rendererFeatures.Count != 0)
                throw new InvalidDataException("Base renderer gained feature subassets; review ownership before cloning.");

            var renderer = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(RendererPath);
            if (renderer == null) { renderer = UnityEngine.Object.Instantiate(rendererSource); AssetDatabase.CreateAsset(renderer, RendererPath); }
            else EditorUtility.CopySerialized(rendererSource, renderer);
            renderer.name = "TownDriveRenderer";
            EditorUtility.SetDirty(renderer);

            var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelinePath);
            if (pipeline == null) { pipeline = UnityEngine.Object.Instantiate(source); AssetDatabase.CreateAsset(pipeline, PipelinePath); }
            else EditorUtility.CopySerialized(source, pipeline);
            pipeline.name = "TownDriveURP";
            var settings = new SerializedObject(pipeline);
            var renderers = Required(settings, "m_RendererDataList");
            renderers.arraySize = 1;
            renderers.GetArrayElementAtIndex(0).objectReferenceValue = renderer;
            Required(settings, "m_DefaultRendererIndex").intValue = 0;
            settings.ApplyModifiedPropertiesWithoutUndo();
            pipeline.shadowDistance = 120;
            pipeline.mainLightShadowmapResolution = 2048;
            pipeline.shadowCascadeCount = 4;
            pipeline.shadowDepthBias = 1.5f;
            pipeline.shadowNormalBias = 1;
            pipeline.msaaSampleCount = 4;
            pipeline.supportsHDR = true;
            EditorUtility.SetDirty(pipeline);
            return pipeline;
        }

        sealed class TownDrivePipelineScope : IDisposable
        {
            readonly RenderPipelineAsset pipeline, previousDefault, previousQuality;
            bool disposed;
            public TownDrivePipelineScope(RenderPipelineAsset owned)
            {
                pipeline = owned ?? throw new ArgumentNullException(nameof(owned));
                previousDefault = GraphicsSettings.defaultRenderPipeline;
                previousQuality = QualitySettings.renderPipeline;
                try
                {
                    GraphicsSettings.defaultRenderPipeline = pipeline;
                    QualitySettings.renderPipeline = pipeline;
                    ResetGltfPipelineCaches();
                    if (GLTFast.RenderPipelineUtils.RenderPipeline != GLTFast.RenderPipeline.Universal ||
                        !(GLTFast.Materials.MaterialGenerator.GetDefaultMaterialGenerator() is GLTFast.Materials.UniversalRPMaterialGenerator))
                        throw new InvalidOperationException("glTFast failed to select its Universal render pipeline material generator.");
                }
                catch { Dispose(); throw; }
            }
            public void Dispose()
            {
                if (disposed) return;
                disposed = true;
                // Restore only values still owned by this scope. Never overwrite
                // a setting another operation changed while the scope was open.
                if (QualitySettings.renderPipeline == pipeline) QualitySettings.renderPipeline = previousQuality;
                if (GraphicsSettings.defaultRenderPipeline == pipeline) GraphicsSettings.defaultRenderPipeline = previousDefault;
                ResetGltfPipelineCaches();
            }
        }

        static void ResetGltfPipelineCaches()
        {
            // Pinned glTFast 6.20 caches both detection and its material generator.
            // Its Editor-only load-reset hooks are the inspected reset operation;
            // fail if that contract changes instead of editing package sources.
            var types = new[] { typeof(GLTFast.RenderPipelineUtils), typeof(GLTFast.Materials.MaterialGenerator) };
            var methods = types.Select(type => type.GetMethod("ResetStaticsOnLoad", BindingFlags.Static | BindingFlags.NonPublic)
                ?? throw new MissingMethodException(type.FullName, "ResetStaticsOnLoad")).ToArray();
            foreach (var method in methods) method.Invoke(null, null);
        }

        public static bool SupportsTownDrivePipeline(Material material)
        {
            if (material == null || material.shader == null) return false;
            var pipelineTag = new ShaderTagId("RenderPipeline");
            return Enumerable.Range(0, material.shader.subshaderCount)
                .Any(index => material.shader.FindSubshaderTagValue(index, pipelineTag).name == "UniversalPipeline");
        }

        static bool ImportedMaterialsUseUrp(string path)
        {
            var materials = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Material>().ToArray();
            return materials.Length > 0 && materials.All(SupportsTownDrivePipeline);
        }
    }
}
