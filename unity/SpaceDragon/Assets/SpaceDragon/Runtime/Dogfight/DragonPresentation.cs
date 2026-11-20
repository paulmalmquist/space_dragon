using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Experimental.Rendering;

namespace SpaceDragon.Dogfight
{
    /// <summary>
    /// Render-only adapter. Gameplay is metres/+Y up/+Z forward. The generated
    /// hierarchy supplies exactly one Y180 source-basis transform for the -Z GLB.
    /// This component never moves that basis, the gameplay root, or a collider.
    /// Clip poses are sampled once from the real imported clips, then interpolated
    /// at the irregular stroke phase; Jaw and steering remain additive presentation.
    /// </summary>
    public sealed class DragonPresentation : MonoBehaviour
    {
        const int Samples = 31;
        // Keep the original indices for rollback: Jaw 7, Root 8. Organic anatomy
        // adds six sampled bones without changing the mechanical adapter layout.
        static readonly string[] BoneNames = { "Wing_L", "Wing_R", "Tail_0", "Tail_1", "Tail_2", "Tail_3", "Tail_4", "Jaw", "Root",
            "Neck", "Head", "Fore_L", "Fore_R", "Hind_L", "Hind_R" };
        readonly Transform[] bones = new Transform[15];
        readonly Quaternion[] rests = new Quaternion[15];
        readonly Quaternion[] displayed = new Quaternion[15];
        readonly Quaternion[][][] poses = new Quaternion[3][][];
        readonly float[] weights = { 1, 0, 0 };
        readonly Dictionary<string, Transform> nodes = new Dictionary<string, Transform>(StringComparer.Ordinal);
        readonly List<Mesh> ownedMeshes = new List<Mesh>();
        readonly List<GameObject> details = new List<GameObject>();
        Transform motion, model;
        SampledDragonRig measuredRig;
        DragonRigProfile measuredProfile;
        WingPropulsion wingPropulsion;
        static readonly float[] ShipPoseWeights = { 0, 1, 0 };
        Vector3 motionRestPosition;
        Quaternion motionRestRotation;
        bool configured, paused, organic;
        int boneCount = 9;
        uint random = 8147;
        float strokeTime, strokeDuration, amplitude, downstroke, boostWeight, animationTime;
        int strokes;
        bool gliding;

        public Transform ModelRoot => model;
        public Transform MuzzleTransform => Socket("socket_muzzle");
        public string ActiveState { get; private set; } = "Flight";
        public float FlightWeight => weights[0];
        public float GlideWeight => weights[1];
        public float BoostWeight => weights[2];
        public int AddedMeshCount => ownedMeshes.Count;
        public int AddedTriangles { get; private set; }
        public bool UsesAuthoredClips { get; private set; }
        public bool UsesOrganicRig => organic;
        public string RigProfile => measuredRig != null ? measuredRig.Id : organic ? "violet-organic-15" : "mechanical-9";
        public int AnimatedTransformCount => measuredRig != null ? measuredRig.AnimatedCount : boneCount - 2;
        public Transform DamageAttachment(int system) => measuredProfile?.damageSockets?.Length == 3 && system >= 0 && system < 3 ? Socket(measuredProfile.damageSockets[system]) : null;
        public bool UsesMeasuredRig => measuredRig != null;
        public bool UsesSpacecraftMode { get; private set; }
        public Transform LaserMuzzleLeft => wingPropulsion?.LaserLeft;
        public Transform LaserMuzzleRight => wingPropulsion?.LaserRight;
        public Transform NozzleLeft => wingPropulsion?.NozzleLeft;
        public Transform NozzleRight => wingPropulsion?.NozzleRight;
        public float PropulsionLevel => wingPropulsion?.Level ?? 0;
        public bool PropulsionBoosting => wingPropulsion?.Boosting ?? false;
        public bool PropulsionBraking => wingPropulsion?.Braking ?? false;
        public int PropulsionTriangles => wingPropulsion?.Triangles ?? 0;
        public int WingMaterialCount => wingPropulsion?.WingMaterialCount ?? 0;
        public void ShutdownPropulsion() => wingPropulsion?.Shutdown();
#if DEVELOPMENT_BUILD || UNITY_EDITOR
        [Serializable] public sealed class SkinWeightEvidence
        {
            public string status="NOT_APPLICABLE", runtimeQualitySkinWeights="NOT_SAMPLED";
            public int maxMeshInfluences=-1, skinnedMeshCount, unreadableSkinMeshes;
            public long totalPositiveInfluences=-1;
            public bool allRendererQualityAuto;
        }
        // Captured once from the meshes actually present after player loading.
        // Restart and snapshot requests reuse this evidence; no per-frame scan.
        public SkinWeightEvidence SkinWeights { get; private set; } = new SkinWeightEvidence();
        [Serializable] public sealed class TextureRuntimeEvidence
        {
            public bool supportsBc7;public int count,bc7Count,otherCount,readableCount;
            public long allocatedBytes;public string[] formats=Array.Empty<string>();
        }
        public TextureRuntimeEvidence Textures { get; private set; } = new TextureRuntimeEvidence();
#endif
        public bool IsGliding => gliding;
        public float StrokePhase => Mathf.Clamp01(strokeTime / Mathf.Max(.01f, strokeDuration));

        public void Configure(Transform visualMotion, Transform importedModel,
            AnimationClip flight, AnimationClip glide, AnimationClip boost, bool authoredArmor = false, bool organic = false, DragonRigProfile rigProfile = null, bool spacecraft = false)
        {
            if (visualMotion == null || importedModel == null || visualMotion == importedModel)
                throw new ArgumentException("Dragon requires separate visual-motion and imported-model roots.");
            if (spacecraft && (rigProfile == null || rigProfile.id != "oscar-creativo-flight"))
                throw new ArgumentException("The spacecraft wing adapter requires the measured Oscar rig.");
            configured = false; UsesAuthoredClips = false; UsesSpacecraftMode = false;
            wingPropulsion?.Dispose(); wingPropulsion = null;
#if DEVELOPMENT_BUILD || UNITY_EDITOR
            SkinWeights=new SkinWeightEvidence();
            Textures=new TextureRuntimeEvidence();
#endif
            measuredRig?.Restore(); measuredRig = null; measuredProfile = null;
            DisposeDetails(); nodes.Clear(); Array.Clear(bones, 0, bones.Length);
            this.organic = organic; boneCount = organic ? 15 : 9;
            motion = visualMotion; model = importedModel;
            motionRestPosition = motion.localPosition; motionRestRotation = motion.localRotation;
            // Disable autonomous evaluators; the encounter's simulation clock owns poses.
            foreach (var animator in model.GetComponentsInChildren<Animator>(true))
            { animator.applyRootMotion = false; animator.enabled = false; }
            foreach (var legacy in model.GetComponentsInChildren<Animation>(true)) legacy.enabled = false;
            var transforms = model.GetComponentsInChildren<Transform>(true);
            foreach (var item in transforms)
            {
                if (!nodes.ContainsKey(item.name)) nodes.Add(item.name, item);
                else if (rigProfile != null && !string.IsNullOrEmpty(rigProfile.id))
                    throw new InvalidOperationException("Measured dragon node names must be unique: " + item.name);
            }
            if (rigProfile != null && !string.IsNullOrEmpty(rigProfile.id))
            {
                if (rigProfile.damageSockets?.Length != 3)
                    throw new InvalidOperationException("Measured dragon requires three damage attachment mappings.");
                foreach (var name in rigProfile.damageSockets)
                    if (string.IsNullOrEmpty(name) || !nodes.ContainsKey(name)) throw new InvalidOperationException("Missing measured damage attachment: " + name);
                measuredRig = new SampledDragonRig(model,nodes,rigProfile,new[] {flight,glide,boost});
                measuredProfile = rigProfile;
                foreach (var renderer in model.GetComponentsInChildren<Renderer>(true))
                {
                    renderer.shadowCastingMode = ShadowCastingMode.On; renderer.receiveShadows = true;
                    if (renderer is SkinnedMeshRenderer skin) { skin.updateWhenOffscreen = true; skin.quality = SkinQuality.Auto; }
                }
                if (spacecraft)
                {
                    wingPropulsion = new WingPropulsion(model,Socket("socket_wing_l"),Socket("socket_wing_r"));
                    nodes.Add("socket_laser_l",wingPropulsion.LaserLeft);
                    nodes.Add("socket_laser_r",wingPropulsion.LaserRight);
                    nodes.Add("socket_wing_exhaust_l",wingPropulsion.NozzleLeft);
                    nodes.Add("socket_wing_exhaust_r",wingPropulsion.NozzleRight);
                    UsesSpacecraftMode = true;
                }
#if DEVELOPMENT_BUILD || UNITY_EDITOR
                if(rigProfile.id=="oscar-creativo-flight") {CaptureSkinWeights();CaptureTextures();}
#endif
                UsesAuthoredClips = true; configured = true; ResetPose(); return;
            }
            for (int i = 0; i < boneCount; i++)
            {
                if (!nodes.TryGetValue(BoneNames[i], out bones[i]))
                    throw new InvalidOperationException("Imported dragon is missing bone " + BoneNames[i]);
                rests[i] = bones[i].localRotation;
            }
            // Restore EVERY transform after sampling, including root and sockets. This
            // keeps accidental future translation/scale channels out of gameplay.
            var positions = new Vector3[transforms.Length]; var rotations = new Quaternion[transforms.Length];
            var scales = new Vector3[transforms.Length];
            for (int i = 0; i < transforms.Length; i++)
            { positions[i] = transforms[i].localPosition; rotations[i] = transforms[i].localRotation; scales[i] = transforms[i].localScale; }
            var clips = new[] { flight, glide, boost };
            if (organic)
                for (int state = 0; state < clips.Length; state++)
                    if (clips[state] == null || clips[state].empty || clips[state].length <= 0)
                        throw new InvalidOperationException("Organic dragon requires authored Flight, Glide and Boost clips; no mechanical fallback is allowed.");
            void RestoreHierarchy()
            {
                for (int i = 0; i < transforms.Length; i++)
                { transforms[i].localPosition = positions[i]; transforms[i].localRotation = rotations[i]; transforms[i].localScale = scales[i]; }
            }
            UsesAuthoredClips = true;
            try
            {
                for (int state = 0; state < 3; state++)
                {
                    poses[state] = new Quaternion[Samples][];
                    bool valid = clips[state] != null && clips[state].length > 0;
                    UsesAuthoredClips &= valid;
                    for (int sample = 0; sample < Samples; sample++)
                    {
                        // Start each sample from the complete imported rest state,
                        // so a channel omitted by another clip cannot leak across it.
                        RestoreHierarchy();
                        if (valid) clips[state].SampleAnimation(model.gameObject, clips[state].length * sample / (Samples - 1));
                        poses[state][sample] = new Quaternion[boneCount];
                        for (int i = 0; i < boneCount; i++) poses[state][sample][i] = i == 7 || i == 8 ? rests[i]
                            : valid ? bones[i].localRotation : FallbackPose(i, state, sample / (float)(Samples - 1));
                    }
                }
            }
            finally
            {
                RestoreHierarchy();
            }
            foreach (var renderer in model.GetComponentsInChildren<Renderer>(true))
            {
                renderer.shadowCastingMode = ShadowCastingMode.On;
                renderer.receiveShadows = true;
                if (renderer is SkinnedMeshRenderer skinned) skinned.updateWhenOffscreen = true;
            }
            if (!organic && !authoredArmor) BuildArmorAccents();
            configured = true; ResetPose();
        }

        public Transform Socket(string name) => name != null && nodes.TryGetValue(name, out var node) ? node : null;
        public void SetPaused(bool value) => paused = value;
        public void SetPropulsion(float thrust01, bool boosting, bool braking, bool reducedMotion)
            => wingPropulsion?.SetDemand(thrust01,boosting,braking,reducedMotion);

#if DEVELOPMENT_BUILD || UNITY_EDITOR
        void CaptureSkinWeights()
        {
            var skins=model.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            var result=new SkinWeightEvidence {runtimeQualitySkinWeights=QualitySettings.skinWeights.ToString(),
                skinnedMeshCount=skins.Length,allRendererQualityAuto=skins.Length>0};
            int maximum=0; long positive=0; bool invalid=skins.Length==0;
            foreach(var skin in skins)
            {
                result.allRendererQualityAuto&=skin.quality==SkinQuality.Auto;
                var mesh=skin.sharedMesh;
                if(mesh==null || !mesh.isReadable) { result.unreadableSkinMeshes++; continue; }
                try
                {
                    // Views owned by Mesh; they must not be disposed by us.
                    var counts=mesh.GetBonesPerVertex(); var all=mesh.GetAllBoneWeights();
                    long expected=0; bool valid=counts.Length==mesh.vertexCount && counts.Length>0;
                    for(int i=0;i<counts.Length;i++) { maximum=Mathf.Max(maximum,counts[i]); expected+=counts[i]; valid&=counts[i]>0; }
                    valid&=expected==all.Length;
                    for(int i=0;i<all.Length;i++)
                    {
                        float weight=all[i].weight;
                        if(weight>0 && !float.IsNaN(weight) && !float.IsInfinity(weight)) positive++;
                        else valid=false;
                    }
                    invalid|=!valid;
                }
                catch(Exception) { result.unreadableSkinMeshes++; }
            }
            if(result.unreadableSkinMeshes>0) result.status="UNKNOWN_UNREADABLE_MESH";
            else if(invalid) result.status="UNKNOWN_INVALID_WEIGHT_DATA";
            else { result.status="READABLE_FULL_WEIGHT_DATA"; result.maxMeshInfluences=maximum; result.totalPositiveInfluences=positive; }
            SkinWeights=result;
        }
        void CaptureTextures()
        {
            var result=new TextureRuntimeEvidence {supportsBc7=SystemInfo.SupportsTextureFormat(TextureFormat.BC7)};
            var textures=new HashSet<Texture2D>();var formats=new HashSet<string>(StringComparer.Ordinal);
            foreach(var renderer in model.GetComponentsInChildren<Renderer>(true)) foreach(var material in renderer.sharedMaterials)
            {
                if(material==null) continue;
                foreach(string property in material.GetTexturePropertyNames())
                    if(material.GetTexture(property) is Texture2D texture) textures.Add(texture);
            }
            foreach(var texture in textures)
            {
                result.count++;if(texture.format==TextureFormat.BC7) result.bc7Count++;else result.otherCount++;
                if(texture.isReadable) result.readableCount++;
                result.allocatedBytes+=UnityEngine.Profiling.Profiler.GetRuntimeMemorySizeLong(texture);
                formats.Add(texture.format+"/"+texture.graphicsFormat+"/"+(GraphicsFormatUtility.IsSRGBFormat(texture.graphicsFormat)?"sRGB":"linear"));
            }
            result.formats=new string[formats.Count];formats.CopyTo(result.formats);Array.Sort(result.formats,StringComparer.Ordinal);Textures=result;
        }
#endif

        /// <param name="bankRadians">Presentation bank; never baked into gameplay Rotation.</param>
        /// <param name="rollRadians">Finite dodge roll from FlightState.</param>
        /// <param name="jawRadians">Attack-timeline jaw angle, e.g. -.025 idle to -.32 beam.</param>
        public void Tick(float dt, float time, bool boost, float bankRadians, float rollRadians, float jawRadians, float turnRateRadians)
        {
            if (!configured || paused || dt <= 0 || float.IsNaN(dt) || float.IsInfinity(dt)) return;
            dt = Mathf.Min(dt, .25f); animationTime += dt;
            float target = boost ? 1 : 0, decay = Mathf.Exp(-4 * dt);
            float integrated = target * dt + (boostWeight - target) * (1 - decay) / 4;
            boostWeight = target + (boostWeight - target) * decay;
            if (UsesSpacecraftMode)
            {
                // A dragon-shaped spacecraft holds the authored extended-wing
                // silhouette. Glide is a fixed exported pose, never another clock.
                // In particular, head/neck/root translation and flap animation do
                // not run when thrust changes. The jaw alone retains attack motion.
                weights[0] = 0; weights[1] = 1 - boostWeight; weights[2] = boostWeight;
                ActiveState = boost ? "ShipBoost" : wingPropulsion.Braking ? "ShipBrake" : "ShipCruise";
                gliding = true;
                measuredRig.Advance(0,ShipPoseWeights,jawRadians);
                motion.localPosition = motionRestPosition;
                // Roll remains unwrapped. Slerping Euler/shortest-path rotations
                // here would reverse direction through the middle of a full roll.
                motion.localRotation = motionRestRotation * Quaternion.AngleAxis((bankRadians + rollRadians) * Mathf.Rad2Deg,Vector3.forward);
                wingPropulsion.Tick(dt,animationTime);
                return;
            }
            strokeTime += dt + .4f * integrated;
            while (strokeTime >= strokeDuration)
            {
                strokeTime -= strokeDuration;
                if (gliding) { gliding = false; strokes = 2 + Mathf.FloorToInt(Random01() * 2); StartStroke(); }
                else if (--strokes <= 0) { gliding = true; strokeDuration = .9f + Random01() * .9f; }
                else StartStroke();
            }
            int state = boost ? 2 : gliding ? 1 : 0;
            ActiveState = state == 2 ? "Boost" : state == 1 ? "Glide" : "Flight";
            float response = 1 - Mathf.Exp(-dt / .18f);
            for (int s = 0; s < 3; s++) weights[s] = Mathf.Lerp(weights[s], s == state ? 1 : 0, response);
            if (measuredRig != null)
            {
                // Keep authored full TRS and a common Flight/Boost phase; the
                // measured durations control its smoothly changing cadence.
                measuredRig.Advance(dt,weights,jawRadians);
                motion.localPosition = motionRestPosition;
                motion.localRotation = motionRestRotation * Quaternion.AngleAxis((bankRadians + rollRadians) * Mathf.Rad2Deg,Vector3.forward);
                return;
            }
            // Map the randomized downstroke ratio to the authored .4/.6 cycle.
            float phase = gliding ? 0 : StrokePhase;
            float clipPhase = phase < downstroke ? .4f * phase / downstroke : .4f + .6f * (phase - downstroke) / (1 - downstroke);
            for (int i = 0; i < boneCount; i++)
            {
                if (i == 7 || i == 8) continue; // Jaw follows combat; Root remains at its authored rest.
                var a = Sample(0, clipPhase, i); var b = Sample(1, Mathf.Repeat(animationTime, 1), i); var c = Sample(2, clipPhase, i);
                float ab = weights[0] + weights[1];
                displayed[i] = ab > .00001f ? Quaternion.Slerp(a, b, weights[1] / ab) : c;
                displayed[i] = Quaternion.Slerp(displayed[i], c, weights[2]);
                bones[i].localRotation = displayed[i];
            }
            // glTFast mirrors X: a source local X rotation keeps its sign, Y/Z
            // rotations reverse. Preserve the imported pose and add only modest
            // bank/turn offsets in that handedness.
            // The organic rig has different local axes/rests. Its authored clips
            // own wing/tail shape; mechanical neutral offsets are inapplicable.
            for (int i = 0; !organic && i < 2; i++)
            {
                // Scale only the stroke's Z offset from neutral, leaving the
                // authored sweep and all rest transforms intact.
                Quaternion relative = Quaternion.Inverse(rests[i]) * bones[i].localRotation;
                float z = Mathf.DeltaAngle(0, relative.eulerAngles.z) * Mathf.Deg2Rad;
                float neutral = i == 0 ? .13f : -.13f;
                float variation = (z-neutral)*(amplitude/.2f-1);
                bones[i].localRotation *= Quaternion.AngleAxis((variation + bankRadians * .13f) * Mathf.Rad2Deg, Vector3.forward);
            }
            for (int i = 2; !organic && i < 7; i++)
                bones[i].localRotation *= Quaternion.AngleAxis(turnRateRadians * .055f * Mathf.Rad2Deg, Vector3.up);
            bones[7].localRotation = rests[7] * Quaternion.AngleAxis(jawRadians * Mathf.Rad2Deg, Vector3.right);
            bones[8].localRotation = rests[8];
            float flap = gliding ? 0 : Mathf.Sin(clipPhase * Mathf.PI * 2) * amplitude;
            // Deliberate power strokes and longer broad-wing holds give the dragon
            // weight. This is only render cadence, never thrust or maneuverability.
            motion.localPosition = motionRestPosition + Vector3.up * flap * .10f;
            motion.localRotation = motionRestRotation * Quaternion.AngleAxis((bankRadians + rollRadians) * Mathf.Rad2Deg, Vector3.forward);
        }

        Quaternion Sample(int state, float phase, int bone)
        {
            float frame = Mathf.Clamp01(phase) * (Samples - 1);
            int lo = Mathf.FloorToInt(frame), hi = Mathf.Min(Samples - 1, lo + 1);
            return Quaternion.Slerp(poses[state][lo][bone], poses[state][hi][bone], frame - lo);
        }
        Quaternion FallbackPose(int bone, int state, float phase)
        {
            float wave = state == 1 ? 0 : Mathf.Sin(phase * Mathf.PI * 2) * (state == 2 ? .236f : .2f);
            float sweep = state == 2 ? .245f : .025f;
            if (bone < 2) return rests[bone] * Quaternion.Euler(0, (bone == 0 ? sweep : -sweep) * Mathf.Rad2Deg,
                (bone == 0 ? .13f + wave : -.13f - wave) * Mathf.Rad2Deg);
            int tail = bone - 2;
            return rests[bone] * Quaternion.Euler(Mathf.Sin(phase * 2 * Mathf.PI - tail * .65f) * .035f * Mathf.Rad2Deg,
                -Mathf.Sin(phase * 2 * Mathf.PI - tail * .6f) * .07f * Mathf.Rad2Deg, 0);
        }
        float Random01() { random = unchecked(random * 1664525u + 1013904223u); return random / 4294967296f; }
        void StartStroke() { strokeDuration = 1.05f + Random01() * .5f; amplitude = .16f + Random01() * .09f; downstroke = .32f + Random01() * .10f; }

        public void ResetPose()
        {
            if (model == null) return;
            measuredRig?.Reset();
            for (int i = 0; i < bones.Length; i++) if (bones[i] != null) bones[i].localRotation = rests[i];
            motion.localPosition = motionRestPosition; motion.localRotation = motionRestRotation;
            weights[0] = 1; weights[1] = weights[2] = 0; random = 8147;
            strokeTime = boostWeight = animationTime = 0; gliding = false;
            strokes = 2 + Mathf.FloorToInt(Random01() * 2); StartStroke(); ActiveState = "Flight";
            if (UsesSpacecraftMode)
            {
                measuredRig.Advance(0,ShipPoseWeights,0);
                weights[0] = weights[2] = 0; weights[1] = 1;
                gliding = true; ActiveState = "ShipCruise"; wingPropulsion.Reset();
            }
        }

        void BuildArmorAccents()
        {
            Material crimson = null, dark = null;
            foreach (var renderer in model.GetComponentsInChildren<Renderer>(true))
                foreach (var material in renderer.sharedMaterials)
                {
                    if (material == null) continue;
                    // The original contains membrane and atlas materials too;
                    // shields must use the unatlased painted armor, not either.
                    if (material.name == "SD3_Crimson painted armor") crimson = material;
                    if (material.name == "SD3_Dark painted armor") dark = material;
                }
            // Authored materials are shared immutable references: no palette replacement.
            if (dark == null) dark = crimson;
            if (dark == null) return;
            AddGroup("Chest overlapping shields", bones[8], dark, new[] {
                new Plate(new Vector3(0, .91f, -.25f), new Vector3(.65f,.07f,.59f), Vector3.zero),
                new Plate(new Vector3(0, .837f, .18f), new Vector3(.62f,.07f,.58f), new Vector3(10,0,0)),
                new Plate(new Vector3(0, .72f, .60f), new Vector3(.53f,.065f,.51f), new Vector3(10,0,0)),
                new Plate(new Vector3(-.42f,.946f,-.34f), new Vector3(.30f,.065f,.41f), new Vector3(0,0,18)),
                new Plate(new Vector3(.42f,.946f,-.34f), new Vector3(.30f,.065f,.41f), new Vector3(0,0,-18)) });
            // Measured against the GLB rest triangles; glTFast mirrors X. The
            // cinematic benchmark's two shoulders are intentionally asymmetric.
            // Separate combined groups follow their original wing bones.
            AddGroup("Port shoulder articulated shields", bones[0], crimson != null ? crimson : dark, new[] {
                new Plate(new Vector3(.90f,.731f,-.71f),new Vector3(.34f,.065f,.40f),new Vector3(0,10,-15)),
                new Plate(new Vector3(.97f,.574f,-.52f),new Vector3(.30f,.060f,.36f),new Vector3(0,14,-18)) });
            AddGroup("Starboard shoulder articulated shields", bones[1], crimson != null ? crimson : dark, new[] {
                new Plate(new Vector3(-.90f,.989f,-.71f),new Vector3(.34f,.065f,.40f),new Vector3(0,-10,15)),
                new Plate(new Vector3(-.97f,.883f,-.52f),new Vector3(.30f,.060f,.36f),new Vector3(0,-14,18)) });
            AddGroup("Brow and neck segmented caps", bones[8], dark, new[] {
                new Plate(new Vector3(-.28f,1.066f,-2.73f),new Vector3(.25f,.065f,.53f),new Vector3(0,-12,12)),
                new Plate(new Vector3(.28f,1.066f,-2.73f),new Vector3(.25f,.065f,.53f),new Vector3(0,12,-12)),
                new Plate(new Vector3(0,1.288f,-2.03f),new Vector3(.43f,.055f,.37f),new Vector3(8,0,0)),
                new Plate(new Vector3(0,1.198f,-1.72f),new Vector3(.47f,.055f,.39f),new Vector3(8,0,0)) });
        }

        struct Plate
        {
            public Vector3 position, size, angles;
            public Plate(Vector3 p, Vector3 s, Vector3 a) { position = p; size = s; angles = a; }
        }
        void AddGroup(string name, Transform parent, Material material, Plate[] plates)
        {
            var verts = new List<Vector3>(); var tris = new List<int>();
            Matrix4x4 toBone = parent.worldToLocalMatrix * model.localToWorldMatrix;
            foreach (var plate in plates)
                AppendPlate(verts, tris, toBone * Matrix4x4.TRS(plate.position, Quaternion.Euler(plate.angles), plate.size));
            var mesh = new Mesh { name = "Dogfight runtime detail: " + name };
            mesh.SetVertices(verts); mesh.SetTriangles(tris, 0); mesh.RecalculateNormals(); mesh.RecalculateBounds();
            ownedMeshes.Add(mesh); AddedTriangles += tris.Count / 3;
            var obj = new GameObject(name); obj.transform.SetParent(parent, false); details.Add(obj);
            obj.AddComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = obj.AddComponent<MeshRenderer>(); renderer.sharedMaterial = material;
            renderer.shadowCastingMode = ShadowCastingMode.On;
            var lod = obj.AddComponent<LODGroup>(); lod.fadeMode = LODFadeMode.None;
            lod.SetLODs(new[] { new LOD(.018f, new Renderer[] { renderer }), new LOD(.008f, Array.Empty<Renderer>()) });
            lod.RecalculateBounds();
        }

        /// <summary>Low-poly six-sided shield with real bevel, thickness and tapered end.</summary>
        internal static void AppendPlate(List<Vector3> vertices, List<int> triangles, Matrix4x4 matrix)
        {
            var outline = new[] { new Vector2(-.5f,-.42f), new Vector2(.5f,-.42f), new Vector2(.5f,.20f),
                new Vector2(.27f,.5f),new Vector2(-.27f,.5f),new Vector2(-.5f,.20f) };
            int start = vertices.Count;
            for (int ring = 0; ring < 3; ring++)
                for (int i = 0; i < 6; i++)
                {
                    float inset = ring == 2 ? .83f : 1;
                    vertices.Add(matrix.MultiplyPoint3x4(new Vector3(outline[i].x * inset, ring == 0 ? -.5f : ring == 1 ? .22f : .5f, outline[i].y * inset)));
                }
            for (int ring = 0; ring < 2; ring++) for (int i = 0; i < 6; i++)
            {
                int a = start + ring * 6 + i, b = start + ring * 6 + (i + 1) % 6, c = a + 6, d = b + 6;
                triangles.AddRange(new[] { a,c,b,b,c,d });
            }
            for (int i = 1; i < 5; i++)
            {
                triangles.AddRange(new[] { start, start+i, start+i+1 });
                triangles.AddRange(new[] { start+12, start+12+i+1, start+12+i });
            }
        }
        void DisposeDetails()
        {
            foreach (var item in details) if (item != null) Destroy(item);
            foreach (var mesh in ownedMeshes) if (mesh != null) Destroy(mesh);
            details.Clear(); ownedMeshes.Clear(); AddedTriangles = 0;
        }
        void OnDestroy() { wingPropulsion?.Dispose(); wingPropulsion = null; DisposeDetails(); }
    }
}
