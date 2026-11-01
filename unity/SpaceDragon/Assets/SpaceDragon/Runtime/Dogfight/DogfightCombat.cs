using System.Collections.Generic;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    // Adapter hooks for SD-088. State classes own rules; these hooks supply scene facts.
    public sealed partial class DogfightEncounter
    {
        PerfectRollState perfectRoll;
        CombatFeedbackVfx combatFeedback;
        ClawFinisherState finisher;
        FinisherFeedbackVfx finisherFeedback;
        WingmanState wingman;
        WingmanVisual wingmanVisual;
        readonly List<WingmanCandidate> wingmanCandidates=new List<WingmanCandidate>();
        readonly List<Vector3> breathBeamEnds=new List<Vector3>();
        public WingmanState Wingman => wingman;
        readonly List<PerfectRollThreat> rollThreats = new List<PerfectRollThreat>();
        int projectileSequence;
        WaveState waveState;
        int enemySequence;
        public bool HasGrappler { get { foreach(var e in enemies)if(!e.Dead&&e.Combat.Latched)return true;return false; } }
        string qaCondition = "natural";
        float independentBankInput;
        public float CurrentCombatTimeScale => !ReducedMotion && perfectRoll != null && perfectRoll.SlowRemaining > 0
            ? Mathf.Clamp01(tuning.PerfectRollTimeScale) : 1f;
        public string CombatFlags => $"perfectRoll={tuning.EnablePerfectRoll};enemyRoles={tuning.EnableEnemyRoles};clawFinisher={tuning.EnableClawFinisher};wingman={tuning.EnableWingman};rockWeapons={tuning.EnableRockWeapons};multiTargetBreath={tuning.EnableMultiTargetBreath};repairCode={tuning.EnableRepairCode};comeback={tuning.EnableComeback};independentBank={tuning.EnableIndependentBank}";

        void InitializeCombatUpgrades()
        {
            perfectRoll = new PerfectRollState(tuning);
            rockWeapons=new RocksWeaponState(tuning);
            repairCode=new RepairCodeState(tuning);
            comeback=new ComebackState(tuning);
            finisher = new ClawFinisherState(tuning);
            finisherFeedback = gameObject.AddComponent<FinisherFeedbackVfx>();finisherFeedback.Setup(visualMotion,tuning);
            waveState = new WaveState(tuning);
            wingman=new WingmanState(tuning);wingmanVisual=new WingmanVisual();wingmanVisual.Setup(tuning);
            combatFeedback = gameObject.AddComponent<CombatFeedbackVfx>();
            combatFeedback.Setup(visualMotion,tuning);
        }
        void ResetCombatUpgrades()
        {
            perfectRoll.Reset(); combatFeedback.Clear(); projectileSequence = 0; qaCondition = "natural";
            independentBankInput=0;
            finisher.Reset();finisherFeedback.Clear();
            repairCode.Reset();
            comeback.Reset();disabledHandled=false;comebackSuccessObserved=0;
            waveState.Reset();enemySequence=0;
            Breath.SetCapacity(tuning.EnableMultiTargetBreath?Mathf.Max(1,tuning.BreathTargetCapacity):1);
            wingman.Reset();wingmanVisual.Clear();
        }
        float CombatDelta(float realDt)
        {
            float frozen=!ReducedMotion?Mathf.Min(realDt,finisher.FreezeRemaining):0;
            finisher.Tick(realDt);
            realDt-=frozen;
            float scaled = realDt;
            if (!ReducedMotion && perfectRoll.SlowRemaining > 0)
            {
                float slowPart = Mathf.Min(realDt,perfectRoll.SlowRemaining);
                scaled = slowPart * CurrentCombatTimeScale + realDt - slowPart;
            }
            perfectRoll.Tick(realDt);
            return scaled;
        }

        void TryFinishers()
        {
            foreach(var enemy in enemies)
            {
                if(!finisher.TryFinish(enemy.Id,!enemy.Dead,enemy.Combat.ShieldIntact,enemy.Health,enemy.Combat.MaximumHealth,
                    Flight.Position,Flight.Forward,enemy.Position,Flight.Boosting,ReducedMotion))continue;
                DamageEnemy(enemy,enemy.Health,WeaponKind.Finisher);
                Flight.RefillBoost();Flight.AddEvasion(tuning.FinisherEvasionReward);
                finisherFeedback.Trigger(enemy.Position);sound.PlayHit();sound.PlayExplosion();
                Message("CLAW FINISH — boost full, evasion restored");
                break;
            }
        }

        void SendWingman()
        {
            wingmanCandidates.Clear();foreach(var e in enemies)wingmanCandidates.Add(new WingmanCandidate(e.Id,e.Position,!e.Dead));
            string target=WingmanState.SelectTarget(Tactics.LockedTargetId,wingmanCandidates,Flight.Position);
            if(wingman.TrySend(target)){sound.PlayLaunch();Message("WINGMAN — strafing run (lab placeholder)");}
            else Message(string.IsNullOrEmpty(target)?"No wingman target":"Wingman recharging");
        }
        void TickWingman(float dt)
        {
            var target=enemies.Find(e=>e.Id==wingman.TargetId&&!e.Dead);
            var hit=wingman.Tick(dt,target!=null);
            if(hit.HasValue&&target!=null&&!Blocked(Flight.Position,target.Position))
                DamageEnemy(target,hit.Value.Damage,WeaponKind.Wingman);
            float tracking=0;foreach(var enemy in enemies)if(!enemy.Dead)tracking=Mathf.Max(tracking,enemy.TargetProgress);
            if(wingman.ObserveTracking(tracking,dt)){Message("WINGMAN: On your tail!");sound.PlayLockStart();}
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
            foreach(var enemy in enemies)if(enemy.Combat.ShakeOff()){Message("Grappler shaken off — stunned");enemy.Pilot.BreakLock();}
            if (perfectRoll.Serial != before)
            {
                combatFeedback.PerfectRoll(); sound.PlayPerfectRoll(); Message("PERFECT ROLL — evasion restored");
            }
        }

        void SpawnWave(EnemyRole[] specifiedRoles=null)
        {
            foreach(var enemy in enemies){enemy.RoleVisual?.Dispose();Destroy(enemy.Visual.gameObject);}
            enemies.Clear();
            var roles=specifiedRoles??waveState.CurrentRoles;
            for(int i=0;i<roles.Length;i++)
            {
                var obj=dronePrefab!=null?Instantiate(dronePrefab):GameObject.CreatePrimitive(PrimitiveType.Cube);
                obj.name="LAB PLACEHOLDER "+roles[i]+" "+(enemySequence+1);obj.transform.localScale=Vector3.one*3;
                foreach(var collider in obj.GetComponentsInChildren<Collider>())Destroy(collider);
                var state=new EnemyRoleState(roles[i],tuning);
                var pilot=new RolePilotState(i,state,tuning);pilot.Reset(Flight.Position);
                var view=new EnemyView{Id="wraith-"+enemySequence,CombatId=enemySequence++,Combat=state,
                    Pilot=pilot.Pilot,RolePilot=pilot,Position=pilot.Position,Visual=obj.transform};
                view.Visual.SetPositionAndRotation(view.Position,pilot.Rotation*Quaternion.Euler(0,180,0));
                view.RoleVisual=new EnemyRoleVisual();view.RoleVisual.Setup(view.Visual,state.Role,tuning);
                enemies.Add(view);
            }
            if(tuning.EnableEnemyRoles)
            {
                var role=roles[roles.Length-1];if(waveState.Index==waveState.Count-1)role=roles[0];
                Message("WAVE "+(waveState.Index+1)+" / "+waveState.Count+" — "+enemies.Find(e=>e.Combat.Role==role).Combat.Hint);
                sound.PlayEnemyRole(role);
            }
        }

        bool CombatQaFixture(string action)
        {
#if DEVELOPMENT_BUILD || UNITY_EDITOR
            if(action=="comeback"){fixtureQuiet=true;ClearProjectiles();HitPlayer(DragonSystem.Hull,tuning.MaxSystemHealth,Flight.Position);return true;}
            if(action=="multi"||action=="wave:targets")
            {
                fixtureQuiet=true;fixtureTarget=false;fixtureWaveTargets=true;ClearProjectiles();MouseAimMode=true;aim=Vector2.zero;pointerActive=false;
                if(action=="multi")SpawnWave(new[]{EnemyRole.Fighter,EnemyRole.Fighter,EnemyRole.Fighter});
                return true;
            }
            if(SceneryQaFixture(action))return true;
            if(action=="finisher")
            {
                fixtureQuiet=fixtureTarget=true;SpawnWave(new[]{EnemyRole.Fighter});ClearProjectiles();
                enemies[0].Combat.ApplyDamage(WeaponKind.Environment,enemies[0].Health*(1-tuning.FinisherHealthFraction*.8f));
                return true;
            }
            if(action.StartsWith("role:"))
            {
                if(System.Enum.TryParse<EnemyRole>(action.Substring(5),out var role))
                {fixtureQuiet=true;fixtureTarget=role!=EnemyRole.Grappler;SpawnWave(new[]{role});ClearProjectiles();MouseAimMode=true;aim=Vector2.zero;pointerActive=false;}
                return true;
            }
            if (action == "upgrades:off" || action == "upgrades:on")
            {
                bool enabled = action.EndsWith(":on");
                tuning.EnablePerfectRoll=tuning.EnableEnemyRoles=tuning.EnableClawFinisher=tuning.EnableWingman=
                    tuning.EnableRockWeapons=tuning.EnableMultiTargetBreath=tuning.EnableRepairCode=tuning.EnableComeback=enabled;
                tuning.EnableIndependentBank=enabled;
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
