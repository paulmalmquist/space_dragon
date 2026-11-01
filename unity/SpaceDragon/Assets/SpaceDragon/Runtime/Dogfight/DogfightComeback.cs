using UnityEngine;
using UnityEngine.InputSystem;

namespace SpaceDragon.Dogfight
{
    public sealed partial class DogfightEncounter
    {
        ComebackState comeback;
        bool disabledHandled;
        int comebackSuccessObserved;
        public ComebackState Comeback => comeback;
        void HandleHullFailure()
        {
            if(!Tactics.IsDestroyed||comeback.Active||disabledHandled)return;
            if(!comeback.TryBegin()){OnDestroyed();return;}
            wreckVelocity=Flight.Velocity*tuning.ComebackDriftMultiplier;
            Flight.ResolveContact(Flight.Position,wreckVelocity);
            Breath.CancelBurst();Tactics.CancelRepair();repairCode.Cancel();damageVfx.CancelRepair();
            wingman.CancelRun();wingmanVisual.Clear();weaponVfx.Clear();combatFeedback.Clear();finisherFeedback.Clear();
            perfectRoll.ClearSlowMotion();finisher.PauseClearFreeze();sound.StopCombat();sound.PlayHit();
            presentation.ShutdownPropulsion();mouthLight.enabled=false;lastBeam=false;combatArmed=false;
            Message("WAKE THE SHIP — spell SONG or F1 together");
        }
        void TickComeback(Keyboard keyboard,float dt)
        {
            comeback.Tick(dt);elapsed+=dt;
            if(comeback.Active&&keyboard!=null)
            {
                if(keyboard.f1Key.wasPressedThisFrame)comeback.Assist();
                else foreach(var key in keyboard.allKeys)if(key.wasPressedThisFrame&&key.name.Length==1)comeback.PressLetter(key.name[0]);
            }
            playerRoot.position+=wreckVelocity*dt;wreckVelocity*=Mathf.Exp(-dt*tuning.ComebackDriftDrag);
            Flight.ResolveContact(playerRoot.position,wreckVelocity);
            foreach(var enemy in enemies)
            {
                if(enemy.Dead)continue;var shot=enemy.RolePilot.Tick(dt,elapsed,Flight);
                enemy.Position=enemy.RolePilot.Position;enemy.Visual.SetPositionAndRotation(enemy.Position,enemy.RolePilot.Rotation*Quaternion.Euler(0,180,0));
                enemy.TargetProgress=enemy.RolePilot.TargetProgress;enemy.Locked=enemy.RolePilot.Locked;
                enemy.RoleVisual.Tick(enemy.Combat,elapsed,ReducedMotion);
                if(shot.HasValue&&!Quiet)SpawnBolt(shot.Value.Origin,shot.Value.Direction*210,true,7);
            }
            ResolveBolts(dt);ResolveMissiles(dt);damageVfx.Tick(dt);
            if(!ReducedMotion)visualMotion.Rotate(tuning.ComebackPitchDegrees*dt,0,tuning.ComebackRollDegrees*dt,Space.Self);
            if(comeback.SucceededSerial>comebackSuccessObserved)
            {
                comebackSuccessObserved=comeback.SucceededSerial;
                if(Tactics.RestoreComebackHull(tuning.ComebackHull))
                {
                    foreach(var enemy in enemies){enemy.Pilot.BreakLock();enemy.TargetProgress=0;enemy.Locked=false;enemy.Combat.ShakeOff();}
                    foreach(var missile in missiles)if(missile.Hostile)missile.Seeker=false;
                    IncomingThreatWorld=null;Tactics.IncomingLockedMissile=false;
                    presentation.ResetPose();sound.PlayRepair();
                    Message(comeback.Assisted?"SONG complete together — recovery assisted":"SONG complete — dragon reawakened");
                }
            }
            else if(comeback.Failed)OnDestroyed();
            MoveCamera(dt,false);
        }
    }
}
