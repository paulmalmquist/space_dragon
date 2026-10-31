using System;
using UnityEngine;

namespace SpaceDragon.LaunchLab
{
    [Serializable]
    public sealed class LaunchPose
    {
        public float time;
        public Vector3 position;
        public Quaternion rotation;
        public Vector3 velocity;
        public Vector3 cameraPosition;
        public Vector3 cameraTarget;
        public float cameraFov;

        public Quaternion CameraRotation => Quaternion.LookRotation(cameraTarget - cameraPosition, Vector3.up);
    }

    [Serializable]
    public sealed class LaunchChoreography
    {
        public float duration;
        public int frameRate;
        public float videoStart;
        public float videoEnd;
        public LaunchPose[] frames;

        public static LaunchChoreography Parse(string json)
        {
            var result = JsonUtility.FromJson<LaunchChoreography>(json);
            if (result == null || result.duration != 12 || result.videoStart != 3 || result.videoEnd != 10 ||
                result.frameRate != 30 || result.frames == null || result.frames.Length < 2)
                throw new ArgumentException("Launch choreography must define the 12-second, 30fps contract with a 3–10 second video insert.");
            float previous = -1;
            foreach (var pose in result.frames)
            {
                if (pose == null || !Finite(pose.time) || pose.time <= previous || !Finite(pose.position) || !Finite(pose.velocity) ||
                    !Finite(pose.cameraPosition) || !Finite(pose.cameraTarget) || !Finite(pose.cameraFov) || pose.cameraFov < 10 || pose.cameraFov > 110 ||
                    !Finite(pose.rotation.x) || !Finite(pose.rotation.y) || !Finite(pose.rotation.z) || !Finite(pose.rotation.w) ||
                    Quaternion.Dot(pose.rotation, pose.rotation) < 0.99f || Quaternion.Dot(pose.rotation, pose.rotation) > 1.01f ||
                    (pose.cameraTarget - pose.cameraPosition).sqrMagnitude < 0.01f)
                    throw new ArgumentException("Launch choreography contains an invalid or unordered pose.");
                previous = pose.time;
            }
            if (Mathf.Abs(result.frames[0].time) > 0.001f || Mathf.Abs(previous - result.duration) > 0.001f)
                throw new ArgumentException("Launch choreography must include both endpoints.");
            return result;
        }

        public LaunchPose Sample(float time)
        {
            time = Mathf.Clamp(time, 0, duration);
            int left = 0, right = frames.Length - 1;
            while (right - left > 1)
            {
                int mid = (left + right) / 2;
                if (frames[mid].time <= time) left = mid; else right = mid;
            }
            var a = frames[left]; var b = frames[right];
            float t = Mathf.InverseLerp(a.time, b.time, time);
            return new LaunchPose
            {
                time = time, position = Vector3.Lerp(a.position, b.position, t), rotation = Quaternion.Slerp(a.rotation, b.rotation, t),
                velocity = Vector3.Lerp(a.velocity, b.velocity, t), cameraPosition = Vector3.Lerp(a.cameraPosition, b.cameraPosition, t),
                cameraTarget = Vector3.Lerp(a.cameraTarget, b.cameraTarget, t), cameraFov = Mathf.Lerp(a.cameraFov, b.cameraFov, t)
            };
        }

        private static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
        private static bool Finite(Vector3 value) => Finite(value.x) && Finite(value.y) && Finite(value.z);
    }
}
