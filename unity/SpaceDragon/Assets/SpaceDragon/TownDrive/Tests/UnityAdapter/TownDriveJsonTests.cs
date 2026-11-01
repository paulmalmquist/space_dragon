using System;
using NUnit.Framework;
using UnityEngine;
using UnityEditor;

namespace SpaceDragon.TownDrive.UnityRuntime.Tests
{
    public sealed class TownDriveJsonTests
    {
        private static TextAsset RouteAsset() => AssetDatabase.LoadAssetAtPath<TextAsset>("Assets/SpaceDragon/TownDrive/Data/town-drive-v001.json");

        [Test]
        public void UnitySerializerLoadsTheVerifiedMetreScaleRoute()
        {
            var data = TownDriveJson.Load(RouteAsset());
            Assert.That(data.sourceFingerprint, Is.EqualTo("ebfd1afb10cbe59c88c0bd0143e5e4a77a15dec5d8f09c5628b38041317286da"));
            Assert.That(data.route.length, Is.EqualTo(4455.219725).Within(.001));
            Assert.That(data.route.sections[0].endS, Is.EqualTo(407.943720).Within(.001));
            Assert.That(data.route.checkpoints.Length, Is.EqualTo(5));
            Assert.That(data.closureObstacles.Length, Is.GreaterThan(100));
            var route = new DriveRoute(data.route);
            Assert.That(route.LabelAt(240), Is.EqualTo("Winston Trails South"));
            var simulation = new DriveSimulation(route);
            var initial = simulation.CreateState();
            var next = simulation.Step(initial, new DriveInput { throttle = 1 }, data.config, data.closureObstacles);
            Assert.That(next.elapsedSeconds, Is.EqualTo(1.0 / 60).Within(1e-12));
            Assert.That(next.speed, Is.GreaterThan(0));
            Assert.That(initial.elapsedSeconds, Is.EqualTo(0));
        }

        [Test]
        public void UnknownSchemaAndMissingRouteAreRejected()
        {
            var original = RouteAsset().text;
            var data = TownDriveJson.Parse(original);
            data.schemaVersion = 2;
            Assert.Throws<ArgumentException>(() => TownDriveJson.Parse(JsonUtility.ToJson(data)));
            Assert.Throws<ArgumentException>(() => TownDriveJson.Parse("{}"));
            Assert.Throws<ArgumentException>(() => TownDriveJson.Parse(" "));
            Assert.Throws<ArgumentNullException>(() => TownDriveJson.Load(null));
        }
    }
}
