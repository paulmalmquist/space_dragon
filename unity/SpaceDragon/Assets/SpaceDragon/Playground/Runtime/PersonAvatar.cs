using System;
using System.Collections.Generic;
using SpaceDragon.Traversal;
using UnityEngine;

namespace SpaceDragon.Playground
{
    /// <summary>What the avatar reads each frame. It never writes the hero.</summary>
    public struct PersonFrame
    {
        /// <summary>Interpolated feet position.</summary>
        public Vector3 position;
        /// <summary>Facing in radians; zero looks toward +z.</summary>
        public float yaw;
        public HeroMode mode;
        public Vector3 velocity;
        public HeroEvent events;
        public float impact;
        public bool hasAnchor;
        public Vector3 anchor;
        /// <summary>0 to 1: reeling after a bonk.</summary>
        public float dizzy;
        /// <summary>0 to 1: lifted off the ground and held still.</summary>
        public float lifted;
        /// <summary>A point the right hand reaches toward, such as a snared robot.</summary>
        public bool hasReach;
        public Vector3 reach;
    }

    /// <summary>
    /// A realistic child stand-in for the hero: a generic licensed model, never a family likeness
    /// (see Imported/Characters/PROVENANCE.json). Baked idle, walk, run and sprint loops are blended
    /// by ground speed; jumping, falling, swinging, landing, climbing and reeling from a bonk are
    /// procedural poses layered on top in world space. A port of src/game/hero/person-avatar.ts using the same numbers.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class PersonAvatar : MonoBehaviour
    {
        [SerializeField] private PersonClipLibrary library;
        [Tooltip("Leans and crouches; parent of the imported model.")]
        [SerializeField] private Transform body;
        [Tooltip("The transform the baked bone paths are relative to.")]
        [SerializeField] private Transform model;
        [SerializeField] private SkinnedMeshRenderer[] skins = Array.Empty<SkinnedMeshRenderer>();

        private struct Turn { public Transform bone; public char axis; public float degrees; public bool landLeg; }
        private struct Arm { public Transform bone, tip; public float weight; }
        private struct Shape { public SkinnedMeshRenderer skin; public int index; public float full; }

        private Transform[] bones = Array.Empty<Transform>();
        private Transform hips, grip, head;
        private Turn[][] poses = Array.Empty<Turn[]>();
        private Arm[] arms = Array.Empty<Arm>();
        private Shape[] blinkShapes, wideShapes, smileShapes, jawShapes, browShapes;
        private bool bound;

        private readonly double[] wanted = new double[PersonMotion.ClipCount];
        private readonly double[] weights = { 1, 0, 0, 0 };
        private float idleTime, stride, yaw, lastYaw, lean, roll;
        private float swing, airborne, rising, squash, joy, awe;
        private float climb, climbPhase, dizzy, lifted, reach, sway;
        private Vector3 reachPoint;
        private float blink, nextBlink = 2.2f;
        private uint blinkSeed = 7;

        public bool Bound => bound;
        public float Swing => swing;
        public float Airborne => airborne;
        public float Climb => climb;
        public float Dizzy => dizzy;
        /// <summary>Share of the pose coming from the moving loops rather than the standing one.</summary>
        public float Gait => (float)(1 - weights[0]);

        /// <summary>Called by the scene generator; play mode only reads these references.</summary>
        public void Configure(PersonClipLibrary clips, Transform bodyPivot, Transform modelRoot, SkinnedMeshRenderer[] renderers)
        {
            library = clips; body = bodyPivot; model = modelRoot; skins = renderers ?? Array.Empty<SkinnedMeshRenderer>();
        }

        /// <summary>World position of the right hand, where the tether is held.</summary>
        public Vector3 GripPosition => grip != null ? grip.position : transform.position + Vector3.up * 1.2f;

        /// <summary>A short smile, for example after collecting a practice spark.</summary>
        public void Celebrate() { joy = 1.6f; }

        private void Awake() { Bind(); }

        /// <summary>Resolves bones and blend shapes. Returns false, with a reason, when the rig is unusable.</summary>
        public bool Bind()
        {
            bound = false;
            if (library == null || model == null || body == null) { Debug.LogError("PersonAvatar is not configured; regenerate the Luke's Playground scene.", this); return false; }
            if (library.clips == null || library.clips.Length != PersonMotion.ClipCount) { Debug.LogError("PersonAvatar needs the four baked loops.", this); return false; }
            int boneCount = library.bonePaths.Length;
            bones = new Transform[boneCount];
            for (int index = 0; index < boneCount; index++)
            {
                bones[index] = model.Find(library.bonePaths[index]);
                if (bones[index] == null) { Debug.LogError("PersonAvatar cannot find bone " + library.bonePaths[index], this); return false; }
            }
            hips = model.Find(library.hipPath);
            if (hips == null) { Debug.LogError("PersonAvatar cannot find the hip joint " + library.hipPath, this); return false; }
            foreach (var clip in library.clips)
            {
                if (clip == null || clip.frames < 2 || clip.rotations == null || clip.rotations.Length != clip.frames * boneCount * 4 ||
                    clip.hipHeights == null || clip.hipHeights.Length != clip.frames)
                { Debug.LogError("PersonAvatar has a damaged baked loop; regenerate the scene.", this); return false; }
            }

            var named = new Dictionary<string, Transform>(StringComparer.Ordinal);
            foreach (var node in model.GetComponentsInChildren<Transform>(true)) if (!named.ContainsKey(node.name)) named.Add(node.name, node);
            var poseList = new List<Turn[]>();
            foreach (var pose in PersonMotionData.Poses)
            {
                var turns = new List<Turn>();
                foreach (var turn in pose.turns)
                {
                    if (!named.TryGetValue(turn.bone, out var bone)) { Debug.LogError("PersonAvatar pose bone is missing: " + turn.bone, this); return false; }
                    turns.Add(new Turn { bone = bone, axis = turn.axis, degrees = (float)turn.degrees, landLeg = turn.landLeg });
                }
                poseList.Add(turns.ToArray());
            }
            poses = poseList.ToArray();
            var armList = new List<Arm>();
            foreach (var arm in PersonMotionData.TetherArms)
            {
                if (!named.TryGetValue(arm.bone, out var bone) || !named.TryGetValue(arm.tip, out var tip)) { Debug.LogError("PersonAvatar arm bone is missing: " + arm.bone, this); return false; }
                armList.Add(new Arm { bone = bone, tip = tip, weight = (float)arm.weight });
            }
            arms = armList.ToArray();
            named.TryGetValue(PersonMotionData.GripBone, out grip);
            named.TryGetValue(PersonMotionData.HeadBone, out head);

            blinkShapes = Shapes("EyeBlinkLeft", "EyeBlinkRight");
            wideShapes = Shapes("EyeWideLeft", "EyeWideRight");
            smileShapes = Shapes("MouthSmileLeft", "MouthSmileRight");
            jawShapes = Shapes("JawOpen");
            browShapes = Shapes("BrowInnerUp");
            bound = true;
            return true;
        }

        private Shape[] Shapes(params string[] suffixes)
        {
            var found = new List<Shape>();
            foreach (var skin in skins)
            {
                if (skin == null || skin.sharedMesh == null) continue;
                var mesh = skin.sharedMesh;
                for (int index = 0; index < mesh.blendShapeCount; index++)
                {
                    string shapeName = mesh.GetBlendShapeName(index);
                    foreach (string suffix in suffixes)
                    {
                        if (!shapeName.EndsWith(suffix, StringComparison.Ordinal)) continue;
                        int frames = mesh.GetBlendShapeFrameCount(index);
                        // Importers disagree on whether a full shape is 1 or 100; ask the mesh.
                        float full = frames > 0 ? mesh.GetBlendShapeFrameWeight(index, frames - 1) : 100f;
                        found.Add(new Shape { skin = skin, index = index, full = full });
                    }
                }
            }
            return found.ToArray();
        }

        private static void SetShapes(Shape[] shapes, float amount)
        {
            if (shapes == null) return;
            float value = Mathf.Clamp01(amount);
            foreach (var shape in shapes) shape.skin.SetBlendShapeWeight(shape.index, value * shape.full);
        }

        private static float Damp(float current, float target, double rate, float seconds) =>
            current + (target - current) * (1 - Mathf.Exp(-(float)rate * seconds));

        /// <summary>Places and poses the stand-in for this frame.</summary>
        public void Present(in PersonFrame frame, float seconds, bool snap = false)
        {
            float dt = Mathf.Max(0, seconds);
            float planar = new Vector2(frame.velocity.x, frame.velocity.z).magnitude;
            bool grounded = frame.mode == HeroMode.Ground;
            if (snap)
            {
                yaw = lastYaw = frame.yaw; lean = roll = swing = airborne = rising = squash = climb = dizzy = lifted = reach = 0;
                weights[0] = 1; weights[1] = weights[2] = weights[3] = 0;
            }
            float turnRate = dt > 0 ? Mathf.DeltaAngle(lastYaw * Mathf.Rad2Deg, frame.yaw * Mathf.Rad2Deg) * Mathf.Deg2Rad / dt : 0;
            lastYaw = frame.yaw;
            yaw += Mathf.DeltaAngle(yaw * Mathf.Rad2Deg, frame.yaw * Mathf.Rad2Deg) * Mathf.Deg2Rad * (snap ? 1 : 1 - Mathf.Exp(-18 * dt));
            Quaternion heading = Quaternion.Euler(0, yaw * Mathf.Rad2Deg, 0);
            transform.SetPositionAndRotation(frame.position, heading);
            if (!bound) return;

            // Loop weights follow ground speed; in the air the legs settle to the standing loop.
            if (grounded) PersonMotion.LocomotionWeights(planar, wanted);
            else { wanted[0] = 1; wanted[1] = wanted[2] = wanted[3] = 0; }
            double total = 0;
            for (int index = 0; index < weights.Length; index++)
            {
                weights[index] = snap ? wanted[index] : PersonMotion.Damp(weights[index], wanted[index], grounded ? PersonMotionData.BlendRate : PersonMotionData.AirBlendRate, dt);
                total += weights[index];
            }
            for (int index = 0; index < weights.Length; index++) weights[index] /= total;
            float idleDuration = library.clips[0].duration;
            idleTime = Mathf.Repeat(idleTime + dt, idleDuration);
            if (grounded) stride = Mathf.Repeat(stride + dt * (float)PersonMotion.StrideCyclesPerSecond(weights, planar), 1);

            if ((frame.events & HeroEvent.Land) != 0) squash = Mathf.Min(1, 0.4f + frame.impact / 20);
            squash = Mathf.Max(0, squash - dt * (float)PersonMotionData.LandRecover);
            swing = Damp(swing, frame.mode == HeroMode.Swing ? 1 : 0, PersonMotionData.SwingBlendRate, dt);
            airborne = Damp(airborne, frame.mode == HeroMode.Air || frame.mode == HeroMode.Catch ? 1 : 0, PersonMotionData.AirBlendRate, dt);
            rising = Damp(rising, frame.velocity.y > 0.5f ? 1 : 0, 9, dt);
            climb = Damp(climb, frame.mode == HeroMode.Climb ? 1 : 0, PersonMotionData.ClimbBlendRate, dt);
            if (frame.mode == HeroMode.Climb) climbPhase = Mathf.Repeat(climbPhase + dt * (float)PersonMotionData.ClimbCyclesPerMetre * frame.velocity.magnitude, 1);
            dizzy = Damp(dizzy, Mathf.Clamp01(frame.dizzy), PersonMotionData.StanceBlendRate, dt);
            lifted = Damp(lifted, Mathf.Clamp01(frame.lifted), PersonMotionData.StanceBlendRate, dt);
            reach = Damp(reach, frame.hasReach ? 1 : 0, PersonMotionData.StanceBlendRate, dt);
            if (frame.hasReach) reachPoint = frame.reach;
            sway = Mathf.Repeat(sway + dt * (float)PersonMotionData.DizzyRate, 1);
            float land = Mathf.Max(Mathf.Sin(Mathf.Min(1, squash) * Mathf.PI * 0.5f), dizzy * (float)PersonMotionData.DizzyCrouch);

            // Base pose: a weighted blend of the baked loops.
            int boneCount = bones.Length;
            float height = 0;
            for (int clipIndex = 0; clipIndex < library.clips.Length; clipIndex++)
            {
                var clip = library.clips[clipIndex];
                float weight = (float)weights[clipIndex];
                if (weight <= 0.001f) continue;
                float position = Mathf.Clamp01(clipIndex == 0 ? idleTime / idleDuration : stride) * (clip.frames - 1);
                int index = Mathf.Min(clip.frames - 2, (int)position);
                height += weight * Mathf.Lerp(clip.hipHeights[index], clip.hipHeights[index + 1], position - index);
            }
            for (int boneIndex = 0; boneIndex < boneCount; boneIndex++)
            {
                float sx = 0, sy = 0, sz = 0, sw = 0;
                bool first = true;
                for (int clipIndex = 0; clipIndex < library.clips.Length; clipIndex++)
                {
                    float weight = (float)weights[clipIndex];
                    if (weight <= 0.001f) continue;
                    var clip = library.clips[clipIndex];
                    float[] values = clip.rotations;
                    float position = Mathf.Clamp01(clipIndex == 0 ? idleTime / idleDuration : stride) * (clip.frames - 1);
                    int index = Mathf.Min(clip.frames - 2, (int)position);
                    float blend = position - index;
                    int a = (index * boneCount + boneIndex) * 4, b = a + boneCount * 4;
                    float sign = values[a] * values[b] + values[a + 1] * values[b + 1] + values[a + 2] * values[b + 2] + values[a + 3] * values[b + 3] < 0 ? -1 : 1;
                    float x = values[a] + (values[b] * sign - values[a]) * blend, y = values[a + 1] + (values[b + 1] * sign - values[a + 1]) * blend;
                    float z = values[a + 2] + (values[b + 2] * sign - values[a + 2]) * blend, w = values[a + 3] + (values[b + 3] * sign - values[a + 3]) * blend;
                    float scale = first || sx * x + sy * y + sz * z + sw * w >= 0 ? weight : -weight;
                    sx += x * scale; sy += y * scale; sz += z * scale; sw += w * scale;
                    first = false;
                }
                float length = Mathf.Sqrt(sx * sx + sy * sy + sz * sz + sw * sw);
                if (length > 1e-6f) bones[boneIndex].localRotation = new Quaternion(sx / length, sy / length, sz / length, sw / length);
            }
            hips.localPosition = new Vector3(library.hipRest.x, height > 0 ? height : library.hipRest.y, library.hipRest.z);

            // Whole-body attitude: bank into turns, follow the rope while swinging.
            float sprint = (float)TraversalTuning.Default.sprintSpeed;
            float gait = grounded ? Mathf.Min(1, planar / sprint) : 0;
            float pitch = gait * 0.05f;
            float bank = Mathf.Clamp(-turnRate * 0.03f, -0.3f, 0.3f) * (grounded ? gait : 0.4f);
            if (frame.hasAnchor && swing > 0.01f)
            {
                float dx = frame.anchor.x - frame.position.x, dz = frame.anchor.z - frame.position.z;
                float dy = frame.anchor.y - (frame.position.y + (float)TraversalTuning.Default.handHeight);
                float forward = dx * Mathf.Sin(yaw) + dz * Mathf.Cos(yaw), side = dx * Mathf.Cos(yaw) - dz * Mathf.Sin(yaw), up = Mathf.Max(0.5f, dy);
                pitch += (Mathf.Atan2(forward, up) * 0.75f - pitch) * swing;
                bank += (-Mathf.Atan2(side, up) * 0.6f - bank) * swing;
            }
            if (airborne > 0.01f) pitch += airborne * (1 - lifted) * Mathf.Clamp(-frame.velocity.y * 0.014f + planar * 0.01f, -0.25f, 0.3f);
            lean = snap ? pitch : Damp(lean, pitch, 10, dt);
            roll = snap ? bank : Damp(roll, bank, 9, dt);
            body.localRotation = Quaternion.Euler(lean * Mathf.Rad2Deg, 0, roll * Mathf.Rad2Deg);
            body.localPosition = new Vector3(0, -(float)PersonMotion.CrouchDrop(land), 0);

            // Procedural poses: jump and fall, the tucked swing, the landing crouch, the two climbing reaches, the bonk.
            Vector3 right = heading * Vector3.right, ahead = heading * Vector3.forward;
            float reachLeft = (float)PersonMotion.ClimbLeftWeight(climbPhase);
            float aloft = Mathf.Max(airborne, lifted), upward = rising * (1 - lifted);
            for (int poseIndex = 0; poseIndex < poses.Length; poseIndex++)
            {
                float weight;
                switch (PersonMotionData.Poses[poseIndex].id)
                {
                    case "rise": weight = aloft * upward * (1 - swing); break;
                    case "fall": weight = aloft * (1 - upward) * (1 - swing); break;
                    case "swing": weight = swing; break;
                    case "land": weight = land; break;
                    case "climbLeft": weight = climb * reachLeft; break;
                    case "climbRight": weight = climb * (1 - reachLeft); break;
                    case "dizzy": weight = dizzy; break;
                    // A pose this build does not know is left out rather than guessed at.
                    default: weight = 0; break;
                }
                if (weight <= 0.002f) continue;
                foreach (var turn in poses[poseIndex])
                {
                    float degrees = (turn.landLeg ? turn.degrees * (float)PersonMotionData.LandBend : turn.degrees) * weight;
                    Vector3 axis = turn.axis == 'x' ? right : turn.axis == 'z' ? ahead : Vector3.up;
                    turn.bone.rotation = Quaternion.AngleAxis(degrees, axis) * turn.bone.rotation;
                }
            }
            if (frame.hasAnchor && swing > 0.02f)
            {
                foreach (var arm in arms)
                {
                    Vector3 origin = arm.bone.position;
                    Vector3 from = arm.tip.position - origin, to = frame.anchor - origin;
                    if (from.sqrMagnitude < 1e-10f || to.sqrMagnitude < 1e-10f) continue;
                    Quaternion towardAnchor = Quaternion.Slerp(Quaternion.identity, Quaternion.FromToRotation(from, to), arm.weight * swing);
                    arm.bone.rotation = towardAnchor * arm.bone.rotation;
                }
            }
            // The right arm points along a snare line; the left stays free for balance.
            float pointing = reach * (1 - swing) * (1 - climb);
            if (pointing > 0.02f)
            {
                for (int index = 0; index < Mathf.Min(2, arms.Length); index++)
                {
                    Vector3 origin = arms[index].bone.position;
                    Vector3 from = arms[index].tip.position - origin, to = reachPoint - origin;
                    if (from.sqrMagnitude < 1e-10f || to.sqrMagnitude < 1e-10f) continue;
                    arms[index].bone.rotation = Quaternion.Slerp(Quaternion.identity, Quaternion.FromToRotation(from, to), arms[index].weight * pointing) * arms[index].bone.rotation;
                }
            }
            if (dizzy > 0.02f && head != null)
                head.rotation = Quaternion.AngleAxis(Mathf.Sin(sway * Mathf.PI * 2) * (float)PersonMotionData.DizzySway * dizzy, ahead) * head.rotation;

            // Face: blinking, a wide-eyed look at speed, a smile after a pickup.
            nextBlink -= dt;
            if (nextBlink <= 0)
            {
                blink = (float)PersonMotionData.BlinkSeconds;
                blinkSeed = unchecked(blinkSeed * 1103515245u + 12345u) & 0x7fffffffu;
                nextBlink = (float)(PersonMotionData.BlinkEveryMin + blinkSeed / 2147483648.0 * (PersonMotionData.BlinkEveryMax - PersonMotionData.BlinkEveryMin));
            }
            blink = Mathf.Max(0, blink - dt);
            float lid = Mathf.Sin(Mathf.Min(1, blink / (float)PersonMotionData.BlinkSeconds) * Mathf.PI);
            awe = Damp(awe, frame.mode == HeroMode.Swing || lifted > 0.5f || (frame.mode == HeroMode.Air && Mathf.Abs(frame.velocity.y) > 6) ? 1 : 0, 6, dt);
            joy = Mathf.Max(0, joy - dt * 0.45f);
            SetShapes(blinkShapes, lid);
            SetShapes(wideShapes, awe * 0.6f * (1 - lid));
            SetShapes(browShapes, awe * 0.45f);
            SetShapes(jawShapes, awe * 0.16f + Mathf.Min(1, joy) * 0.1f);
            SetShapes(smileShapes, Mathf.Min(1, joy) * 0.8f + awe * 0.25f);
        }
    }
}
