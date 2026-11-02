using System.Collections.Generic;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    public sealed partial class DogfightEncounter
    {
        const int GasBreathIdBase=100000;
        RocksWeaponState rockWeapons;
        readonly List<GameObject> gasRocks=new List<GameObject>();
        readonly List<GasPocketVisual> gasVisuals=new List<GasPocketVisual>();
        int rockShotCount,gasDetonations;
        float gasHissClock;
        public IReadOnlyList<RockPocket> GasPockets => rockWeapons.Pockets;

        void ResetSceneryWeapons()
        {
            foreach(var view in gasVisuals)view.Dispose();gasVisuals.Clear();gasRocks.Clear();
            var ordered=new List<GameObject>(rocks);ordered.Sort((a,b)=>a.transform.position.sqrMagnitude.CompareTo(b.transform.position.sqrMagnitude));
            var selected=new List<RockPocket>();
            int count=Mathf.Min(ordered.Count,Mathf.Clamp(tuning.GasPocketCount,3,5));
            for(int i=0;i<count;i++)
            {
                gasRocks.Add(ordered[i]);selected.Add(new RockPocket("gas-"+i,ordered[i].transform.position));
                var view=new GasPocketVisual();view.Setup(ordered[i].transform,tuning);gasVisuals.Add(view);
            }
            rockWeapons.Reset(selected);rockShotCount=gasDetonations=0;gasHissClock=0;
        }
        bool DetonateGasAt(Vector3 point)
        {
            if(!tuning.EnableRockWeapons)return false;
            for(int i=0;i<gasRocks.Count;i++)
            {
                var collider=gasRocks[i].GetComponent<Collider>();
                if(collider!=null&&(collider.ClosestPoint(point)-point).sqrMagnitude<=tuning.GasImpactTolerance*tuning.GasImpactTolerance)
                    return DetonateGas("gas-"+i);
            }
            return false;
        }
        bool DetonateGas(string id)
        {
            var result=rockWeapons.TryDetonate(id);if(!result.HasValue)return false;
            var gas=result.Value;gasDetonations++;
            foreach(var enemy in enemies)if(!enemy.Dead&&gas.ContainsEnemy(enemy.Position))
                DamageEnemy(enemy,gas.EnemyDamage,WeaponKind.Environment,gas.Position);
            if(gas.ContainsPlayer(Flight.Position))HitPlayer(DragonSystem.Hull,gas.PlayerDamage,gas.Position);
            damageVfx.Burst(gas.Position,48);sound.PlayExplosion();Message("GAS POCKET — blast radius! Asteroid remains solid.");return true;
        }
        void MissileRockImpact(MissileView missile,Vector3 point)
        {
            bool rewarded=missile.Hostile&&rockWeapons.TryRockShot(missile.Id,point,Flight.Position);
            bool gasHit=DetonateGasAt(point);
            if(rewarded)
            {rockShotCount++;Flight.AddEvasion(tuning.RockShotEvasionReward);damageVfx.Burst(point,48);sound.PlayExplosion();Message(gasHit?"ROCK SHOT! Gas pocket detonated — evasion restored":"ROCK SHOT! Evasion restored");}
        }
        void TickSceneryWeapons(float dt)
        {
            gasHissClock-=dt;bool near=false;
            for(int i=0;i<gasVisuals.Count;i++)
            {
                var gas=rockWeapons.Pockets[i];gasVisuals[i].Tick(gas.Detonated,elapsed,ReducedMotion);
                near|=tuning.EnableRockWeapons&&!gas.Detonated&&Vector3.Distance(Flight.Position,gas.Position)<tuning.GasHissRange;
            }
            if(near&&gasHissClock<=0){sound.PlayGasHiss(tuning.GasHissGain);gasHissClock=tuning.GasHissInterval;}
        }
        void AddGasBreathCandidates()
        {
            if(!tuning.EnableRockWeapons)return;
            for(int i=0;i<rockWeapons.Pockets.Count;i++)
            {
                var gas=rockWeapons.Pockets[i];Vector3 screen=gameCamera.WorldToViewportPoint(gas.Position);
                float error=Vector2.Distance(new Vector2(screen.x*2-1,screen.y*2-1),aim);
                // Its own collider must be the first surface; other rocks still occlude it.
                bool visible=screen.z>0&&Physics.Linecast(Muzzle,gas.Position,out RaycastHit hit,EnvironmentMask)&&hit.collider.gameObject==gasRocks[i];
                breathCandidates.Add(new BreathCandidate(GasBreathIdBase+i,Vector3.Distance(Flight.Position,gas.Position),error,visible,gas.Detonated));
            }
        }
        bool SceneryQaFixture(string action)
        {
#if DEVELOPMENT_BUILD || UNITY_EDITOR
            if(action=="gas")
            {
                fixtureQuiet=true;fixtureTarget=false;ClearProjectiles();SpawnWave(new[]{EnemyRole.Fighter});
                gasRocks[0].transform.position=Flight.Position+Flight.Forward*90;
                var pockets=new List<RockPocket>();for(int i=0;i<gasRocks.Count;i++)pockets.Add(new RockPocket("gas-"+i,gasRocks[i].transform.position));
                rockWeapons.Reset(pockets);MouseAimMode=true;aim=Vector2.zero;pointerActive=false;return true;
            }
            if(action=="rockshot")
            {
                fixtureQuiet=true;ClearProjectiles();
                // Keep this condition a solid, non-gas interception; gas has its own fixture.
                var solid=rocks.FindLast(rock=>!gasRocks.Contains(rock));
                if(solid==null)return false;
                solid.transform.position=Flight.Position+Flight.Forward*70;
                AddMissile(Flight.Position+Flight.Forward*140,-Flight.Forward,"dragon",true);return true;
            }
#endif
            return false;
        }
    }
}
