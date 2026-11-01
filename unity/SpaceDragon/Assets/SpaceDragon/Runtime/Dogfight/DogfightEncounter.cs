using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Rendering;
using Unity.Profiling;

namespace SpaceDragon.Dogfight
{
    [Serializable] public sealed class EnemyView
    {
        public string Id; public int CombatId; public Vector3 Position;
        public float Health => Combat.Health; public bool Dead => Combat.Dead;
        [NonSerialized] public EnemyRoleState Combat;
        [NonSerialized] public RolePilotState RolePilot;
        [NonSerialized] public EnemyRoleVisual RoleVisual;
        public float TargetProgress; public bool Locked;
        [NonSerialized] public EnemyPilot Pilot;
        [NonSerialized] public Transform Visual;
    }

    /// <summary>
    /// Unity adapter for encounter-only state. Metres, +Z forward, +Y up; source -Z is
    /// converted once beneath VisualMotion with a Y180 basis. Player gameplay collision
    /// is a 3.3m sphere, independent of the imported render mesh and animated wings.
    /// Contact height is recorded in the selected asset contract; this space scene has no ground solver.
    /// No PlayerPrefs, campaign, inventory or learner writes occur in this lab.
    /// </summary>
    public sealed partial class DogfightEncounter : MonoBehaviour
    {
        [SerializeField] Transform playerRoot, visualMotion, model;
        [SerializeField] GameObject dronePrefab;
        [SerializeField] Camera gameCamera;
        [SerializeField] DogfightTuning tuning;
        [SerializeField] AnimationClip flightClip, glideClip, boostClip;
        [SerializeField] AudioClip roarClip, breathClip, blastClip, metalClip, surgeClip;
        [Header("Flight and scene tuning")]
        public FlightTuning FlightSettings = new FlightTuning();
        public Material RockMaterial, ProjectileMaterial, EnemyProjectileMaterial, SalvageMaterial;
        [Min(1)] public float EnemyHull = 216;
        [Min(1)] public float PlayerRadius = 3.3f;
        [Min(0)] public float CollisionDamage = 45;
        [Min(0)] public float HostileMissileDamage = 24;
        [Min(1)] public float HostileMissileInterval = 12;
        [Range(0,100)] public int AsteroidCount = 48;
        public TacticalState Tactics { get; private set; }
        public FlightState Flight { get; private set; }
        public BreathState Breath { get; private set; }
        public DogfightTuning Tuning => tuning;
        public Camera GameCamera => gameCamera;
        public bool Paused { get; private set; }
        public bool SoundEnabled { get; private set; }
        public bool ReducedMotion { get; private set; }
        public bool RepairSelectorOpen { get; private set; }
        public bool MouseAimMode { get; private set; }
        public bool Dead => Tactics != null && Tactics.IsDestroyed;
        public bool Crashing => Dead && deathTime < 3.2f;
        public float AsteroidClearance { get; private set; } = -1;
        public bool Won => waveState != null && waveState.Won;
        public int AliveEnemies { get { int n = 0; foreach(var e in enemies) if(!e.Dead) n++; return n; } }
        public string Toast => toastTime > 0 ? toast : "";
        public Vector3 AimWorld { get; private set; }
        public Vector2 AimScreen => aim;
        public IReadOnlyList<EnemyView> Enemies => enemies;
        public IReadOnlyList<SalvagePiece> SalvageItems => salvage.Items;
        public Vector3? IncomingThreatWorld { get; private set; }
        readonly List<EnemyView> enemies = new List<EnemyView>();
        readonly List<Bolt> bolts = new List<Bolt>();
        readonly List<MissileView> missiles = new List<MissileView>();
        readonly Dictionary<string,Transform> salvageVisuals = new Dictionary<string,Transform>();
        readonly List<string> removedSalvage = new List<string>();
        readonly List<BreathCandidate> breathCandidates = new List<BreathCandidate>();
        readonly List<WingLaserTarget> laserTargets = new List<WingLaserTarget>();
        readonly List<GameObject> rocks = new List<GameObject>();
        readonly List<Vector3> rockPositions = new List<Vector3>(),rockScales = new List<Vector3>();
        readonly List<Mesh> generatedMeshes = new List<Mesh>();
        readonly float[] frameTimes = new float[600];
        readonly Collider[] collisionBuffer = new Collider[8];
        DragonPresentation presentation; DamageVfx damageVfx; DogfightAudio sound; SalvageField salvage;
        readonly ChaseCameraState chaseCamera = new ChaseCameraState();
        Transform starfield;
        ShipWeaponsVfx weaponVfx; Light mouthLight;
        ProfilerRecorder draws, triangles;
        Vector2 aim, pointer; Vector2 previousPointer;
        Vector3 wreckVelocity;
        // Read-only verification evidence captured from the actual spawned visual.
        Vector3 lastPlasmaOrigin, lastPlasmaMuzzle;
        bool lastPlasmaRecorded;
        Vector3 lastLaserLeftOrigin,lastLaserRightOrigin,lastLaserLeftSocket,lastLaserRightSocket,lastLaserLeftEnd,lastLaserRightEnd;
        float lastLaserFiredAt,lastLaserResolvedAt;int laserBeamsFired;
        bool lastLaserLeftHit,lastLaserRightHit;
        Collider lastRock;
        bool pointerActive, initialized, lastBeam, selectorConsumed, combatArmed;
        float elapsed, fireClock, collisionGrace, hitGrace, missileClock, toastTime, repairHold, deathTime;
        float previousFrame, lastTextureMeasure, textureBytes;
        int frameIndex, frameCount, shotsFired, ordinaryHits, missileHits, enemiesDestroyed, pickups, damageHits, collisionHits;
        int launchAttempts, rejectedLaunches, repairStarts, interruptionObserved, lastRoll;
        string toast = "";
        const int EnvironmentMask = 1 << 8;
        const float FireInterval=.19f;
        sealed class Bolt { public int Id; public Vector3 Position,Velocity; public float Life,Damage; public bool Hostile; public Transform Visual; }
        sealed class MissileView { public int Id; public HomingMissile State; public string Target; public bool Hostile,Seeker=true; public int RollAtLaunch; public Transform Visual; }
#if DEVELOPMENT_BUILD || UNITY_EDITOR
        bool fixtureQuiet, fixtureTarget; float fixtureHitDelay=-1; DragonSystem fixtureHitSystem;
#endif

        public void Configure(Transform root,Transform motion,Transform imported,GameObject enemy,Camera camera,DogfightTuning settings,
            AnimationClip flight,AnimationClip glide,AnimationClip boost,AudioClip roar,AudioClip breath,AudioClip blast,AudioClip metal,AudioClip surge)
        { playerRoot=root;visualMotion=motion;model=imported;dronePrefab=enemy;gameCamera=camera;tuning=settings;
          flightClip=flight;glideClip=glide;boostClip=boost;roarClip=roar;breathClip=breath;blastClip=blast;metalClip=metal;surgeClip=surge; }

        public bool UseAuthoredArmor;
        public bool UseOrganicDragon;
        public bool UseSpacecraftDragon;
        public DragonRigProfile MeasuredDragonProfile;
        public TextAsset DragonAttribution;
        public string DragonTextureMode="source";
        public Transform ImportedDragon => model;
        public string DragonProfileId => !string.IsNullOrEmpty(MeasuredDragonProfile?.id) ? MeasuredDragonProfile.id : UseOrganicDragon ? "violet-organic-15" : "mechanical-9";

        void Start()
        {
            if(playerRoot==null || model==null || tuning==null || gameCamera==null) { Debug.LogError("Dogfight scene is missing generated references"); enabled=false;return; }
            tuning=Instantiate(tuning); // Encounter-local QA/options never mutate the project asset.
            Tactics=new TacticalState(tuning); Flight=new FlightState(FlightSettings); Breath=new BreathState(); salvage=new SalvageField(tuning);
            presentation=gameObject.AddComponent<DragonPresentation>(); presentation.Configure(visualMotion,model,flightClip,glideClip,boostClip,UseAuthoredArmor,UseOrganicDragon,MeasuredDragonProfile,UseSpacecraftDragon);
            damageVfx=gameObject.AddComponent<DamageVfx>(); damageVfx.Configure(playerRoot,presentation);
            sound=gameObject.AddComponent<DogfightAudio>(); sound.Configure(roarClip,breathClip,blastClip,metalClip,surgeClip);
            var hud=gameObject.AddComponent<DogfightHud>(); hud.Configure(this);
            weaponVfx=gameObject.AddComponent<ShipWeaponsVfx>();weaponVfx.Configure(presentation.MuzzleTransform,LaserLeft,LaserRight);
            mouthLight=new GameObject("Restrained breath illumination").AddComponent<Light>(); mouthLight.type=LightType.Point;mouthLight.range=12;mouthLight.color=new Color(1,.22f,.035f);mouthLight.enabled=false;
            InitializeCombatUpgrades();
            BuildAsteroids();
            starfield=GameObject.Find("Space.starfield.background-only")?.transform;
            try { draws=ProfilerRecorder.StartNew(ProfilerCategory.Render,"Draw Calls Count"); triangles=ProfilerRecorder.StartNew(ProfilerCategory.Render,"Triangles Count"); } catch(Exception) { }
            initialized=true;RestartEncounter();
            Application.targetFrameRate=60; QualitySettings.vSyncCount=0;
        }

        public void RestartEncounter()
        {
            if(!initialized) return;
            ClearProjectiles(); foreach(var t in salvageVisuals.Values) Destroy(t.gameObject);salvageVisuals.Clear();
            ResetCombatUpgrades();
            Tactics.Reset();Flight.Reset();Breath.Reset();salvage.Reset(); presentation.ResetPose();damageVfx.Clear();sound.ResetEncounter();
            for(int i=0;i<rocks.Count;i++){rocks[i].transform.position=rockPositions[i];rocks[i].transform.localScale=rockScales[i];}
            ResetSceneryWeapons();
            elapsed=fireClock=collisionGrace=hitGrace=toastTime=repairHold=deathTime=0;missileClock=HostileMissileInterval;lastRock=null;AsteroidClearance=-1;
            shotsFired=ordinaryHits=missileHits=enemiesDestroyed=pickups=damageHits=collisionHits=launchAttempts=rejectedLaunches=repairStarts=interruptionObserved=lastRoll=0;
            lastPlasmaRecorded=false;lastPlasmaOrigin=lastPlasmaMuzzle=Vector3.zero;
            laserBeamsFired=0;lastLaserFiredAt=lastLaserResolvedAt=0;lastLaserLeftHit=lastLaserRightHit=false;
            lastLaserLeftOrigin=lastLaserRightOrigin=lastLaserLeftSocket=lastLaserRightSocket=lastLaserLeftEnd=lastLaserRightEnd=Vector3.zero;
            weaponVfx.Clear();
            aim=Vector2.zero;pointer=Vector2.zero;pointerActive=false;previousPointer=Mouse.current?.position.ReadValue()??Vector2.zero;RepairSelectorOpen=false;selectorConsumed=false;lastBeam=false;
            SpawnWave();
#if DEVELOPMENT_BUILD || UNITY_EDITOR
            fixtureQuiet=fixtureTarget=false;fixtureHitDelay=-1;
#endif
            playerRoot.SetPositionAndRotation(Flight.Position,Flight.Rotation); MoveCamera(1,true); SetPaused(false);
            if(!tuning.EnableEnemyRoles)Message("Keep flying. Track a bogey; Enter launches a locked missile.");
        }

        void Update()
        {
            if(!initialized) return;
            float now=Time.realtimeSinceStartup; if(previousFrame>0) { frameTimes[frameIndex++%frameTimes.Length]=(now-previousFrame)*1000;frameCount=Math.Min(frameCount+1,frameTimes.Length); } previousFrame=now;
            var keyboard=Keyboard.current;var mouse=Mouse.current;
            if(keyboard!=null && keyboard.escapeKey.wasPressedThisFrame) TogglePause();
            if(Paused) return;
            float dt=CombatDelta(Mathf.Min(Time.unscaledDeltaTime,.05f)); toastTime=Mathf.Max(0,toastTime-dt);
            if(Dead) { deathTime+=dt;playerRoot.position+=wreckVelocity*dt;wreckVelocity*=Mathf.Exp(-dt*.8f);damageVfx.Tick(dt);if(!ReducedMotion)visualMotion.Rotate(dt*9,0,dt*24);MoveCamera(dt,false);return; }
            UpdatePointer(mouse); bool fire=false,launch=false,breathFire=false;
            var input=ReadInput(keyboard,mouse,dt,ref fire,ref launch,ref breathFire);
            int slices=Mathf.Max(1,Mathf.CeilToInt(dt/(1f/60)));float step=dt/slices;
            for(int i=0;i<slices;i++) Simulate(step,input,fire);
            if(Dead){MoveCamera(dt,false);return;}
            if(launch) LaunchMissile(); if(breathFire) FireBreath();
            UpdatePresentation(dt); MoveCamera(dt,false);
        }

        void UpdatePointer(Mouse mouse)
        {
            if(mouse==null)return;
            Vector2 p=mouse.position.ReadValue();
            bool inside=p.x>1&&p.y>1&&p.x<Screen.width-1&&p.y<Screen.height-1;
            // An initial/focus/resize pointer state at a canvas edge is not a pilot command.
            if(inside&&(p-previousPointer).sqrMagnitude>.25f)pointerActive=true;previousPointer=p;
            pointer=new Vector2(p.x/Mathf.Max(1,Screen.width)*2-1,p.y/Mathf.Max(1,Screen.height)*2-1);
            pointer=new Vector2(Mathf.Clamp(pointer.x,-1,1),Mathf.Clamp(pointer.y,-1,1));
        }
        FlightInput ReadInput(Keyboard k,Mouse m,float dt,ref bool fire,ref bool launch,ref bool breathFire)
        {
            Vector2 steer=Vector2.zero;float throttle=0;bool boost=false,breakHeld=false;
            if(k!=null)
            {
                steer=new Vector2((k.rightArrowKey.isPressed?1:0)-(k.leftArrowKey.isPressed?1:0),(k.upArrowKey.isPressed?1:0)-(k.downArrowKey.isPressed?1:0));
                if(k.mKey.wasPressedThisFrame)SetMouseMode();
                if(k.tKey.wasPressedThisFrame&&combatArmed&&tuning.EnableWingman)SendWingman();
                Vector2 aimKeys=new Vector2((k.dKey.isPressed?1:0)-(k.aKey.isPressed?1:0),(k.wKey.isPressed?1:0)-(k.zKey.isPressed?1:0));
                if(aimKeys.sqrMagnitude>0) { aim+=aimKeys*dt*.9f;pointerActive=false; }
                else if(pointerActive && !RepairSelectorOpen) aim=pointer;
                if(k.xKey.wasPressedThisFrame){aim=Vector2.zero;pointerActive=false;}
                if(k.qKey.wasPressedThisFrame)RequestCombatRoll(-1);if(k.eKey.wasPressedThisFrame)RequestCombatRoll(1);
                if(UseSpacecraftDragon)breakHeld=k.bKey.isPressed;
                else if(k.bKey.wasPressedThisFrame){if(steer.x==0)Flight.RequestBreak();else Flight.RequestBreak(steer.x>0?1:-1);}
                throttle=(k.rKey.isPressed?1:0)-(k.fKey.isPressed?1:0);boost=k.leftShiftKey.isPressed||k.rightShiftKey.isPressed;
                if(k.tabKey.isPressed && !selectorConsumed && !Tactics.IsRepairing) {repairHold+=dt;if(repairHold>.15f)RepairSelectorOpen=true;}
                if(k.tabKey.wasReleasedThisFrame){repairHold=0;selectorConsumed=false;RepairSelectorOpen=false;}
                if(RepairSelectorOpen) {if(k.digit1Key.wasPressedThisFrame)ChooseRepair(0);if(k.digit2Key.wasPressedThisFrame)ChooseRepair(1);if(k.digit3Key.wasPressedThisFrame)ChooseRepair(2);}
                launch=k.enterKey.wasPressedThisFrame;breathFire=k.spaceKey.wasPressedThisFrame;
                if(k.f1Key.wasPressedThisFrame){Breath.Assist();Message("Assisted charge ready. Keep dodging and track a target.");}
                foreach(var key in k.allKeys) if(key.wasPressedThisFrame && key.name.Length==1) Breath.PressLetter(key.name[0]);
            }
            if(m!=null) {fire=m.leftButton.isPressed&&!RepairSelectorOpen;launch|=m.middleButton.wasPressedThisFrame&&!RepairSelectorOpen;}
            if(!combatArmed)
            {
                bool held=(m!=null&&(m.leftButton.isPressed||m.middleButton.isPressed)) || (k!=null&&(k.leftShiftKey.isPressed||k.rightShiftKey.isPressed||k.enterKey.isPressed||k.spaceKey.isPressed||k.bKey.isPressed||k.tKey.isPressed));
                if(!held)combatArmed=true;
                fire=launch=breathFire=boost=breakHeld=false;
            }
            if(steer==Vector2.zero && pointerActive && !MouseAimMode&&!RepairSelectorOpen) steer=Vector2.ClampMagnitude(pointer*1.18f,1);
            aim=new Vector2(Mathf.Clamp(aim.x,-.94f,.94f),Mathf.Clamp(aim.y,-.88f,.88f));
            return new FlightInput(steer,throttle,boost,breakHeld);
        }

        void Simulate(float dt,FlightInput input,bool fire)
        {
            if(Dead)return; elapsed+=dt;fireClock-=dt;collisionGrace-=dt;hitGrace-=dt;missileClock-=dt;
            Vector3 previousPosition=Flight.Position;
            Flight.Tick(dt,input,Tactics.BoostMultiplier,Tactics.CanBoost&&!HasGrappler,HasGrappler?tuning.GrapplerSpeedMultiplier:1);playerRoot.SetPositionAndRotation(Flight.Position,Flight.Rotation);
            AimWorld=gameCamera.ViewportPointToRay(new Vector3((aim.x+1)*.5f,(aim.y+1)*.5f,0)).GetPoint(450);
            foreach(var e in enemies)
            {
                if(e.Dead)continue;
#if DEVELOPMENT_BUILD || UNITY_EDITOR
                if(fixtureTarget && e==enemies[0]) {e.Position=Flight.Position+Flight.Forward*(qaCondition=="finisher"?tuning.FinisherRange*.8f:140);e.Visual.position=e.Position;e.TargetProgress=0;e.Locked=false;continue;}
#endif
                EnemyShot? shot=e.RolePilot.Tick(dt,elapsed,Flight);e.Position=e.RolePilot.Position;e.Visual.SetPositionAndRotation(e.Position,e.RolePilot.Rotation*Quaternion.Euler(0,180,0));
                e.TargetProgress=e.RolePilot.TargetProgress;e.Locked=e.RolePilot.Locked;
                if(shot.HasValue && !Quiet) SpawnBolt(shot.Value.Origin,shot.Value.Direction*210,true,7);
            }
            TickWingman(dt);
            TryFinishers();
            if(fire && fireClock<=0) {if(UseSpacecraftDragon)FireWingLasers();else FirePlasma();fireClock=FireInterval;}
            if(missileClock<=0 && !Quiet) {SpawnIncomingMissile();missileClock=HostileMissileInterval;}
            ResolveBolts(dt);ResolveMissiles(dt);ResolveRockCollision(previousPosition);
            if(Dead){OnDestroyed();return;}
#if DEVELOPMENT_BUILD || UNITY_EDITOR
            if(fixtureHitDelay>=0) {fixtureHitDelay-=dt;if(fixtureHitDelay<0) SpawnFixtureHit(fixtureHitSystem);}
#endif
            LockCandidate candidate=FindTarget();Tactics.TickLock(candidate);
            bool wasRepairing=Tactics.IsRepairing;int completed=Tactics.RepairsCompleted;DragonSystem repaired=Tactics.RepairSystem;int locks=Tactics.LocksConfirmed;
            Tactics.Tick(dt);
            if(Tactics.LocksConfirmed>locks)sound.PlayLockConfirmed();
            if(Tactics.RepairsCompleted>completed){damageVfx.CompleteRepair(repaired.ToString().ToLowerInvariant(),Tactics.PatchCount(repaired));sound.PlayRepair();Message("Field repair complete — patch installed");}
            else if(wasRepairing&&!Tactics.IsRepairing)damageVfx.CancelRepair();
            if(Tactics.RepairsInterrupted>interruptionObserved){interruptionObserved=Tactics.RepairsInterrupted;damageVfx.CancelRepair();Message("Repair interrupted — salvage and activation retained");}
            UpdateBreath(dt);
            salvage.Tick(dt);int collected=salvage.PickupWithin(Flight.Position,Tactics);if(collected>0){pickups+=collected;Message("Salvage recovered");sound.PlayRepair();}
            else foreach(var item in salvage.Items) if(Vector3.Distance(item.Position,Flight.Position)<tuning.SalvagePickupRadius && Tactics.Salvage>=tuning.SalvageCapacity) {Message("Salvage full");break;}
            UpdateSalvageVisuals();
            if(Dead)OnDestroyed();
            if(waveState.Tick(dt,AliveEnemies==0))SpawnWave();
        }
        bool Quiet {
            get {
#if DEVELOPMENT_BUILD || UNITY_EDITOR
                return fixtureQuiet;
#else
                return false;
#endif
            }
        }
        LockCandidate FindTarget()
        {
            string id=null;float best=999;Vector3 direction=(AimWorld-Muzzle).normalized;
            foreach(var e in enemies)if(!e.Dead)
            {
                Vector3 offset=e.Position-Muzzle;float angle=Vector3.Angle(direction,offset);
                if(offset.magnitude>tuning.LockRange||angle>tuning.LockConeDegrees||angle>=best||Blocked(Muzzle,e.Position))continue;
                best=angle;id=e.Id;
            }
            if(id!=null && Tactics.TrackingTargetId!=id)sound.PlayLockStart();
            return id==null?default:new LockCandidate(id);
        }
        Vector3 Muzzle => presentation!=null&&presentation.MuzzleTransform!=null?presentation.MuzzleTransform.position:Flight.Position+Flight.Forward*3.66f;
        Transform LaserLeft=>presentation.LaserMuzzleLeft??presentation.Socket("socket_wing_l");
        Transform LaserRight=>presentation.LaserMuzzleRight??presentation.Socket("socket_wing_r");
        static bool Blocked(Vector3 from,Vector3 to) => Physics.Linecast(from,to,EnvironmentMask,QueryTriggerInteraction.Ignore);

        void FireWingLasers()
        {
            Vector3 dir=(AimWorld-Muzzle).normalized;float best=.135f*Mathf.Rad2Deg;EnemyView assist=null;
            foreach(var e in enemies)if(!e.Dead && Vector3.Distance(Muzzle,e.Position)<650 && !Blocked(Muzzle,e.Position))
            {float angle=Vector3.Angle(dir,e.Position-Muzzle);if(angle<best && angle<.135f*Mathf.Rad2Deg*(e.Combat.Role==EnemyRole.Racer?tuning.RacerAssistMultiplier:1)){best=angle;assist=e;}}
            Vector3 point=assist!=null?assist.Position:AimWorld;
            laserTargets.Clear();for(int i=0;i<enemies.Count;i++)if(!enemies[i].Dead)laserTargets.Add(new WingLaserTarget(i,enemies[i].Position));
            lastLaserLeftOrigin=lastLaserLeftSocket=LaserLeft.position;lastLaserRightOrigin=lastLaserRightSocket=LaserRight.position;
            // Both rays observe the same pre-volley world before either can destroy a target.
            var leftHit=QueryLaser(lastLaserLeftOrigin,point);var rightHit=QueryLaser(lastLaserRightOrigin,point);
            lastLaserFiredAt=elapsed;lastLaserLeftEnd=leftHit.Endpoint;lastLaserRightEnd=rightHit.Endpoint;
            lastLaserLeftHit=leftHit.TargetIndex>=0;lastLaserRightHit=rightHit.TargetIndex>=0;
            ResolveLaser(leftHit);ResolveLaser(rightHit);lastLaserResolvedAt=elapsed;
            weaponVfx.PulseLasers(leftHit.Endpoint,rightHit.Endpoint);shotsFired++;laserBeamsFired+=2;sound.PlayFire();
        }
        void FirePlasma()
        {
            Vector3 direction=(AimWorld-Muzzle).normalized;float best=.135f*Mathf.Rad2Deg;EnemyView assist=null;
            foreach(var enemy in enemies)if(!enemy.Dead&&Vector3.Distance(Muzzle,enemy.Position)<650&&!Blocked(Muzzle,enemy.Position))
            {float angle=Vector3.Angle(direction,enemy.Position-Muzzle);if(angle<best && angle<.135f*Mathf.Rad2Deg*(enemy.Combat.Role==EnemyRole.Racer?tuning.RacerAssistMultiplier:1)){best=angle;assist=enemy;}}
            if(assist!=null)direction=Vector3.Slerp(direction,(assist.Position+assist.Pilot.Velocity*.25f-Muzzle).normalized,.82f);
            SpawnBolt(Muzzle,direction*330+Flight.Velocity,false,8);shotsFired++;sound.PlayFire();
        }
        WingLaserHit QueryLaser(Vector3 origin,Vector3 point)
        {
            Vector3 direction=(point-origin).normalized;
            float fraction=Physics.CheckSphere(origin,.08f,EnvironmentMask,QueryTriggerInteraction.Ignore)?0:
                ObstacleFraction(origin,origin+direction*WingLaserQuery.Range,.08f,out _);
            return WingLaserQuery.Resolve(origin,direction,laserTargets,Mathf.Min(1,fraction)*WingLaserQuery.Range);
        }
        void ResolveLaser(WingLaserHit hit)
        {
            if(hit.TargetIndex>=0){DamageEnemy(enemies[hit.TargetIndex],WingLaserQuery.DamagePerWing);ordinaryHits++;damageVfx.Burst(hit.Endpoint,3);}
            else if(hit.Blocked){damageVfx.Burst(hit.Endpoint,3);DetonateGasAt(hit.Endpoint);}
        }
        void SpawnBolt(Vector3 origin,Vector3 velocity,bool hostile,float damage)
        {
            if(bolts.Count>=96){Destroy(bolts[0].Visual.gameObject);bolts.RemoveAt(0);}
            Transform visual=Primitive(hostile?"Incoming plasma":"Dragon plasma",PrimitiveType.Capsule,hostile?EnemyProjectileMaterial:ProjectileMaterial,new Vector3(.16f,.8f,.16f));
            visual.position=origin;visual.rotation=Quaternion.LookRotation(velocity)*Quaternion.Euler(90,0,0);
            if(!hostile){lastPlasmaOrigin=visual.position;lastPlasmaMuzzle=Muzzle;lastPlasmaRecorded=true;}
            bolts.Add(new Bolt{Id=++projectileSequence,Position=origin,Velocity=velocity,Life=hostile?4.8f:2.5f,Damage=damage,Hostile=hostile,Visual=visual});
        }
        void ResolveBolts(float dt)
        {
            for(int i=bolts.Count-1;i>=0;i--)
            {
                var b=bolts[i];Vector3 next=b.Position+b.Velocity*dt;bool end=false;
                float obstacle=ObstacleFraction(b.Position,next,.15f,out Vector3 rockPoint);
                if(b.Hostile)
                {
                    if(!perfectRoll.IsHarmless(b.Id)&&SegmentSphere(b.Position,next,Flight.Position,PlayerRadius+1,out float t)&&t<obstacle){HitPlayer(LocalSystem(Vector3.Lerp(b.Position,next,t)),b.Damage,Vector3.Lerp(b.Position,next,t));end=true;}
                }
                else
                {
                    EnemyView hit=null;float nearest=obstacle;
                    foreach(var e in enemies)if(!e.Dead&&SegmentSphere(b.Position,next,e.Position,5,out float t)&&t<nearest){nearest=t;hit=e;}
                    if(hit!=null){DamageEnemy(hit,b.Damage);ordinaryHits++;damageVfx.Burst(Vector3.Lerp(b.Position,next,nearest),4);end=true;}
                }
                if(!end&&obstacle<=1){damageVfx.Burst(rockPoint,4);DetonateGasAt(rockPoint);end=true;}
                b.Position=next;b.Life-=dt;b.Visual.position=next;
                if(end||b.Life<=0){Destroy(b.Visual.gameObject);bolts.RemoveAt(i);}
            }
        }
        void LaunchMissile()
        {
            if(Dead||Paused)return;
            launchAttempts++;if(missiles.Count>=12){rejectedLaunches++;Message("Launcher busy — no charge spent");return;}
            EnemyView enemy=enemies.Find(e=>e.Id==Tactics.LockedTargetId&&!e.Dead);
            LockCandidate current=FindTarget();Tactics.TickLock(current);
            if(!Tactics.TryLaunch(enemy!=null&&current.Id==enemy.Id)){rejectedLaunches++;Message(Tactics.LastNotice);return;}
            AddMissile(Muzzle,(enemy.Position-Muzzle).normalized,enemy.Id,false);sound.PlayLaunch();Message("Missile away");
        }
        void AddMissile(Vector3 position,Vector3 direction,string target,bool hostile)
        {
            if(missiles.Count>=12)return;
            Transform visual=Primitive(hostile?"Incoming guided missile":"Dragon guided missile",PrimitiveType.Capsule,hostile?EnemyProjectileMaterial:ProjectileMaterial,new Vector3(.35f,1.5f,.35f));
            visual.position=position;var view=new MissileView {Id=++projectileSequence,State=new HomingMissile(position,direction,tuning),Target=target,Hostile=hostile,Visual=visual,RollAtLaunch=Flight.RollSerial};missiles.Add(view);
        }
        void SpawnIncomingMissile()
        {
            EnemyView e=enemies.Find(x=>!x.Dead&&x.Locked&&!Blocked(x.Position,Flight.Position));
            if(e!=null)AddMissile(e.Position,(Flight.Position-e.Position).normalized,"dragon",true);
        }
        void ResolveMissiles(float dt)
        {
            IncomingThreatWorld=null;float closest=float.MaxValue;
            for(int i=missiles.Count-1;i>=0;i--)
            {
                var m=missiles[i];EnemyView target=m.Hostile?null:enemies.Find(e=>e.Id==m.Target&&!e.Dead);
                if(m.Hostile&&Flight.RollSerial!=m.RollAtLaunch)m.Seeker=false;
                Vector3 destination=m.Hostile?Flight.Position:target!=null?target.Position:m.State.Position+m.State.Forward*1000;
                if(Blocked(m.State.Position,destination))m.Seeker=false;
                if(!m.Seeker)destination=m.State.Position+m.State.Forward*1000;
                m.State.Step(dt,destination,!m.Seeker?Vector3.zero:m.Hostile?Flight.Velocity:target!=null?target.RolePilot.Velocity:Vector3.zero);
                Vector3 from=m.State.PreviousPosition,to=m.State.Position;float obstacle=ObstacleFraction(from,to,.3f,out Vector3 rockPoint);bool hit=false;
                if(m.Hostile)
                {
                    if(!perfectRoll.IsHarmless(m.Id)&&SegmentSphere(from,to,Flight.Position,PlayerRadius,out float t)&&t<obstacle){HitPlayer(LocalSystem(Vector3.Lerp(from,to,t)),HostileMissileDamage,Vector3.Lerp(from,to,t));hit=true;}
                    float distance=Vector3.Distance(to,Flight.Position);if(m.Seeker&&distance<closest){closest=distance;IncomingThreatWorld=to;}
                }
                else
                {
                    EnemyView victim=null;float nearest=obstacle;
                    foreach(var e in enemies)if(!e.Dead&&SegmentSphere(from,to,e.Position,5.5f,out float t)&&t<nearest){nearest=t;victim=e;}
                    if(victim!=null){DamageEnemy(victim,tuning.MissileDamage,WeaponKind.Missile,from);missileHits++;damageVfx.Burst(Vector3.Lerp(from,to,nearest),20);sound.PlayExplosion();hit=true;}
                }
                if(!hit&&obstacle<=1){damageVfx.Burst(rockPoint,18);sound.PlayExplosion();MissileRockImpact(m,rockPoint);hit=true;}
                m.Visual.position=to;m.Visual.rotation=Quaternion.LookRotation(m.State.Forward)*Quaternion.Euler(90,0,0);
                if(hit||!m.State.Alive){Destroy(m.Visual.gameObject);missiles.RemoveAt(i);}
            }
            Tactics.IncomingLockedMissile=IncomingThreatWorld.HasValue;
        }
        void UpdateBreath(float dt)
        {
            breathCandidates.Clear();foreach(var e in enemies)
            {
                Vector3 screen=gameCamera.WorldToViewportPoint(e.Position);float error=Vector2.Distance(new Vector2(screen.x*2-1,screen.y*2-1),aim);
                breathCandidates.Add(new BreathCandidate(e.CombatId,Vector3.Distance(Flight.Position,e.Position),error,screen.z>0&&!Blocked(Muzzle,e.Position),e.Dead));
            }
            AddGasBreathCandidates();
            BreathImpact? impact=Breath.Tick(dt,breathCandidates);
            if(impact.HasValue)foreach(int id in impact.Value.TargetIds){if(id>=GasBreathIdBase){DetonateGas("gas-"+(id-GasBreathIdBase));continue;}var e=enemies.Find(x=>x.CombatId==id&&!x.Dead);if(e!=null&&!Blocked(Muzzle,e.Position))DamageEnemy(e,999,WeaponKind.Breath);}
        }
        void FireBreath()
        {
            if(Dead||Paused)return;
            if(Breath.RequestFire()){sound.PlayBreathWindup();Message("Dragon breath charging");}
            else Message(Breath.Phase==BreathPhase.Charging?"Finish the word while flying":"Hold the reticle on a clear bogey to lock breath");
        }
        void DamageEnemy(EnemyView e,float damage,WeaponKind weapon=WeaponKind.Primary,Vector3? origin=null)
        {
            if(e.Dead)return;
            var result=e.Combat.ApplyDamage(weapon,damage,(origin??Flight.Position)-e.Position,e.RolePilot.Rotation*Vector3.forward);
            if(result.Blocked){Message("SHIELDED — word breath breaks the front shield");return;}
            if(result.ShieldBroken){Message("SHIELD BROKEN — all weapons effective");sound.PlayExplosion();return;}
            if(!result.DisabledNow)return;
            e.Visual.gameObject.SetActive(false);e.TargetProgress=0;e.Locked=false;enemiesDestroyed++;
            salvage.Drop(e.Id,e.Position,e.RolePilot.Velocity);damageVfx.Burst(e.Position,36);sound.PlayExplosion();Message("Bogey disabled — recover salvage");
        }
        DragonSystem LocalSystem(Vector3 world)
        {
            Vector3 local=playerRoot.InverseTransformPoint(world);
            return Mathf.Abs(local.x)>1.1f?DragonSystem.Propulsion:local.z>1?DragonSystem.Weapons:DragonSystem.Hull;
        }
        void HitPlayer(DragonSystem system,float amount,Vector3 point)
        {
            if(Dead||(amount<tuning.RepairInterruptDamage&&hitGrace>0))return;
            // Preserve the original .65s ordinary-hit grace; substantial impacts still interrupt repairs.
            hitGrace=.65f;Tactics.ApplyDamage(system,amount);damageHits++;damageVfx.Burst(point,12);sound.PlayHit();
            if(!Tactics.IsRepairing)damageVfx.CancelRepair();
            Message(system+" hit");
        }
        void ResolveRockCollision(Vector3 previousPosition)
        {
            AsteroidClearance=-1;if(Quiet||Dead)return;
            if(Physics.SphereCast(Flight.Position,PlayerRadius+8,Flight.Forward,out RaycastHit warning,Flight.Speed*2.2f,EnvironmentMask,QueryTriggerInteraction.Ignore))AsteroidClearance=warning.distance;
            Vector3 delta=Flight.Position-previousPosition;Collider collider=null;Vector3 normal=Vector3.zero;
            if(delta.sqrMagnitude>.000001f&&Physics.SphereCast(previousPosition,PlayerRadius,delta.normalized,out RaycastHit impact,delta.magnitude,EnvironmentMask,QueryTriggerInteraction.Ignore))
            {collider=impact.collider;normal=impact.normal;}
            else if(Physics.OverlapSphereNonAlloc(Flight.Position,PlayerRadius,collisionBuffer,EnvironmentMask,QueryTriggerInteraction.Ignore)>0)
            {collider=collisionBuffer[0];normal=(previousPosition-collider.bounds.center).normalized;if(normal.sqrMagnitude<.1f)normal=-Flight.Forward;}
            if(collider==null||(collider==lastRock&&collisionGrace>0))return;
            CollisionImpactResult result=CollisionImpact.Evaluate(Flight.Velocity,normal,Tactics.Hull);
            float surfaceRadius=collider.bounds.extents.magnitude;
            Vector3 contact=collider.bounds.center+normal*surfaceRadius;
            Flight.ResolveContact(contact+normal*(PlayerRadius+1.5f),result.DeflectedVelocity);
            playerRoot.SetPositionAndRotation(Flight.Position,Flight.Rotation);
            collisionHits++;collisionGrace=.8f;lastRock=collider;
            HitPlayer(DragonSystem.Hull,result.Fatal?Tactics.Hull:result.Damage,contact);
            Message(result.Fatal?"IMPACT — ARMOR RUPTURE":"Armor graze — pull clear");
        }
        void OnDestroyed()
        {
            deathTime=0;wreckVelocity=Flight.Velocity*.35f;
            Breath.CancelBurst();Tactics.CancelRepair();damageVfx.CancelRepair();sound.StopCombat();sound.PlayExplosion();damageVfx.Burst(Flight.Position,48);
            for(int i=0;i<3;i++)damageVfx.SetDamage(((DragonSystem)i).ToString().ToLowerInvariant(),1-Tactics.GetHealth((DragonSystem)i)/tuning.MaxSystemHealth);
            weaponVfx.Clear();combatFeedback.Clear();perfectRoll.ClearSlowMotion();finisher.PauseClearFreeze();finisherFeedback.Clear();wingman.CancelRun();wingmanVisual.Clear();presentation.ShutdownPropulsion();lastBeam=false;mouthLight.enabled=false;Message("Dragon disabled — crew capsule secure. Restart the encounter.");
        }
        public void ChooseRepair(int index)
        {
            if(index<0||index>2||Dead)return;
            if(Tactics.TryStartRepair((DragonSystem)index))
            {repairStarts++;damageVfx.BeginRepair(((DragonSystem)index).ToString().ToLowerInvariant());sound.PlayRepair();Message("Maintenance drones working — keep maneuvering");}
            else Message(Tactics.LastNotice);
            RepairSelectorOpen=false;selectorConsumed=true;combatArmed=false;
        }
        void UpdatePresentation(float dt)
        {
            TickSceneryWeapons(dt);
            combatFeedback.Tick(dt,ReducedMotion);
            foreach(var enemy in enemies)enemy.RoleVisual?.Tick(enemy.Combat,elapsed,ReducedMotion);
            var burst=Breath.Burst;bool beamActive=burst!=null&&burst.Stage=="beam";
            float jaw=burst==null?(!UseSpacecraftDragon&&fireClock>0?-.18f:-.025f):burst.Stage=="windup"?-.04f-.30f*Mathf.SmoothStep(0,1,burst.Progress):-.36f;
            presentation.SetPropulsion(Mathf.InverseLerp(20,100,Flight.Speed),Flight.Boosting,Flight.BreakActive,ReducedMotion);
            presentation.Tick(dt,elapsed,Flight.Boosting,Flight.Bank,Flight.RollAngle,jaw,Flight.YawRate);
            finisherFeedback.Tick(dt,ReducedMotion);visualMotion.localPosition+=finisherFeedback.VisualLungeOffset;
            var allyTarget=enemies.Find(e=>e.Id==wingman.TargetId&&!e.Dead);
            wingmanVisual.Tick(dt,Flight,wingman,allyTarget!=null?(Vector3?)allyTarget.Position:null,ReducedMotion);
            for(int i=0;i<3;i++)damageVfx.SetDamage(((DragonSystem)i).ToString().ToLowerInvariant(),1-Tactics.GetHealth((DragonSystem)i)/tuning.MaxSystemHealth);
            damageVfx.SetRepairProgress(Tactics.RepairProgress);damageVfx.Tick(dt);sound.Tick(dt,Flight.Boosting&&!Dead);
            sound.SetAlarm(Dead?DogfightAlarm.None:(DogfightAlarm)(int)Tactics.HighestWarning);
            mouthLight.enabled=burst!=null;mouthLight.transform.position=Muzzle;mouthLight.intensity=beamActive?2.2f:burst==null?0:burst.Progress*2.5f;
            Vector3 end=AimWorld;
            if(beamActive)
            {
                var target=burst.TargetIds.Length>0?enemies.Find(e=>e.CombatId==burst.TargetIds[0]):null;
                end=target!=null?target.Position:AimWorld;
                if(Physics.Linecast(Muzzle,end,out RaycastHit hit,EnvironmentMask))end=hit.point;
                if(!lastBeam)sound.PlayBreathBeam();
            }
            weaponVfx.Tick(dt,burst,end,Flight.Forward,Flight.Up,ReducedMotion);
            lastBeam=beamActive;
        }
        void MoveCamera(float dt,bool snap)
        {
            bool zoom=Mouse.current!=null&&Mouse.current.rightButton.isPressed&&!RepairSelectorOpen;
            chaseCamera.Tick(dt,Flight,snap,zoom,ReducedMotion,Dead?(Vector3?)playerRoot.position:null);
            gameCamera.transform.SetPositionAndRotation(chaseCamera.Position,chaseCamera.Rotation);gameCamera.fieldOfView=chaseCamera.FieldOfView;
            if(starfield!=null)starfield.position=playerRoot.position*.96f;
        }
        void UpdateSalvageVisuals()
        {
            removedSalvage.Clear();foreach(var pair in salvageVisuals){bool exists=false;foreach(var item in salvage.Items)if(item.Id==pair.Key){exists=true;break;}if(!exists){Destroy(pair.Value.gameObject);removedSalvage.Add(pair.Key);}}
            foreach(string id in removedSalvage)salvageVisuals.Remove(id);
            foreach(var item in salvage.Items)
            {
                if(!salvageVisuals.TryGetValue(item.Id,out Transform visual)){visual=Primitive("Recoverable salvage "+item.Id,PrimitiveType.Cube,SalvageMaterial,Vector3.one*2.4f);salvageVisuals.Add(item.Id,visual);}
                visual.position=item.Position;visual.rotation=Quaternion.Euler(item.Age*18,item.Age*27,25);
            }
        }
        void BuildAsteroids()
        {
            var random=new System.Random(8024);
            for(int i=0;i<AsteroidCount;i++)
            {
                var rock=GameObject.CreatePrimitive(PrimitiveType.Sphere);rock.name="Solid asteroid "+i;rock.layer=8;
                var filter=rock.GetComponent<MeshFilter>();var mesh=Instantiate(filter.sharedMesh);mesh.name="Fractured asteroid "+i;generatedMeshes.Add(mesh);
                Vector3[] vertices=mesh.vertices;
                for(int j=0;j<vertices.Length;j++){Vector3 v=vertices[j];float noise=.83f+.18f*Mathf.Sin(v.x*19+v.y*8+i)+.11f*Mathf.Cos(v.z*23-v.x*7+i);vertices[j]=v*noise;}
                mesh.vertices=vertices;mesh.RecalculateNormals();mesh.RecalculateTangents();mesh.RecalculateBounds();filter.sharedMesh=mesh;
                rock.GetComponent<Renderer>().sharedMaterial=RockMaterial;
                float x=(float)(random.NextDouble()-.5)*1800;float y=(float)(random.NextDouble()-.5)*900;float z=(float)random.NextDouble()*6500-500;
                if(Mathf.Abs(x)<85&&Mathf.Abs(y)<75)x+=Mathf.Sign(x==0?1:x)*120;
                rock.transform.position=new Vector3(x,y,z);float scale=18+(float)random.NextDouble()*52;rock.transform.localScale=new Vector3(scale,scale*(.7f+(float)random.NextDouble()*.5f),scale*.9f);
                rock.transform.rotation=Quaternion.Euler((float)random.NextDouble()*360,(float)random.NextDouble()*360,(float)random.NextDouble()*360);rocks.Add(rock);rockPositions.Add(rock.transform.position);rockScales.Add(rock.transform.localScale);
            }
        }
        Transform Primitive(string title,PrimitiveType kind,Material material,Vector3 scale)
        {
            GameObject go=GameObject.CreatePrimitive(kind);go.name=title;Destroy(go.GetComponent<Collider>());var renderer=go.GetComponent<Renderer>();renderer.sharedMaterial=material;renderer.shadowCastingMode=ShadowCastingMode.Off;renderer.receiveShadows=false;go.transform.localScale=scale;return go.transform;
        }
        static float ObstacleFraction(Vector3 from,Vector3 to,float radius,out Vector3 point)
        {Vector3 delta=to-from;point=to;if(delta.sqrMagnitude>.000001f&&Physics.SphereCast(from,radius,delta.normalized,out RaycastHit hit,delta.magnitude,EnvironmentMask,QueryTriggerInteraction.Ignore)){point=hit.point;return hit.distance/delta.magnitude;}return 2;}
        public static bool SegmentSphere(Vector3 from,Vector3 to,Vector3 center,float radius,out float fraction)
        {
            Vector3 d=to-from,m=from-center;float c=Vector3.Dot(m,m)-radius*radius;fraction=0;if(c<=0)return true;
            float a=Vector3.Dot(d,d);if(a<1e-10f)return false;float b=Vector3.Dot(m,d),disc=b*b-a*c;if(disc<0)return false;
            float t=(-b-Mathf.Sqrt(disc))/a;if(t<0||t>1)return false;fraction=t;return true;
        }
        void ClearProjectiles(){foreach(var b in bolts)Destroy(b.Visual.gameObject);bolts.Clear();foreach(var m in missiles)Destroy(m.Visual.gameObject);missiles.Clear();IncomingThreatWorld=null;}
        void Message(string text){toast=text;toastTime=3.5f;}
        public void TogglePause()=>SetPaused(!Paused);
        void SetPaused(bool value){Paused=value;RepairSelectorOpen=false;repairHold=0;pointerActive=false;previousPointer=Mouse.current?.position.ReadValue()??Vector2.zero;combatArmed=false;if(value){Flight.CancelHeldBreak();perfectRoll.Pause();combatFeedback.Clear();finisher.PauseClearFreeze();finisherFeedback.Clear();}presentation.SetPaused(value);damageVfx.SetPaused(value);sound.SetPaused(value);}
        void OnApplicationFocus(bool focused){if(!focused&&initialized)SetPaused(true);}
        void OnApplicationPause(bool paused){if(paused&&initialized)SetPaused(true);}
        public void SetSoundEnabled(string value){SoundEnabled=value=="true"||value=="1";if(sound!=null)sound.SetEnabled(SoundEnabled);}
        public void SetReducedMotion(string value){ReducedMotion=value=="true"||value=="1";}
        public void SetMouseMode(){MouseAimMode=!MouseAimMode;pointerActive=false;Message(MouseAimMode?"Mouse aims — arrows fly":"Mouse flies and aims — arrows override");}
        void OnDestroy(){foreach(var gas in gasVisuals)gas.Dispose();wingmanVisual?.Dispose();foreach(var enemy in enemies)enemy.RoleVisual?.Dispose();draws.Dispose();triangles.Dispose();foreach(var mesh in generatedMeshes)Destroy(mesh);}

        [Serializable] sealed class Snapshot
        {
            public string scene="Unity Dogfight",engine="Unity",version="tactical-v1",word,breathPhase,breathStage,lockState,lockedTarget,warning,toast,graphics,device,animation,audio,modelName,rigProfile;
            public bool paused,dead,won,mouseAim,sound,repairing,selector,authoredClips,organicRig,boosting,beam,fixture,muzzleAttached,windupActive,lastPlasmaRecorded;
            public float elapsed,hull,propulsion,weapons,speed,boostEnergy,evasion,lockProgress,breathLockProgress,aimX,aimY,rechargeProgress,rechargeSeconds,repairProgress,fov,cameraTrailingDistance,flightWeight,glideWeight,boostWeight,frameMeanMs,frameP95Ms,textureAllocatedMiB;
            public int breathLockedCount;
            public int salvage,repairsRemaining,repairsCompleted,repairsInterrupted,missileCharges,missilesLaunched,missileHits,launchAttempts,rejectedLaunches,shotsFired,ordinaryHits,kills,pickups,damageHits,collisionHits,rolls,breaks,letterIndex,breathsFired,breathsResolved,missilesActive,boltsActive,particles,patches,drones,frameSamples,width,height,addedArmorTriangles;
            public long drawCalls,renderTriangles;public Vector3 position,forward,muzzle,muzzleScreen,windupOrigin,beamOrigin,beamCoreOrigin,lastPlasmaOrigin,lastPlasmaMuzzle;public EnemySnapshot[] enemies;public SalvageSnapshot[] debris;
            public bool spacecraft,breakActive,lasersActive,lastLaserLeftHit,lastLaserRightHit;
            public int wave,waveCount;
            public int rockShots,gasDetonations,gasPockets;public GasSnapshot[] gas;
            public int wingmanRuns;public bool wingmanRunning;public float wingmanCooldown;
            public int finishers;public float freezeRemaining;
            public int perfectRolls; public float combatTimeScale,slowRemaining; public string combatFlags,qaCondition;
            public float rollAngle,bankAngle,yawRate,lastLaserFiredAt,lastLaserResolvedAt,propulsionLevel;
            public int laserBeamsFired,playerBoltsActive,propulsionTriangles,wingMaterialCount;
            public Vector3 lastLaserLeftOrigin,lastLaserRightOrigin,lastLaserLeftSocket,lastLaserRightSocket,lastLaserLeftEnd,lastLaserRightEnd,laserLeft,laserRight,laserVisualLeft,laserVisualRight;
#if DEVELOPMENT_BUILD || UNITY_EDITOR
            public string skinWeightsStatus,runtimeQualitySkinWeights;
            public int maxMeshInfluences,skinnedMeshCount,unreadableSkinMeshes;
            public long totalPositiveInfluences; public bool allRendererQualityAuto;
            public string textureMode;public bool supportsBc7;
            public int modelTextureCount,modelBc7TextureCount,modelOtherTextureCount,modelTexturesReadableCount;
            public long modelTextureAllocatedBytes;public string[] modelTextureFormats;
#endif
        }
        [Serializable] sealed class EnemySnapshot {public string id,role;public float health,maxHealth,distance,screenX,screenY,screenZ,threat;public bool dead,shield,latched,stunned;public Vector3 position;}
        [Serializable] sealed class GasSnapshot {public string id;public bool detonated;public Vector3 position;public float screenX,screenY,screenZ;}
        [Serializable] sealed class SalvageSnapshot {public string id;public Vector3 position;public float distance,screenX,screenY;}
        [DllImport("__Internal")] static extern void SD_DogfightSnapshot(string json);
        public void RequestSnapshot()
        {
            if(!initialized)return;string json=SnapshotJson();
#if UNITY_WEBGL && !UNITY_EDITOR
            SD_DogfightSnapshot(json);
#else
            LastSnapshot=json;
#endif
        }
        public string LastSnapshot { get; private set; }
        public string SnapshotJson()
        {
            if(Time.realtimeSinceStartup-lastTextureMeasure>5){lastTextureMeasure=Time.realtimeSinceStartup;textureBytes=0;foreach(var t in Resources.FindObjectsOfTypeAll<Texture>())textureBytes+=UnityEngine.Profiling.Profiler.GetRuntimeMemorySizeLong(t);}
            var frames=new float[frameCount];Array.Copy(frameTimes,frames,frameCount);Array.Sort(frames);float total=0;foreach(float f in frames)total+=f;
            var s=new Snapshot {word=Breath.Word,breathPhase=Breath.Phase.ToString(),breathStage=Breath.Burst?.Stage??"",breathLockProgress=Breath.LockProgress,breathLockedCount=Breath.LockedIds.Length,aimX=aim.x,aimY=aim.y,lockState=Tactics.LockState.ToString(),lockedTarget=Tactics.LockedTargetId,warning=Tactics.HighestWarning.ToString(),toast=Toast,graphics=SystemInfo.graphicsDeviceType.ToString(),device=SystemInfo.graphicsDeviceName,
                paused=Paused,dead=Dead,won=Won,mouseAim=MouseAimMode,sound=SoundEnabled,repairing=Tactics.IsRepairing,selector=RepairSelectorOpen,authoredClips=presentation.UsesAuthoredClips,organicRig=presentation.UsesOrganicRig,boosting=Flight.Boosting,beam=lastBeam,fixture=Quiet,
                elapsed=elapsed,hull=Tactics.Hull,propulsion=Tactics.Propulsion,weapons=Tactics.Weapons,speed=Flight.Speed,boostEnergy=Flight.BoostEnergy,evasion=Flight.EvasionEnergy,lockProgress=Tactics.LockProgress,rechargeProgress=Tactics.RechargeProgress,rechargeSeconds=Tactics.RechargeSecondsRemaining,repairProgress=Tactics.RepairProgress,fov=gameCamera.fieldOfView,cameraTrailingDistance=Vector3.Dot(chaseCamera.Anchor-gameCamera.transform.position,Flight.Forward),
                salvage=Tactics.Salvage,repairsRemaining=Tactics.RepairsRemaining,repairsCompleted=Tactics.RepairsCompleted,repairsInterrupted=Tactics.RepairsInterrupted,missileCharges=Tactics.MissileCharges,missilesLaunched=Tactics.MissilesLaunched,missileHits=missileHits,launchAttempts=launchAttempts,rejectedLaunches=rejectedLaunches,shotsFired=shotsFired,ordinaryHits=ordinaryHits,kills=enemiesDestroyed,pickups=pickups,damageHits=damageHits,collisionHits=collisionHits,rolls=Flight.RollSerial,breaks=Flight.BreakSerial,letterIndex=Breath.LetterIndex,breathsFired=Breath.BurstsFired,breathsResolved=Breath.BurstsResolved,missilesActive=missiles.Count,boltsActive=bolts.Count,
                particles=damageVfx.ActiveParticles,patches=damageVfx.PatchCount,drones=damageVfx.VisibleDrones,animation=presentation.ActiveState,flightWeight=presentation.FlightWeight,glideWeight=presentation.GlideWeight,boostWeight=presentation.BoostWeight,audio=sound.CueStatus,
                frameSamples=frameCount,frameMeanMs=frameCount>0?total/frameCount:0,frameP95Ms=frameCount>0?frames[Mathf.Min(frameCount-1,(int)(frameCount*.95f))]:0,width=Screen.width,height=Screen.height,drawCalls=draws.Valid?draws.LastValue:-1,renderTriangles=triangles.Valid?triangles.LastValue:-1,textureAllocatedMiB=textureBytes/1048576,addedArmorTriangles=presentation.AddedTriangles,
                position=Flight.Position,forward=Flight.Forward,muzzle=Muzzle,modelName=model.name,rigProfile=presentation.RigProfile,muzzleAttached=presentation.MuzzleTransform!=null,muzzleScreen=gameCamera.WorldToViewportPoint(Muzzle),
                windupActive=weaponVfx.WindupActive,windupOrigin=weaponVfx.WindupOrigin,
                beamOrigin=weaponVfx.BeamOrigin,beamCoreOrigin=weaponVfx.BeamCoreOrigin,
                spacecraft=presentation.UsesSpacecraftMode,breakActive=Flight.BreakActive,rollAngle=Flight.RollAngle,bankAngle=Flight.Bank,yawRate=Flight.YawRate,
                lasersActive=weaponVfx.LasersActive,laserBeamsFired=laserBeamsFired,playerBoltsActive=bolts.FindAll(b=>!b.Hostile).Count,
                lastLaserFiredAt=lastLaserFiredAt,lastLaserResolvedAt=lastLaserResolvedAt,lastLaserLeftHit=lastLaserLeftHit,lastLaserRightHit=lastLaserRightHit,
                lastLaserLeftOrigin=lastLaserLeftOrigin,lastLaserRightOrigin=lastLaserRightOrigin,lastLaserLeftSocket=lastLaserLeftSocket,lastLaserRightSocket=lastLaserRightSocket,
                lastLaserLeftEnd=lastLaserLeftEnd,lastLaserRightEnd=lastLaserRightEnd,laserLeft=LaserLeft.position,laserRight=LaserRight.position,
                laserVisualLeft=weaponVfx.LeftLaserOrigin,laserVisualRight=weaponVfx.RightLaserOrigin,
                propulsionTriangles=presentation.PropulsionTriangles,propulsionLevel=presentation.PropulsionLevel,wingMaterialCount=presentation.WingMaterialCount,
                lastPlasmaRecorded=lastPlasmaRecorded,lastPlasmaOrigin=lastPlasmaOrigin,lastPlasmaMuzzle=lastPlasmaMuzzle,
                enemies=new EnemySnapshot[enemies.Count],debris=new SalvageSnapshot[salvage.Items.Count]};
#if DEVELOPMENT_BUILD || UNITY_EDITOR
            var skinEvidence=presentation.SkinWeights;
            s.skinWeightsStatus=skinEvidence.status; s.runtimeQualitySkinWeights=skinEvidence.runtimeQualitySkinWeights;
            s.maxMeshInfluences=skinEvidence.maxMeshInfluences; s.skinnedMeshCount=skinEvidence.skinnedMeshCount;
            s.unreadableSkinMeshes=skinEvidence.unreadableSkinMeshes; s.totalPositiveInfluences=skinEvidence.totalPositiveInfluences;
            s.allRendererQualityAuto=skinEvidence.allRendererQualityAuto;
            var textureEvidence=presentation.Textures;s.textureMode=DragonTextureMode;s.supportsBc7=textureEvidence.supportsBc7;
            s.modelTextureCount=textureEvidence.count;s.modelBc7TextureCount=textureEvidence.bc7Count;s.modelOtherTextureCount=textureEvidence.otherCount;
            s.modelTexturesReadableCount=textureEvidence.readableCount;s.modelTextureAllocatedBytes=textureEvidence.allocatedBytes;s.modelTextureFormats=textureEvidence.formats;
#endif
            s.rockShots=rockShotCount;s.gasDetonations=gasDetonations;s.gasPockets=rockWeapons.Pockets.Count;s.wingmanRuns=wingman.RunsSent;s.wingmanRunning=wingman.Running;s.wingmanCooldown=wingman.CooldownRemaining;s.finishers=finisher.Serial;s.freezeRemaining=finisher.FreezeRemaining;s.wave=waveState.Index+1;s.waveCount=waveState.Count;s.perfectRolls=perfectRoll.Serial;s.combatTimeScale=CurrentCombatTimeScale;s.slowRemaining=perfectRoll.SlowRemaining;s.combatFlags=CombatFlags;s.qaCondition=qaCondition;
            for(int i=0;i<enemies.Count;i++){var e=enemies[i];Vector3 p=gameCamera.WorldToViewportPoint(e.Position);s.enemies[i]=new EnemySnapshot{id=e.Id,role=e.Combat.Role.ToString(),shield=e.Combat.ShieldIntact,latched=e.Combat.Latched,stunned=e.Combat.Stunned,maxHealth=e.Combat.MaximumHealth,health=e.Health,dead=e.Dead,position=e.Position,distance=Vector3.Distance(e.Position,Flight.Position),screenX=p.x,screenY=1-p.y,screenZ=p.z,threat=e.TargetProgress};}
            s.gas=new GasSnapshot[rockWeapons.Pockets.Count];for(int i=0;i<s.gas.Length;i++){var gas=rockWeapons.Pockets[i];var v=gameCamera.WorldToViewportPoint(gas.Position);s.gas[i]=new GasSnapshot{id=gas.Id,detonated=gas.Detonated,position=gas.Position,screenX=v.x,screenY=1-v.y,screenZ=v.z};}
            for(int i=0;i<salvage.Items.Count;i++){var item=salvage.Items[i];Vector3 p=gameCamera.WorldToViewportPoint(item.Position);s.debris[i]=new SalvageSnapshot{id=item.Id,position=item.Position,distance=Vector3.Distance(item.Position,Flight.Position),screenX=p.x,screenY=1-p.y};}
            return JsonUtility.ToJson(s);
        }

        // Reproducible QA conditions only; compiled out of release players. All launches,
        // collisions, repair completion and spending still go through the production state.
        public void QaFixture(string action)
        {
#if DEVELOPMENT_BUILD || UNITY_EDITOR
            if(!initialized)return;
            qaCondition=action;if(CombatQaFixture(action))return;
            if(action=="quiet"){fixtureQuiet=true;ClearProjectiles();}
            else if(action=="target"){fixtureQuiet=true;fixtureTarget=true;ClearProjectiles();aim=Vector2.zero;pointerActive=false;MouseAimMode=true;}
            else if(action=="supply"){Tactics.AddSalvage(3);}
            else if(action.StartsWith("damage:")){var system=(DragonSystem)int.Parse(action.Substring(7));Tactics.ApplyDamage(system,55);}
            else if(action.StartsWith("interrupt:")){fixtureHitSystem=(DragonSystem)int.Parse(action.Substring(10));fixtureHitDelay=1;}
            else if(action=="incoming"){AddMissile(Flight.Position+Flight.Forward*250,-Flight.Forward,"dragon",true);}
            else if(action=="crash"){fixtureQuiet=false;var rock=rocks[0];rock.transform.position=Flight.Position+Flight.Forward*12;rock.transform.localScale=Vector3.one*35;}
            else if(action=="disable"){HitPlayer(DragonSystem.Hull,100,Flight.Position);OnDestroyed();}
            else if(action=="resetPerf"){frameCount=frameIndex=0;previousFrame=0;}
#endif
        }
#if DEVELOPMENT_BUILD || UNITY_EDITOR
        void SpawnFixtureHit(DragonSystem system)
        {
            Vector3 offset=system==DragonSystem.Propulsion?playerRoot.right*2.5f:system==DragonSystem.Weapons?Flight.Forward*2.5f:-Flight.Forward*2.5f;
            Vector3 origin=Flight.Position+offset+Flight.Up*18;SpawnBolt(origin,-Flight.Up*180+Flight.Velocity,true,18);
        }
#endif
    }
}
