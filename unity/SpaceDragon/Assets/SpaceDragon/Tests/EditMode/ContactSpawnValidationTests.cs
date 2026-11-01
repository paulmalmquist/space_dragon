using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.FirstContact.Tests
{
    public sealed class ContactSpawnValidationTests
    {
        [Test]
        public void RestoreRejectsFurnitureAndPodButAllowsGroundSkinAndIgnoresSelf()
        {
            var root = new GameObject("Restore collision test fixture");
            Vector3 origin = new Vector3(2000, 0, 2000);
            try
            {
                var floor = new GameObject("Floor");
                floor.transform.SetParent(root.transform);
                floor.transform.position = origin + new Vector3(0, -0.1f, 0);
                floor.AddComponent<BoxCollider>().size = new Vector3(8, 0.2f, 8);
                var furniture = new GameObject("Solid furniture");
                furniture.transform.SetParent(root.transform);
                furniture.transform.position = origin + new Vector3(2, 0.5f, 0);
                furniture.AddComponent<BoxCollider>().size = Vector3.one;
                var pod = new GameObject("Solid pod proxy");
                pod.transform.SetParent(root.transform);
                pod.transform.position = origin + new Vector3(-2, 0.6f, 0);
                pod.AddComponent<BoxCollider>().size = new Vector3(2.13f, 1.2f, 1.285f);
                var actor = new GameObject("Actor");
                actor.transform.SetParent(root.transform);
                actor.transform.position = origin;
                var body = actor.AddComponent<CharacterController>();
                body.center = new Vector3(0, 0.9f, 0);
                body.height = 1.8f; body.radius = 0.25f; body.skinWidth = 0.025f;

                Assert.That(ContactSpawnValidation.IsClear(body, origin), Is.True, "The actor itself and its resting floor are allowed.");
                Assert.That(ContactSpawnValidation.IsClear(body, origin + Vector3.down * 0.02f), Is.True, "Normal grounded skin penetration is tolerated.");
                Assert.That(ContactSpawnValidation.TryPlace(body, origin + Vector3.right * 2), Is.False, "Furniture cannot receive a restored body.");
                Assert.That(ContactSpawnValidation.TryPlace(body, origin + Vector3.left * 2), Is.False, "The pod's solid proxy cannot receive a restored body.");
                Assert.That(body.transform.position, Is.EqualTo(origin), "Rejected restores do not move the player.");
                Assert.That(ContactSpawnValidation.TryPlace(body, origin + Vector3.forward), Is.True);
                Assert.That(body.transform.position, Is.EqualTo(origin + Vector3.forward));
            }
            finally { Object.DestroyImmediate(root); }
        }
    }
}
