using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using SpaceDragon.TownDrive;

internal static class AmbientParity
{
    private static readonly JsonSerializerOptions Json = new JsonSerializerOptions { IncludeFields = true };
    public static (int assertions, double maximumError) Verify(DriveRoute route, string file)
    {
        using var document=JsonDocument.Parse(File.ReadAllText(file));var root=document.RootElement;
        int assertions=0;double maximum=0,tolerance=root.GetProperty("tolerance").GetDouble();
        void Check(bool ok,string message){assertions++;if(!ok)throw new Exception(message);}
        void Equal(JsonElement expected,JsonElement actual,string name)
        {
            Check(expected.ValueKind==actual.ValueKind,name+" kind");
            switch(expected.ValueKind)
            {
                case JsonValueKind.Object:
                    var properties=expected.EnumerateObject().ToArray();Check(properties.Length==actual.EnumerateObject().Count(),name+" fields");
                    foreach(var property in properties){Check(actual.TryGetProperty(property.Name,out var value),name+" missing "+property.Name);Equal(property.Value,value,name+"."+property.Name);}break;
                case JsonValueKind.Array:
                    Check(expected.GetArrayLength()==actual.GetArrayLength(),name+" length");int index=0;foreach(var value in expected.EnumerateArray())Equal(value,actual[index],name+"["+(index++)+"]");break;
                case JsonValueKind.Number:
                    double a=actual.GetDouble(),e=expected.GetDouble(),difference=Math.Abs(a-e);maximum=Math.Max(maximum,difference);Check(double.IsFinite(a)&&difference<=tolerance,$"{name}: expected {e:R}, actual {a:R}, difference {difference:R}");break;
                case JsonValueKind.String: Check(expected.GetString()==actual.GetString(),name+" string");break;
                default: Check(expected.GetRawText()==actual.GetRawText(),name+" value");break;
            }
        }
        JsonElement Element<T>(T value)=>JsonSerializer.SerializeToElement(value,Json);
        Check(root.GetProperty("routeId").GetString()==route.Data.id,"Ambient route identity");
        var traffic=new DriveTraffic(route);
        foreach(var entry in root.GetProperty("signals").EnumerateArray())
        {
            var signal=traffic.Signals.Single(s=>s.id==entry.GetProperty("id").GetString());
            Check(DriveTraffic.Phase(signal,entry.GetProperty("time").GetDouble())==entry.GetProperty("phase").GetString(),"Signal phase");
        }
        foreach(var entry in root.GetProperty("advances").EnumerateArray())
            Equal(entry.GetProperty("expected"),Element(traffic.Advance(entry.GetProperty("s").GetDouble(),entry.GetProperty("metres").GetDouble())),"Bridge circuit advance");
        foreach(var run in root.GetProperty("trafficRuns").EnumerateArray())
        {
            traffic=new DriveTraffic(route);int frameIndex=0;
            foreach(var frame in run.GetProperty("frames").EnumerateArray())
            {
                var player=JsonSerializer.Deserialize<DriveState>(frame.GetProperty("player").GetRawText(),Json);traffic.AdvanceTo(player);
                if(frame.TryGetProperty("vehicles",out var vehicles))
                {
                    string label=run.GetProperty("name").GetString()+" frame "+frameIndex;
                    Equal(vehicles,Element(traffic.Vehicles),label+" vehicles");
                    Equal(frame.GetProperty("poses"),Element(traffic.Vehicles.Select(traffic.Pose).ToArray()),label+" poses");
                    var proxies=new List<DriveObstacle>();traffic.AppendCollisionProxies(proxies,player.x,player.z);
                    Equal(frame.GetProperty("proxies"),Element(proxies),label+" collision proxies");
                }
                frameIndex++;
            }
        }
        var pedestrians=new DrivePedestrians(route);
        Equal(root.GetProperty("population"),Element(pedestrians.Population),"Pedestrian population");
        foreach(var frame in root.GetProperty("pedestrians").EnumerateArray())
        {
            double time=frame.GetProperty("time").GetDouble();
            Equal(frame.GetProperty("poses"),Element(pedestrians.Population.Select(p=>pedestrians.PoseAt(p,time)).ToArray()),"Pedestrian time "+time);
        }
        Console.WriteLine($"Ambient oracle: {assertions} assertions, maximum error {maximum:R}");return(assertions,maximum);
    }
}
