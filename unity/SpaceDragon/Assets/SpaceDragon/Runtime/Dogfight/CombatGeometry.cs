using UnityEngine;

namespace SpaceDragon.Dogfight
{
    /// <summary>
    /// Swept tests shared by the encounter and the weapon queries. Math only: no scene,
    /// physics or frame state, so the same code runs in the engine-free state tests.
    /// </summary>
    public static class CombatGeometry
    {
        /// <summary>
        /// First contact of a moving point with a sphere. <paramref name="fraction"/> is how far
        /// along the segment the contact is, 0 at <paramref name="from"/> and 1 at
        /// <paramref name="to"/>. A start inside the sphere is a hit at 0.
        /// </summary>
        public static bool SegmentSphere(Vector3 from,Vector3 to,Vector3 center,float radius,out float fraction)
        {
            Vector3 d=to-from,m=from-center;float c=Vector3.Dot(m,m)-radius*radius;fraction=0;if(c<=0)return true;
            float a=Vector3.Dot(d,d);if(a<1e-10f)return false;float b=Vector3.Dot(m,d),disc=b*b-a*c;if(disc<0)return false;
            float t=(-b-Mathf.Sqrt(disc))/a;if(t<0||t>1)return false;fraction=t;return true;
        }
    }
}
