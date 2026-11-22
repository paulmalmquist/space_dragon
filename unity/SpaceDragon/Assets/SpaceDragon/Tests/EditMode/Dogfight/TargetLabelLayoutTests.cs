using System;
using System.Collections.Generic;
using NUnit.Framework;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class TargetLabelLayoutTests
    {
        readonly List<TargetLabelPlan> plans = new List<TargetLabelPlan>();
        readonly List<LabelBox> placed = new List<LabelBox>();
        readonly List<int> order = new List<int>();

        List<TargetLabelPlan> Plan(List<TargetLabelRequest> requests, LabelBox? reserved = null, bool words = true)
        { TargetLabelLayout.Plan(requests, plans, reserved, words, placed, order); return plans; }

        static List<LabelBox> BoxesOf(List<TargetLabelRequest> requests, List<TargetLabelPlan> result)
        {
            var boxes = new List<LabelBox>();
            for (int i = 0; i < requests.Count; i++)
            {
                if (result[i].ShowName) boxes.Add(new LabelBox(requests[i].X - TargetLabelLayout.NameWidth * .5f, result[i].NameY, TargetLabelLayout.NameWidth, TargetLabelLayout.LineHeight));
                if (result[i].ShowStatus) { float w = TargetLabelLayout.WidthOf(result[i].Status); boxes.Add(new LabelBox(requests[i].X - w * .5f, result[i].StatusY, w, TargetLabelLayout.LineHeight)); }
            }
            return boxes;
        }
        static void AssertNoOverlap(List<LabelBox> boxes, LabelBox? reserved = null)
        {
            if (reserved.HasValue) boxes.Add(reserved.Value);
            for (int a = 0; a < boxes.Count; a++) for (int b = a + 1; b < boxes.Count; b++)
                Assert.That(boxes[a].Overlaps(boxes[b]), Is.False, "Two HUD texts must never cover each other.");
        }

        [Test] public void StatusIsTheMostUsefulSingleFact()
        {
            Assert.That(TargetLabelLayout.StatusFor(new TargetLabelRequest(0, 0, 100, focus: true, shielded: true, wounded: true, latched: true, breathMark: 2)), Is.EqualTo(TargetStatus.Latched));
            Assert.That(TargetLabelLayout.StatusFor(new TargetLabelRequest(0, 0, 100, focus: true, shielded: true, wounded: true, breathMark: 2)), Is.EqualTo(TargetStatus.Wounded));
            Assert.That(TargetLabelLayout.StatusFor(new TargetLabelRequest(0, 0, 100, focus: true, shielded: true, breathMark: 2)), Is.EqualTo(TargetStatus.Shielded));
            Assert.That(TargetLabelLayout.StatusFor(new TargetLabelRequest(0, 0, 100, focus: true, breathMark: 2)), Is.EqualTo(TargetStatus.BreathLock));
            Assert.That(TargetLabelLayout.StatusFor(new TargetLabelRequest(0, 0, 100, focus: true)), Is.EqualTo(TargetStatus.Distance));
            Assert.That(TargetLabelLayout.StatusFor(new TargetLabelRequest(0, 0, 100)), Is.EqualTo(TargetStatus.None), "Distance is shown only for the enemy being worked on.");
        }

        [Test] public void LoneEnemyShowsItsNameAndOneStatusBelow()
        {
            var requests = new List<TargetLabelRequest> { new TargetLabelRequest(600, 400, 250, focus: true, wounded: true, latched: true) };
            var plan = Plan(requests)[0];
            Assert.That(plan.ShowName, Is.True); Assert.That(plan.NameY, Is.EqualTo(400 + TargetLabelLayout.NameOffset));
            Assert.That(plan.ShowStatus, Is.True); Assert.That(plan.Status, Is.EqualTo(TargetStatus.Latched));
            Assert.That(plan.StatusY, Is.EqualTo(400 + TargetLabelLayout.ActionOffset), "Latched and wounded no longer share one rectangle: only one is chosen.");
            AssertNoOverlap(BoxesOf(requests, plans));
        }

        [Test] public void ShieldedNameSitsAboveTheShieldArc()
        {
            var requests = new List<TargetLabelRequest> { new TargetLabelRequest(600, 400, 250, shielded: true) };
            var plan = Plan(requests)[0];
            // The shield arc has radius 36 about the enemy, so its top is at Y - 36.
            Assert.That(plan.ShowName, Is.True); Assert.That(plan.NameY + TargetLabelLayout.LineHeight, Is.LessThanOrEqualTo(400 - 36 - 3));
            Assert.That(plan.Status, Is.EqualTo(TargetStatus.Shielded)); Assert.That(plan.StatusY, Is.EqualTo(400 + TargetLabelLayout.ActionOffset));
        }

        [Test] public void DistanceSitsCloserThanAnActionLine()
        {
            var requests = new List<TargetLabelRequest> { new TargetLabelRequest(600, 400, 250, focus: true) };
            var plan = Plan(requests)[0];
            Assert.That(plan.Status, Is.EqualTo(TargetStatus.Distance)); Assert.That(plan.StatusY, Is.EqualTo(400 + TargetLabelLayout.DistanceOffset));
        }

        [Test] public void EnemiesFarApartAllKeepTheirWords()
        {
            var requests = new List<TargetLabelRequest> {
                new TargetLabelRequest(200, 300, 400, shielded: true), new TargetLabelRequest(700, 300, 300, focus: true), new TargetLabelRequest(1200, 500, 500, wounded: true) };
            Plan(requests);
            for (int i = 0; i < 3; i++) Assert.That(plans[i].ShowName, Is.True);
            Assert.That(plans[0].Status, Is.EqualTo(TargetStatus.Shielded)); Assert.That(plans[0].ShowStatus, Is.True);
            Assert.That(plans[1].Status, Is.EqualTo(TargetStatus.Distance)); Assert.That(plans[2].Status, Is.EqualTo(TargetStatus.Wounded));
            AssertNoOverlap(BoxesOf(requests, plans));
        }

        [Test] public void StackedEnemiesNeverOverlapAndTheFocusKeepsItsWords()
        {
            var requests = new List<TargetLabelRequest> {
                new TargetLabelRequest(640, 380, 420, shielded: true),
                new TargetLabelRequest(650, 384, 300, focus: true, wounded: true),
                new TargetLabelRequest(655, 376, 350) };
            Plan(requests);
            Assert.That(plans[1].ShowName, Is.True, "The enemy being worked on is placed first.");
            Assert.That(plans[1].ShowStatus, Is.True); Assert.That(plans[1].Status, Is.EqualTo(TargetStatus.Wounded));
            Assert.That(plans[1].StatusY, Is.EqualTo(384 + TargetLabelLayout.ActionOffset));
            Assert.That(plans[2].ShowName, Is.False, "A third name in the same place would cover the first.");
            AssertNoOverlap(BoxesOf(requests, plans));
            int shown = 0; foreach (var p in plans) { if (p.ShowName) shown++; if (p.ShowStatus) shown++; }
            Assert.That(shown, Is.LessThan(6), "Crowding removes words instead of stacking them.");
        }

        [Test] public void ACoveredStatusMovesAboveBeforeItIsDropped()
        {
            var requests = new List<TargetLabelRequest> {
                new TargetLabelRequest(640, 400, 200, focus: true, wounded: true),
                new TargetLabelRequest(644, 402, 300, shielded: true) };
            Plan(requests);
            Assert.That(plans[0].StatusY, Is.EqualTo(400 + TargetLabelLayout.ActionOffset));
            Assert.That(plans[1].ShowStatus, Is.True, "The shield note still fits above.");
            Assert.That(plans[1].StatusY, Is.EqualTo(TargetLabelLayout.RaisedTop(requests[1])));
            AssertNoOverlap(BoxesOf(requests, plans));
        }

        [Test] public void ReticlePromptSpaceIsNeverCovered()
        {
            // The reticle prompt sits just below the reticle, which is on the enemy being locked.
            var reserved = new LabelBox(640 - 85, 400 + 38, 170, 24);
            var requests = new List<TargetLabelRequest> { new TargetLabelRequest(640, 400, 200, focus: true, wounded: true) };
            Plan(requests, reserved);
            Assert.That(plans[0].ShowStatus, Is.True, "The action cue moves above rather than disappearing.");
            Assert.That(plans[0].StatusY, Is.EqualTo(TargetLabelLayout.RaisedTop(requests[0])));
            Assert.That(TargetLabelLayout.RaisedTop(requests[0]), Is.LessThan(TargetLabelLayout.NameTop(requests[0])), "Raised means above the name.");
            Assert.That(plans[0].ShowName, Is.True);
            AssertNoOverlap(BoxesOf(requests, plans), reserved);
        }

        [Test] public void ActionCuesOutrankNearerQuietEnemies()
        {
            var requests = new List<TargetLabelRequest> {
                new TargetLabelRequest(640, 400, 100),                 // nearest, nothing to do
                new TargetLabelRequest(642, 401, 500, latched: true) };  // far, but needs a roll
            Plan(requests);
            Assert.That(plans[1].ShowStatus, Is.True); Assert.That(plans[1].Status, Is.EqualTo(TargetStatus.Latched));
            Assert.That(plans[1].ShowName, Is.True); Assert.That(plans[0].ShowName, Is.False);
        }

        [Test] public void NoWordsAtAllDuringTheComebackPrompt()
        {
            var requests = new List<TargetLabelRequest> { new TargetLabelRequest(100, 100, 50, focus: true, latched: true), new TargetLabelRequest(900, 500, 80, wounded: true) };
            Plan(requests, null, words: false);
            Assert.That(plans.Count, Is.EqualTo(2));
            foreach (var p in plans) { Assert.That(p.ShowName, Is.False); Assert.That(p.ShowStatus, Is.False); }
            Assert.That(HudClarity.ShowTargetWords(true, true), Is.False); Assert.That(HudClarity.ShowStandardWarning(true, true), Is.False);
            Assert.That(HudClarity.ShowTargetWords(true, false), Is.True); Assert.That(HudClarity.ShowStandardWarning(true, false), Is.True);
            Assert.That(HudClarity.ShowTargetWords(false, true), Is.True, "With the switch off the HUD behaves as before.");
            Assert.That(HudClarity.ShowStandardWarning(false, true), Is.True);
        }

        [Test] public void OrdinaryFlightAndTheSwitchedOffHudShowEverything()
        {
            foreach (HudElement element in Enum.GetValues(typeof(HudElement)))
            {
                Assert.That(HudClarity.Shows(element, HudMode.Flight, true), Is.True, element.ToString());
                foreach (HudMode mode in Enum.GetValues(typeof(HudMode)))
                    Assert.That(HudClarity.Shows(element, mode, false), Is.True, "Switched off, the HUD draws as it did before: " + element + " in " + mode);
            }
        }

        [Test] public void ComebackKeepsThePromptAndDropsEverythingThatAsksForAnotherAction()
        {
            Assert.That(HudClarity.ModeFor(true, false), Is.EqualTo(HudMode.Comeback));
            Assert.That(HudClarity.ModeFor(true, true), Is.EqualTo(HudMode.Comeback), "The comeback is not a crash yet.");
            Assert.That(HudClarity.Shows(HudElement.Word, HudMode.Comeback, true), Is.True, "The SONG prompt is drawn by the word panel.");
            foreach (var hidden in new[] { HudElement.Warning, HudElement.Reticle, HudElement.TargetWords, HudElement.Missiles, HudElement.Wingman, HudElement.FlightPanel, HudElement.Toast })
                Assert.That(HudClarity.Shows(hidden, HudMode.Comeback, true), Is.False, hidden.ToString());
            foreach (var kept in new[] { HudElement.Canopy, HudElement.TargetShapes, HudElement.Header, HudElement.Radar, HudElement.Systems })
                Assert.That(HudClarity.Shows(kept, HudMode.Comeback, true), Is.True, kept.ToString());
        }

        [Test] public void CrashKeepsItsClosingMessageAndDropsWarningsAndPrompts()
        {
            Assert.That(HudClarity.ModeFor(false, true), Is.EqualTo(HudMode.Crashing));
            Assert.That(HudClarity.ModeFor(false, false), Is.EqualTo(HudMode.Flight));
            Assert.That(HudClarity.Shows(HudElement.Toast, HudMode.Crashing, true), Is.True);
            foreach (var hidden in new[] { HudElement.Warning, HudElement.Reticle, HudElement.TargetWords, HudElement.Missiles, HudElement.Wingman, HudElement.FlightPanel, HudElement.Word })
                Assert.That(HudClarity.Shows(hidden, HudMode.Crashing, true), Is.False, hidden.ToString());
        }

        [Test] public void ManyEnemiesInOnePlaceStayReadableAndRepeatable()
        {
            var requests = new List<TargetLabelRequest>();
            for (int i = 0; i < 12; i++) requests.Add(new TargetLabelRequest(600 + i * 7, 380 + (i % 3) * 9, 200 + i * 13, focus: i == 5, shielded: i % 4 == 0, wounded: i % 5 == 1, latched: i == 9, breathMark: i % 3));
            Plan(requests);
            AssertNoOverlap(BoxesOf(requests, plans));
            Assert.That(plans[5].ShowName && plans[5].ShowStatus, Is.True);
            var first = new List<TargetLabelPlan>(plans);
            Plan(requests);
            for (int i = 0; i < first.Count; i++)
            {
                Assert.That(plans[i].ShowName, Is.EqualTo(first[i].ShowName)); Assert.That(plans[i].ShowStatus, Is.EqualTo(first[i].ShowStatus));
                Assert.That(plans[i].StatusY, Is.EqualTo(first[i].StatusY)); Assert.That(plans[i].Status, Is.EqualTo(first[i].Status));
            }
        }

        [Test] public void EqualEnemiesAreOrderedByTheirPositionInTheList()
        {
            var requests = new List<TargetLabelRequest> { new TargetLabelRequest(640, 400, 300), new TargetLabelRequest(640, 400, 300) };
            Plan(requests);
            Assert.That(plans[0].ShowName, Is.True); Assert.That(plans[1].ShowName, Is.False);
        }

        [Test] public void NonFinitePositionsGetNoWordsAndDoNotBlockOthers()
        {
            var requests = new List<TargetLabelRequest> { new TargetLabelRequest(float.NaN, 400, 10, focus: true, latched: true), new TargetLabelRequest(640, 400, 300, wounded: true) };
            Plan(requests);
            Assert.That(plans[0].ShowName || plans[0].ShowStatus, Is.False);
            Assert.That(plans[1].ShowName && plans[1].ShowStatus, Is.True);
        }

        [Test] public void FocusIsTheFlaggedEnemyElseTheOneNearestTheReticle()
        {
            var requests = new List<TargetLabelRequest> { new TargetLabelRequest(100, 100, 50), new TargetLabelRequest(700, 420, 300), new TargetLabelRequest(660, 400, 500) };
            Assert.That(TargetLabelLayout.FocusIndex(requests, 640, 400), Is.EqualTo(2), "Nearest on screen, not nearest in space.");
            Assert.That(TargetLabelLayout.FocusIndex(requests, 1300, 50), Is.EqualTo(-1), "Nothing near the reticle means no focus.");
            requests[0] = new TargetLabelRequest(100, 100, 50, focus: true);
            Assert.That(TargetLabelLayout.FocusIndex(requests, 640, 400), Is.EqualTo(0), "A tracked or locked enemy wins.");
            Assert.That(TargetLabelLayout.FocusIndex(null, 0, 0), Is.EqualTo(-1));
            Assert.That(TargetLabelLayout.FocusIndex(new List<TargetLabelRequest>(), 0, 0), Is.EqualTo(-1));
        }

        [Test] public void BoxesTouchingEdgeToEdgeDoNotCountAsOverlapping()
        {
            Assert.That(new LabelBox(0, 0, 10, 10).Overlaps(new LabelBox(10, 0, 10, 10)), Is.False);
            Assert.That(new LabelBox(0, 0, 10, 10).Overlaps(new LabelBox(0, 10, 10, 10)), Is.False);
            Assert.That(new LabelBox(0, 0, 10, 10).Overlaps(new LabelBox(9.9f, 9.9f, 10, 10)), Is.True);
            Assert.That(new LabelBox(0, 0, 10, 10).Overlaps(new LabelBox(2, 2, 3, 3)), Is.True);
        }

        [Test] public void MissingListsAreRejected()
        {
            Assert.Throws<ArgumentNullException>(() => TargetLabelLayout.Plan(null, plans, null, true, placed, order));
            Assert.Throws<ArgumentNullException>(() => TargetLabelLayout.Plan(new List<TargetLabelRequest>(), null, null, true, placed, order));
        }
    }
}
