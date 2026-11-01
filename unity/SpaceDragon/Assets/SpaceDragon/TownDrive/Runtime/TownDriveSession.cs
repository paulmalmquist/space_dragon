using System;
using System.Collections.Generic;

namespace SpaceDragon.TownDrive.Runtime
{
    /// <summary>One clock for player/NPCs; the host supplies semantic controls, never engine physics.</summary>
    public sealed class TownDriveSession
    {
        public readonly TownDriveData Data;
        public readonly DriveSimulation Simulation;
        public DriveTraffic Traffic {get;private set;}
        public readonly DrivePedestrians Pedestrians;
        public DriveState State {get;private set;}
        public DriveState Previous {get;private set;}
        public bool Paused {get;private set;}
        public int TickCount {get;private set;}
        public double Accumulator {get;private set;}
        public double DroppedSeconds {get;private set;}
        public event Action<DriveState> CheckpointChanged;
        private readonly DriveObstacle[] statics;
        private readonly List<DriveObstacle> obstacles = new List<DriveObstacle>(512);
        public TownDriveSession(TownDriveData data, DriveState initial=null, DriveObstacle[] sceneObstacles=null)
        {
            Data=data;Simulation=new DriveSimulation(new DriveRoute(data.route));State=initial??Simulation.CreateState();Previous=State.Clone();
            Traffic=new DriveTraffic(Simulation.Route,64,State.elapsedSeconds);Pedestrians=new DrivePedestrians(Simulation.Route);
            var all=new List<DriveObstacle>(data.closureObstacles??Array.Empty<DriveObstacle>());if(sceneObstacles!=null)all.AddRange(sceneObstacles);statics=all.ToArray();
        }
        public void SetPaused(bool paused)
        {
            Paused=paused;Snap();
        }
        public void Snap(){Previous=State.Clone();Accumulator=0;}
        public void Reset(){State=Simulation.Reset(State);Snap();}
        public void SetAssist(bool assist){State=State.Clone();State.assist=assist;CheckpointChanged?.Invoke(State);}
        public void FreshStart(){State=Simulation.CreateState(State.assist);Traffic=new DriveTraffic(Simulation.Route);Snap();CheckpointChanged?.Invoke(State);}
        public int Advance(double frameSeconds,DriveInput input)
        {
            if(Paused||input.paused)return 0;
            if(double.IsNaN(frameSeconds)||double.IsInfinity(frameSeconds)||frameSeconds<=0)return 0;
            double elapsed=Math.Min(.1,frameSeconds);DroppedSeconds+=Math.Max(0,frameSeconds-elapsed);Accumulator+=elapsed;int ticks=0;
            while(Accumulator+1e-12>=DriveSimulation.StepSeconds)
            {
                Previous=State;Traffic.AdvanceTo(State);obstacles.Clear();obstacles.AddRange(statics);Traffic.AppendCollisionProxies(obstacles,State.x,State.z);
                State=Simulation.Step(State,input,Data.config,obstacles.ToArray());Traffic.AdvanceTo(State);TickCount++;ticks++;Accumulator=Math.Max(0,Accumulator-DriveSimulation.StepSeconds);
                if(State.checkpointId!=Previous.checkpointId||State.completed!=Previous.completed||State.visited.Length!=Previous.visited.Length)CheckpointChanged?.Invoke(State);
            }
            return ticks;
        }
        public DrivePose Presentation()=>DrivePresentation.Interpolate(Previous,State,Accumulator/DriveSimulation.StepSeconds,Paused);
    }
    /// <summary>After pause/focus/reset, a held driving key must return neutral before it can re-arm.</summary>
    public sealed class TownDriveInputLatch
    {
        private bool waiting;
        public void Clear()=>waiting=true;
        public DriveInput Filter(DriveInput input,bool physicalDrivingKeyHeld=false)
        {
            bool active=physicalDrivingKeyHeld||input.throttle!=0||input.brake!=0||input.steer!=0||input.handbrake;
            if(waiting){if(!active)waiting=false;return new DriveInput();}return input;
        }
    }
}
