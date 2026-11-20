using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace SpaceDragon.Traversal
{
    /// <summary>What a playground save holds: where the hero last stood and which practice sparks were found.</summary>
    public sealed class PlaygroundSave
    {
        public const int CurrentVersion = 1;
        public int version = CurrentVersion;
        public string world = "";
        public double x, z, yaw;
        public string[] collected = Array.Empty<string>();
    }

    public enum PlaygroundSaveStatus
    {
        /// <summary>Nothing was stored yet.</summary>
        Fresh,
        Restored,
        /// <summary>Sparks were kept; the stored position was unusable so the hero starts at the spawn.</summary>
        RecoveredPosition,
        /// <summary>The stored text could not be read; play starts fresh.</summary>
        Unreadable,
        /// <summary>Written by a newer build. It is left untouched and this session never overwrites it.</summary>
        Newer,
    }

    /// <summary>
    /// Luke's Playground rules with no engine in them: a fixed-step hero, a latched jump press,
    /// practice sparks that can only ever be collected once, and a small text save. Unity reads
    /// this for drawing and feeds it input; animation and rendering never write back.
    /// Mirrors the browser slice's loop in src/game/scene.ts.
    /// </summary>
    public sealed class PlaygroundSession
    {
        public const string SaveHeader = "space-dragon.playground";

        public TraversalWorld World { get; }
        public HeroState Hero { get; private set; }
        /// <summary>The state one fixed step earlier, for interpolated drawing.</summary>
        public HeroState Previous { get; private set; }
        /// <summary>Events raised by the steps taken in the latest Advance call.</summary>
        public HeroEvent FrameEvents { get; private set; }
        /// <summary>True when the latest Advance call found a spark; the caller saves at once.</summary>
        public bool FoundSpark { get; private set; }
        /// <summary>The anchor a tether would take right now, or an empty string.</summary>
        public string CandidateAnchorId { get; private set; } = "";
        /// <summary>False after loading a save from a newer build: nothing may overwrite it.</summary>
        public bool MayWriteSave { get; private set; } = true;

        readonly TraversalTuning tuning;
        readonly HashSet<string> collected = new HashSet<string>(StringComparer.Ordinal);
        double accumulator;
        bool pendingJump;

        public PlaygroundSession(TraversalWorld world, TraversalTuning tuning = null)
        {
            World = world ?? throw new ArgumentNullException(nameof(world));
            this.tuning = tuning ?? TraversalTuning.Default;
            Place(world.spawn.x, world.spawn.z, world.spawn.yaw);
        }

        public int SparkCount => collected.Count;
        public int TotalSparks => World.sparks.Length;
        public bool IsCollected(string sparkId) => collected.Contains(sparkId);
        /// <summary>Fraction of a fixed step already elapsed; blend Previous toward Hero by this much.</summary>
        public double Alpha => Math.Max(0, Math.Min(1, accumulator / TraversalTuning.Step));

        /// <summary>A jump press seen between frames. It is delivered as a real edge on the next step.</summary>
        public void PressJump() => pendingJump = true;

        public void Place(double x, double z, double yaw, double? height = null)
        {
            Hero = HeroSimulation.Create(World, x, z, yaw, height, tuning);
            Previous = Hero;
            accumulator = 0;
            pendingJump = false;
            CandidateAnchorId = "";
            FrameEvents = HeroEvent.None;
        }

        /// <summary>Drops held motion without losing a tether or a fall, for example when pausing.</summary>
        public void Settle()
        {
            Hero = HeroSimulation.Settle(Hero);
            Previous = Hero;
            pendingJump = false;
        }

        /// <summary>
        /// Advances by real seconds in fixed steps. Movement is a world-space intent on the ground
        /// plane. Frames longer than the cap run in slow motion instead of tunnelling.
        /// </summary>
        public void Advance(double seconds, double moveX, double moveZ, bool jumpHeld, bool powerHeld)
        {
            FrameEvents = HeroEvent.None;
            FoundSpark = false;
            if (!(seconds > 0) || double.IsInfinity(seconds)) return;
            accumulator += Math.Min(seconds, TraversalTuning.MaxFrameSeconds);
            while (accumulator >= TraversalTuning.Step)
            {
                Previous = Hero;
                // Deliver a latched press as a real edge: let go for one step if still held, then press.
                bool jump = jumpHeld;
                if (pendingJump)
                {
                    if (Hero.jumpHeld) jump = false;
                    else { jump = true; pendingJump = false; }
                }
                Hero = HeroSimulation.Step(World, Hero, new HeroInput { moveX = moveX, moveZ = moveZ, jump = jump, power = powerHeld }, TraversalTuning.Step, tuning);
                FrameEvents |= Hero.events;
                if (PracticeSparks.Collect(World, Hero, collected)) FoundSpark = true;
                accumulator -= TraversalTuning.Step;
            }
            UpdateCandidate(powerHeld);
        }

        /// <summary>Offer a tether target while airborne, or on the ground while sprinting on suit power.</summary>
        void UpdateCandidate(bool powerHeld)
        {
            double planar = Math.Sqrt(Hero.vx * Hero.vx + Hero.vz * Hero.vz);
            bool aiming = Hero.mode == HeroMode.Air || (Hero.mode == HeroMode.Ground && powerHeld && planar > 3);
            if (!aiming) { CandidateAnchorId = ""; return; }
            HeroSimulation.TravelDirection(Hero, Hero.vx, Hero.vz, out double dirX, out double dirZ);
            HeroState probe = Hero;
            if (Hero.mode == HeroMode.Ground) { probe = Hero.Clone(); probe.y += 1.2; }
            string exclude = Hero.lastAnchorAge < tuning.tetherForget ? Hero.lastAnchorId : "";
            Anchor anchor = HeroSimulation.SelectAnchor(World, probe, dirX, dirZ, exclude, tuning);
            CandidateAnchorId = anchor == null ? "" : anchor.id;
        }

        /// <summary>
        /// The state worth storing, or null while the hero is somewhere a reload could not put
        /// them back (in the air, on a roof, mid-swing). Sparks are listed in level order.
        /// </summary>
        public PlaygroundSave Snapshot(PlaygroundSave lastGood = null)
        {
            var save = new PlaygroundSave { world = World.id, collected = CollectedInOrder() };
            bool grounded = Hero.mode == HeroMode.Ground && TraversalGeometry.IsStandable(World, Hero.x, Hero.z, tuning) &&
                Math.Abs(Hero.y - TraversalGeometry.SupportAt(World, Hero.x, Hero.z, 0, tuning.placeReach).height) <= 0.02;
            if (grounded) { save.x = Hero.x; save.z = Hero.z; save.yaw = Hero.yaw; }
            else if (lastGood != null && lastGood.world == World.id) { save.x = lastGood.x; save.z = lastGood.z; save.yaw = lastGood.yaw; }
            else { save.x = World.spawn.x; save.z = World.spawn.z; save.yaw = World.spawn.yaw; }
            return save;
        }

        string[] CollectedInOrder()
        {
            var ordered = new List<string>();
            foreach (var spark in World.sparks) if (collected.Contains(spark.id)) ordered.Add(spark.id);
            return ordered.ToArray();
        }

        /// <summary>Applies stored text. Unknown sparks are dropped and an unusable position falls back to the spawn.</summary>
        public PlaygroundSaveStatus Restore(string text)
        {
            collected.Clear();
            MayWriteSave = true;
            PlaygroundSave save = Decode(text, out PlaygroundSaveStatus status);
            if (status == PlaygroundSaveStatus.Newer) MayWriteSave = false;
            if (save == null || save.world != World.id)
            {
                Place(World.spawn.x, World.spawn.z, World.spawn.yaw);
                return save == null ? status : PlaygroundSaveStatus.Unreadable;
            }
            foreach (var spark in World.sparks) if (Array.IndexOf(save.collected, spark.id) >= 0) collected.Add(spark.id);
            bool usable = TraversalGeometry.Finite(save.x) && TraversalGeometry.Finite(save.z) && TraversalGeometry.Finite(save.yaw) &&
                TraversalGeometry.IsStandable(World, save.x, save.z, tuning);
            if (usable) Place(save.x, save.z, save.yaw);
            else Place(World.spawn.x, World.spawn.z, World.spawn.yaw);
            return usable ? PlaygroundSaveStatus.Restored : PlaygroundSaveStatus.RecoveredPosition;
        }

        /// <summary>Forgets every spark and returns to the spawn. The caller decides whether to store that.</summary>
        public void Reset()
        {
            collected.Clear();
            MayWriteSave = true;
            Place(World.spawn.x, World.spawn.z, World.spawn.yaw);
        }

        public static string Encode(PlaygroundSave save)
        {
            if (save == null) throw new ArgumentNullException(nameof(save));
            var text = new StringBuilder();
            text.Append(SaveHeader).Append('/').Append(save.version.ToString(CultureInfo.InvariantCulture)).Append('\n');
            text.Append("world=").Append(save.world).Append('\n');
            text.Append("x=").Append(save.x.ToString("R", CultureInfo.InvariantCulture)).Append('\n');
            text.Append("z=").Append(save.z.ToString("R", CultureInfo.InvariantCulture)).Append('\n');
            text.Append("yaw=").Append(save.yaw.ToString("R", CultureInfo.InvariantCulture)).Append('\n');
            text.Append("collected=").Append(string.Join(",", save.collected ?? Array.Empty<string>())).Append('\n');
            return text.ToString();
        }

        /// <summary>Reads stored text. Returns null with a status when there is nothing usable.</summary>
        public static PlaygroundSave Decode(string text, out PlaygroundSaveStatus status)
        {
            status = PlaygroundSaveStatus.Fresh;
            if (string.IsNullOrEmpty(text)) return null;
            status = PlaygroundSaveStatus.Unreadable;
            string[] lines = text.Replace("\r\n", "\n").Split('\n');
            string prefix = SaveHeader + "/";
            if (lines.Length == 0 || !lines[0].StartsWith(prefix, StringComparison.Ordinal)) return null;
            if (!int.TryParse(lines[0].Substring(prefix.Length), NumberStyles.None, CultureInfo.InvariantCulture, out int version) || version < 1) return null;
            if (version > PlaygroundSave.CurrentVersion) { status = PlaygroundSaveStatus.Newer; return null; }
            var save = new PlaygroundSave { version = version };
            bool hasWorld = false, hasX = false, hasZ = false, hasYaw = false;
            for (int index = 1; index < lines.Length; index++)
            {
                int split = lines[index].IndexOf('=');
                if (split <= 0) continue;
                string key = lines[index].Substring(0, split), value = lines[index].Substring(split + 1);
                switch (key)
                {
                    case "world": save.world = value; hasWorld = value.Length > 0; break;
                    case "x": hasX = Number(value, out save.x); break;
                    case "z": hasZ = Number(value, out save.z); break;
                    case "yaw": hasYaw = Number(value, out save.yaw); break;
                    case "collected": save.collected = value.Length == 0 ? Array.Empty<string>() : value.Split(','); break;
                }
            }
            if (!hasWorld) return null;
            // A damaged position still keeps the sparks: Restore falls back to the spawn.
            if (!hasX || !hasZ || !hasYaw) { save.x = double.NaN; save.z = double.NaN; save.yaw = double.NaN; }
            status = PlaygroundSaveStatus.Restored;
            return save;
        }

        static bool Number(string text, out double value) =>
            double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out value) && TraversalGeometry.Finite(value);
    }
}
