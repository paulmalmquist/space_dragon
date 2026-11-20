using System;
using UnityEngine;

namespace SpaceDragon.Playground
{
    /// <summary>One authored loop, sampled at even intervals from first key to last.</summary>
    [Serializable]
    public sealed class PersonClip
    {
        public string id;
        public int frames;
        public float duration;
        /// <summary>frames x bones x 4 local rotations (x, y, z, w), bone order as in the library.</summary>
        public float[] rotations;
        /// <summary>frames local heights of the hip joint.</summary>
        public float[] hipHeights;
    }

    /// <summary>
    /// The hero stand-in's loops baked to plain numbers by the scene generator. Play mode blends
    /// them with simple arithmetic, so the result does not depend on an Animator, a controller
    /// or how any importer chose to store its curves.
    /// </summary>
    public sealed class PersonClipLibrary : ScriptableObject
    {
        /// <summary>Paths below the model root, one per animated bone.</summary>
        public string[] bonePaths = Array.Empty<string>();
        public string hipPath = "";
        public Vector3 hipRest;
        /// <summary>Order matches PersonMotionData.ClipIds: idle, walk, run, sprint.</summary>
        public PersonClip[] clips = Array.Empty<PersonClip>();
        public string sourceAsset = "";
    }
}
