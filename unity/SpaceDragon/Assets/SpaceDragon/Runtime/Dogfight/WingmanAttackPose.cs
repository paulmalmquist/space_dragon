using System;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    /// <summary>Pure attack geometry shared by scenery/damage queries and the ally
    /// renderer. It never reads a rendered transform or advances run/cooldown state.</summary>
    public readonly struct WingmanAttackPose
    {
        // The placeholder's nose is authored at +1.8 local Z in WingmanVisual.
        public const float NoseLocalZ = 1.8f;
        public readonly Vector3 Position, BeamOrigin;
        public readonly Quaternion Rotation;

        WingmanAttackPose(Vector3 position,Quaternion rotation,float scale)
        {
            Position=position;Rotation=rotation;
            BeamOrigin=position+rotation*Vector3.forward*(NoseLocalZ*scale);
        }
        public static Vector3 Formation(FlightState player,DogfightTuning tuning)
        {
            if(player==null)throw new ArgumentNullException(nameof(player));
            if(tuning==null)throw new ArgumentNullException(nameof(tuning));
            float distance=Mathf.Max(0,tuning.WingmanFormationDistance);
            return player.Position+player.Rotation*new Vector3(-distance,distance*.25f,distance);
        }
        public static WingmanAttackPose Sample(FlightState player,Vector3 target,float runRemaining,DogfightTuning tuning)
        {
            Vector3 formation=Formation(player,tuning);
            if(!Finite(target)||!Finite(runRemaining))throw new ArgumentException("Wingman attack pose requires a finite target and run time.");
            float duration=Mathf.Max(.001f,tuning.WingmanRunSeconds);
            float remaining=Mathf.Clamp(runRemaining,0,duration),elapsed=duration-remaining;
            float progress=elapsed/duration,radius=Mathf.Max(0,tuning.WingmanStrafeRadius);
            float angle=Mathf.Lerp(-Mathf.PI*.65f,Mathf.PI*.65f,progress);
            Vector3 orbit=target+player.Rotation*new Vector3(Mathf.Sin(angle)*radius,radius*.22f,-Mathf.Cos(angle)*radius-radius*.45f);
            // Existing travel speed controls smooth ingress and egress, instead of
            // a render-only MoveTowards history that damage cannot reproduce.
            float separation=Mathf.Max(.001f,Vector3.Distance(formation,orbit));
            float travel=Mathf.Min(elapsed,remaining)*Mathf.Max(0,tuning.WingmanVisualSpeed)/separation;
            Vector3 position=Vector3.Lerp(formation,orbit,Mathf.SmoothStep(0,1,Mathf.Clamp01(travel)));
            Vector3 forward=target-position;
            if(forward.sqrMagnitude<.001f)forward=player.Forward;
            Vector3 up=Mathf.Abs(Vector3.Dot(forward.normalized,player.Up))>.99f?player.Rotation*Vector3.right:player.Up;
            return new WingmanAttackPose(position,Quaternion.LookRotation(forward,up),Mathf.Max(.01f,tuning.WingmanVisualScale));
        }
        static bool Finite(float n)=>!float.IsNaN(n)&&!float.IsInfinity(n);
        static bool Finite(Vector3 v)=>Finite(v.x)&&Finite(v.y)&&Finite(v.z);
    }
}
