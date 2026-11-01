using UnityEngine;

namespace SpaceDragon.FirstContact
{
    public enum ContactPositionRestoreResult { Restored, RecoveredToSpawn, NoSafePosition }

    /// <summary>Checks a restored character volume before moving it into scene geometry.</summary>
    public static class ContactSpawnValidation
    {
        public static bool IsClear(CharacterController body, Vector3 feetPosition)
        {
            if (body == null || !Finite(feetPosition.x) || !Finite(feetPosition.y) || !Finite(feetPosition.z)) return false;
            Vector3 scale = body.transform.lossyScale;
            float widthScale = Mathf.Max(Mathf.Abs(scale.x), Mathf.Abs(scale.z));
            float radius = body.radius * widthScale;
            float height = Mathf.Max(body.height * Mathf.Abs(scale.y), radius * 2);
            // CharacterController can rest partly inside its skin. The reduced query radius
            // allows that normal floor contact without accepting full-body wall penetration.
            float tolerance = Mathf.Max(0.01f, body.skinWidth * Mathf.Max(widthScale, Mathf.Abs(scale.y))) + 0.005f;
            float queryRadius = Mathf.Max(0.01f, radius - tolerance);
            Vector3 center = feetPosition + body.transform.TransformVector(body.center);
            Vector3 halfSegment = body.transform.up * Mathf.Max(0, height * 0.5f - radius);
            var overlaps = new Collider[32];
            Physics.SyncTransforms();
            int count = Physics.OverlapCapsuleNonAlloc(center - halfSegment, center + halfSegment, queryRadius,
                overlaps, ~0, QueryTriggerInteraction.Ignore);
            // A full buffer cannot establish that omitted contacts are safe.
            if (count == overlaps.Length) return false;
            for (int index = 0; index < count; index++)
            {
                Collider contact = overlaps[index];
                if (contact == body || contact.transform.IsChildOf(body.transform)) continue;
                return false;
            }
            return true;
        }

        public static bool TryPlace(CharacterController body, Vector3 feetPosition)
        {
            if (!IsClear(body, feetPosition)) return false;
            bool wasEnabled = body.enabled;
            body.enabled = false;
            body.transform.position = feetPosition;
            body.enabled = wasEnabled;
            Physics.SyncTransforms();
            return true;
        }

        private static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
    }
}
