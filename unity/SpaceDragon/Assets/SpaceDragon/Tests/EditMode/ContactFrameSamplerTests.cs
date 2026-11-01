using NUnit.Framework;

namespace SpaceDragon.FirstContact.Tests
{
    public sealed class ContactFrameSamplerTests
    {
        [Test]
        public void MedianP95AndRealSpikesAreRetainedInTheRollingWindow()
        {
            var sampler = new ContactFrameSampler(20, 0);
            double time = 0;
            sampler.Record(time);
            for (int index = 0; index < 18; index++) { time += 0.016; sampler.Record(time); }
            time += 0.040; sampler.Record(time);
            time += 0.500; sampler.Record(time);
            var sample = sampler.Snapshot();
            Assert.That(sample.sampleCount, Is.EqualTo(20));
            Assert.That(sample.medianFrameMs, Is.EqualTo(16).Within(0.0001));
            Assert.That(sample.p95FrameMs, Is.EqualTo(40).Within(0.0001));
            Assert.That(sample.maxFrameMs, Is.EqualTo(500).Within(0.0001));
            Assert.That(sample.meanFrameMs, Is.EqualTo(41.4).Within(0.0001));
            Assert.That(sample.spikesAbove50Ms, Is.EqualTo(1));
            time += 0.010; sampler.Record(time);
            Assert.That(sampler.Snapshot().meanFrameMs, Is.EqualTo(41.1).Within(0.0001));
        }

        [Test]
        public void StartupPauseResumeAndInvalidTimestampsAreExcluded()
        {
            var sampler = new ContactFrameSampler(300, 2);
            foreach (double value in new[] { 0, 1, 2, 2.016, double.NaN, 2.016, 1, 2.034 }) sampler.Record(value);
            Assert.That(sampler.Snapshot().sampleCount, Is.EqualTo(2));
            sampler.SetPaused(true);
            sampler.Record(12);
            sampler.SetPaused(false);
            foreach (double value in new[] { 20, 21, 22, 22.020 }) sampler.Record(value);
            var sample = sampler.Snapshot();
            Assert.That(sample.sampleCount, Is.EqualTo(3));
            Assert.That(sample.maxFrameMs, Is.EqualTo(20).Within(0.0001));
            sampler.Reset();
            Assert.That(sampler.Snapshot().sampleCount, Is.Zero);
            Assert.That(sampler.Snapshot().warmupRemaining, Is.EqualTo(2));
        }
    }
}
