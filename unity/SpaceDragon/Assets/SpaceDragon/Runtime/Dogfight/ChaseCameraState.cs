using UnityEngine;

namespace SpaceDragon.Dogfight
{
    /// <summary>Follow the moving gameplay frame before damping; speed must not add trailing lag.</summary>
    public sealed class ChaseCameraState
    {
        // SD-079: closer hero framing without scaling the actor or its hit shapes.
        public const float CruiseDistance = 9.8f, CruiseHeight = 3.55f;
        public const float LookAhead = 42f, LookHeight = 1.2f;
        public Vector3 Position { get; private set; }
        public Quaternion Rotation { get; private set; } = Quaternion.identity;
        public float FieldOfView { get; private set; } = 61;
        public Vector3 Anchor { get; private set; }
        Vector3 look, up = Vector3.up, previousAnchor;
        bool hasAnchor;
        public void Tick(float dt, FlightState flight, bool snap=false, bool zoom=false, bool reducedMotion=false, Vector3? wreckAnchor=null)
        {
            if(flight==null||float.IsNaN(dt)||float.IsInfinity(dt)||dt<0)return;
            Anchor=wreckAnchor??(flight.Position-flight.RollOffset);
            snap|=!hasAnchor;
            if(!snap&&dt>0){Vector3 delta=Anchor-previousAnchor;Position+=delta;look+=delta;}
            if(snap||dt>0){previousAnchor=Anchor;hasAnchor=true;}
            float normal=Mathf.InverseLerp(54,88,flight.Speed),boost=Mathf.InverseLerp(88,148,flight.Speed);
            float setback=reducedMotion?0:.8f*normal+1.2f*boost;
            float response=snap?1:1-Mathf.Exp(-9*dt);
            Position=Vector3.Lerp(Position,Anchor-flight.Forward*(CruiseDistance+setback)+flight.Up*CruiseHeight,response);
            look=Vector3.Lerp(look,Anchor+flight.Forward*LookAhead+flight.Up*LookHeight,snap?1:1-Mathf.Exp(-11*dt));
            up=Vector3.Lerp(up,flight.Up,response).normalized;
            Rotation=Quaternion.LookRotation(look-Position,up);
            float fov=zoom?40:reducedMotion?61:61+5*normal+8*boost;
            FieldOfView=Mathf.Lerp(FieldOfView,fov,snap?1:1-Mathf.Exp(-7*dt));
        }
    }
}
