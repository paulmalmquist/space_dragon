using System.Collections.Generic;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    // Adapter hooks for SD-088. State classes own rules; these hooks supply scene facts.
    public sealed partial class DogfightEncounter
    {
        PerfectRollState perfectRoll;
        CombatFeedbackVfx combatFeedback;
        readonly List<PerfectRollThreat> rollThreats = new List<PerfectRollThreat>();
        int projectileSequence;
        string qaCondition = "natural";
        public float CurrentCombatTimeScale => !ReducedMotion && perfectRoll != null && perfectRoll.SlowRemaining > 0
            ? Mathf.Clamp01(tuning.PerfectRollTimeScale) : 1f;
        public string CombatFlags => $"perfectRoll={tuning.EnablePerfectRoll};enemyRoles={tuning.EnableEnemyRoles};clawFinisher={tuning.EnableClawFinisher};wingman={tuning.EnableWingman};rockWeapons={tuning.EnableRockWeapons};multiTargetBreath={tuning.EnableMultiTargetBreath};repairCode={tuning.EnableRepairCode};comeback={tuning.EnableComeback}";

        void InitializeCombatUpgrades()
        {
            perfectRoll = new PerfectRollState(tuning);
            combatFeedback = gameObject.AddComponent<CombatFeedbackVfx>();
            combatFeedback.Setup(visualMotion,tuning);
        }
        void ResetCombatUpgrades()
        {
            perfectRoll.Reset(); combatFeedback.Clear(); projectileSequence = 0; qaCondition = "natural";
        }
        float CombatDelta(float realDt)
        {
            float scaled = realDt;
            if (!ReducedMotion && perfectRoll.SlowRemaining > 0)
            {
                float slowPart = Mathf.Min(realDt,perfectRoll.SlowRemaining);
                scaled = slowPart * CurrentCombatTimeScale + realDt - slowPart;
            }
            perfectRoll.Tick(realDt);
            return scaled;
        }
        void RequestCombatRoll(int direction)
        {
            rollThreats.Clear();
            foreach (var bolt in bolts) if (bolt.Hostile)
                rollThreats.Add(new PerfectRollThreat(bolt.Id,bolt.Position,bolt.Velocity,bolt.Life));
            foreach (var missile in missiles) if (missile.Hostile && missile.Seeker && missile.State.Alive)
                rollThreats.Add(new PerfectRollThreat(missile.Id,missile.State.Position,missile.State.Velocity,
                    tuning.MissileLifetimeSeconds-missile.State.Age));
            int before = perfectRoll.Serial;
            if (!perfectRoll.TryRoll(Flight,direction,rollThreats)) return;
            if (perfectRoll.Serial != before)
            {
                combatFeedback.PerfectRoll(); sound.PlayPerfectRoll(); Message("PERFECT ROLL — evasion restored");
            }
        }

        bool CombatQaFixture(string action)
        {
#if DEVELOPMENT_BUILD || UNITY_EDITOR
            if (action == "upgrades:off" || action == "upgrades:on")
            {
                bool enabled = action.EndsWith(":on");
                tuning.EnablePerfectRoll=tuning.EnableEnemyRoles=tuning.EnableClawFinisher=tuning.EnableWingman=
                    tuning.EnableRockWeapons=tuning.EnableMultiTargetBreath=tuning.EnableRepairCode=tuning.EnableComeback=enabled;
                RestartEncounter(); qaCondition=action; return true;
            }
            if (action == "perfect:bolt" || action == "perfect:early" || action == "perfect:missile")
            {
                fixtureQuiet=true; ClearProjectiles();
                float seconds=action=="perfect:early"?tuning.PerfectRollWindow*3:tuning.PerfectRollWindow*.85f;
                float speed=action=="perfect:missile"?tuning.MissileSpeed:210f;
                Vector3 origin=Flight.Position+Flight.Forward*(speed+Flight.Speed)*seconds;
                if(action=="perfect:missile")AddMissile(origin,-Flight.Forward,"dragon",true);
                else SpawnBolt(origin,-Flight.Forward*speed,true,18);
                return true;
            }
#endif
            return false;
        }
    }
}
