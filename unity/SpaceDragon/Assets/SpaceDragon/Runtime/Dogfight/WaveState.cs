using System;

namespace SpaceDragon.Dogfight
{
    /// <summary>Current wave and inter-wave time only; the adapter supplies living-enemy facts.</summary>
    public sealed class WaveState
    {
        readonly DogfightTuning tuning;
        EnemyWaveDefinition[] waves;
        float delay;
        public int Index { get; private set; }
        public int Count => waves.Length;
        public bool Won { get; private set; }
        public EnemyRole[] CurrentRoles => (EnemyRole[])waves[Index].Roles.Clone();
        public float DelayRemaining => delay;
        public WaveState(DogfightTuning tuning) { this.tuning=tuning;Reset(); }
        public void Reset()
        {
            waves=tuning.EnableEnemyRoles ? tuning.Waves : new[] {new EnemyWaveDefinition(EnemyRole.Fighter,EnemyRole.Fighter,EnemyRole.Fighter)};
            if(waves==null||waves.Length==0)waves=DogfightWaveList.CreateDefault();
            foreach(var wave in waves) if(wave==null||wave.Roles==null||wave.Roles.Length==0)
                throw new ArgumentException("Every wave needs at least one role");
            Index=0;Won=false;delay=Math.Max(0,tuning.WaveDelaySeconds);
        }
        public bool Tick(float dt,bool allDisabled)
        {
            if(Won||!allDisabled||!FlightState.Finite(dt)||dt<=0)return false;
            if(Index==waves.Length-1){Won=true;return false;}
            delay=Math.Max(0,delay-dt);if(delay>0)return false;
            Index++;delay=Math.Max(0,tuning.WaveDelaySeconds);return true;
        }
    }
}
