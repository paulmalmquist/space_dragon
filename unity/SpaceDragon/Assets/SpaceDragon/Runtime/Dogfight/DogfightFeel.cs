using UnityEngine;

namespace SpaceDragon.Dogfight
{
    // Adapter hooks for SD-095, the feel and clarity pass. Presentation only: nothing here changes
    // a rule, a reward, a timer of play or anything the simulation reads. The camera offset is
    // put on at the end of a frame and taken off again before the next step reads the camera.
    // Every hook does nothing until InitializeFeel has run, because EditMode tests drive single
    // encounter methods on a host that was never started.
    public sealed partial class DogfightEncounter
    {
        const int BlastSlots=6;
        const float ReferenceLens=61f;
        CameraImpactState cameraImpact;
        HitConfirmState hitConfirm;
        readonly KillSequenceState[] blastStates=new KillSequenceState[BlastSlots];
        readonly KillSequenceVisual[] blastVisuals=new KillSequenceVisual[BlastSlots];
        readonly Transform[] blastHulls=new Transform[BlastSlots];
        readonly Vector3[] blastHullScales=new Vector3[BlastSlots];
        readonly Quaternion[] blastHullRotations=new Quaternion[BlastSlots];
        bool cameraOffsetApplied,wasBoosting;
        public CameraImpactState CameraImpact=>cameraImpact;
        public HitConfirmState HitConfirm=>hitConfirm;
        public string FeelFlags=>$"impactCamera={tuning.EnableImpactCamera};killSequence={tuning.EnableKillSequence};hitConfirm={tuning.EnableHitConfirm};hudClarity={tuning.EnableHudClarity}";
        public int ActiveKillSequences{get{int n=0;foreach(var state in blastStates)if(state!=null&&state.Active)n++;return n;}}
        public int KillSequencesStarted{get{int n=0;foreach(var state in blastStates)if(state!=null)n+=state.Serial;return n;}}

        void InitializeFeel()
        {
            cameraImpact=new CameraImpactState(tuning);hitConfirm=new HitConfirmState(tuning);
            for(int i=0;i<BlastSlots;i++){blastStates[i]=new KillSequenceState(tuning);blastVisuals[i]=new KillSequenceVisual();blastVisuals[i].Setup(tuning);}
        }
        // Restart: everything back to rest, counts included. Enemy visuals are replaced by SpawnWave next.
        void ResetFeel()
        {
            if(cameraImpact==null)return;
            cameraImpact.Clear();hitConfirm.Reset();wasBoosting=false;
            for(int i=0;i<BlastSlots;i++){blastStates[i].Reset();blastVisuals[i].Hide();blastHulls[i]=null;}
        }
        // Pause and focus loss: no shake or marker is left frozen on screen. A kill sequence simply
        // waits, because nothing ticks it while paused.
        void PauseFeel()
        {
            if(cameraImpact==null)return;
            cameraImpact.Clear();hitConfirm.Hide();ApplyCamera();
        }
        void DisposeFeel(){foreach(var visual in blastVisuals)visual?.Dispose();}
        // A new wave destroys the old enemy objects. Let go of them first; rings already in flight finish.
        void ReleaseBlastHulls(){for(int i=0;i<BlastSlots;i++)blastHulls[i]=null;}
        void SetFeelSwitches(bool enabled)
        {tuning.EnableImpactCamera=tuning.EnableKillSequence=tuning.EnableHitConfirm=tuning.EnableHudClarity=enabled;}

        /// <summary>The simulation, aim and snapshots must read the camera without the impact offset.</summary>
        void RestoreChaseCamera()
        {
            if(!cameraOffsetApplied||gameCamera==null)return;
            gameCamera.transform.SetPositionAndRotation(chaseCamera.Position,chaseCamera.Rotation);gameCamera.fieldOfView=chaseCamera.FieldOfView;
            cameraOffsetApplied=false;
        }
        void ApplyCamera()
        {
            Vector3 position=chaseCamera.Position;Quaternion rotation=chaseCamera.Rotation;float lens=chaseCamera.FieldOfView;
            cameraOffsetApplied=cameraImpact!=null&&cameraImpact.HasOffset;
            if(cameraOffsetApplied)
            {
                // A narrower lens magnifies a turn of the camera, so turn less when zoomed.
                float steadiness=Mathf.Clamp01(lens/ReferenceLens);
                position+=rotation*cameraImpact.PositionOffset;
                rotation=rotation*Quaternion.Euler(cameraImpact.EulerOffset*steadiness);
                lens+=cameraImpact.FieldOfViewOffset;
            }
            gameCamera.transform.SetPositionAndRotation(position,rotation);gameCamera.fieldOfView=lens;
        }

        float ImpactFalloff(Vector3 point)=>CameraImpactState.DistanceFalloff(Vector3.Distance(point,Flight.Position),tuning.ImpactNearMetres,tuning.ImpactFarMetres);
        void FeelPlayerHit(float amount){if(cameraImpact!=null)cameraImpact.AddTrauma(tuning.ImpactHitTrauma+Mathf.Max(0,amount)*tuning.ImpactHitTraumaPerDamage);}
        void FeelExplosion(Vector3 point){if(cameraImpact!=null)cameraImpact.AddTrauma(tuning.ImpactMissileTrauma*ImpactFalloff(point));}
        void FeelKill(Vector3 point){if(cameraImpact!=null)cameraImpact.AddTrauma(tuning.ImpactKillTrauma*ImpactFalloff(point));}
        void FeelFinisher(){if(cameraImpact==null)return;cameraImpact.AddTrauma(tuning.ImpactFinisherTrauma);cameraImpact.Punch(tuning.ImpactFinisherLensPunch);}
        void FeelPerfectRoll(){if(cameraImpact!=null)cameraImpact.Punch(tuning.ImpactPerfectRollLensPunch);}
        void FeelGasBlast(Vector3 point)
        {
            if(cameraImpact==null)return;
            cameraImpact.AddTrauma(tuning.ImpactGasTrauma*ImpactFalloff(point));
            if(!tuning.EnableKillSequence)return;
            int slot=FreeBlastSlot();
            // The ring is drawn at the radius that really hurts enemies.
            if(slot>=0)blastStates[slot].BeginBlast(point,Mathf.Max(0,tuning.GasEnemyRadius),gasDetonations,ReducedMotion);
        }

        // Only the pilot's own weapons are confirmed. The wingman's hits are not theirs, and
        // scenery only confirms a kill.
        void ConfirmHit(WeaponKind weapon,HitConfirmKind kind)
        {
            if(hitConfirm==null||weapon==WeaponKind.Wingman||(weapon==WeaponKind.Environment&&kind!=HitConfirmKind.Kill))return;
            hitConfirm.Register(kind);
        }

        int FreeBlastSlot(){for(int i=0;i<BlastSlots;i++)if(!blastStates[i].Active&&blastHulls[i]==null)return i;return -1;}

        /// <summary>
        /// Called after the rules have disabled the enemy and dropped its salvage. Returns false
        /// when the sequence is off or every slot is busy; the caller then hides the hull at once,
        /// exactly as before this pass.
        /// </summary>
        bool BeginKillSequence(EnemyView enemy)
        {
            if(cameraImpact==null||!tuning.EnableKillSequence||enemy.Visual==null)return false;
            Vector3 velocity=enemy.RolePilot.Velocity;
            if(!FlightState.Finite(enemy.Position.x)||!FlightState.Finite(enemy.Position.y)||!FlightState.Finite(enemy.Position.z)||
                !FlightState.Finite(velocity.x)||!FlightState.Finite(velocity.y)||!FlightState.Finite(velocity.z))return false;
            int slot=FreeBlastSlot();if(slot<0)return false;
            var state=blastStates[slot];
            state.Begin(enemy.Position,velocity,enemy.CombatId,ReducedMotion);
            if(state.HullVisible)
            {blastHulls[slot]=enemy.Visual;blastHullScales[slot]=enemy.Visual.localScale;blastHullRotations[slot]=enemy.Visual.rotation;}
            else enemy.Visual.gameObject.SetActive(false);
            // Reduced motion owes its explosion at once, as before this pass.
            if(state.TakeBlast())BlastCue(state.Position);
            return true;
        }
        void BlastCue(Vector3 point){damageVfx.Burst(point,36);sound.PlayExplosion();FeelKill(point);}

        void TickBlasts(float dt)
        {
            Transform view=gameCamera.transform;Vector3 eye=view.position,right=view.right,up=view.up;
            for(int i=0;i<BlastSlots;i++)
            {
                var state=blastStates[i];
                if(state.Active)state.Tick(dt,ReducedMotion);
                if(state.TakeBlast())BlastCue(state.Position);
                var hull=blastHulls[i];
                if(hull!=null)
                {
                    if(state.Active&&state.HullVisible)
                    {hull.SetPositionAndRotation(state.Position,blastHullRotations[i]*Quaternion.Euler(state.SpinEuler));hull.localScale=blastHullScales[i]*state.HullScale;}
                    else{hull.localScale=blastHullScales[i];hull.gameObject.SetActive(false);blastHulls[i]=null;}
                }
                if(state.Active)blastVisuals[i].Show(state,eye,right,up);else blastVisuals[i].Hide();
            }
        }

        // Runs on every unpaused path, including the wreck and the comeback, so that a sequence
        // already begun always finishes.
        void TickFeelBackground(float dt)
        {
            if(cameraImpact==null||!FlightState.Finite(dt)||dt<=0)return;
            hitConfirm.Tick(dt);TickBlasts(dt);
        }
        void TickFeel(float dt,bool beamActive)
        {
            if(cameraImpact==null)return;
            if(Flight.Boosting&&!wasBoosting)cameraImpact.Punch(tuning.ImpactBoostLensPunch);
            wasBoosting=Flight.Boosting;
            if(beamActive)cameraImpact.Hold(tuning.ImpactBeamRumble);
            TickFeelBackground(dt);
        }
    }
}
