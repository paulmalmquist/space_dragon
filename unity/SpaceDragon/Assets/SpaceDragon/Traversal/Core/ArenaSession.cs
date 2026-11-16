using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace SpaceDragon.Traversal
{
    public enum ArenaSaveStatus
    {
        /// <summary>Nothing was stored yet.</summary>
        Fresh,
        Restored,
        /// <summary>The stored text could not be read or describes progress this arena cannot produce; play starts fresh.</summary>
        Unreadable,
        /// <summary>Written by a newer build. It is left untouched and this session never overwrites it.</summary>
        Newer,
    }

    /// <summary>
    /// Luke's Arena with no engine in it: fixed steps from real seconds, presses that are never
    /// lost between frames, and a small text save of stars and counters. Unity reads this for
    /// drawing and feeds it input; animation and rendering never write back. Mirrors the browser
    /// page's loop in src/game/arena/main.ts.
    /// </summary>
    public sealed class ArenaSession
    {
        public const string SaveHeader = "space-dragon.arena";
        public const int SaveVersion = 1;

        public ArenaLayout Layout { get; }
        public ArenaState State { get; private set; }
        /// <summary>The state one fixed step earlier, for interpolated drawing.</summary>
        public ArenaState Previous { get; private set; }
        /// <summary>Events raised by the steps taken in the latest Advance call.</summary>
        public ArenaEvent FrameEvents { get; private set; }
        public HeroEvent FrameHeroEvents { get; private set; }
        /// <summary>The anchor a tether would take right now, or an empty string.</summary>
        public string CandidateAnchorId { get; private set; } = "";
        /// <summary>False after loading a save from a newer build: nothing may overwrite it.</summary>
        public bool MayWriteSave { get; private set; } = true;

        double accumulator;
        int pendingJump, pendingAction, pendingPounce;

        public ArenaSession(ArenaLayout layout, ArenaProgress progress = null)
        {
            Layout = layout ?? throw new ArgumentNullException(nameof(layout));
            State = ArenaSimulation.Create(layout, progress);
            Previous = State;
        }

        /// <summary>Fraction of a fixed step already elapsed; blend Previous toward State by this much.</summary>
        public double Alpha => Math.Max(0, Math.Min(1, accumulator / TraversalTuning.Step));
        public int TotalStars => State.progress.courseStars + State.progress.ringStars + State.progress.stealthStars;
        /// <summary>True when something worth keeping happened in the latest Advance call; the caller saves at once.</summary>
        public bool ShouldSave => (FrameEvents & (ArenaEvent.Star | ArenaEvent.Pickup | ArenaEvent.Quiet | ArenaEvent.Trial | ArenaEvent.Wave)) != 0;

        /// <summary>What the one-button action would do right now.</summary>
        public ActionKind Action => ArenaSimulation.ActionFor(Layout, State, State.FindRobot(State.targetId));

        /// <summary>Presses seen between frames. Each is delivered as a real edge on a later step.</summary>
        public void PressJump() { if (pendingJump < 2) pendingJump++; }
        public void PressAction() { if (pendingAction < 2) pendingAction++; }
        public void PressPounce() { if (pendingPounce < 2) pendingPounce++; }

        /// <summary>Drops held motion and waiting presses without losing a tether or a fall, for example when pausing.</summary>
        public void Settle()
        {
            var settled = ShallowCopy(State);
            settled.hero = HeroSimulation.Settle(State.hero);
            settled.actionHeld = false; settled.pounceHeld = false;
            State = settled; Previous = settled;
            accumulator = 0;
            pendingJump = pendingAction = pendingPounce = 0;
        }

        /// <summary>
        /// Advances by real seconds in fixed steps. Movement and aim are world-space intents on the
        /// ground plane. Frames longer than the cap run in slow motion instead of tunnelling.
        /// </summary>
        public void Advance(double seconds, double moveX, double moveZ, bool jumpHeld, bool powerHeld, bool actionHeld, bool pounceHeld, double aimX, double aimZ)
        {
            FrameEvents = ArenaEvent.None;
            FrameHeroEvents = HeroEvent.None;
            if (!(seconds > 0) || double.IsInfinity(seconds)) return;
            accumulator += Math.Min(seconds, TraversalTuning.MaxFrameSeconds);
            while (accumulator >= TraversalTuning.Step)
            {
                // A latched press reaches the rules as a real edge: released for one step if still held, then pressed.
                bool jump = jumpHeld, action = actionHeld, pounce = pounceHeld;
                if (pendingJump > 0) { if (State.hero.jumpHeld) jump = false; else { jump = true; pendingJump--; } }
                if (pendingAction > 0) { if (State.actionHeld) action = false; else { action = true; pendingAction--; } }
                if (pendingPounce > 0) { if (State.pounceHeld) pounce = false; else { pounce = true; pendingPounce--; } }
                Previous = State;
                State = ArenaSimulation.Step(Layout, State, new ArenaInput
                {
                    moveX = moveX, moveZ = moveZ, jump = jump, power = powerHeld, action = action, pounce = pounce, aimX = aimX, aimZ = aimZ,
                });
                FrameEvents |= State.events;
                FrameHeroEvents |= State.hero.events;
                accumulator -= TraversalTuning.Step;
            }
            UpdateCandidate(powerHeld);
        }

        /// <summary>Offer a tether target while airborne, or on the ground while sprinting on suit power.</summary>
        void UpdateCandidate(bool powerHeld)
        {
            var hero = State.hero;
            var tuning = TraversalTuning.Default;
            double planar = Math.Sqrt(hero.vx * hero.vx + hero.vz * hero.vz);
            bool aiming = State.pounceId.Length == 0 && (hero.mode == HeroMode.Air || (hero.mode == HeroMode.Ground && powerHeld && planar > 3));
            if (!aiming) { CandidateAnchorId = ""; return; }
            HeroSimulation.TravelDirection(hero, hero.vx, hero.vz, out double dirX, out double dirZ);
            HeroState probe = hero;
            if (hero.mode == HeroMode.Ground) { probe = hero.Clone(); probe.y += 1.2; }
            string exclude = hero.lastAnchorAge < tuning.tetherForget ? hero.lastAnchorId : "";
            Anchor anchor = HeroSimulation.SelectAnchor(Layout.world, probe, dirX, dirZ, exclude, tuning);
            CandidateAnchorId = anchor == null ? "" : anchor.id;
        }

        static ArenaState ShallowCopy(ArenaState source)
        {
            // One idle step would also copy, but must not advance the world while paused.
            return new ArenaState
            {
                hero = source.hero, robots = source.robots, energy = source.energy, mercy = source.mercy, bonk = source.bonk, held = source.held,
                snareCooldown = source.snareCooldown, pounceCooldown = source.pounceCooldown, actionHeld = source.actionHeld, pounceHeld = source.pounceHeld,
                pounceId = source.pounceId, pounceTime = source.pounceTime, pounceDuration = source.pounceDuration,
                pounceFromX = source.pounceFromX, pounceFromY = source.pounceFromY, pounceFromZ = source.pounceFromZ, pounceQuiet = source.pounceQuiet,
                snareId = source.snareId, targetId = source.targetId, targetQuiet = source.targetQuiet, trial = source.trial, away = source.away,
                lap = source.lap, lapTime = source.lapTime, lapRest = source.lapRest, wave = source.wave, waveTimer = source.waveTimer,
                ringHits = source.ringHits, ringBonks = source.ringBonks, seen = source.seen, catches = source.catches, vaultTaken = source.vaultTaken,
                hideId = source.hideId, progress = source.progress, events = ArenaEvent.None,
            };
        }

        // ---------- Saving: stars and counters only, never anything about a learner ----------

        /// <summary>
        /// The text to store now, merged with what is already stored so a star earned in an earlier
        /// visit is never taken away. Returns null when nothing may be written: the stored save is
        /// from a newer build, or the progress is not something this arena can produce.
        /// </summary>
        public string SaveText(string stored)
        {
            if (!MayWriteSave || !ArenaSimulation.IsValidProgress(Layout, State.progress)) return null;
            ArenaProgress earlier = Decode(Layout, stored, out ArenaSaveStatus status);
            if (status == ArenaSaveStatus.Newer) return null;
            ArenaProgress merged = earlier == null ? State.progress.Clone() : ArenaSimulation.MergeProgress(Layout, earlier, State.progress);
            return Encode(Layout, merged);
        }

        /// <summary>Starts a fresh visit from stored text. Unusable text is ignored; a newer build's save is preserved.</summary>
        public ArenaSaveStatus Restore(string text)
        {
            ArenaProgress progress = Decode(Layout, text, out ArenaSaveStatus status);
            MayWriteSave = status != ArenaSaveStatus.Newer;
            State = ArenaSimulation.Create(Layout, progress);
            Previous = State;
            accumulator = 0;
            pendingJump = pendingAction = pendingPounce = 0;
            CandidateAnchorId = "";
            FrameEvents = ArenaEvent.None; FrameHeroEvents = HeroEvent.None;
            return status;
        }

        /// <summary>Forgets every star, on purpose. The caller keeps the earlier text as a backup before storing the result.</summary>
        public string ResetText()
        {
            if (!MayWriteSave) return null;
            State = ArenaSimulation.Create(Layout, null);
            Previous = State;
            accumulator = 0;
            return Encode(Layout, State.progress);
        }

        public static string Encode(ArenaLayout layout, ArenaProgress progress)
        {
            if (progress == null) throw new ArgumentNullException(nameof(progress));
            var text = new StringBuilder();
            text.Append(SaveHeader).Append('/').Append(SaveVersion.ToString(CultureInfo.InvariantCulture)).Append('\n');
            text.Append("world=").Append(layout.world.id).Append('\n');
            text.Append("course=").Append(string.Join(",", progress.course)).Append('\n');
            text.Append("courseStars=").Append(progress.courseStars.ToString(CultureInfo.InvariantCulture)).Append('\n');
            text.Append("courseBest=").Append(progress.courseBest.ToString("R", CultureInfo.InvariantCulture)).Append('\n');
            text.Append("ringStars=").Append(progress.ringStars.ToString(CultureInfo.InvariantCulture)).Append('\n');
            text.Append("ringBest=").Append(progress.ringBest.ToString(CultureInfo.InvariantCulture)).Append('\n');
            text.Append("stealthStars=").Append(progress.stealthStars.ToString(CultureInfo.InvariantCulture)).Append('\n');
            text.Append("quiet=").Append(progress.quiet.ToString(CultureInfo.InvariantCulture)).Append('\n');
            return text.ToString();
        }

        /// <summary>Reads stored text. Returns null with a status when there is nothing usable.</summary>
        public static ArenaProgress Decode(ArenaLayout layout, string text, out ArenaSaveStatus status)
        {
            status = ArenaSaveStatus.Fresh;
            if (string.IsNullOrEmpty(text)) return null;
            status = ArenaSaveStatus.Unreadable;
            string[] lines = text.Replace("\r\n", "\n").Split('\n');
            string prefix = SaveHeader + "/";
            if (lines.Length == 0 || !lines[0].StartsWith(prefix, StringComparison.Ordinal)) return null;
            if (!int.TryParse(lines[0].Substring(prefix.Length), NumberStyles.None, CultureInfo.InvariantCulture, out int version) || version < 1) return null;
            if (version > SaveVersion) { status = ArenaSaveStatus.Newer; return null; }
            var progress = new ArenaProgress();
            string world = "";
            var seen = new HashSet<string>(StringComparer.Ordinal);
            for (int index = 1; index < lines.Length; index++)
            {
                int split = lines[index].IndexOf('=');
                if (split <= 0) continue;
                string key = lines[index].Substring(0, split), value = lines[index].Substring(split + 1);
                if (!seen.Add(key)) return null;
                switch (key)
                {
                    case "world": world = value; break;
                    case "course": if (value.Length > 0) progress.course.AddRange(value.Split(',')); break;
                    case "courseStars": if (!Whole(value, out progress.courseStars)) return null; break;
                    case "courseBest": if (!double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out progress.courseBest)) return null; break;
                    case "ringStars": if (!Whole(value, out progress.ringStars)) return null; break;
                    case "ringBest": if (!Whole(value, out progress.ringBest)) return null; break;
                    case "stealthStars": if (!Whole(value, out progress.stealthStars)) return null; break;
                    case "quiet": if (!Whole(value, out progress.quiet)) return null; break;
                }
            }
            foreach (string required in new[] { "world", "course", "courseStars", "courseBest", "ringStars", "ringBest", "stealthStars", "quiet" })
                if (!seen.Contains(required)) return null;
            if (world != layout.world.id || !ArenaSimulation.IsValidProgress(layout, progress)) return null;
            status = ArenaSaveStatus.Restored;
            return progress;
        }

        static bool Whole(string text, out int value) => int.TryParse(text, NumberStyles.None, CultureInfo.InvariantCulture, out value);
    }
}
