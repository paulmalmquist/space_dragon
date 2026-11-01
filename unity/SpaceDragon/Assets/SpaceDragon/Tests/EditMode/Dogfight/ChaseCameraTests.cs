using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class ChaseCameraTests
    {
        [Test] public void CruiseDoesNotAddSpeedDividedByResponseTrailingDistance()
        {
            var flight=new FlightState();var camera=new ChaseCameraState();camera.Tick(0,flight,true);
            for(int i=0;i<300;i++){flight.Tick(1f/60,new FlightInput());camera.Tick(1f/60,flight);}
            Assert.That(Vector3.Dot(flight.Position-camera.Position,flight.Forward),Is.EqualTo(9.8f).Within(.01f));
            Assert.That(camera.Position.y-flight.Position.y,Is.EqualTo(3.55f).Within(.01f));
        }
        [Test] public void BoostChangesPerspectiveByActualSpeedAndZoomWins()
        {
            var flight=new FlightState();var camera=new ChaseCameraState();camera.Tick(0,flight,true);
            for(int i=0;i<180;i++){flight.Tick(1f/60,new FlightInput(Vector2.zero,0,true));camera.Tick(1f/60,flight);}
            Assert.That(Vector3.Dot(flight.Position-camera.Position,flight.Forward),Is.EqualTo(11.8f).Within(.05f));
            Assert.That(camera.FieldOfView,Is.EqualTo(74).Within(.1f));
            camera.Tick(0,flight,true,true);Assert.That(camera.FieldOfView,Is.EqualTo(40));
        }
        [Test] public void CorkscrewDoesNotShakeCameraAnchorAndReducedMotionKeepsLens()
        {
            var flight=new FlightState();var camera=new ChaseCameraState();flight.RequestRoll(1);
            for(int i=0;i<30;i++){flight.Tick(1f/60,new FlightInput());camera.Tick(1f/60,flight,false,false,true);}
            Assert.That(flight.RollOffset.sqrMagnitude,Is.GreaterThan(1));
            Assert.That(camera.Anchor.x,Is.EqualTo(0).Within(.001f));Assert.That(camera.Anchor.y,Is.EqualTo(0).Within(.001f));
            Assert.That(camera.FieldOfView,Is.EqualTo(61));Assert.That(Vector3.Angle(camera.Rotation*Vector3.up,Vector3.up),Is.LessThan(5));
        }
    }
}
