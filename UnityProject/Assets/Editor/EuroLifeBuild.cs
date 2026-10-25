using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEditor.SceneManagement;

namespace EuroLife.Editor
{
    /// <summary>CI entry point. Creates a minimal bootstrap scene if no scene is committed, then builds Android.</summary>
    public static class EuroLifeBuild
    {
        private const string ScenePath = "Assets/Scenes/ParisPrototype.unity";

        public static void BuildAndroid()
        {
            EnsureBootstrapScene();
            string output = System.Environment.GetEnvironmentVariable("EUROLIFE_BUILD_PATH");
            if (string.IsNullOrWhiteSpace(output)) output = "Builds/EuroLife.apk";
            Directory.CreateDirectory(Path.GetDirectoryName(output) ?? "Builds");

            EditorUserBuildSettings.buildAppBundle = false;
            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = BuildTarget.Android,
                options = BuildOptions.None
            };
            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
                throw new System.Exception("EURO LIFE Android build failed: " + report.summary.result +
                    " (" + report.summary.totalErrors + " errors).");
            Debug.Log("EURO LIFE Android APK built: " + output + " | size=" + report.summary.totalSize + " bytes");
        }

        private static void EnsureBootstrapScene()
        {
            if (!Directory.Exists("Assets/Scenes")) Directory.CreateDirectory("Assets/Scenes");
            if (!File.Exists(ScenePath))
            {
                var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                var bootstrap = new GameObject("EURO LIFE Bootstrap");
                bootstrap.AddComponent<global::EuroLife.PrototypeBootstrap>();
                EditorSceneManager.SaveScene(scene, ScenePath);
            }

            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene(ScenePath, true)
            };
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
        }
    }
}
