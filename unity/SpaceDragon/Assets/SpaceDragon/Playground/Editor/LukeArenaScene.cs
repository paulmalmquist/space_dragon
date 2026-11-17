using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using SpaceDragon.Traversal;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace SpaceDragon.Playground.Editor
{
    // Luke's Arena: a second generated scene beside Luke's Playground. It shares the playground's
    // render pipeline, hero stand-in and helpers, and writes only under Playground/Generated.
    // The level comes from LukeArenaData (exported from TypeScript), so what is drawn always
    // matches what the hero and the robots collide with.
    public static partial class LukePlaygroundProject
    {
        public const string ArenaScenePath = Generated + "/LukeArena.unity";
        public const string ArenaReceiptPath = "Builds/arena-setup-receipt.json";

        [Serializable]
        class ArenaEvidence
        {
            public string unityVersion, scene, world, sourceFingerprint, heroAsset, createdUtc;
            public int solids, climbs, anchors, robots, pickups, lights, heroBones;
            public float heroHeight;
            public string[] notes;
        }

        sealed class ArenaPalette
        {
            public readonly Material padCourse = Lit("Arena-pad-course", new Color(0.1f, 0.2f, 0.19f), 0.18f);
            public readonly Material padRing = Textured("Arena-pad-ring", "concrete", new Color(0.74f, 0.64f, 0.48f), 0.45f, 0.45f);
            public readonly Material tower = Textured("Arena-tower", "plaster", new Color(0.86f, 0.83f, 0.76f), 0.4f, 0.4f);
            public readonly Material crate = Textured("Arena-crate", "wood", new Color(0.78f, 0.58f, 0.4f), 0.8f, 0.8f);
            public readonly Material panel = Lit("Arena-climb-panel", new Color(0.05f, 0.14f, 0.17f), 0.3f, 0.2f);
            public readonly Material hold = Glow("Arena-hold", new Color(0.29f, 0.89f, 0.76f), 2.6f);
            public readonly Material trim = Glow("Arena-trim", new Color(0.62f, 0.85f, 1), 1.1f);
            public readonly Material lineCourse = Glow("Arena-line-course", new Color(0.29f, 0.89f, 0.76f), 2.2f);
            public readonly Material lineRing = Glow("Arena-line-ring", new Color(1, 0.7f, 0.33f), 2.2f);
            public readonly Material lineStealth = Glow("Arena-line-stealth", new Color(0.66f, 0.55f, 1), 2.4f);
            public readonly Material hide = Glow("Arena-hide", new Color(0.54f, 0.64f, 1), 1.8f);
            public readonly Material shell = Lit("Arena-robot-shell", new Color(0.36f, 0.6f, 0.44f), 0.55f, 0.4f);
            public readonly Material mower = Lit("Arena-robot-mower", new Color(0.62f, 0.24f, 0.14f), 0.5f, 0.45f);
            public readonly Material sidekick = Lit("Arena-sidekick-armour", new Color(0.24f, 0.35f, 0.44f), 0.62f, 0.45f);
            public readonly Material eyeCalm = Glow("Arena-eye-calm", new Color(0.39f, 0.85f, 1), 3.4f);
            public readonly Material eyeCurious = Glow("Arena-eye-curious", new Color(1, 0.83f, 0.35f), 3.4f);
            public readonly Material eyeAlert = Glow("Arena-eye-alert", new Color(1, 0.35f, 0.29f), 3.6f);
            public readonly Material eyeHeld = Glow("Arena-eye-held", new Color(0.56f, 0.95f, 1), 3.2f);
            public readonly Material eyeOff = Lit("Arena-eye-off", new Color(0.03f, 0.04f, 0.05f), 0.6f);
            public readonly Material pipSpent = Lit("Arena-pip-spent", new Color(0.08f, 0.09f, 0.1f), 0.3f);
            public readonly Material gemTaken = Lit("Arena-gem-taken", new Color(0.2f, 0.19f, 0.15f), 0.4f);
            public readonly Material quiet = Glow("Arena-target-quiet", new Color(0.6f, 0.39f, 1), 3.4f);
            public readonly Material fanCalm = Sheer("Arena-fan-calm", new Color(0.39f, 0.85f, 1, 0.16f));
            public readonly Material fanCurious = Sheer("Arena-fan-curious", new Color(1, 0.83f, 0.35f, 0.2f));
            public readonly Material fanAlert = Sheer("Arena-fan-alert", new Color(1, 0.35f, 0.29f, 0.24f));
            public readonly Material lane = Sheer("Arena-lane", new Color(1, 0.29f, 0.23f, 0.5f));
            public readonly Material beam = Sheer("Arena-catch-beam", new Color(1, 0.95f, 0.77f, 0.4f));
        }

        /// <summary>Unlit and see-through, for what a robot can see and where its attack will go.</summary>
        static Material Sheer(string name, Color color)
        {
            var material = Glow(name, color, 1);
            material.SetColor("_BaseColor", color);
            // URP's own material inspector normally sets these together; a generated material must set each one.
            material.SetFloat("_Surface", 1);
            material.SetFloat("_Blend", 0);
            material.SetFloat("_ZWrite", 0);
            material.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha);
            material.SetFloat("_DstBlend", (float)BlendMode.OneMinusSrcAlpha);
            material.SetOverrideTag("RenderType", "Transparent");
            material.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
            material.renderQueue = (int)RenderQueue.Transparent;
            EditorUtility.SetDirty(material);
            return material;
        }

        [MenuItem("Space Dragon/Luke's Arena/Generate scene")]
        public static void SetupArena()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode) throw new InvalidOperationException("Exit Play mode before generating Luke's Arena.");
            if (!Application.isBatchMode && !EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            Folder(Generated); Folder(MaterialFolder);
            var notes = new List<string>();
            var pipeline = PreparePipeline();
            using var pipelineScope = new PipelineScope(pipeline, notes);
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);

            ConfigureHeroTextures();
            var heroPrefab = ImportHero(notes);
            var clips = AssetDatabase.LoadAllAssetsAtPath(HeroPath).OfType<AnimationClip>()
                .Where(clip => !clip.name.StartsWith("__preview__", StringComparison.Ordinal)).ToArray();

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var layout = LukeArenaData.Create();
            var palette = new Palette();
            var arena = new ArenaPalette();
            lightCount = 0;
            var worldRoot = new GameObject("Arena.world").transform;
            BuildArenaFloor(layout, worldRoot, palette, arena);
            BuildArenaBlocks(layout, worldRoot, palette, arena);
            BuildArenaClimbs(layout, worldRoot, arena);
            BuildArenaMasts(layout, worldRoot, palette);
            BuildLighting(palette);
            // A lit training yard at night: a little brighter than the street outside.
            RenderSettings.ambientSkyColor = new Color(0.2f, 0.26f, 0.38f);
            RenderSettings.ambientEquatorColor = new Color(0.11f, 0.14f, 0.19f);
            RenderSettings.fogEndDistance = 150;

            var heroEvidence = new SetupEvidence();
            var hero = BuildHero(heroPrefab, clips, heroEvidence, notes);
            var camera = BuildCamera();
            BuildArenaGameplay(layout, hero, camera, pipeline, palette, arena);

            var evidence = new ArenaEvidence
            {
                unityVersion = Application.unityVersion, scene = ArenaScenePath, world = layout.world.id, sourceFingerprint = LukeArenaData.SourceFingerprint,
                heroAsset = HeroPath, createdUtc = DateTime.UtcNow.ToString("O"), solids = layout.world.solids.Length, climbs = layout.world.climbs.Length,
                anchors = layout.world.anchors.Length, robots = layout.robots.Length, pickups = layout.pickups.Length, lights = lightCount + 3,
                heroBones = heroEvidence.heroBones, heroHeight = heroEvidence.heroHeight, notes = notes.ToArray(),
            };
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, ArenaScenePath)) throw new IOException("Failed to save the generated Luke's Arena scene.");
            AssetDatabase.SaveAssets();
            Directory.CreateDirectory("Builds");
            File.WriteAllText(ArenaReceiptPath, JsonUtility.ToJson(evidence, true));
            Debug.Log("SPACE_DRAGON_ARENA_SETUP_OK " + ArenaScenePath + " robots=" + evidence.robots + " hero=" + evidence.heroBones + " bones");
        }

        static Material ArenaLine(ArenaPalette arena, TrialId trial) =>
            trial == TrialId.Course ? arena.lineCourse : trial == TrialId.Ring ? arena.lineRing : arena.lineStealth;

        static void BuildArenaFloor(ArenaLayout layout, Transform parent, Palette m, ArenaPalette arena)
        {
            var root = new GameObject("Floor").transform;
            root.SetParent(parent, false);
            var b = layout.world.bounds;
            // Tiles keep each piece within reach of only its nearby lights.
            for (double x = b.minX - 8; x < b.maxX + 7.9; x += 16)
                for (double z = b.minZ - 8; z < b.maxZ + 7.9; z += 16)
                    Block("Deck", x, Math.Min(b.maxX + 8, x + 16), -0.6, 0, z, Math.Min(b.maxZ + 8, z + 16), m.concrete, root, false);
            foreach (var zone in layout.zones)
            {
                var pad = zone.id == TrialId.Course ? arena.padCourse : zone.id == TrialId.Ring ? arena.padRing : m.asphalt;
                Block("Pad." + zone.id, zone.minX, zone.maxX, 0, 0.014, zone.minZ, zone.maxZ, pad, root, false);
                // A bright line on the sides that face the hub and the neighbours: step over it to start, step back to stop.
                var line = ArenaLine(arena, zone.id);
                Block("Line." + zone.id + ".south", zone.minX, zone.maxX, 0.014, 0.05, zone.minZ - 0.07, zone.minZ + 0.07, line, root, false);
                if (zone.minX > b.minX) Block("Line." + zone.id + ".west", zone.minX - 0.07, zone.minX + 0.07, 0.014, 0.05, zone.minZ, zone.maxZ, line, root, false);
                if (zone.maxX < b.maxX) Block("Line." + zone.id + ".east", zone.maxX - 0.07, zone.maxX + 0.07, 0.014, 0.05, zone.minZ, zone.maxZ, line, root, false);
            }
            // Perimeter wall with a lit coping.
            const double wall = 3.2, thick = 0.5;
            var sides = new[]
            {
                new[] { b.minX - thick, b.maxX + thick, b.minZ - thick, b.minZ }, new[] { b.minX - thick, b.maxX + thick, b.maxZ, b.maxZ + thick },
                new[] { b.minX - thick, b.minX, b.minZ, b.maxZ }, new[] { b.maxX, b.maxX + thick, b.minZ, b.maxZ },
            };
            for (int index = 0; index < sides.Length; index++)
            {
                var side = sides[index];
                Block("Wall." + index, side[0], side[1], 0, wall, side[2], side[3], m.darkMetal, root);
                Block("Wall-coping." + index, side[0], side[1], wall, wall + 0.06, side[2], side[3], arena.trim, root, false);
            }
            // Hiding places: a ring on the floor where the floodlight sets Luke back down.
            foreach (var hide in layout.hides)
            {
                var ring = Ring("Hide." + hide.id, F(layout.rules.hideRadius), 0.05f, arena.hide, root);
                ring.transform.position = new Vector3(F(hide.x), 0.04f, F(hide.z));
                ring.transform.rotation = Quaternion.Euler(90, 0, 0);
            }
            // The vault spark sits on a small plinth.
            foreach (var pickup in layout.pickups)
            {
                if (pickup.trial != TrialId.Stealth) continue;
                var plinth = Primitive(PrimitiveType.Cylinder, "Vault.plinth", m.darkMetal, root, true);
                plinth.transform.position = new Vector3(F(pickup.x), 0.25f, F(pickup.z));
                plinth.transform.localScale = new Vector3(1, 0.25f, 1);
            }
        }

        static void BuildArenaBlocks(ArenaLayout layout, Transform parent, Palette m, ArenaPalette arena)
        {
            var root = new GameObject("Blocks").transform;
            root.SetParent(parent, false);
            foreach (var block in layout.blocks)
            {
                var body = block.look == "tower" ? arena.tower : block.look == "crate" ? arena.crate : block.look == "pillar" ? m.concrete : m.darkMetal;
                Block(block.id, block.minX, block.maxX, 0, block.top, block.minZ, block.maxZ, body, root);
                if (block.look == "crate")
                {
                    foreach (double y in new[] { 0.18, block.top - 0.18 })
                        Block(block.id + ".band", block.minX - 0.03, block.maxX + 0.03, y - 0.05, y + 0.05, block.minZ - 0.03, block.maxZ + 0.03, m.darkMetal, root);
                    continue;
                }
                // A thin cap and a line of light mark every edge Luke can stand on.
                Block(block.id + ".cap", block.minX - 0.05, block.maxX + 0.05, block.top - 0.12, block.top, block.minZ - 0.05, block.maxZ + 0.05, m.darkMetal, root);
                Block(block.id + ".edge", block.minX - 0.06, block.maxX + 0.06, block.top - 0.05, block.top - 0.02, block.minZ - 0.06, block.maxZ + 0.06, arena.trim, root, false);
            }
        }

        /// <summary>Marked faces: a dark grip panel studded with lit hand-holds. Spider Climb works here and nowhere else.</summary>
        static void BuildArenaClimbs(ArenaLayout layout, Transform parent, ArenaPalette arena)
        {
            var root = new GameObject("Climbs").transform;
            root.SetParent(parent, false);
            foreach (var face in layout.world.climbs)
            {
                double outward = face.facing * 0.03;
                void Place(string name, double along, double y, double width, double height, double depth, Material material)
                {
                    double near = face.at + outward, far = near + face.facing * depth;
                    double low = Math.Min(near, far), high = Math.Max(near, far);
                    if (face.alongX) Block(name, along - width / 2, along + width / 2, y - height / 2, y + height / 2, low, high, material, root, false);
                    else Block(name, low, high, y - height / 2, y + height / 2, along - width / 2, along + width / 2, material, root, false);
                }
                double span = face.max - face.min, rise = face.maxY - face.minY;
                Place(face.id + ".panel", (face.min + face.max) / 2, face.minY + rise / 2, span - 0.24, rise - 0.2, 0.04, arena.panel);
                int columns = Math.Max(2, (int)Math.Round(span / 0.62));
                for (int row = 0; row * 0.56 + 0.5 < rise - 0.2; row++)
                {
                    for (int column = 0; column < columns; column++)
                    {
                        double along = face.min + (column + 0.5 + (row % 2 == 1 ? 0.22 : -0.22)) * span / columns;
                        if (along < face.min + 0.25 || along > face.max - 0.25) continue;
                        Place(face.id + ".hold", along, face.minY + 0.5 + row * 0.56, 0.2, 0.07, 0.09, arena.hold);
                    }
                }
            }
        }

        /// <summary>Masts and a gantry for the tether rings to hang from, and a few lamps to see the yard by.</summary>
        static void BuildArenaMasts(ArenaLayout layout, Transform parent, Palette m)
        {
            var root = new GameObject("Masts").transform;
            root.SetParent(parent, false);
            var b = layout.world.bounds;
            foreach (var anchor in layout.world.anchors)
            {
                var top = new Vector3(F(anchor.x), F(anchor.y) + 0.3f, F(anchor.z));
                // Each ring hangs from an arm that reaches in from the nearest side wall or block edge.
                var foot = anchor.perch ? new Vector3(top.x - 1.7f, F(anchor.floor), top.z + 1.7f) : new Vector3(top.x, 0, F(b.maxZ) - 0.4f);
                if (!anchor.perch && anchor.z < 10)
                {
                    // Over the ring: a gantry from one side line to the other.
                    ArenaZone ring = null;
                    foreach (var zone in layout.zones) if (zone.id == TrialId.Ring) ring = zone;
                    if (ring != null)
                    {
                        var west = new Vector3(F(ring.minX) + 0.3f, 0, top.z); var east = new Vector3(F(ring.maxX) - 0.3f, 0, top.z);
                        Bar("Gantry.west", west, new Vector3(west.x, top.y, west.z), 0.09f, m.darkMetal, root);
                        Bar("Gantry.east", east, new Vector3(east.x, top.y, east.z), 0.09f, m.darkMetal, root);
                        Bar("Gantry.beam", new Vector3(west.x, top.y, west.z), new Vector3(east.x, top.y, east.z), 0.07f, m.darkMetal, root);
                        Ball("Gantry.lamp", top + Vector3.down * 0.25f, Vector3.one * 0.3f, m.lampGlow, root, false);
                        Lamp("Gantry.light", top + Vector3.down * 0.8f, new Color(1, 0.86f, 0.66f), 26, 16, root);
                        continue;
                    }
                }
                Bar("Mast." + anchor.id, foot, new Vector3(foot.x, top.y, foot.z), 0.09f, m.darkMetal, root);
                Bar("Mast-arm." + anchor.id, new Vector3(foot.x, top.y, foot.z), top, 0.06f, m.darkMetal, root);
            }
            // One lamp over each of the other two trials.
            Lamp("Course.light", new Vector3(-19, 11, 4), new Color(0.8f, 0.95f, 1), 30, 20, root);
            Lamp("Yard.light", new Vector3(18, 8, 2), new Color(0.72f, 0.74f, 1), 14, 15, root);
        }

        static void BuildArenaGameplay(ArenaLayout layout, PersonAvatar hero, Camera camera, RenderPipelineAsset pipeline, Palette palette, ArenaPalette arena)
        {
            var root = new GameObject("Arena.gameplay");
            foreach (var anchor in layout.world.anchors)
            {
                var ring = Ring("Anchor." + anchor.id, anchor.perch ? 0.5f : 0.4f, 0.045f, anchor.perch ? palette.perchGlow : palette.tetherGlow, root.transform);
                ring.transform.position = new Vector3(F(anchor.x), F(anchor.y), F(anchor.z));
                ring.transform.rotation = Quaternion.Euler(90, 0, 0); // Lie flat: the ring is drawn in its local x-y plane.
            }
            var reticle = Ring("Arena.reticle", 0.75f, 0.06f, palette.reticleGlow, root.transform);
            reticle.SetActive(false);

            var tether = new GameObject("Arena.tether").AddComponent<LineRenderer>();
            tether.transform.SetParent(root.transform, false);
            tether.useWorldSpace = true;
            tether.positionCount = 2;
            tether.startWidth = 0.05f;
            tether.endWidth = 0.03f;
            tether.numCapVertices = 4;
            tether.sharedMaterial = palette.tetherGlow;
            tether.shadowCastingMode = ShadowCastingMode.Off;
            tether.receiveShadows = false;
            tether.enabled = false;

            // The floodlight is a real spotlight, so the yard is bright where it looks and dark while it rests.
            Light flood = null;
            foreach (var robot in layout.robots)
            {
                if (robot.kind != RobotKind.Sentry) continue;
                var profile = layout.Profile(RobotKind.Sentry);
                flood = new GameObject("Arena.floodlight").AddComponent<Light>();
                flood.transform.SetParent(root.transform, false);
                flood.transform.position = new Vector3(F(robot.x), 2, F(robot.z));
                flood.type = LightType.Spot;
                flood.spotAngle = F(profile.cone * 2 * Mathf.Rad2Deg);
                flood.innerSpotAngle = flood.spotAngle * 0.7f;
                flood.range = F(profile.sight * 1.6);
                flood.intensity = 60;
                flood.color = new Color(1, 0.95f, 0.8f);
                flood.shadows = LightShadows.Soft;
                lightCount++;
            }

            var art = new ArenaArt
            {
                shell = arena.shell, dark = palette.darkMetal, mower = arena.mower, drone = palette.metal, pip = palette.sparkGlow, pipSpent = arena.pipSpent,
                gem = palette.sparkGlow, gemTaken = arena.gemTaken, lane = arena.lane, target = palette.reticleGlow, quiet = arena.quiet, wrap = palette.tetherGlow,
                star = palette.perchGlow, beam = arena.beam, eyeCalm = arena.eyeCalm, eyeCurious = arena.eyeCurious, eyeAlert = arena.eyeAlert, eyeHeld = arena.eyeHeld, eyeOff = arena.eyeOff,
                fanCalm = arena.fanCalm, fanCurious = arena.fanCurious, fanAlert = arena.fanAlert, sidekick = arena.sidekick, diamond = ArenaDiamond(),
            };
            var gameObject = new GameObject("Arena.game");
            var voice = gameObject.AddComponent<AudioSource>();
            voice.playOnAwake = false;
            voice.spatialBlend = 0;
            var game = gameObject.AddComponent<ArenaGame>();
            game.Configure(hero, camera, tether, reticle.transform, pipeline, voice, flood, art);
            EditorUtility.SetDirty(game);
        }

        /// <summary>The spark mesh, stored as an asset so the scene keeps it after a reload.</summary>
        static Mesh ArenaDiamond()
        {
            string path = Generated + "/ArenaSpark.asset";
            var existing = AssetDatabase.LoadAssetAtPath<Mesh>(path);
            if (existing != null) return existing;
            var mesh = DiamondMesh();
            mesh.name = "Arena.spark";
            AssetDatabase.CreateAsset(mesh, path);
            return mesh;
        }

        [MenuItem("Space Dragon/Luke's Arena/Build Windows player")]
        public static void BuildArenaWindows() => BuildArena(BuildTarget.StandaloneWindows64, "Builds/Arena/Windows/LukeArena.exe");
        [MenuItem("Space Dragon/Luke's Arena/Build Web player")]
        public static void BuildArenaWeb() => BuildArena(BuildTarget.WebGL, "Builds/Arena/Web");

        static void BuildArena(BuildTarget target, string output)
        {
            if (EditorUserBuildSettings.activeBuildTarget != target)
                throw new InvalidOperationException("Launch Unity with -buildTarget " + (target == BuildTarget.WebGL ? "WebGL" : "Win64") + " before this entry point; no mid-method domain reload is permitted.");
            SetupArena();
            string folder = target == BuildTarget.WebGL ? output : Path.GetDirectoryName(output);
            Directory.CreateDirectory(folder);
            // Only this scene is passed; the shared build settings list is left as it was.
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { ArenaScenePath }, target = target, locationPathName = output, options = BuildOptions.StrictMode });
            if (report.summary.result != BuildResult.Succeeded)
                throw new BuildFailedException("Luke's Arena " + target + " build failed: " + report.summary.result);
            File.WriteAllText(folder + "/build-receipt.json", JsonUtility.ToJson(new BuildEvidence
            {
                unityVersion = Application.unityVersion, target = target.ToString(), output = output, scene = ArenaScenePath, bytes = report.summary.totalSize,
                durationSeconds = report.summary.totalTime.TotalSeconds, result = report.summary.result.ToString(),
            }, true));
            Debug.Log("SPACE_DRAGON_ARENA_BUILD_OK " + output);
        }
    }
}
