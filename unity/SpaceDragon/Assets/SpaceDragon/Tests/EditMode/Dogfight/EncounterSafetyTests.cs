using System.Reflection;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public class EncounterSafetyTests
    {
        [TestCase(0f)] [TestCase(-.1f)] [TestCase(float.NaN)]
        public void FrozenOrInvalidSimulationStepCannotReachAnyGameplayAdapter(float dt)
        {
            var owner=new GameObject("Uninitialized adapter guard test");
            try
            {
                var encounter=owner.AddComponent<DogfightEncounter>();
                var method=typeof(DogfightEncounter).GetMethod("Simulate",BindingFlags.Instance|BindingFlags.NonPublic);
                // No scene/state is configured: any attempted damage/finisher/flight/weapon
                // action would throw here. A frozen frame must stop before touching them.
                Assert.DoesNotThrow(()=>method.Invoke(encounter,new object[]{dt,new FlightInput(Vector2.one,boost:true),true}));
            }
            finally{Object.DestroyImmediate(owner);}
        }
    }
}
