using SpaceDragon.Traversal;
using UnityEngine;

namespace SpaceDragon.Playground
{
    /// <summary>
    /// Lets the realistic stand-in walk wherever another object goes, for scenes that already
    /// move a simple proxy (the First Contact living room). It only watches the target's
    /// position and facing; it never moves the target or touches that scene's state.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class PersonFollower : MonoBehaviour
    {
        [SerializeField] private PersonAvatar avatar;
        [SerializeField] private Transform target;
        [Tooltip("Height of the target's origin above its feet.")]
        [SerializeField] private float feetOffset;

        private Vector3 last;
        private bool started;

        public void Configure(PersonAvatar person, Transform follow, float originAboveFeet)
        {
            avatar = person; target = follow; feetOffset = originAboveFeet;
        }

        private void LateUpdate()
        {
            if (avatar == null || target == null) return;
            float seconds = Time.deltaTime;
            Vector3 feet = target.position - Vector3.up * feetOffset;
            Vector3 velocity = started && seconds > 1e-5f ? (feet - last) / seconds : Vector3.zero;
            last = feet;
            avatar.Present(new PersonFrame
            {
                position = feet, yaw = target.eulerAngles.y * Mathf.Deg2Rad, mode = HeroMode.Ground,
                velocity = new Vector3(velocity.x, 0, velocity.z),
            }, seconds, !started);
            started = true;
        }
    }
}
