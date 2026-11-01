using System;
using System.Collections.Generic;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    /// <summary>Measured render-only anatomy. Names and local jaw axis come from
    /// the selected export contract, never from a gameplay collision shape.</summary>
    [Serializable]
    public sealed class DragonRigProfile
    {
        public string id;
        public string[] animatedNodes = Array.Empty<string>();
        public string jawBone;
        public Vector3 jawAxis;
        // Clamp the gameplay input radians FIRST, then apply the direction sign.
        // E.g. input -.32 with scale -1 opens +.32 around the measured local axis.
        public float jawScale = 1, jawMinRadians = -.5f, jawMaxRadians;
        public int sampleRate = 30;
        // hull, propulsion, weapons: measured exported attachments in that order.
        public string[] damageSockets = Array.Empty<string>();
    }

    /// <summary>Full local TRS sampling for authored rigs with stretch/twist
    /// joints. This owns no Animator clock, gameplay transform, collider or asset.</summary>
    internal sealed class SampledDragonRig
    {
        struct Pose
        {
            public Vector3 position, scale;
            public Quaternion rotation;
            public static Pose Read(Transform node) => new Pose { position = node.localPosition, rotation = node.localRotation, scale = node.localScale };
            public void Apply(Transform node) { node.localPosition = position; node.localRotation = rotation; node.localScale = scale; }
            public static Pose Blend(Pose a, Pose b, float weight) => new Pose {
                position = Vector3.Lerp(a.position,b.position,weight), scale = Vector3.Lerp(a.scale,b.scale,weight),
                rotation = Quaternion.Slerp(a.rotation,b.rotation,weight) };
        }
        readonly DragonRigProfile profile;
        readonly Transform[] hierarchy, animated;
        readonly Pose[] rest;
        readonly Pose[][][] samples = new Pose[3][][];
        readonly float[] durations = new float[3];
        readonly Transform jaw;
        readonly Quaternion jawRest;
        readonly bool jawAnimated;
        float flightPhase;
        public int AnimatedCount => animated.Length;
        public string Id => profile.id;

        public SampledDragonRig(Transform model, Dictionary<string,Transform> nodes, DragonRigProfile definition, AnimationClip[] clips)
        {
            if (definition == null || string.IsNullOrEmpty(definition.id) || definition.animatedNodes == null || definition.animatedNodes.Length == 0
                || definition.animatedNodes.Length > 2048 || definition.sampleRate < 1 || definition.sampleRate > 120)
                throw new ArgumentException("Measured dragon needs a bounded authored animation profile.");
            if (!Finite(definition.jawAxis) || definition.jawAxis.sqrMagnitude < .0001f || !Finite(definition.jawScale)
                || Mathf.Abs(definition.jawScale) < .0001f || !Finite(definition.jawMinRadians) || !Finite(definition.jawMaxRadians)
                || definition.jawMinRadians > definition.jawMaxRadians || string.IsNullOrEmpty(definition.jawBone)
                || !nodes.TryGetValue(definition.jawBone, out jaw))
                throw new ArgumentException("Measured dragon needs its own finite jaw bone, local axis and bounded attack range.");
            profile = definition;
            hierarchy = model.GetComponentsInChildren<Transform>(true);
            rest = new Pose[hierarchy.Length];
            for (int i=0;i<hierarchy.Length;i++) rest[i]=Pose.Read(hierarchy[i]);
            jawRest = jaw.localRotation;
            animated = new Transform[definition.animatedNodes.Length];
            var unique = new HashSet<string>(StringComparer.Ordinal);
            for (int i=0;i<animated.Length;i++)
            {
                var name=definition.animatedNodes[i];
                if (string.IsNullOrEmpty(name) || !unique.Add(name) || !nodes.TryGetValue(name,out animated[i]) || animated[i] == model)
                    throw new ArgumentException("Invalid measured animation target: " + name);
                if (animated[i] == jaw) jawAnimated=true;
            }
            if (clips?.Length != 3) throw new ArgumentException("Measured dragon needs three explicitly assigned state clips.");
            try
            {
                for (int state=0;state<3;state++)
                {
                    var clip=clips[state];
                    if (clip == null || clip.empty || !Finite(clip.length) || clip.length <= 0)
                        throw new ArgumentException("Measured dragon requires authored Flight, Glide and Boost clips.");
                    durations[state]=clip.length;
                    int count=Mathf.CeilToInt(clip.length*definition.sampleRate)+1;
                    if (count>1201) throw new ArgumentException("Measured dragon clip exceeds the bounded sample cache: " + clip.name);
                    samples[state]=new Pose[count][];
                    for (int frame=0;frame<count;frame++)
                    {
                        Restore();
                        clip.SampleAnimation(model.gameObject,clip.length*frame/(count-1));
                        samples[state][frame]=new Pose[animated.Length];
                        for (int bone=0;bone<animated.Length;bone++)
                        {
                            var pose=Pose.Read(animated[bone]);
                            if (!Finite(pose.position) || !Finite(pose.scale) || !Finite(pose.rotation))
                                throw new ArgumentException("Nonfinite authored dragon pose: " + clip.name + "/" + animated[bone].name);
                            samples[state][frame][bone]=pose;
                        }
                    }
                }
            }
            finally { Restore(); }
        }

        public void Restore() { for(int i=0;i<hierarchy.Length;i++) if(hierarchy[i]!=null) rest[i].Apply(hierarchy[i]); }
        public void Reset() { flightPhase=0; Restore(); }
        Pose Sample(int state,float phase,int bone)
        {
            var frames=samples[state];
            float frame=Mathf.Clamp01(phase)*(frames.Length-1);
            int lo=Mathf.FloorToInt(frame), hi=Mathf.Min(frames.Length-1,lo+1);
            return Pose.Blend(frames[lo][bone],frames[hi][bone],frame-lo);
        }
        public void Advance(float deltaTime,float[] weights,float jawRadians)
        {
            // Boost is a retimed derivative of Flight. Both must sample the same
            // normalized wing phase while blending; independent seconds would
            // pull the anatomy between different points in the flap. Integrate
            // this render clock only when Tick advances, including during glide.
            flightPhase=Mathf.Repeat(flightPhase+deltaTime*Mathf.Lerp(1/durations[0],1/durations[2],weights[2]),1);
            for (int i=0;i<animated.Length;i++)
            {
                var a=Sample(0,flightPhase,i); var b=Sample(1,0,i); var c=Sample(2,flightPhase,i);
                float ab=weights[0]+weights[1];
                var pose=ab>.00001f ? Pose.Blend(a,b,weights[1]/ab) : c;
                Pose.Blend(pose,c,weights[2]).Apply(animated[i]);
            }
            // Keep the authored facial motion, then add the measured attack axis.
            // A nonanimated jaw starts from rest each frame, so offsets never compound.
            if (!jawAnimated) jaw.localRotation=jawRest;
            float angle=Mathf.Clamp(jawRadians,profile.jawMinRadians,profile.jawMaxRadians)*profile.jawScale;
            jaw.localRotation *= Quaternion.AngleAxis(angle*Mathf.Rad2Deg,profile.jawAxis.normalized);
        }
        static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
        static bool Finite(Vector3 value) => Finite(value.x)&&Finite(value.y)&&Finite(value.z);
        static bool Finite(Quaternion value) => Finite(value.x)&&Finite(value.y)&&Finite(value.z)&&Finite(value.w);
    }
}
