using System;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class CameraImpactStateTests
    {
        const float Step = 1f / 60;
        DogfightTuning tuning;
        CameraImpactState camera;
        [SetUp] public void SetUp() { tuning = ScriptableObject.CreateInstance<DogfightTuning>(); camera = new CameraImpactState(tuning); }
        [TearDown] public void TearDown() { UnityEngine.Object.DestroyImmediate(tuning); }

        [Test] public void RestsAtExactlyZeroUntilAnImpactArrives()
        {
            for (int i = 0; i < 120; i++) camera.Tick(Step, false);
            Assert.That(camera.Trauma, Is.Zero); Assert.That(camera.FieldOfViewOffset, Is.Zero);
            Assert.That(camera.PositionOffset, Is.EqualTo(Vector3.zero)); Assert.That(camera.EulerOffset, Is.EqualTo(Vector3.zero));
            Assert.That(camera.AtRest, Is.True); Assert.That(camera.Serial, Is.Zero);
        }

        [Test] public void ImpactShakesWithinTheTunedLimitsAndNeverInDepth()
        {
            camera.AddTrauma(5); // far more than full
            Assert.That(camera.Trauma, Is.EqualTo(1));
            float largestMetres = 0, largestDegrees = 0, largestRoll = 0;
            for (int i = 0; i < 600; i++)
            {
                camera.AddTrauma(1); camera.Tick(Step, false);
                largestMetres = Mathf.Max(largestMetres, Mathf.Max(Mathf.Abs(camera.PositionOffset.x), Mathf.Abs(camera.PositionOffset.y)));
                largestDegrees = Mathf.Max(largestDegrees, Mathf.Max(Mathf.Abs(camera.EulerOffset.x), Mathf.Abs(camera.EulerOffset.y)));
                largestRoll = Mathf.Max(largestRoll, Mathf.Abs(camera.EulerOffset.z));
                Assert.That(camera.PositionOffset.z, Is.Zero, "The chase distance is never shaken.");
            }
            Assert.That(largestMetres, Is.GreaterThan(tuning.ImpactCameraMaxMetres * .5f), "A full impact is clearly visible.");
            Assert.That(largestMetres, Is.LessThanOrEqualTo(tuning.ImpactCameraMaxMetres + .0001f));
            Assert.That(largestDegrees, Is.LessThanOrEqualTo(tuning.ImpactCameraMaxDegrees + .0001f));
            Assert.That(largestRoll, Is.LessThanOrEqualTo(tuning.ImpactCameraMaxRollDegrees + .0001f));
        }

        [Test] public void ShakeFadesAwayOnItsOwnAndEndsAtExactlyZero()
        {
            camera.AddTrauma(1);
            float seconds = 1 / tuning.ImpactCameraDecayPerSecond;
            for (float t = 0; t < seconds * .5f; t += Step) camera.Tick(Step, false);
            Assert.That(camera.Trauma, Is.InRange(.4f, .6f));
            for (float t = 0; t < seconds; t += Step) camera.Tick(Step, false);
            camera.Tick(Step, false);
            Assert.That(camera.Trauma, Is.Zero);
            Assert.That(camera.PositionOffset, Is.EqualTo(Vector3.zero)); Assert.That(camera.EulerOffset, Is.EqualTo(Vector3.zero));
            Assert.That(camera.AtRest, Is.True);
        }

        [Test] public void SmallHitsAreMuchGentlerThanLargeOnes()
        {
            float Largest(float trauma)
            {
                var state = new CameraImpactState(tuning); float largest = 0;
                for (int i = 0; i < 600; i++) { state.Hold(trauma); state.Tick(Step, false); largest = Mathf.Max(largest, state.PositionOffset.magnitude); }
                return largest;
            }
            // Strength is the square of trauma, so a third of the trauma is about a ninth of the motion.
            Assert.That(Largest(.3f), Is.LessThan(Largest(.9f) * .2f));
        }

        [Test] public void SameImpactsGiveTheSameMotionEveryTime()
        {
            var other = new CameraImpactState(tuning);
            foreach (var state in new[] { camera, other }) { state.AddTrauma(.7f); state.Punch(3); }
            for (int i = 0; i < 90; i++)
            {
                if (i == 30) { camera.AddTrauma(.4f); other.AddTrauma(.4f); }
                camera.Tick(Step, false); other.Tick(Step, false);
                Assert.That(camera.PositionOffset, Is.EqualTo(other.PositionOffset));
                Assert.That(camera.EulerOffset, Is.EqualTo(other.EulerOffset));
                Assert.That(camera.FieldOfViewOffset, Is.EqualTo(other.FieldOfViewOffset));
            }
        }

        [Test] public void ReducedMotionRemovesShakeAndLensPunchAndLeavesNothingBehind()
        {
            camera.AddTrauma(1); camera.Punch(4); camera.Hold(.5f);
            camera.Tick(Step, false);
            Assert.That(camera.PositionOffset.sqrMagnitude + camera.EulerOffset.sqrMagnitude, Is.GreaterThan(0));
            camera.Tick(0, true); // even a frozen step must clear at once
            Assert.That(camera.Trauma, Is.Zero); Assert.That(camera.FieldOfViewOffset, Is.Zero);
            Assert.That(camera.PositionOffset, Is.EqualTo(Vector3.zero)); Assert.That(camera.EulerOffset, Is.EqualTo(Vector3.zero));
            camera.Tick(Step, false);
            Assert.That(camera.AtRest, Is.True, "Turning reduced motion off again must not reveal an old shake.");
        }

        [Test] public void SwitchedOffIgnoresEveryInput()
        {
            tuning.EnableImpactCamera = false;
            camera.AddTrauma(1); camera.Punch(4); camera.Hold(1);
            for (int i = 0; i < 10; i++) camera.Tick(Step, false);
            Assert.That(camera.Serial, Is.Zero); Assert.That(camera.AtRest, Is.True);
            Assert.That(camera.PositionOffset, Is.EqualTo(Vector3.zero)); Assert.That(camera.EulerOffset, Is.EqualTo(Vector3.zero));
            Assert.That(camera.FieldOfViewOffset, Is.Zero);
        }

        [Test] public void SwitchingOffMidShakeClearsItOnTheNextStep()
        {
            camera.AddTrauma(1); camera.Punch(4); camera.Tick(Step, false);
            tuning.EnableImpactCamera = false; camera.Tick(Step, false);
            Assert.That(camera.AtRest, Is.True); Assert.That(camera.PositionOffset, Is.EqualTo(Vector3.zero));
        }

        [TestCase(0f)] [TestCase(-.1f)] [TestCase(float.NaN)] [TestCase(float.PositiveInfinity)]
        public void FrozenOrInvalidStepHoldsThePose(float dt)
        {
            camera.AddTrauma(.8f); camera.Punch(3); camera.Tick(Step, false);
            Vector3 position = camera.PositionOffset, euler = camera.EulerOffset; float trauma = camera.Trauma, lens = camera.FieldOfViewOffset;
            camera.Tick(dt, false);
            Assert.That(camera.PositionOffset, Is.EqualTo(position)); Assert.That(camera.EulerOffset, Is.EqualTo(euler));
            Assert.That(camera.Trauma, Is.EqualTo(trauma)); Assert.That(camera.FieldOfViewOffset, Is.EqualTo(lens));
        }

        [Test] public void LensPunchIsLimitedRecoversAndCanNarrow()
        {
            camera.Punch(100); Assert.That(camera.FieldOfViewOffset, Is.EqualTo(tuning.ImpactCameraLensPunchMax));
            camera.Punch(-1000); Assert.That(camera.FieldOfViewOffset, Is.EqualTo(-tuning.ImpactCameraLensPunchMax));
            float previous = Mathf.Abs(camera.FieldOfViewOffset);
            for (int i = 0; i < 20; i++) { camera.Tick(Step, false); float now = Mathf.Abs(camera.FieldOfViewOffset); Assert.That(now, Is.LessThan(previous)); previous = now; }
            for (int i = 0; i < 240; i++) camera.Tick(Step, false);
            Assert.That(camera.FieldOfViewOffset, Is.Zero, "Recovery ends at exactly zero, not a lingering fraction.");
        }

        [Test] public void HeldRumbleLastsOnlyWhileItIsHeld()
        {
            for (int i = 0; i < 60; i++) { camera.Hold(.22f); camera.Tick(Step, false); Assert.That(camera.Trauma, Is.InRange(.15f, .22f)); }
            for (int i = 0; i < 30; i++) camera.Tick(Step, false);
            Assert.That(camera.Trauma, Is.Zero);
            camera.AddTrauma(.9f); camera.Hold(.22f); camera.Tick(Step, false);
            Assert.That(camera.Trauma, Is.GreaterThan(.8f), "A rumble never lowers a stronger impact.");
        }

        [Test] public void InvalidAmountsAreIgnoredAndCounted()
        {
            foreach (float bad in new[] { 0f, -1f, float.NaN, float.PositiveInfinity }) { camera.AddTrauma(bad); camera.Hold(bad); }
            foreach (float bad in new[] { 0f, float.NaN, float.NegativeInfinity }) camera.Punch(bad);
            Assert.That(camera.Serial, Is.Zero); Assert.That(camera.AtRest, Is.True);
            camera.AddTrauma(.2f); camera.Punch(1); Assert.That(camera.Serial, Is.EqualTo(2));
        }

        [Test] public void ClearReturnsToRestAndRestartsTheMotion()
        {
            camera.AddTrauma(.6f); for (int i = 0; i < 7; i++) camera.Tick(Step, false);
            camera.Clear();
            Assert.That(camera.AtRest, Is.True); Assert.That(camera.PositionOffset, Is.EqualTo(Vector3.zero));
            var fresh = new CameraImpactState(tuning);
            camera.AddTrauma(.6f); fresh.AddTrauma(.6f); camera.Tick(Step, false); fresh.Tick(Step, false);
            Assert.That(camera.PositionOffset, Is.EqualTo(fresh.PositionOffset), "After a clear the motion starts from the same place as a new state.");
        }

        [Test] public void ResetAlsoForgetsTheCountButClearDoesNot()
        {
            camera.AddTrauma(.5f); camera.Punch(2); camera.Tick(Step, false);
            camera.Clear();
            Assert.That(camera.Serial, Is.EqualTo(2), "Pause and a camera snap clear the motion and keep the count.");
            camera.AddTrauma(.5f); camera.Reset();
            Assert.That(camera.Serial, Is.Zero, "Restart begins a fresh encounter."); Assert.That(camera.AtRest, Is.True);
            Assert.That(camera.HasOffset, Is.False);
        }

        [Test] public void LongFrameIsTreatedAsAShortOne()
        {
            camera.AddTrauma(1); camera.Tick(10, false);
            Assert.That(camera.Trauma, Is.GreaterThan(.5f), "One long frame must not skip the whole shake silently.");
            Assert.That(Mathf.Abs(camera.PositionOffset.x), Is.LessThanOrEqualTo(tuning.ImpactCameraMaxMetres + .0001f));
        }

        [Test] public void DistanceFalloffIsFullNearZeroFarAndNeverRises()
        {
            Assert.That(CameraImpactState.DistanceFalloff(0, 60, 420), Is.EqualTo(1));
            Assert.That(CameraImpactState.DistanceFalloff(60, 60, 420), Is.EqualTo(1));
            Assert.That(CameraImpactState.DistanceFalloff(420, 60, 420), Is.Zero);
            Assert.That(CameraImpactState.DistanceFalloff(5000, 60, 420), Is.Zero);
            Assert.That(CameraImpactState.DistanceFalloff(240, 60, 420), Is.EqualTo(.5f).Within(.0001f));
            float previous = 1;
            for (float d = 0; d <= 500; d += 5) { float now = CameraImpactState.DistanceFalloff(d, 60, 420); Assert.That(now, Is.LessThanOrEqualTo(previous)); Assert.That(now, Is.InRange(0f, 1f)); previous = now; }
            Assert.That(CameraImpactState.DistanceFalloff(float.NaN, 60, 420), Is.Zero);
            Assert.That(CameraImpactState.DistanceFalloff(-1, 60, 420), Is.Zero);
            Assert.That(CameraImpactState.DistanceFalloff(10, 50, 50), Is.EqualTo(1));
            Assert.That(CameraImpactState.DistanceFalloff(90, 50, 50), Is.Zero);
        }

        [Test] public void RejectsMissingOrNonFiniteTuning()
        {
            Assert.Throws<ArgumentNullException>(() => new CameraImpactState(null));
            tuning.ImpactCameraMaxMetres = float.NaN; Assert.Throws<ArgumentException>(() => new CameraImpactState(tuning));
            tuning.ImpactCameraMaxMetres = .3f; tuning.ImpactCameraDecayPerSecond = -1; Assert.Throws<ArgumentException>(() => new CameraImpactState(tuning));
        }
    }
}
