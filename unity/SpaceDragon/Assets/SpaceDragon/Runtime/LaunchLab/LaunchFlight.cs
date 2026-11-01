using System;
using UnityEngine;

namespace SpaceDragon.LaunchLab
{
    [Serializable]
    public sealed class LaunchFlightSnapshot
    {
        public Vector3 position;
        public Quaternion rotation;
        public Vector3 velocity;
        public float bank;
        public float animationTime;
        public Vector3 cameraPosition;
        public Quaternion cameraRotation;
        public float cameraFov;
    }

    /// <summary>Safe flight only. Root motion/collision are independent of the imported animated rig.</summary>
    public sealed class LaunchFlight
    {
        private readonly Transform root;
        private readonly Camera camera;
        private readonly SphereCollider proxy;
        private readonly RaycastHit[] hits = new RaycastHit[16];
        private readonly Vector3 centre;
        private Vector3 velocity;
        private float yaw;
        private float pitch;
        private float bank;
        private float animationTime;
        public Vector3 Velocity => velocity;
        public float Bank => bank;
        public float AnimationTime => animationTime;
        public bool Boosting { get; private set; }
        public int CollisionRecoveries { get; private set; }

        public LaunchFlight(Transform gameplayRoot, Camera gameplayCamera, Vector3 orbitCentre)
        {
            root = gameplayRoot; camera = gameplayCamera; centre = orbitCentre;
            var body = new GameObject("LaunchLab.CollisionProxy");
            body.transform.SetParent(root, false);
            proxy = body.AddComponent<SphereCollider>();
            proxy.radius = 3.3f;
            proxy.isTrigger = true;
            proxy.enabled = false;
        }

        public void SetActive(bool active) { proxy.enabled = active; }

        public LaunchFlightSnapshot Capture() => new LaunchFlightSnapshot
        {
            position = root.position, rotation = root.rotation, velocity = velocity, bank = bank, animationTime = animationTime,
            cameraPosition = camera.transform.position, cameraRotation = camera.transform.rotation, cameraFov = camera.fieldOfView
        };

        public void Seed(LaunchFlightSnapshot snapshot)
        {
            root.SetPositionAndRotation(snapshot.position, snapshot.rotation);
            camera.transform.SetPositionAndRotation(snapshot.cameraPosition, snapshot.cameraRotation);
            camera.fieldOfView = snapshot.cameraFov;
            velocity = snapshot.velocity; bank = snapshot.bank; animationTime = snapshot.animationTime;
            yaw = root.eulerAngles.y;
            pitch = Mathf.DeltaAngle(0, root.eulerAngles.x);
            Boosting = false;
            SetActive(true);
        }

        public static LaunchFlightSnapshot FromPose(LaunchPose pose) => new LaunchFlightSnapshot
        {
            position = pose.position, rotation = pose.rotation, velocity = pose.velocity, animationTime = pose.time,
            cameraPosition = pose.cameraPosition, cameraRotation = pose.CameraRotation, cameraFov = pose.cameraFov
        };

        public void Tick(Vector2 steer, bool boost, float seconds)
        {
            if (seconds <= 0) return;
            seconds = Mathf.Min(seconds, 0.05f);
            Boosting = boost;
            yaw += steer.x * 52 * seconds;
            pitch = Mathf.Clamp(pitch - steer.y * 38 * seconds, -55, 55);
            bank = Mathf.Lerp(bank, -steer.x * 26, 1 - Mathf.Exp(-4 * seconds));
            root.rotation = Quaternion.Euler(pitch, yaw, bank);
            velocity = Vector3.Lerp(velocity, root.forward * (boost ? 55 : 35), 1 - Mathf.Exp(-2.5f * seconds));
            Vector3 travel = velocity * seconds;
            float distance = travel.magnitude;
            bool blocked = false;
            if (distance > 0)
            {
                int count = Physics.SphereCastNonAlloc(root.position, proxy.radius, travel / distance, hits, distance + 0.1f, ~0, QueryTriggerInteraction.Ignore);
                for (int i = 0; i < count; i++)
                    if (!hits[i].transform.IsChildOf(root)) { blocked = true; break; }
                if (count == hits.Length) blocked = true;
            }
            if (blocked) { velocity = Vector3.zero; CollisionRecoveries++; }
            else root.position += travel;
            // A generous rehearsal volume, not planet traversal. Turn smoothly towards its centre at the edge.
            if ((root.position - centre).sqrMagnitude > 800 * 800)
            {
                var inward = Quaternion.LookRotation(centre - root.position);
                yaw = Mathf.MoveTowardsAngle(yaw, inward.eulerAngles.y, 65 * seconds);
                pitch = Mathf.MoveTowardsAngle(pitch, Mathf.DeltaAngle(0, inward.eulerAngles.x), 45 * seconds);
            }
            animationTime += seconds;
            Vector3 focus = root.position + root.forward * 9;
            Vector3 desired = root.position - root.forward * 20 + Vector3.up * 7;
            camera.transform.position = Vector3.Lerp(camera.transform.position, desired, 1 - Mathf.Exp(-3.5f * seconds));
            camera.transform.rotation = Quaternion.Slerp(camera.transform.rotation, Quaternion.LookRotation(focus - camera.transform.position, Vector3.up), 1 - Mathf.Exp(-4 * seconds));
        }
    }
}
