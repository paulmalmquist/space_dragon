using UnityEngine;

namespace SpaceDragon.FirstContact
{
    /// <summary>Movement and camera presentation. The controller never awards or saves progress.</summary>
    internal sealed class FirstContactPlayer
    {
        private readonly CharacterController body;
        private readonly Camera camera;
        private readonly Vector3 spawn;
        private readonly RaycastHit[] cameraHits = new RaycastHit[24];
        private float verticalSpeed;
        private float yaw = 70;
        private float pitch = 22;
        public bool Moving { get; private set; }
        public Vector3 Focus => body.transform.position + Vector3.up * 1.35f;
        public Vector3 DesiredCameraPosition => Focus - Quaternion.Euler(pitch, yaw, 0) * Vector3.forward * 5.4f;

        public FirstContactPlayer(CharacterController character, Camera gameplayCamera)
        {
            body = character;
            camera = gameplayCamera;
            spawn = character.transform.position;
        }

        public ContactPositionRestoreResult RestorePosition(Vector3 position)
        {
            var result = ContactSpawnValidation.TryPlace(body, position)
                ? ContactPositionRestoreResult.Restored
                : ContactSpawnValidation.TryPlace(body, spawn)
                    ? ContactPositionRestoreResult.RecoveredToSpawn
                    : ContactPositionRestoreResult.NoSafePosition;
            verticalSpeed = 0;
            Moving = false;
            return result;
        }

        public void Stop() { Moving = false; verticalSpeed = 0; }
        public void Recenter() { yaw = body.transform.eulerAngles.y; pitch = 22; }

        public void Tick(Vector2 movement, Vector2 lookDegrees, float seconds)
        {
            yaw += lookDegrees.x;
            pitch = Mathf.Clamp(pitch - lookDegrees.y, 8, 50);
            var direction = Quaternion.Euler(0, yaw, 0) * new Vector3(movement.x, 0, movement.y);
            if (direction.sqrMagnitude > 1) direction.Normalize();
            if (body.isGrounded && verticalSpeed < 0) verticalSpeed = -2;
            verticalSpeed = Mathf.Max(-20, verticalSpeed - 18 * seconds);
            var before = body.transform.position;
            body.Move((direction * 3.2f + Vector3.up * verticalSpeed) * seconds);
            var planarTravel = body.transform.position - before;
            planarTravel.y = 0;
            Moving = planarTravel.sqrMagnitude > 0.000001f;
            if (direction.sqrMagnitude > 0.01f)
                body.transform.rotation = Quaternion.Slerp(body.transform.rotation, Quaternion.LookRotation(direction), 1 - Mathf.Exp(-12 * seconds));
            if (body.transform.position.y < -2) RestorePosition(spawn);
            UpdateCamera(seconds);
        }

        public void UpdateCamera(float seconds, bool snap = false)
        {
            Vector3 focus = Focus;
            Vector3 desired = DesiredCameraPosition;
            Vector3 ray = desired - focus;
            float distance = ray.magnitude;
            // Ignore the controlled body while shortening the camera against environment colliders.
            int hitCount = Physics.SphereCastNonAlloc(focus, 0.16f, ray.normalized, cameraHits, distance, ~0, QueryTriggerInteraction.Ignore);
            for (int index = 0; index < hitCount; index++)
            {
                RaycastHit hit = cameraHits[index];
                if (hit.collider == body || hit.transform.IsChildOf(body.transform)) continue;
                distance = Mathf.Min(distance, Mathf.Max(0.5f, hit.distance - 0.12f));
            }
            desired = focus + ray.normalized * distance;
            camera.transform.position = snap ? desired : Vector3.Lerp(camera.transform.position, desired, 1 - Mathf.Exp(-12 * seconds));
            camera.transform.rotation = Quaternion.LookRotation(focus - camera.transform.position, Vector3.up);
        }
    }
}
