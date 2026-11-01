using System;
using System.Collections.Generic;
using UnityEngine;

namespace SpaceDragon.TownDrive.Runtime
{
    /// <summary>One bounded 60-pose shoe-floor profile per imported rig, shared by every actor.</summary>
    internal sealed class TownDrivePedestrianGrounding
    {
        public const int FrameCount=60;
        public const float SidewalkHeight=.12f;
        private readonly float[] floors=new float[FrameCount];
        public float Floor(int frame)=>floors[Math.Max(0,Math.Min(FrameCount-1,frame))];
        public static int Frame(double phase,double distance)
        {
            int stride=distance<60?1:3;
            return Math.Max(0,Math.Min(FrameCount-1,(int)Math.Floor(phase*FrameCount/stride)*stride));
        }
        public static TownDrivePedestrianGrounding Bake(GameObject template,AnimationClip clip)
        {
            if(template==null||clip==null||clip.length<=0)throw new ArgumentException("Pedestrian grounding requires an imported rig and walk clip.");
            var profile=new TownDrivePedestrianGrounding();
            var probe=UnityEngine.Object.Instantiate(template);probe.name="TownDrive grounding probe";probe.SetActive(false);
            probe.transform.SetPositionAndRotation(Vector3.zero,Quaternion.identity);probe.transform.localScale=Vector3.one;
            foreach(var animator in probe.GetComponentsInChildren<Animator>(true))animator.enabled=false;
            foreach(var animation in probe.GetComponentsInChildren<Animation>(true))animation.enabled=false;
            var mesh=new Mesh{name="TownDrive grounding sample"};var vertices=new List<Vector3>(10000);
            try
            {
                var skins=probe.GetComponentsInChildren<SkinnedMeshRenderer>(true);
                if(skins.Length==0)throw new InvalidOperationException("Pedestrian template has no skinned geometry.");
                for(int frame=0;frame<FrameCount;frame++)
                {
                    clip.SampleAnimation(probe,clip.length*frame/FrameCount);float floor=float.PositiveInfinity;
                    foreach(var skin in skins)
                    {
                        // BakeMesh(false) produces skin-local vertices. Apply the
                        // complete skin-to-root transform once, including scale.
                        skin.BakeMesh(mesh,false);mesh.GetVertices(vertices);
                        var toRoot=probe.transform.worldToLocalMatrix*skin.transform.localToWorldMatrix;
                        foreach(var vertex in vertices)floor=Math.Min(floor,toRoot.MultiplyPoint3x4(vertex).y);
                    }
                    if(float.IsNaN(floor)||float.IsInfinity(floor))throw new InvalidOperationException("Pedestrian walk has no finite planted-shoe floor.");
                    profile.floors[frame]=floor;
                }
                return profile;
            }
            finally{UnityEngine.Object.Destroy(mesh);UnityEngine.Object.Destroy(probe);}
        }
    }
}
