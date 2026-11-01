using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    /// <summary>Immutable snapshot of an adapter-selected existing asteroid.</summary>
    public readonly struct RockPocket
    {
        public string Id { get; }
        public Vector3 Position { get; }
        public bool Detonated { get; }
        public RockPocket(string id, Vector3 position) : this(id, position, false) { }
        internal RockPocket(string id, Vector3 position, bool detonated)
        { Id = id; Position = position; Detonated = detonated; }
    }

    /// <summary>One committed gas-pocket event. The adapter applies these amounts
    /// once to actual living targets; this value never applies damage or rewards.</summary>
    public readonly struct GasDetonation
    {
        public string Id { get; }
        public Vector3 Position { get; }
        public float EnemyRadius { get; }
        public float PlayerRadius { get; }
        public float EnemyDamage { get; }
        public float PlayerDamage { get; }
        internal GasDetonation(RockPocket pocket, DogfightTuning tuning)
        {
            Id = pocket.Id; Position = pocket.Position;
            EnemyRadius = tuning.GasEnemyRadius; PlayerRadius = tuning.GasPlayerRadius;
            EnemyDamage = tuning.GasEnemyDamage; PlayerDamage = tuning.GasPlayerDamage;
        }
        public bool ContainsEnemy(Vector3 position) => RocksWeaponState.Within(Position, position, EnemyRadius);
        public bool ContainsPlayer(Vector3 position) => RocksWeaponState.Within(Position, position, PlayerRadius);
    }

    /// <summary>One-shot scenery events only. Selection/count/actual asteroid positions,
    /// collider hits, visuals, damage and resource grants stay with their existing owners.
    /// No clock advances while paused and no collider or asteroid geometry is changed.</summary>
    public sealed class RocksWeaponState
    {
        readonly DogfightTuning tuning;
        readonly List<RockPocket> pockets = new List<RockPocket>();
        readonly Dictionary<string, int> indices = new Dictionary<string, int>(StringComparer.Ordinal);
        readonly HashSet<int> rockShotEvents = new HashSet<int>();
        readonly ReadOnlyCollection<RockPocket> view;
        public IReadOnlyList<RockPocket> Pockets => view;

        public RocksWeaponState(DogfightTuning tuning)
        {
            this.tuning = tuning ?? throw new ArgumentNullException(nameof(tuning));
            if (!ValidGasTuning() || !Nonnegative(tuning.RockShotNearRange))
                throw new ArgumentException("Scenery weapons require finite nonnegative radii, damage and reward range.", nameof(tuning));
            view = pockets.AsReadOnly();
        }

        /// <summary>Copy current world positions from the adapter's original rock list.
        /// Selection uses GasPocketCount in the adapter. Null means no selected pockets.
        /// Validate atomically so bad data cannot partially erase current event guards.</summary>
        public void Reset(IEnumerable<RockPocket> selected)
        {
            var next = new List<RockPocket>();
            var unique = new HashSet<string>(StringComparer.Ordinal);
            if (selected != null) foreach (var pocket in selected)
            {
                if (string.IsNullOrWhiteSpace(pocket.Id) || !Finite(pocket.Position) || !unique.Add(pocket.Id))
                    throw new ArgumentException("Gas pockets need unique nonempty IDs and finite world positions.", nameof(selected));
                next.Add(new RockPocket(pocket.Id, pocket.Position)); // Restart always clears Detonated.
            }
            pockets.Clear(); pockets.AddRange(next); indices.Clear();
            for (int i = 0; i < pockets.Count; i++) indices.Add(pockets[i].Id, i);
            rockShotEvents.Clear();
        }

        public GasDetonation? TryDetonate(string id)
        {
            if (!tuning.EnableRockWeapons || string.IsNullOrWhiteSpace(id) || !ValidGasTuning() ||
                !indices.TryGetValue(id, out int index) || pockets[index].Detonated) return null;
            RockPocket pocket = pockets[index];
            pockets[index] = new RockPocket(pocket.Id, pocket.Position, true);
            return new GasDetonation(pocket, tuning);
        }

        /// <summary>Call only on a real hostile missile/scenery impact. Every valid event
        /// ID is consumed, even when far away: moving closer to an old explosion cannot
        /// award it later. A true result authorizes one existing evasion reward.</summary>
        public bool TryRockShot(int hostileMissileId, Vector3 impact, Vector3 player)
        {
            if (!tuning.EnableRockWeapons || hostileMissileId < 0 || !Finite(impact) || !Finite(player) ||
                !Nonnegative(tuning.RockShotNearRange) || !rockShotEvents.Add(hostileMissileId)) return false;
            return Within(impact, player, tuning.RockShotNearRange);
        }

        bool ValidGasTuning() => Nonnegative(tuning.GasEnemyRadius) && Nonnegative(tuning.GasPlayerRadius) &&
            Nonnegative(tuning.GasEnemyDamage) && Nonnegative(tuning.GasPlayerDamage);
        static bool Nonnegative(float value) => FlightState.Finite(value) && value >= 0;
        static bool Finite(Vector3 value) => FlightState.Finite(value.x) && FlightState.Finite(value.y) && FlightState.Finite(value.z);
        internal static bool Within(Vector3 center, Vector3 point, float radius)
        {
            if (!Finite(center) || !Finite(point) || !Nonnegative(radius)) return false;
            double x = (double)point.x - center.x, y = (double)point.y - center.y, z = (double)point.z - center.z;
            return x * x + y * y + z * z <= (double)radius * radius;
        }
    }
}
