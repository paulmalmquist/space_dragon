using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Rendering;
using SpaceDragon.TownDrive.UnityRuntime;

namespace SpaceDragon.TownDrive.Runtime
{
    [Serializable] public sealed class TownDriveSnapshot
    {
        public string scene="TownDrive", checkpointId, street, cameraMode, saveStatus, error;
        public string graphicsDeviceType,graphicsDeviceName,graphicsDeviceVersion,processorType;
        public bool ready, paused, completed, assist, cabinVisible;
        public double elapsed, x,z,yaw,speed,routeS,lookYaw,bonkSeconds,frontGlazingAlpha;
        public string[] visited;
        public int trafficCount,pedestrianCount,visibleTraffic,visiblePedestrians,ticks,frames,dashboardMph,frameSampleCount;
        public float meanFrameMs,p95FrameMs;
        public bool rearViewActive,rearViewSupported;
        public int rearViewCaptures;
        public float rearViewCaptureCpuMs;
        public double frameSeconds,droppedSeconds,displayedYaw,displayedSpeed;
        public Vector3 displayedCarPosition,cameraPosition,cabinEyeLocal;
        public RouteSample targetAhead;
        public double recommendedSpeed;
        public DriveTrafficSnapshot[] traffic;
        public DriveWalkerSnapshot[] pedestrians;
        public DriveSignalSnapshot[] signals;
    }
    [Serializable] public struct DriveTrafficSnapshot { public string id,kind; public double x,z,yaw,speed,s; public int direction,lane; public bool braking; }
    [Serializable] public struct DriveWalkerSnapshot { public string id; public double x,y,z,walkPhase,footHeight;public int animationFrame; }
    [Serializable] public struct DriveSignalSnapshot { public string id,phase; public double s; }

    /// <summary>Detailed scene host. Transform animation observes the same interpolated pose as the camera.</summary>
    [DisallowMultipleComponent]
    public sealed class TownDriveExperience : MonoBehaviour
    {
        [SerializeField] private TextAsset routeData;
        [SerializeField] private Transform playerRoot;
        [SerializeField] private Camera driveCamera;
        [SerializeField] private GameObject[] trafficTemplates=Array.Empty<GameObject>();
        [SerializeField] private GameObject[] pedestrianTemplates=Array.Empty<GameObject>();
        [SerializeField] private AnimationClip[] pedestrianWalks=Array.Empty<AnimationClip>();
        [SerializeField] private DriveObstacle[] sceneObstacles=Array.Empty<DriveObstacle>();
        [SerializeField] private RenderPipelineAsset townDrivePipeline;
        private RenderPipelineAsset previousDefaultPipeline,previousQualityPipeline;
        private bool ownsPipeline;
        private TownDriveSession session;
        private TownDriveSave save;
        private TownDriveRearView rearView;
        private readonly TownDriveInputLatch inputLatch=new TownDriveInputLatch();
        private DriveInput controls;
        private readonly List<Transform> frontWheels=new List<Transform>(),spinWheels=new List<Transform>();
        private readonly Dictionary<Transform,Quaternion> wheelBases=new Dictionary<Transform,Quaternion>();
        private readonly List<GameObject> cabinDetails=new List<GameObject>();
        private Transform steeringWheel,headrest;
        private TownDriveDashboard dashboard;
        private Quaternion steeringBase;
        private readonly Dictionary<string,GameObject> trafficModels=new Dictionary<string,GameObject>(),walkerModels=new Dictionary<string,GameObject>();
        private readonly Dictionary<string,TrafficAppearance> trafficAppearance=new Dictionary<string,TrafficAppearance>();
        private TownDrivePedestrianGrounding[] walkerGrounding=Array.Empty<TownDrivePedestrianGrounding>();
        private sealed class TrafficAppearance {public readonly List<Renderer> brakes=new List<Renderer>();}
        private static readonly string[] TrafficPaints={"#e6e8e5","#27323c","#a5a9ad","#792629","#284756","#b4aa91","#d8dce2","#38483a"};
        private readonly List<DriveTrafficSnapshot> trafficSnapshot=new List<DriveTrafficSnapshot>();
        private readonly List<DriveWalkerSnapshot> walkerSnapshot=new List<DriveWalkerSnapshot>();
        private readonly HashSet<string> activeTraffic=new HashSet<string>(),activeWalkers=new HashSet<string>();
        private readonly List<SignalMaterial> signalMaterials=new List<SignalMaterial>();
        private readonly List<Material> frontGlazingMaterials=new List<Material>();
        private sealed class SignalMaterial{public string id,phase;public Material material;public Color color;}
        private bool cabin,ready,confirmFreshStart;
        private double lookYaw,visualSteer,wheelSpin,framedSpeed;
        private float lookInput,lastFrameSeconds;
        private readonly float[] frameSamples=new float[240];
        private int frameSampleCount,frameSampleIndex;
        private int frames;
        private string error="";
        private DrivePose renderedPose;
        private GUIStyle titleStyle,bodyStyle;
#if UNITY_EDITOR || DEVELOPMENT_BUILD
        private bool reviewInputActive;
        private DriveInput reviewInput;
#endif
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] private static extern void TownDriveReceiveSnapshot(string json);
#endif
        public TownDriveSession Session=>session;
        public void ConfigurePipeline(RenderPipelineAsset pipeline)=>townDrivePipeline=pipeline;
        public void Configure(TextAsset data,Transform car,Camera camera,GameObject[] traffic,GameObject[] pedestrians,AnimationClip[] walks,DriveObstacle[] obstacles=null)
        {
            routeData=data;playerRoot=car;driveCamera=camera;trafficTemplates=traffic??Array.Empty<GameObject>();pedestrianTemplates=pedestrians??Array.Empty<GameObject>();
            pedestrianWalks=walks??Array.Empty<AnimationClip>();sceneObstacles=obstacles??Array.Empty<DriveObstacle>();
        }
        private void Start()
        {
            try
            {
                if(townDrivePipeline!=null)
                {
                    previousDefaultPipeline=GraphicsSettings.defaultRenderPipeline;previousQualityPipeline=QualitySettings.renderPipeline;
                    GraphicsSettings.defaultRenderPipeline=townDrivePipeline;QualitySettings.renderPipeline=townDrivePipeline;ownsPipeline=true;
                }
                if(playerRoot==null||driveCamera==null)throw new InvalidOperationException("Town Drive scene has no car or camera binding.");
                var data=TownDriveJson.Load(routeData);var simulation=new DriveSimulation(new DriveRoute(data.route));
                save=new TownDriveSave(new TownDrivePlayerPreferences(),simulation);session=new TownDriveSession(data,save.Load(),sceneObstacles);
                session.CheckpointChanged+=OnCheckpointChanged;
                walkerGrounding=new TownDrivePedestrianGrounding[pedestrianTemplates.Length];
                for(int i=0;i<pedestrianTemplates.Length;i++)
                {
                    if(i>=pedestrianWalks.Length)throw new InvalidOperationException("Pedestrian template has no corresponding walk clip.");
                    walkerGrounding[i]=TownDrivePedestrianGrounding.Bake(pedestrianTemplates[i],pedestrianWalks[i]);
                }
                foreach(var node in playerRoot.GetComponentsInChildren<Transform>(true))
                {
                    if(node.name.StartsWith("drive.car.wheel-spin.",StringComparison.Ordinal)){spinWheels.Add(node);wheelBases[node]=node.localRotation;}
                    if(node.name.StartsWith("drive.car.wheel-steer.",StringComparison.Ordinal)&&node.localPosition.z>0){frontWheels.Add(node);wheelBases[node]=node.localRotation;}
                    if(node.name=="drive.car.steering-wheel"){steeringWheel=node;steeringBase=node.localRotation;}
                    if(node.name.StartsWith("drive.car.cabin-detail",StringComparison.Ordinal)||node.name=="drive.car.steering-detail")cabinDetails.Add(node.gameObject);
                    if(node.name=="drive.car.driver-headrest")headrest=node;
                }
                dashboard=TownDriveDashboard.Create(playerRoot);if(dashboard!=null)cabinDetails.Add(dashboard.Root);
                rearView=playerRoot.GetComponent<TownDriveRearView>();
                BindFrontGlazing();BindSignalMaterials();driveCamera.nearClipPlane=.06f;driveCamera.farClipPlane=620;ApplyCabinVisibility();ready=true;Render(0,true);RequestSnapshot();
            }
            catch(Exception exception){ready=false;error=exception.Message;Debug.LogException(exception,this);RequestSnapshot();}
        }
        private void OnCheckpointChanged(DriveState state)=>save.Save(state);
        private static bool Down(UnityEngine.InputSystem.Controls.ButtonControl a,UnityEngine.InputSystem.Controls.ButtonControl b)=>a.isPressed||b.isPressed;
        private void Update()
        {
            if(!ready)return;
            frames++;lastFrameSeconds=Time.unscaledDeltaTime;
            frameSamples[frameSampleIndex]=lastFrameSeconds*1000;frameSampleIndex=(frameSampleIndex+1)%frameSamples.Length;
            frameSampleCount=Math.Min(frameSamples.Length,frameSampleCount+1);
            var keyboard=Keyboard.current;
            if(keyboard!=null)
            {
                if(keyboard.escapeKey.wasPressedThisFrame||keyboard.pKey.wasPressedThisFrame)TogglePause();
                if(keyboard.cKey.wasPressedThisFrame)CycleCamera();
                if(keyboard.rKey.wasPressedThisFrame)ResetCheckpoint();
                if(keyboard.fKey.wasPressedThisFrame)ToggleAssist();
                var raw=new DriveInput {throttle=Down(keyboard.wKey,keyboard.upArrowKey)?1:0,brake=Down(keyboard.sKey,keyboard.downArrowKey)?1:0,
                    steer=(Down(keyboard.dKey,keyboard.rightArrowKey)?1:0)-(Down(keyboard.aKey,keyboard.leftArrowKey)?1:0),handbrake=keyboard.spaceKey.isPressed};
                bool physicalDrivingKeyHeld=Down(keyboard.wKey,keyboard.upArrowKey)||Down(keyboard.sKey,keyboard.downArrowKey)||
                    Down(keyboard.aKey,keyboard.leftArrowKey)||Down(keyboard.dKey,keyboard.rightArrowKey)||keyboard.spaceKey.isPressed;
                controls=inputLatch.Filter(raw,physicalDrivingKeyHeld);lookInput=session.Paused?0:(keyboard.eKey.isPressed?1:0)-(keyboard.qKey.isPressed?1:0);
            }
            else{controls=new DriveInput();lookInput=0;}
#if UNITY_EDITOR || DEVELOPMENT_BUILD
            if(reviewInputActive)controls=reviewInput;
#endif
            if(session.Paused){controls=new DriveInput();lookInput=0;}
            session.Advance(lastFrameSeconds,controls);Render(lastFrameSeconds);
        }
        private void ReleaseInput()
        {
            controls=new DriveInput();lookInput=0;lookYaw=0;inputLatch.Clear();
#if UNITY_EDITOR || DEVELOPMENT_BUILD
            reviewInputActive=false;reviewInput=new DriveInput();
#endif
        }
        public void TogglePause(){if(!ready)return;ReleaseInput();session.SetPaused(!session.Paused);Render(0,true);}
        public void Resume(){if(ready&&session.Paused)TogglePause();}
        public void ResetCheckpoint(){if(!ready)return;ReleaseInput();session.Reset();visualSteer=0;Render(0,true);RequestSnapshot();}
        public void CycleCamera(){if(!ready)return;cabin=!cabin;lookYaw=0;lookInput=0;ApplyCabinVisibility();Render(0,true);}
        public void ToggleAssist(){if(ready)session.SetAssist(!session.State.assist);}
        private void OnApplicationFocus(bool focused){if(!focused&&ready){ReleaseInput();session.SetPaused(true);Render(0,true);}}
        private void OnApplicationPause(bool paused){if(paused&&ready){ReleaseInput();session.SetPaused(true);Render(0,true);}}
        private void ApplyCabinVisibility()
        {
            foreach(var detail in cabinDetails)detail.SetActive(cabin);
            if(headrest!=null)headrest.gameObject.SetActive(!cabin);
            Color color;ColorUtility.TryParseHtmlString(cabin?"#c3d2d3":"#273840",out color);color=color.linear;color.a=cabin?.10f:.55f;
            foreach(var material in frontGlazingMaterials)foreach(string property in new[]{"_BaseColor","_Color","baseColorFactor"})
                if(material.HasProperty(property))material.SetColor(property,BaseColorForProperty(property,color));
        }
        private static Color BaseColorForProperty(string property,Color linear)
        {
            // glTFast ShaderGraphMaterialGenerator writes baseColorLinear.gamma
            // to its baseColorFactor; its shader performs the conversion back.
            // Standard/URP aliases retain the existing linear-color convention.
            return property=="baseColorFactor"?linear.gamma:linear;
        }
        private void BindFrontGlazing()
        {
            var replacements=new Dictionary<Material,Material>();
            foreach(var renderer in playerRoot.GetComponentsInChildren<Renderer>(true))
            {
                var materials=renderer.sharedMaterials;bool changed=false;
                for(int i=0;i<materials.Length;i++)
                {
                    var source=materials[i];if(source==null||!source.name.StartsWith("drive.car.clear-front-glazing",StringComparison.Ordinal))continue;
                    if(!replacements.TryGetValue(source,out var copy)){copy=new Material(source);replacements[source]=copy;frontGlazingMaterials.Add(copy);}
                    materials[i]=copy;changed=true;
                }
                if(changed)renderer.sharedMaterials=materials;
            }
        }
        private void Render(double dt,bool snap=false)
        {
            renderedPose=snap?session.State.Pose():session.Presentation();
            var position=new Vector3((float)renderedPose.x,0,(float)renderedPose.z);var rotation=Quaternion.Euler(0,(float)(renderedPose.yaw*Mathf.Rad2Deg),0);
            playerRoot.SetPositionAndRotation(position,rotation);
            double weight=snap?1:1-Math.Exp(-Math.Min(.1,dt)*14);
            lookYaw+=(lookInput*1.48-lookYaw)*weight;framedSpeed+=(Math.Min(1,Math.Abs(renderedPose.speed)/25)-framedSpeed)*(snap?1:1-Math.Exp(-Math.Min(.1,dt)*7));
            visualSteer=snap?controls.steer:DrivePresentation.SmoothSteering(visualSteer,controls.steer,dt,session.Paused);
            if(!session.Paused)wheelSpin=(wheelSpin+renderedPose.speed*Math.Min(.1,dt)/.37)%(Math.PI*2);
            foreach(var wheel in frontWheels)wheel.localRotation=wheelBases[wheel]*Quaternion.AngleAxis((float)(visualSteer*.42*Mathf.Rad2Deg),Vector3.up);
            foreach(var wheel in spinWheels)wheel.localRotation=wheelBases[wheel]*Quaternion.AngleAxis((float)(wheelSpin*Mathf.Rad2Deg),Vector3.right);
            if(steeringWheel!=null)steeringWheel.localRotation=steeringBase*Quaternion.AngleAxis((float)(-visualSteer*2.25*Mathf.Rad2Deg),Vector3.forward);
            var frame=TownDriveCameraFrame.At(renderedPose,cabin,lookYaw,framedSpeed);
            driveCamera.transform.SetPositionAndRotation(frame.position,frame.rotation);driveCamera.fieldOfView=frame.fieldOfView;
            dashboard?.Update(renderedPose.speed);
            RenderPopulation();
            rearView?.Tick(cabin,session.Paused);
            foreach(var light in signalMaterials)
            {
                var signal=Array.Find(session.Traffic.Signals,item=>item.id==light.id);if(signal==null)continue;
                bool on=DriveTraffic.Phase(signal,session.Traffic.ElapsedSeconds)==light.phase;var color=light.color*(on?.8f:.035f);color.a=1;
                foreach(string property in new[]{"_BaseColor","_Color","baseColorFactor"})if(light.material.HasProperty(property))light.material.SetColor(property,BaseColorForProperty(property,color));
                foreach(string property in new[]{"_EmissionColor","emissiveFactor"})if(light.material.HasProperty(property))light.material.SetColor(property,light.color*(on?1.1f:0));
            }
        }
        private void BindSignalMaterials()
        {
            var replacements=new Dictionary<Material,Material>();
            foreach(var renderer in FindObjectsByType<Renderer>(FindObjectsInactive.Include))
            {
                var materials=renderer.sharedMaterials;bool changed=false;
                for(int i=0;i<materials.Length;i++)
                {
                    var source=materials[i];if(source==null)continue;int marker=source.name.IndexOf(".signal.traffic-signal.",StringComparison.Ordinal);if(marker<0)continue;
                    if(!replacements.TryGetValue(source,out var copy))
                    {
                        string suffix=source.name.Substring(marker+8);string phase=suffix.EndsWith(".red",StringComparison.Ordinal)?"red":suffix.EndsWith(".amber",StringComparison.Ordinal)?"amber":suffix.EndsWith(".green",StringComparison.Ordinal)?"green":null;
                        if(phase==null)continue;string id=suffix.Substring(0,suffix.Length-phase.Length-1);copy=new Material(source);copy.EnableKeyword("_EMISSION");copy.EnableKeyword("_EMISSIVE");replacements[source]=copy;
                        Color color;ColorUtility.TryParseHtmlString(phase=="red"?"#ff3924":phase=="amber"?"#ffc444":"#52e786",out color);
                        signalMaterials.Add(new SignalMaterial{id=id,phase=phase,material=copy,color=color.linear});
                    }
                    materials[i]=copy;changed=true;
                }
                if(changed)renderer.sharedMaterials=materials;
            }
        }
        private GameObject TrafficTemplate(string kind)
        {
            foreach(var template in trafficTemplates)if(template!=null&&template.name.IndexOf(kind,StringComparison.OrdinalIgnoreCase)>=0)return template;
            return trafficTemplates.Length>0?trafficTemplates[0]:null;
        }
        private static void DisableAutonomousAnimation(GameObject model)
        {
            foreach(var animator in model.GetComponentsInChildren<Animator>(true))animator.enabled=false;
            foreach(var animation in model.GetComponentsInChildren<Animation>(true))animation.enabled=false;
        }
        private static TrafficAppearance BindTrafficAppearance(GameObject model,int colorIndex)
        {
            var appearance=new TrafficAppearance();Color paint;ColorUtility.TryParseHtmlString(TrafficPaints[((colorIndex%TrafficPaints.Length)+TrafficPaints.Length)%TrafficPaints.Length],out paint);paint=paint.linear;
            foreach(var renderer in model.GetComponentsInChildren<Renderer>(true))
            {
                var materials=renderer.sharedMaterials;
                for(int i=0;i<materials.Length;i++)
                {
                    var material=materials[i];if(material==null)continue;
                    if(material.name.StartsWith("drive.traffic.paint",StringComparison.Ordinal))
                    {
                        var block=new MaterialPropertyBlock();renderer.GetPropertyBlock(block,i);
                        foreach(string property in new[]{"_BaseColor","_Color","baseColorFactor"})block.SetColor(property,BaseColorForProperty(property,paint));
                        renderer.SetPropertyBlock(block,i);
                    }
                    // Exported brake LEDs are their own material-group mesh. Keep
                    // fixed tail lenses visible; only these bright LEDs switch.
                    if(material.name.StartsWith("drive.traffic.brake",StringComparison.Ordinal)&&materials.Length==1)appearance.brakes.Add(renderer);
                }
            }
            return appearance;
        }
        private void RenderPopulation()
        {
            trafficSnapshot.Clear();walkerSnapshot.Clear();activeTraffic.Clear();activeWalkers.Clear();
            for(int vehicleIndex=0;vehicleIndex<session.Traffic.Vehicles.Length;vehicleIndex++)
            {
                var vehicle=session.Traffic.Vehicles[vehicleIndex];var pose=session.Traffic.PresentationPose(vehicleIndex,session.Accumulator);double distance=Math.Sqrt(Math.Pow(pose.x-renderedPose.x,2)+Math.Pow(pose.z-renderedPose.z,2));if(distance>350)continue;
                if(!trafficModels.TryGetValue(vehicle.id,out var model))
                {
                    var template=TrafficTemplate(vehicle.kind);if(template==null)continue;
                    model=Instantiate(template,transform);model.name=vehicle.id;DisableAutonomousAnimation(model);trafficModels.Add(vehicle.id,model);trafficAppearance.Add(vehicle.id,BindTrafficAppearance(model,vehicle.colorIndex));
                }
                activeTraffic.Add(vehicle.id);if(!model.activeSelf)model.SetActive(true);model.transform.SetPositionAndRotation(new Vector3((float)pose.x,0,(float)pose.z),Quaternion.Euler(0,(float)(pose.yaw*Mathf.Rad2Deg),0));
                foreach(var brake in trafficAppearance[vehicle.id].brakes)brake.enabled=vehicle.braking;
                trafficSnapshot.Add(new DriveTrafficSnapshot{id=vehicle.id,kind=vehicle.kind,s=vehicle.s,lane=vehicle.lane,x=pose.x,z=pose.z,yaw=pose.yaw,speed=vehicle.speed,direction=vehicle.direction,braking=vehicle.braking});
            }
            foreach(var pair in trafficModels)if(!activeTraffic.Contains(pair.Key)&&pair.Value.activeSelf)pair.Value.SetActive(false);
            var nearby=new List<(DrivePedestrian person,DrivePedestrianPose pose,double distance)>();
            foreach(var person in session.Pedestrians.Population)
            {
                var pose=session.Pedestrians.PoseAt(person,session.State.elapsedSeconds);double distance=Math.Sqrt(Math.Pow(pose.x-renderedPose.x,2)+Math.Pow(pose.z-renderedPose.z,2));
                if(distance<120)nearby.Add((person,pose,distance));
            }
            nearby.Sort((a,b)=>a.distance.CompareTo(b.distance));
            for(int i=0;i<Math.Min(12,nearby.Count);i++)
            {
                var pose=nearby[i].pose;if(pedestrianTemplates.Length==0)break;int index=pose.appearance%pedestrianTemplates.Length;var template=pedestrianTemplates[index];if(template==null)continue;
                if(!walkerModels.TryGetValue(pose.id,out var model)){model=Instantiate(template,transform);model.name=pose.id;DisableAutonomousAnimation(model);walkerModels.Add(pose.id,model);}
                activeWalkers.Add(pose.id);if(!model.activeSelf)model.SetActive(true);
                int frame=TownDrivePedestrianGrounding.Frame(pose.walkPhase,nearby[i].distance);var clip=pedestrianWalks[index];
                clip.SampleAnimation(model,clip.length*frame/TownDrivePedestrianGrounding.FrameCount);
                float floor=walkerGrounding[index].Floor(frame),rootY=TownDrivePedestrianGrounding.SidewalkHeight-floor*(float)pose.heightScale;
                model.transform.SetPositionAndRotation(new Vector3((float)pose.x,rootY,(float)pose.z),Quaternion.Euler(0,(float)(pose.yaw*Mathf.Rad2Deg),0));model.transform.localScale=Vector3.one*(float)pose.heightScale;
                walkerSnapshot.Add(new DriveWalkerSnapshot{id=pose.id,x=pose.x,y=rootY,z=pose.z,walkPhase=pose.walkPhase,animationFrame=frame,
                    footHeight=rootY+floor*pose.heightScale});
            }
            foreach(var pair in walkerModels)if(!activeWalkers.Contains(pair.Key)&&pair.Value.activeSelf)pair.Value.SetActive(false);
        }
        public string SnapshotJson()
        {
            var result=new TownDriveSnapshot{ready=ready,error=error,graphicsDeviceType=SystemInfo.graphicsDeviceType.ToString(),
                graphicsDeviceName=SystemInfo.graphicsDeviceName,graphicsDeviceVersion=SystemInfo.graphicsDeviceVersion,processorType=SystemInfo.processorType};
            result.frameSampleCount=frameSampleCount;
            if(frameSampleCount>0)
            {
                var sorted=new float[frameSampleCount];Array.Copy(frameSamples,sorted,frameSampleCount);float sum=0;foreach(float frame in sorted)sum+=frame;
                Array.Sort(sorted);result.meanFrameMs=sum/frameSampleCount;result.p95FrameMs=sorted[Math.Max(0,(int)Math.Ceiling(frameSampleCount*.95)-1)];
            }
            if(ready)
            {
                var state=session.State;result.paused=session.Paused;result.elapsed=state.elapsedSeconds;result.x=state.x;result.z=state.z;result.yaw=state.yaw;result.speed=state.speed;result.routeS=state.routeS;
                result.checkpointId=state.checkpointId;result.visited=state.visited;result.completed=state.completed;result.assist=state.assist;result.bonkSeconds=state.bonkSeconds;
                result.cameraMode=cabin?"cabin":"chase";result.lookYaw=lookYaw;result.cabinVisible=cabin;result.saveStatus=save.Status;result.street=session.Simulation.Route.LabelAt(state.routeS);
                result.dashboardMph=dashboard==null?-1:dashboard.Mph;
                if(rearView!=null){result.rearViewActive=rearView.Active;result.rearViewSupported=rearView.Supported;result.rearViewCaptures=rearView.Captures;result.rearViewCaptureCpuMs=(float)rearView.LastCaptureMilliseconds;}
                result.frontGlazingAlpha=-1;
                if(frontGlazingMaterials.Count>0)foreach(string property in new[]{"_BaseColor","_Color","baseColorFactor"})
                    if(frontGlazingMaterials[0].HasProperty(property)){result.frontGlazingAlpha=frontGlazingMaterials[0].GetColor(property).a;break;}
                result.trafficCount=session.Traffic.Vehicles.Length;result.pedestrianCount=session.Pedestrians.Population.Length;result.visibleTraffic=trafficSnapshot.Count;result.visiblePedestrians=walkerSnapshot.Count;
                result.displayedCarPosition=playerRoot.position;result.displayedYaw=renderedPose.yaw;result.displayedSpeed=renderedPose.speed;result.cameraPosition=driveCamera.transform.position;result.cabinEyeLocal=playerRoot.InverseTransformPoint(driveCamera.transform.position);
                result.ticks=session.TickCount;result.frames=frames;result.frameSeconds=lastFrameSeconds;result.droppedSeconds=session.DroppedSeconds;result.traffic=trafficSnapshot.ToArray();result.pedestrians=walkerSnapshot.ToArray();
                result.signals=Array.ConvertAll(session.Traffic.Signals,signal=>new DriveSignalSnapshot{id=signal.id,s=signal.s,phase=DriveTraffic.Phase(signal,session.Traffic.ElapsedSeconds)});
                result.recommendedSpeed=session.Simulation.Route.RecommendedSpeedAt(state.routeS);result.targetAhead=session.Simulation.Route.LanePoseAt(state.routeS+(result.recommendedSpeed<12?3+Math.Abs(state.speed)*.35:8+Math.Abs(state.speed)*.55));
            }
            return JsonUtility.ToJson(result);
        }
        public void RequestSnapshot()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            TownDriveReceiveSnapshot(SnapshotJson());
#endif
        }
        public void SetReviewInput(string json)
        {
#if UNITY_EDITOR || DEVELOPMENT_BUILD
            if(!ready||session.Paused)return;var input=JsonUtility.FromJson<DriveInput>(json);
            if(double.IsNaN(input.throttle)||double.IsInfinity(input.throttle)||double.IsNaN(input.brake)||double.IsInfinity(input.brake)||double.IsNaN(input.steer)||double.IsInfinity(input.steer))return;
            input.throttle=Math.Max(0,Math.Min(1,input.throttle));input.brake=Math.Max(0,Math.Min(1,input.brake));input.steer=Math.Max(-1,Math.Min(1,input.steer));input.paused=false;reviewInput=input;reviewInputActive=true;
#endif
        }
        public void StopReviewInput(){ReleaseInput();}
        private void OnGUI()
        {
            if(titleStyle==null){titleStyle=new GUIStyle(GUI.skin.label){fontSize=23,fontStyle=FontStyle.Bold};bodyStyle=new GUIStyle(GUI.skin.label){fontSize=14,wordWrap=true};}
            if(!ready){GUI.Box(new Rect(18,18,Math.Min(Screen.width-36,560),100),"");GUI.Label(new Rect(32,28,530,80),string.IsNullOrEmpty(error)?"Preparing Town Drive…":"Town Drive could not start: "+error,bodyStyle);return;}
            var state=session.State;GUI.Box(new Rect(16,16,390,92),"");GUI.Label(new Rect(30,21,360,32),Math.Round(Math.Abs(state.speed)*2.236936)+" mph  ·  "+session.Simulation.Route.LabelAt(state.routeS),titleStyle);
            string next=state.completed?"Home again — route complete":state.visited.Length<session.Data.route.checkpoints.Length?"Next: "+session.Data.route.checkpoints[state.visited.Length].label:"Return to Starpass Court";
            GUI.Label(new Rect(30,57,360,45),next+"\n"+(state.assist?"Assist on  ·  ":"")+save.Status,bodyStyle);
            GUI.Box(new Rect(16,Screen.height-43,Math.Min(Screen.width-32,920),29),"");GUI.Label(new Rect(26,Screen.height-39,Screen.width-52,24),"WASD / arrows drive   Space handbrake   C camera   Q / E look   R reset   F assist   Esc / P pause",bodyStyle);
            if(GUI.Button(new Rect(Screen.width-110,18,94,30),session.Paused?"Resume":"Pause"))TogglePause();
            if(!session.Paused)return;
            float x=Screen.width/2f-180,y=Screen.height/2f-125;GUI.Box(new Rect(x,y,360,250),"");GUI.Label(new Rect(x+22,y+18,310,34),"Drive paused",titleStyle);
            if(GUI.Button(new Rect(x+22,y+65,316,32),"Resume driving"))Resume();
            if(GUI.Button(new Rect(x+22,y+105,152,32),cabin?"Chase camera":"Cabin camera"))CycleCamera();
            if(GUI.Button(new Rect(x+186,y+105,152,32),state.assist?"Assist: on":"Assist: off"))ToggleAssist();
            if(GUI.Button(new Rect(x+22,y+145,316,32),"Return to saved checkpoint"))ResetCheckpoint();
            if(GUI.Button(new Rect(x+22,y+185,316,32),confirmFreshStart?"Confirm new drive from home":"Start a new drive"))
            {if(confirmFreshStart){ReleaseInput();session.FreshStart();confirmFreshStart=false;Render(0,true);}else confirmFreshStart=true;}
        }
        private void OnDestroy()
        {
            if(session!=null)session.CheckpointChanged-=OnCheckpointChanged;dashboard?.Dispose();
            foreach(var light in signalMaterials)if(light.material!=null)Destroy(light.material);
            foreach(var material in frontGlazingMaterials)if(material!=null)Destroy(material);
            if(ownsPipeline)
            {
                if(GraphicsSettings.defaultRenderPipeline==townDrivePipeline)GraphicsSettings.defaultRenderPipeline=previousDefaultPipeline;
                if(QualitySettings.renderPipeline==townDrivePipeline)QualitySettings.renderPipeline=previousQualityPipeline;
            }
        }
    }
}
