using System;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.LaunchLab.Tests
{
    public sealed class LaunchPresentationTests
    {
        [Test]
        public void ChoreographyInterpolationPreservesEndpointsVelocityAndCamera()
        {
            var source = new LaunchChoreography
            {
                duration = 12, frameRate = 30, videoStart = 3, videoEnd = 10,
                frames = new[] {
                    new LaunchPose { time = 0, rotation = Quaternion.identity, cameraPosition = new Vector3(0, 2, -5), cameraTarget = Vector3.up, cameraFov = 50 },
                    new LaunchPose { time = 12, position = new Vector3(0, 155, 290), rotation = Quaternion.Euler(-10, 0, 0), velocity = new Vector3(0, 6, 34), cameraPosition = new Vector3(0, 162, 270), cameraTarget = new Vector3(0, 155, 300), cameraFov = 52 }
                }
            };
            var parsed = LaunchChoreography.Parse(JsonUtility.ToJson(source));
            var half = parsed.Sample(6);
            Assert.That(half.position, Is.EqualTo(new Vector3(0, 77.5f, 145)));
            Assert.That(half.cameraFov, Is.EqualTo(51));
            Assert.That(parsed.Sample(12).velocity, Is.EqualTo(source.frames[1].velocity));
            Assert.That(parsed.Sample(99).cameraPosition, Is.EqualTo(source.frames[1].cameraPosition));
            source.frames[1].rotation = new Quaternion(0, 0, 0, 0);
            Assert.Throws<ArgumentException>(() => LaunchChoreography.Parse(JsonUtility.ToJson(source)));
        }

        [Test]
        public void FlightReplaySeedRestoresPoseVelocityCameraAndAnimationWithoutAdvancing()
        {
            var root = new GameObject("Synthetic launch actor");
            var cameraObject = new GameObject("Synthetic launch camera");
            try
            {
                var camera = cameraObject.AddComponent<Camera>();
                var controller = new LaunchFlight(root.transform, camera, new Vector3(0, 5000, 0));
                var seed = new LaunchFlightSnapshot
                {
                    position = new Vector3(5, 5003, 20), rotation = Quaternion.Euler(-10, 20, 8), velocity = new Vector3(5, 3, 34),
                    bank = 8, animationTime = 6.25f, cameraPosition = new Vector3(4, 5011, 3), cameraRotation = Quaternion.Euler(5, 21, 0), cameraFov = 48
                };
                controller.Seed(seed);
                var captured = controller.Capture();
                controller.Tick(new Vector2(1, 0.5f), true, 0.05f);
                Assert.That(controller.Capture().position, Is.Not.EqualTo(captured.position));
                controller.Seed(captured);
                var restored = controller.Capture();
                Assert.That(restored.position, Is.EqualTo(seed.position));
                Assert.That(Quaternion.Angle(restored.rotation, seed.rotation), Is.LessThan(0.001));
                Assert.That(restored.velocity, Is.EqualTo(seed.velocity));
                Assert.That(restored.cameraPosition, Is.EqualTo(seed.cameraPosition));
                Assert.That(Quaternion.Angle(restored.cameraRotation, seed.cameraRotation), Is.LessThan(0.001));
                Assert.That(restored.cameraFov, Is.EqualTo(seed.cameraFov));
                Assert.That(restored.bank, Is.EqualTo(seed.bank));
                Assert.That(restored.animationTime, Is.EqualTo(seed.animationTime));
                Assert.That(root.GetComponentInChildren<SphereCollider>().radius, Is.EqualTo(3.3f));
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(root);
                UnityEngine.Object.DestroyImmediate(cameraObject);
            }
        }
    }
}
