using System;
using System.Collections.Generic;

namespace SpaceDragon.TownDrive
{
    [Serializable] public sealed class DriveTrafficVehicle
    {
        public string id, kind;
        public double s, speed, cruiseSpeed;
        public int direction, lane, colorIndex;
        public bool braking;
        public DriveTrafficVehicle Clone() => (DriveTrafficVehicle)MemberwiseClone();
    }
    [Serializable] public sealed class DriveTrafficSignal { public string id, streetName; public double s, offsetSeconds; }
    /// <summary>Fixed 30 Hz port of traffic.ts. Physical circuit excludes the shared dead-end court.</summary>
    public sealed class DriveTraffic
    {
        public DriveTrafficVehicle[] Vehicles { get; private set; }
        public readonly DriveTrafficSignal[] Signals;
        public double ElapsedSeconds { get; private set; }
        private DriveTrafficVehicle[] previousVehicles;
        private double accumulator;
        private readonly DriveRoute route;
        private readonly double mainLength, skippedLength, bridgeLength;
        private readonly Segment[] segments;
        public double CircuitLength => mainLength + bridgeLength;
        private const double Step = 1.0 / 30, Braking = 5.5;
        private struct Segment { public DrivePoint a, b; public double length, start, yaw; }
        public DriveTraffic(DriveRoute route, int count = 64, double elapsedSeconds = 0)
        {
            this.route = route; var bridge = route.Data.trafficBridge;
            mainLength = bridge.fromS - bridge.toS; skippedLength = route.Length - mainLength;
            segments = new Segment[bridge.points.Length - 1]; double measured = 0;
            for (int i = 0; i < segments.Length; i++)
            {
                var a = bridge.points[i]; var b = bridge.points[i + 1]; double length = DriveMath.Hypot(b.x - a.x, b.z - a.z);
                segments[i] = new Segment { a = a, b = b, length = length, start = measured, yaw = Math.Atan2(b.x - a.x, b.z - a.z) }; measured += length;
            }
            bridgeLength = measured;
            var signals = new List<DriveTrafficSignal>();
            for (int i = 1; i < route.Data.checkpoints.Length; i++)
            {
                var checkpoint = route.Data.checkpoints[i]; var turn = Array.Find(route.Data.turns, item => item.toSection == i && item.fromSection != i);
                signals.Add(new DriveTrafficSignal { id = "traffic-signal." + checkpoint.id, s = i == 1 ? route.Data.homeExitSignalS : (turn == null ? checkpoint.s : turn.s) - 30,
                    streetName = route.Data.sections[i].label });
            }
            signals.Add(new DriveTrafficSignal { id = "traffic-signal.canopy-midpoint", s = route.Data.sections[2].startS + 180, streetName = route.Data.sections[2].label });
            signals.Sort((a,b) => a.s.CompareTo(b.s)); for (int i = 0; i < signals.Count; i++) signals[i].offsetSeconds = i * 5;
            Signals = signals.ToArray();
            count = Math.Max(0, Math.Min(96, count)); Vehicles = new DriveTrafficVehicle[count];
            double realStart = route.Data.sections[1].startS, realEnd = route.Data.sections[4].endS, realLength = realEnd - realStart;
            int realCount = (int)Math.Floor(count * .78 + .5), connectorCount = count - realCount;
            for (int i = 0; i < count; i++)
            {
                int direction = i % 2 == 0 ? 1 : -1; double jitter = Math.Sin(i * 12.9898 + 4.2) * 6;
                double s = i < realCount ? realStart + (i + .5) * realLength / Math.Max(1,realCount) + jitter : Advance(realEnd, (i - realCount + .5) * (CircuitLength - realLength) / Math.Max(1,connectorCount) + jitter);
                double cruise = 12 + (i * 7 % 9) * .5;
                Vehicles[i] = new DriveTrafficVehicle { id = "traffic." + i.ToString("000"), s = s, direction = direction,
                    lane = direction == 1 ? (i % 10 == 0 ? 0 : 1 + (i / 2) % 2) : (i / 2) % 3,
                    speed = route.Data.sections[Center(s).sectionIndex].character == "neighborhood" ? 8 : cruise, cruiseSpeed = cruise,
                    kind = i % 7 == 0 ? "van" : i % 3 == 0 ? "suv" : "sedan", colorIndex = i % 8 };
            }
            ElapsedSeconds = elapsedSeconds;
            previousVehicles = Vehicles;
        }
        private double Mod(double s) => DriveMath.Wrap(s, route.Length);
        private bool OnBridge(double s) { s = Mod(s); return s >= route.Data.trafficBridge.fromS || s < route.Data.trafficBridge.toS; }
        private double DistanceAt(double s) { s = Mod(s); return OnBridge(s) ? mainLength + Mod(s - route.Data.trafficBridge.fromS) / skippedLength * bridgeLength : s - route.Data.trafficBridge.toS; }
        private double RouteDistanceAt(double d) { d = DriveMath.Wrap(d, CircuitLength); return d < mainLength ? route.Data.trafficBridge.toS + d : Mod(route.Data.trafficBridge.fromS + (d - mainLength) / bridgeLength * skippedLength); }
        public double Advance(double s, double metres) => RouteDistanceAt(DistanceAt(s) + metres);
        private double Ahead(double from, double to, int direction) => DriveMath.Wrap((DistanceAt(to) - DistanceAt(from)) * direction, CircuitLength);
        public static string Phase(DriveTrafficSignal signal, double time) { double p = DriveMath.Wrap((DriveMath.Finite(time) ? time : 0) + signal.offsetSeconds, 31); return p < 20 ? "green" : p < 23 ? "amber" : "red"; }
        private RouteSample Center(double s)
        {
            double value = Mod(s); if (!OnBridge(value)) return route.PointAtDistance(value);
            double d = DistanceAt(value) - mainLength; var segment = segments[segments.Length - 1];
            foreach (var candidate in segments) if (d < candidate.start + candidate.length) { segment = candidate; break; }
            double t = DriveMath.Clamp((d - segment.start) / segment.length, 0, 1);
            return new RouteSample { x = segment.a.x + (segment.b.x - segment.a.x) * t, z = segment.a.z + (segment.b.z - segment.a.z) * t, yaw = segment.yaw, s = value, sectionIndex = 0 };
        }
        private double SectionOffset(int index, int lane) { var section = route.Data.sections[index]; return section.medianWidth / 2 + (DriveMath.Clamp(lane, 0, section.lanes - 1) + .5) * section.laneWidth; }
        private double LaneOffset(double s, int lane)
        {
            s = Mod(s); if (OnBridge(s)) return SectionOffset(0, lane);
            for (int i = 1; i < route.Data.sections.Length; i++)
            {
                double delta = s - route.Data.sections[i].startS, before = SectionOffset(i-1,lane), after = SectionOffset(i,lane);
                if (Math.Abs(delta) >= 72 || before == after) continue;
                double t = DriveMath.Clamp(after < before ? (delta + 72) / 72 : delta / 72, 0, 1), eased = t * t * (3 - 2*t);
                return before * (1-eased) + after * eased;
            }
            return SectionOffset(Center(s).sectionIndex, lane);
        }
        private RouteSample Position(double s, int direction, int lane)
        {
            var p = Center(s); var before = Center(Advance(s,-4)); var after = Center(Advance(s,4));
            double yaw = Math.Atan2(after.x-before.x,after.z-before.z), offset = LaneOffset(s,lane)*direction;
            p.x += Math.Cos(yaw)*offset; p.z -= Math.Sin(yaw)*offset; return p;
        }
        public RouteSample Pose(DriveTrafficVehicle vehicle)
        {
            var p = Position(vehicle.s,vehicle.direction,vehicle.lane);
            var before = Position(Advance(vehicle.s,-vehicle.direction*.8),vehicle.direction,vehicle.lane);
            var after = Position(Advance(vehicle.s,vehicle.direction*.8),vehicle.direction,vehicle.lane);
            p.yaw = Math.Atan2(after.x-before.x,after.z-before.z); return p;
        }
        public RouteSample PresentationPose(int index,double remainderSeconds)
        {
            var current=Pose(Vehicles[index]);var previous=Pose(previousVehicles[index]);
            double alpha=DriveMath.Clamp((accumulator+Math.Max(0,remainderSeconds))/Step,0,1);
            current.x=previous.x+(current.x-previous.x)*alpha;current.z=previous.z+(current.z-previous.z)*alpha;
            current.yaw=previous.yaw+DriveMath.AngleDelta(current.yaw,previous.yaw)*alpha;return current;
        }
        private NearestRoutePoint PlayerRoad(DriveState player)
        {
            var result = route.Nearest(player.x,player.z,player.routeS); if (!OnBridge(result.s)) return result;
            double best = double.PositiveInfinity;
            foreach (var segment in segments)
            {
                double dx=segment.b.x-segment.a.x,dz=segment.b.z-segment.a.z;
                double t=DriveMath.Clamp(((player.x-segment.a.x)*dx+(player.z-segment.a.z)*dz)/(segment.length*segment.length),0,1);
                double x=segment.a.x+dx*t,z=segment.a.z+dz*t,distance=DriveMath.Hypot(player.x-x,player.z-z);
                if(distance>=best)continue;best=distance;
                result=new NearestRoutePoint{x=x,z=z,yaw=segment.yaw,s=RouteDistanceAt(mainLength+segment.start+t*segment.length),sectionIndex=0,distance=distance,
                    signedOffset=(player.x-x)*Math.Cos(segment.yaw)-(player.z-z)*Math.Sin(segment.yaw)};
            }
            return result;
        }
        private void Tick(DriveState player,double time)
        {
            var road=PlayerRoad(player); bool onRoad=road.distance<DriveRoute.RoadHalfWidth(route.Data.sections[road.sectionIndex])+1.5;
            var next = new DriveTrafficVehicle[Vehicles.Length];
            for(int i=0;i<Vehicles.Length;i++)
            {
                var vehicle=Vehicles[i];var point=Center(vehicle.s);var look=Center(Advance(vehicle.s,vehicle.direction*28));
                double target=Math.Min(vehicle.cruiseSpeed,route.Data.sections[point.sectionIndex].character=="neighborhood"?9:16);
                if(Math.Cos(look.yaw-point.yaw)<.91)target=Math.Min(target,7.5);
                double maxTravel=double.PositiveInfinity;bool blocked=false;
                void Limit(double gap,double leaderSpeed) {gap=Math.Max(0,gap);maxTravel=Math.Min(maxTravel,gap);target=Math.Min(target,Math.Min(Math.Sqrt(leaderSpeed*leaderSpeed+2*Braking*gap),leaderSpeed+gap/1.4));if(gap<.25&&leaderSpeed<.1)target=0;if(target<.25)blocked=true;}
                foreach(var signal in Signals)
                {
                    string phase=Phase(signal,time);if(phase=="green")continue;
                    double gap=Ahead(vehicle.s,signal.s-vehicle.direction*12,vehicle.direction);if(gap>90)continue;
                    if(phase=="amber"&&gap<vehicle.speed*vehicle.speed/(2*Braking)+2)continue;Limit(gap,0);
                }
                foreach(var leader in Vehicles)
                {
                    if(leader.id==vehicle.id||leader.direction!=vehicle.direction)continue;
                    double gap=Ahead(vehicle.s,leader.s,vehicle.direction);if(gap>110)continue;
                    if(Math.Abs(LaneOffset(leader.s,vehicle.lane)-LaneOffset(leader.s,leader.lane))>2.15)continue;Limit(gap-7.6,leader.speed);
                }
                if(onRoad)
                {
                    double gap=Ahead(vehicle.s,road.s,vehicle.direction),offset=LaneOffset(road.s,vehicle.lane)*vehicle.direction;
                    if(gap<100&&Math.Abs(road.signedOffset-offset)<2.25)Limit(gap-7.6,Math.Max(0,player.speed*Math.Cos(player.yaw-road.yaw)*vehicle.direction));
                }
                double speed=Math.Max(0,vehicle.speed+DriveMath.Clamp(target-vehicle.speed,-Braking*Step,2.2*Step)),travel=speed*Step;
                if(travel>maxTravel){travel=maxTravel;speed=0;blocked=true;}
                var updated=vehicle.Clone();updated.s=travel>0?Advance(vehicle.s,travel*vehicle.direction):vehicle.s;updated.speed=speed;updated.braking=speed<vehicle.speed-.02||(speed<.25&&blocked);next[i]=updated;
            }
            previousVehicles=Vehicles;Vehicles=next;
        }
        public void AdvanceTo(DriveState player)
        {
            double elapsed=player.elapsedSeconds-ElapsedSeconds;if(!DriveMath.Finite(elapsed)||elapsed==0)return;
            if(elapsed<0||elapsed>2){ElapsedSeconds=player.elapsedSeconds;accumulator=0;previousVehicles=Vehicles;return;}
            double total=accumulator+elapsed;int steps=(int)Math.Floor((total+1e-9)/Step);double start=ElapsedSeconds-accumulator;
            for(int i=0;i<steps;i++)Tick(player,start+(i+1)*Step);
            ElapsedSeconds=player.elapsedSeconds;accumulator=Math.Max(0,total-steps*Step);
        }
        public void AppendCollisionProxies(List<DriveObstacle> output,double x,double z)
        {
            foreach(var vehicle in Vehicles)
            {
                var p=Pose(vehicle);if(DriveMath.Hypot(p.x-x,p.z-z)>45)continue;
                for(int i=0;i<3;i++){double along=(i-1)*1.1;output.Add(new DriveObstacle{id=vehicle.id+".body."+i,x=p.x+Math.Sin(p.yaw)*along,z=p.z+Math.Cos(p.yaw)*along,radius=.9});}
            }
        }
    }
}
