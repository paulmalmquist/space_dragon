using System;
using System.Collections.Generic;

namespace SpaceDragon.Dogfight
{
    /// <summary>The one thing the HUD says about an enemy. A larger value outranks a smaller one.</summary>
    public enum TargetStatus { None = 0, Distance = 1, BreathLock = 2, Shielded = 3, Wounded = 4, Latched = 5 }

    /// <summary>One on-screen enemy, in HUD units, as the HUD already knows it.</summary>
    public readonly struct TargetLabelRequest
    {
        public readonly float X, Y, Distance;
        public readonly bool Focus, Shielded, Wounded, Latched;
        public readonly int BreathMark;
        public TargetLabelRequest(float x, float y, float distance, bool focus = false, bool shielded = false,
            bool wounded = false, bool latched = false, int breathMark = 0)
        { X = x; Y = y; Distance = distance; Focus = focus; Shielded = shielded; Wounded = wounded; Latched = latched; BreathMark = breathMark; }
    }

    /// <summary>Which words to draw for one enemy, and where. Shape cues are not decided here.</summary>
    public struct TargetLabelPlan
    {
        public bool ShowName, ShowStatus;
        public TargetStatus Status;
        /// <summary>Top edge of each text box in HUD units. Boxes are centred on the enemy's X.</summary>
        public float NameY, StatusY;
    }

    public readonly struct LabelBox
    {
        public readonly float X, Y, Width, Height;
        public LabelBox(float x, float y, float width, float height) { X = x; Y = y; Width = width; Height = height; }
        public bool Overlaps(LabelBox other) =>
            X < other.X + other.Width && other.X < X + Width && Y < other.Y + other.Height && other.Y < Y + Height;
    }

    /// <summary>
    /// Chooses the words shown beside enemies so that they never pile up. It reads nothing but
    /// positions and flags and changes no rule. Each enemy gets at most its name and ONE status,
    /// the status being the most useful thing to act on. Words that would cover words already
    /// placed are left out; the enemy's shapes (brackets, shield arc, wounded diamond) still show.
    /// </summary>
    public static class TargetLabelLayout
    {
        public const float LineHeight = 22, NameWidth = 170, NameOffset = -43;
        /// <summary>A shielded enemy's name sits above its shield arc instead of under it.</summary>
        public const float ShieldedNameOffset = -62;
        public const float ActionOffset = 48, DistanceOffset = 25, RaisedGap = 24;

        /// <summary>Latched needs a roll now; wounded invites a finisher; shielded needs the breath.</summary>
        public static TargetStatus StatusFor(TargetLabelRequest request) =>
            request.Latched ? TargetStatus.Latched :
            request.Wounded ? TargetStatus.Wounded :
            request.Shielded ? TargetStatus.Shielded :
            request.BreathMark > 0 ? TargetStatus.BreathLock :
            request.Focus ? TargetStatus.Distance : TargetStatus.None;

        /// <summary>Top edge of the name box for this enemy.</summary>
        public static float NameTop(TargetLabelRequest request) => request.Y + (request.Shielded ? ShieldedNameOffset : NameOffset);
        /// <summary>Top edge of the second place a status may go: the line above the name.</summary>
        public static float RaisedTop(TargetLabelRequest request) => NameTop(request) - RaisedGap;

        public static float WidthOf(TargetStatus status) =>
            status == TargetStatus.Wounded ? 200 : status == TargetStatus.Latched ? 170 :
            status == TargetStatus.Shielded ? 130 : status == TargetStatus.BreathLock ? 90 :
            status == TargetStatus.Distance ? 110 : 0;

        /// <summary>
        /// The enemy the pilot is working on: the one the caller already flagged (tracked or locked),
        /// otherwise the nearest to the reticle within <paramref name="aimRadius"/> HUD units.
        /// Returns -1 for none.
        /// </summary>
        public static int FocusIndex(IReadOnlyList<TargetLabelRequest> requests, float reticleX, float reticleY, float aimRadius)
        {
            if (requests == null || !Finite(aimRadius) || aimRadius < 0) return -1;
            int nearest = -1; float best = aimRadius * aimRadius;
            for (int i = 0; i < requests.Count; i++)
            {
                var r = requests[i];
                if (!Finite(r.X) || !Finite(r.Y)) continue;
                if (r.Focus) return i;
                float dx = r.X - reticleX, dy = r.Y - reticleY, squared = dx * dx + dy * dy;
                if (squared <= best) { best = squared; nearest = i; }
            }
            return nearest;
        }

        /// <summary>
        /// Fills <paramref name="plans"/> with one plan per request, in the same order.
        /// <paramref name="reserved"/> is space already taken by the reticle prompt, if it is showing.
        /// With <paramref name="wordsAllowed"/> false (the SONG comeback) no enemy text is planned.
        /// </summary>
        public static void Plan(IReadOnlyList<TargetLabelRequest> requests, List<TargetLabelPlan> plans,
            LabelBox? reserved, bool wordsAllowed, List<LabelBox> placed, List<int> order)
        {
            if (requests == null || plans == null || placed == null || order == null) throw new ArgumentNullException();
            plans.Clear(); placed.Clear(); order.Clear();
            for (int i = 0; i < requests.Count; i++) { plans.Add(default); order.Add(i); }
            if (!wordsAllowed) return;
            if (reserved.HasValue) placed.Add(reserved.Value);
            // Insertion sort: a handful of enemies, no allocation, and a stable, repeatable order.
            for (int i = 1; i < order.Count; i++)
            {
                int item = order[i], j = i - 1;
                while (j >= 0 && Before(requests[item], item, requests[order[j]], order[j])) { order[j + 1] = order[j]; j--; }
                order[j + 1] = item;
            }
            foreach (int index in order)
            {
                var request = requests[index];
                if (!Finite(request.X) || !Finite(request.Y)) continue;
                var plan = new TargetLabelPlan { Status = StatusFor(request) };
                if (plan.Status != TargetStatus.None)
                {
                    float width = WidthOf(plan.Status);
                    float below = request.Y + (plan.Status == TargetStatus.Distance ? DistanceOffset : ActionOffset);
                    if (TryPlace(placed, request.X, below, width)) { plan.ShowStatus = true; plan.StatusY = below; }
                    else if (TryPlace(placed, request.X, RaisedTop(request), width)) { plan.ShowStatus = true; plan.StatusY = RaisedTop(request); }
                }
                if (TryPlace(placed, request.X, NameTop(request), NameWidth)) { plan.ShowName = true; plan.NameY = NameTop(request); }
                plans[index] = plan;
            }
        }

        // The enemy being worked on first, then anything that needs an action, then the nearest.
        static bool Before(TargetLabelRequest a, int ai, TargetLabelRequest b, int bi)
        {
            if (a.Focus != b.Focus) return a.Focus;
            bool actA = a.Latched || a.Wounded, actB = b.Latched || b.Wounded;
            if (actA != actB) return actA;
            if (a.Latched != b.Latched) return a.Latched;
            bool finiteA = Finite(a.Distance), finiteB = Finite(b.Distance);
            if (finiteA != finiteB) return finiteA;
            if (finiteA && a.Distance != b.Distance) return a.Distance < b.Distance;
            return ai < bi;
        }

        static bool TryPlace(List<LabelBox> placed, float centreX, float top, float width)
        {
            var box = new LabelBox(centreX - width * .5f, top, width, LineHeight);
            for (int i = 0; i < placed.Count; i++) if (placed[i].Overlaps(box)) return false;
            placed.Add(box); return true;
        }
        static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
    }

    /// <summary>What the pilot is doing, as far as the HUD is concerned.</summary>
    public enum HudMode { Flight = 0, Comeback = 1, Down = 2 }

    /// <summary>The blocks the HUD draws during flight.</summary>
    public enum HudElement
    {
        Canopy, TargetShapes, TargetWords, Reticle, Header, Warning, Radar, Systems, Wingman, Missiles, Word, FlightPanel, Toast
    }

    /// <summary>
    /// Decides which HUD blocks belong on screen. It changes no rule and hides nothing during
    /// ordinary flight. While the SONG comeback prompt is up, or once the ship is down, it keeps
    /// only what still means something, so that one instruction is not buried under others that
    /// ask for actions the pilot cannot take.
    /// </summary>
    public static class HudClarity
    {
        /// <summary><paramref name="down"/> is true from the moment the ship is disabled until Restart.</summary>
        public static HudMode ModeFor(bool comebackActive, bool down) =>
            comebackActive ? HudMode.Comeback : down ? HudMode.Down : HudMode.Flight;

        public static bool Shows(HudElement element, HudMode mode, bool clarityEnabled)
        {
            if (!clarityEnabled || mode == HudMode.Flight) return true;
            switch (element)
            {
                // Passive instruments and the world stay.
                case HudElement.Canopy: case HudElement.TargetShapes: case HudElement.Header:
                case HudElement.Radar: case HudElement.Systems:
                    return true;
                // The word panel becomes the SONG prompt during a comeback. A downed ship has no use for it.
                case HudElement.Word: return mode == HudMode.Comeback;
                // A downed ship keeps its closing message. The comeback panel carries its own instruction.
                case HudElement.Toast: return mode == HudMode.Down;
                // Aiming, weapons, the wingman, flight controls, warnings and enemy text all ask for
                // actions that are not available now.
                default: return false;
            }
        }

        public static bool ShowStandardWarning(bool clarityEnabled, bool comebackActive) =>
            Shows(HudElement.Warning, ModeFor(comebackActive, false), clarityEnabled);
        public static bool ShowTargetWords(bool clarityEnabled, bool comebackActive) =>
            Shows(HudElement.TargetWords, ModeFor(comebackActive, false), clarityEnabled);
    }
}
