using System;
using System.IO;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using SpaceDragon.TownDrive.UnityRuntime;

namespace SpaceDragon.TownDrive.Runtime.Tests
{
    public sealed class TownDriveRuntimeTests
    {
        private TownDriveData data;
        private DriveSimulation simulation;
        [SetUp] public void LoadData()
        {
            data=TownDriveJson.Parse(File.ReadAllText(Path.Combine(Application.dataPath,"SpaceDragon","TownDrive","Data","town-drive-v001.json")));
            simulation=new DriveSimulation(new DriveRoute(data.route));
        }
        [Test] public void FrameCadencePreservesFixedTicksAndSharedCabinEye()
        {
            var a=new TownDriveSession(data);var b=new TownDriveSession(data);
            var controls=new DriveInput{throttle=1,steer=.08};
            for(int i=0;i<180;i++)a.Advance(1.0/60,controls);
            double[] cadence={1.0/30,1.0/144,1.0/90,1.0/60};double time=0;int index=0;
            while(time<3-1e-10)
            {
                double dt=Math.Min(cadence[index++%cadence.Length],3-time);time+=dt;b.Advance(dt,controls);
                var pose=b.Presentation();var frame=TownDriveCameraFrame.At(pose,true,.4,0);
                var inverse=Quaternion.Inverse(Quaternion.Euler(0,(float)(pose.yaw*Mathf.Rad2Deg),0));
                var local=inverse*(frame.position-new Vector3((float)pose.x,0,(float)pose.z));
                Assert.That(Vector3.Distance(local,TownDriveCameraFrame.DriverEye),Is.LessThan(.0001f));
            }
            Assert.That(b.TickCount,Is.EqualTo(a.TickCount));Assert.That(b.State.x,Is.EqualTo(a.State.x).Within(1e-10));Assert.That(b.State.z,Is.EqualTo(a.State.z).Within(1e-10));
            Assert.That(b.Traffic.ElapsedSeconds,Is.EqualTo(a.Traffic.ElapsedSeconds).Within(1e-10));
        }
        [Test] public void PauseFreezesAuthorityAndNpcTimeAndResetSnapsWithoutProgressLoss()
        {
            var session=new TownDriveSession(data);for(int i=0;i<90;i++)session.Advance(1.0/60,new DriveInput{throttle=1});
            string before=JsonUtility.ToJson(session.State);double trafficS=session.Traffic.Vehicles[0].s;
            var walker=session.Pedestrians.PoseAt(session.Pedestrians.Population[0],session.State.elapsedSeconds);
            session.SetPaused(true);for(int i=0;i<40;i++)session.Advance(.1,new DriveInput{throttle=1});
            Assert.That(JsonUtility.ToJson(session.State),Is.EqualTo(before));Assert.That(session.Traffic.Vehicles[0].s,Is.EqualTo(trafficS));
            Assert.That(session.Pedestrians.PoseAt(session.Pedestrians.Population[0],session.State.elapsedSeconds).walkPhase,Is.EqualTo(walker.walkPhase));
            session.Reset();Assert.That(session.State.routeS,Is.Zero);Assert.That(session.State.visited,Is.EqualTo(new[]{"home"}));
            Assert.That(session.Presentation().x,Is.EqualTo(session.State.x));Assert.That(session.Presentation().speed,Is.Zero);
            Assert.That(session.State.elapsedSeconds,Is.GreaterThan(1));
        }
        [Test] public void InputRequiresNeutralAfterReleaseAndLargeFrameCatchupIsBounded()
        {
            var latch=new TownDriveInputLatch();var held=new DriveInput{throttle=1};Assert.That(latch.Filter(held).throttle,Is.EqualTo(1));
            latch.Clear();Assert.That(latch.Filter(held).throttle,Is.Zero);Assert.That(latch.Filter(held).throttle,Is.Zero);latch.Filter(new DriveInput());Assert.That(latch.Filter(held).throttle,Is.EqualTo(1));
            // A+D cancel semantically, but are not physical neutral after pause.
            latch.Clear();Assert.That(latch.Filter(new DriveInput(),true).steer,Is.Zero);
            var right=new DriveInput{steer=1};Assert.That(latch.Filter(right,true).steer,Is.Zero,"Releasing A must not re-enable the still-held D key.");
            Assert.That(latch.Filter(new DriveInput(),true).steer,Is.Zero);
            Assert.That(latch.Filter(right,true).steer,Is.Zero,"Repeated cancelled directions must keep the barrier closed.");
            latch.Filter(new DriveInput(),false);Assert.That(latch.Filter(right,true).steer,Is.EqualTo(1),"Only genuine physical neutral permits a fresh steering press.");
            var session=new TownDriveSession(data);session.Advance(20,held);Assert.That(session.TickCount,Is.EqualTo(6));Assert.That(session.DroppedSeconds,Is.EqualTo(19.9).Within(1e-10));
        }
        [Test] public void CheckpointSaveRestoresOrderedCompletionExactlyAndNeverWritesCampaignKeys()
        {
            var store=new MemoryPreferences();var adapter=new TownDriveSave(store,simulation);var state=simulation.CreateState(true);
            state.visited=Array.ConvertAll(data.route.checkpoints,c=>c.id);state.completed=true;state.checkpointId="home";
            Assert.That(adapter.Save(state),Is.True);int writes=store.writes;Assert.That(adapter.Save(state),Is.True);Assert.That(store.writes,Is.EqualTo(writes));
            var restored=new TownDriveSave(store,simulation).Load();Assert.That(restored.completed,Is.True);Assert.That(restored.visited,Is.EqualTo(state.visited));Assert.That(restored.assist,Is.True);Assert.That(restored.speed,Is.Zero);
            simulation.Reset(restored);Assert.That(restored.completed,Is.True);
            foreach(var key in store.values.Keys)Assert.That(key,Does.StartWith("space-dragon.unity.drive.v1"));
        }
        [Test] public void SaveRecoveryFutureProtectionAndWriteFailurePreserveRecoverableBytes()
        {
            var store=new MemoryPreferences();var adapter=new TownDriveSave(store,simulation);var home=simulation.CreateState();adapter.Save(home);
            var first=home.Clone();first.visited=new[]{"home","leg-1"};first.checkpointId="leg-1";adapter.Save(first);string backup=store.values[TownDriveSave.BackupKey];
            store.values[TownDriveSave.Key]="{corrupt";Assert.That(new TownDriveSave(store,simulation).Load().checkpointId,Is.EqualTo("home"));
            string future="{\"version\":42,\"routeId\":\"town-drive-v1\"}";store.values[TownDriveSave.Key]=future;var protectedSave=new TownDriveSave(store,simulation);protectedSave.Load();Assert.That(protectedSave.Save(home),Is.False);Assert.That(store.values[TownDriveSave.Key],Is.EqualTo(future));
            store.values[TownDriveSave.Key]=backup;store.failWrites=true;var failing=new TownDriveSave(store,simulation);failing.Load();Assert.That(failing.Save(first),Is.False);Assert.That(store.values[TownDriveSave.Key],Is.EqualTo(backup));
            var recoveringStore=new MemoryPreferences();var established=new TownDriveSave(recoveringStore,simulation);established.Save(home);established.Save(first);
            string existingPrimary=recoveringStore.values[TownDriveSave.Key],existingBackup=recoveringStore.values[TownDriveSave.BackupKey];int existingWrites=recoveringStore.writes;
            recoveringStore.failReads=true;var interrupted=new TownDriveSave(recoveringStore,simulation);var temporary=interrupted.Load();
            Assert.That(temporary.checkpointId,Is.EqualTo("home"));Assert.That(interrupted.WritesProtected,Is.True);Assert.That(interrupted.Status,Does.Contain("temporary"));
            recoveringStore.failReads=false;
            for(int attempt=0;attempt<3;attempt++){temporary.assist=!temporary.assist;Assert.That(interrupted.Save(temporary),Is.False);Assert.That(interrupted.Save(first),Is.False);}
            Assert.That(recoveringStore.values[TownDriveSave.Key],Is.EqualTo(existingPrimary));Assert.That(recoveringStore.values[TownDriveSave.BackupKey],Is.EqualTo(existingBackup));
            Assert.That(recoveringStore.writes,Is.EqualTo(existingWrites),"A failed-load session must not overwrite or rotate recovered storage.");
        }
        [Test] public void AmbientTrafficStopsForRedAndPedestriansRemainOutsidePavement()
        {
            var traffic=new DriveTraffic(simulation.Route,1);var signal=traffic.Signals[0];var vehicle=traffic.Vehicles[0];vehicle.s=signal.s-22;vehicle.speed=3;vehicle.direction=1;vehicle.lane=0;
            var player=simulation.CreateState();player.x=10000;player.z=10000;player.elapsedSeconds=23;traffic.AdvanceTo(player);
            for(int i=0;i<330;i++){player.elapsedSeconds+=1.0/60;traffic.AdvanceTo(player);}
            Assert.That(vehicle.s,Is.LessThan(signal.s));Assert.That(traffic.Vehicles[0].s,Is.LessThanOrEqualTo(signal.s-12+1e-8));Assert.That(traffic.Vehicles[0].speed,Is.LessThan(.3));
            var people=new DrivePedestrians(simulation.Route);Assert.That(people.Population.Length,Is.EqualTo(40));
            foreach(var person in people.Population)foreach(double time in new[]{0.0,3.0,30.0,65.0})
            {
                var pose=people.PoseAt(person,time);var nearest=simulation.Route.Nearest(pose.x,pose.z,(person.startS+person.endS)/2);
                Assert.That(nearest.distance,Is.GreaterThan(DriveRoute.RoadHalfWidth(data.route.sections[person.sectionIndex])+2.5));
            }
        }
        private sealed class MemoryPreferences:ITownDrivePreferences
        {
            public readonly Dictionary<string,string> values=new Dictionary<string,string>();public int writes;public bool failWrites,failReads;
            public string Read(string key){if(failReads)throw new IOException("Fixture read unavailable");return values.TryGetValue(key,out var value)?value:null;}
            public void Write(string key,string value){if(failWrites)throw new IOException("Fixture storage unavailable");values[key]=value;writes++;}
            public void Flush(){}
        }
    }
}
