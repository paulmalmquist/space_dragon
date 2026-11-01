using System;
using System.Reflection;
using GLTFast;
using GLTFast.Materials;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace SpaceDragon.Dogfight.Editor
{
    /// <summary>
    /// glTFast 6.20 caches both detected pipeline and its default material generator.
    /// The importer can run in another process before the temporary build pipeline
    /// is selected. Bind only Dogfight GLBs to their actual URP asset in that process;
    /// restore globals afterwards and never edit glTFast or imported material data.
    /// </summary>
    internal sealed class DogfightGltfImportScope : AssetPostprocessor
    {
        const string PipelinePath = DogfightProject.Generated + "/DogfightURP.asset";
        static bool active;
        static RenderPipelineAsset priorDefault, priorQuality;

        void OnPreprocessAsset()
        {
            // Also ends a scope in an import worker that did not receive a batch
            // completion callback before its next, possibly unrelated, asset.
            RestoreScope();
            if (!assetPath.StartsWith(DogfightProject.Imported + "/", StringComparison.Ordinal)
                || !assetPath.EndsWith(".glb", StringComparison.OrdinalIgnoreCase)) return;
            var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelinePath);
            // A clean project's very first automatic import may precede pipeline
            // creation. GenerateScene creates it, then forces a scoped reimport.
            if (pipeline == null) return;
            context.DependsOnArtifact(PipelinePath);
            priorDefault = GraphicsSettings.defaultRenderPipeline;
            priorQuality = QualitySettings.renderPipeline;
            active = true;
            try
            {
                GraphicsSettings.defaultRenderPipeline = pipeline;
                QualitySettings.renderPipeline = pipeline;
                ResetCaches();
                var generator = MaterialGenerator.GetDefaultMaterialGenerator();
                if (!(generator is UniversalRPMaterialGenerator))
                    throw new InvalidOperationException("Dogfight glTF import did not select URP: " + generator.GetType().FullName);
                Debug.Log("DOGFIGHT_GLTF_URP_IMPORT " + assetPath);
            }
            catch { RestoreScope(); throw; }
        }

        static void OnPostprocessAllAssets(string[] importedAssets, string[] deletedAssets,
            string[] movedAssets, string[] movedFromAssetPaths)
        {
            RestoreScope();
        }

        static void RestoreScope()
        {
            if (!active) return;
            GraphicsSettings.defaultRenderPipeline = priorDefault;
            QualitySettings.renderPipeline = priorQuality;
            active = false; priorDefault = null; priorQuality = null;
            ResetCaches();
        }

        internal static void ResetCaches()
        {
            // The pinned package exposes no public invalidation API. Invoke its
            // own Editor reset hooks; fail clearly if a future upgrade changes them.
            foreach (var type in new[] { typeof(RenderPipelineUtils), typeof(MaterialGenerator) })
            {
                var method = type.GetMethod("ResetStaticsOnLoad", BindingFlags.Static | BindingFlags.NonPublic);
                if (method == null || method.GetParameters().Length != 0)
                    throw new MissingMethodException(type.FullName, "ResetStaticsOnLoad (pinned glTFast Editor compatibility)");
                method.Invoke(null, null);
            }
        }
    }
}
