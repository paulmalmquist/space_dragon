using System;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class OscarDragonPresentationTests
    {
        GameObject actor;
        Transform motion,basis,model,root,wing,jaw,muzzle;
        DragonPresentation view;
        AnimationClip[] clips;
        DragonRigProfile Profile() => new DragonRigProfile { id="oscar-creativo-flight",
            animatedNodes=new[] {"root.x","arm_stretch.l","jawbone.x"}, jawBone="jawbone.x", jawAxis=Vector3.up,
            jawScale=1,jawMinRadians=-.5f,jawMaxRadians=0,sampleRate=30,
            damageSockets=new[] {"socket_target","socket_thruster_l","socket_muzzle"} };
        static Transform Child(string name,Transform parent)
        { var item=new GameObject(name).transform; item.SetParent(parent,false); return item; }
        [SetUp] public void Setup()
        {
            actor=new GameObject("Gameplay"); actor.transform.SetPositionAndRotation(new Vector3(10,20,30),Quaternion.Euler(4,25,0));
            motion=Child("VisualMotion",actor.transform); basis=Child("IdentityBasis",motion); model=Child("Oscar",basis);
            var rig=Child("rig",model); root=Child("root.x",rig); wing=Child("arm_stretch.l",root); jaw=Child("jawbone.x",root);
            root.localPosition=new Vector3(0,.2f,0); wing.localPosition=new Vector3(1,.5f,0); wing.localScale=new Vector3(1,1.1f,.9f);
            jaw.localRotation=Quaternion.Euler(5,0,0);
            muzzle=Child("socket_muzzle",jaw); muzzle.localPosition=new Vector3(0,0,2);
            Child("socket_target",root); Child("socket_thruster_l",wing);
            view=actor.AddComponent<DragonPresentation>();
            clips=new[] {Clip("Flight",5.133333f,1),Clip("Glide",1,2),Clip("Boost",5.133333f/1.15f,3)};
        }
        static AnimationClip Clip(string name,float duration,float amount)
        {
            var clip=new AnimationClip { name=name,legacy=true };
            void Scalar(string path,string property,float value) => clip.SetCurve(path,typeof(Transform),property,AnimationCurve.Constant(0,duration,value));
            void Rotation(string path,Quaternion value)
            { Scalar(path,"localRotation.x",value.x); Scalar(path,"localRotation.y",value.y); Scalar(path,"localRotation.z",value.z); Scalar(path,"localRotation.w",value.w); }
            Scalar("rig/root.x","localPosition.y",.2f+amount*.1f);
            Scalar("rig/root.x/arm_stretch.l","localPosition.x",1+amount*.2f);
            Scalar("rig/root.x/arm_stretch.l","localScale.y",1.1f+amount*.15f);
            Rotation("rig/root.x/arm_stretch.l",Quaternion.Euler(0,0,amount*10));
            Rotation("rig/root.x/jawbone.x",Quaternion.Euler(5+amount*2,0,0));
            return clip;
        }
        [TearDown] public void TearDown()
        { if(actor!=null) UnityEngine.Object.DestroyImmediate(actor); if(clips!=null) foreach(var clip in clips) if(clip!=null) UnityEngine.Object.DestroyImmediate(clip); }

        [Test] public void MeasuredRigBlendsFullTrsAndJawAxisWithoutMovingGameplayOrBasis()
        {
            var position=actor.transform.position; var rotation=actor.transform.rotation;
            var skin=model.gameObject.AddComponent<SkinnedMeshRenderer>(); skin.quality=SkinQuality.Bone2;
            view.Configure(motion,model,clips[0],clips[1],clips[2],rigProfile:Profile());
            Assert.AreEqual(SkinQuality.Auto,skin.quality);
            Assert.True(view.UsesAuthoredClips); Assert.True(view.UsesMeasuredRig); Assert.False(view.UsesOrganicRig);
            Assert.AreEqual("oscar-creativo-flight",view.RigProfile); Assert.AreEqual(0,view.AddedTriangles);
            Assert.AreSame(muzzle,view.MuzzleTransform);
            Assert.AreSame(wing.Find("socket_thruster_l"),view.DamageAttachment(1));
            view.Tick(.1f,.1f,true,.25f,.8f,-.32f,.9f);
            float blend=view.BoostWeight;
            Assert.That(wing.localPosition.x,Is.EqualTo(Mathf.Lerp(1.2f,1.6f,blend)).Within(.0001f));
            Assert.That(wing.localScale.y,Is.EqualTo(Mathf.Lerp(1.25f,1.55f,blend)).Within(.0001f));
            Assert.That(root.localPosition.y,Is.EqualTo(Mathf.Lerp(.3f,.5f,blend)).Within(.0001f));
            Assert.Less(Quaternion.Angle(wing.localRotation,Quaternion.Slerp(Quaternion.Euler(0,0,10),Quaternion.Euler(0,0,30),blend)),.02f);
            var expectedJaw=Quaternion.Slerp(Quaternion.Euler(7,0,0),Quaternion.Euler(11,0,0),blend)*Quaternion.AngleAxis(-.32f*Mathf.Rad2Deg,Vector3.up);
            Assert.Less(Quaternion.Angle(jaw.localRotation,expectedJaw),.02f);
            Assert.AreEqual(position,actor.transform.position); Assert.Less(Quaternion.Angle(rotation,actor.transform.rotation),.0001f);
            Assert.AreEqual(Quaternion.identity,basis.localRotation); Assert.AreEqual(Vector3.one,basis.localScale);
            Assert.AreEqual(Vector3.zero,model.localPosition);
            var frozen=wing.localPosition; var frozenScale=wing.localScale; var frozenJaw=jaw.localRotation;
            view.SetPaused(true); view.Tick(.2f,10,false,0,0,0,0);
            Assert.AreEqual(frozen,wing.localPosition); Assert.AreEqual(frozenScale,wing.localScale); Assert.AreEqual(frozenJaw,jaw.localRotation);
            view.ResetPose();
            Assert.AreEqual(new Vector3(1,.5f,0),wing.localPosition); Assert.AreEqual(new Vector3(1,1.1f,.9f),wing.localScale);
            Assert.AreEqual(new Vector3(0,.2f,0),root.localPosition); Assert.Less(Quaternion.Angle(Quaternion.Euler(5,0,0),jaw.localRotation),.0001f);
            Assert.AreEqual(Vector3.zero,motion.localPosition); Assert.AreEqual(Quaternion.identity,motion.localRotation);
        }

        [Test] public void SamplingRestoresEveryTransformAndNeverReplaysUnlistedRootOrSocketChannels()
        {
            clips[0].SetCurve("",typeof(Transform),"localPosition.x",AnimationCurve.Constant(0,5.133333f,99));
            clips[1].SetCurve("rig/root.x/jawbone.x/socket_muzzle",typeof(Transform),"localScale.y",AnimationCurve.Constant(0,1,9));
            var transforms=model.GetComponentsInChildren<Transform>(true);
            var positions=new Vector3[transforms.Length]; var scales=new Vector3[transforms.Length]; var rotations=new Quaternion[transforms.Length];
            for(int i=0;i<transforms.Length;i++) {positions[i]=transforms[i].localPosition;scales[i]=transforms[i].localScale;rotations[i]=transforms[i].localRotation;}
            view.Configure(motion,model,clips[0],clips[1],clips[2],rigProfile:Profile());
            for(int i=0;i<transforms.Length;i++)
            { Assert.AreEqual(positions[i],transforms[i].localPosition); Assert.AreEqual(scales[i],transforms[i].localScale); Assert.Less(Quaternion.Angle(rotations[i],transforms[i].localRotation),.02f); }
            view.Tick(.1f,.1f,false,0,0,-.1f,0);
            Assert.AreEqual(Vector3.zero,model.localPosition); Assert.AreEqual(Vector3.one,muzzle.localScale);
        }

        [Test] public void MeasuredProfileRejectsMissingClipOrUnknownJawAndDoesNotUseMechanicalFallback()
        {
            Assert.Throws<ArgumentException>(()=>view.Configure(motion,model,clips[0],null,clips[2],rigProfile:Profile()));
            Assert.False(view.UsesAuthoredClips); Assert.False(view.UsesMeasuredRig);
            Assert.AreEqual(new Vector3(1,.5f,0),wing.localPosition);
            var profile=Profile(); profile.jawBone="missing.jaw";
            Assert.Throws<ArgumentException>(()=>view.Configure(motion,model,clips[0],clips[1],clips[2],rigProfile:profile));
            Assert.False(view.UsesAuthoredClips);
            profile=Profile();profile.jawAxis=Vector3.zero;
            Assert.Throws<ArgumentException>(()=>view.Configure(motion,model,clips[0],clips[1],clips[2],rigProfile:profile));
        }

        [Test] public void AuthoredTranslationUsesActualClipSecondsInsteadOfTheMechanicalStrokePeriod()
        {
            clips[0].SetCurve("rig/root.x/arm_stretch.l",typeof(Transform),"localPosition.x",AnimationCurve.Linear(0,1,5.133333f,6.133333f));
            view.Configure(motion,model,clips[0],clips[1],clips[2],rigProfile:Profile());
            view.Tick(.25f,.25f,false,0,0,0,0); view.Tick(.25f,.5f,false,0,0,0,0);
            Assert.That(wing.localPosition.x,Is.EqualTo(1.5f).Within(.0002f));
            view.ResetPose(); view.Tick(.25f,.25f,false,0,0,0,0);
            Assert.That(wing.localPosition.x,Is.EqualTo(1.25f).Within(.0002f));
        }

        [Test] public void NegativeJawSignClampsInputBeforeDirectionAndNeverCompoundsTheOffset()
        {
            var profile=Profile(); profile.jawScale=-1;
            view.Configure(motion,model,clips[0],clips[1],clips[2],rigProfile:profile);
            view.Tick(.1f,.1f,false,0,0,-.32f,0);
            var expected=Quaternion.Euler(7,0,0)*Quaternion.AngleAxis(.32f*Mathf.Rad2Deg,Vector3.up);
            Assert.Less(Quaternion.Angle(expected,jaw.localRotation),.02f);
            view.Tick(.1f,.2f,false,0,0,-.32f,0);
            Assert.Less(Quaternion.Angle(expected,jaw.localRotation),.02f);
            view.Tick(.1f,.3f,false,0,0,-4,0);
            expected=Quaternion.Euler(7,0,0)*Quaternion.AngleAxis(.5f*Mathf.Rad2Deg,Vector3.up);
            Assert.Less(Quaternion.Angle(expected,jaw.localRotation),.02f);
        }

        [Test] public void RetimedBoostSharesFlightPhaseAndChangesCadenceWithoutPosePulling()
        {
            const float flightSeconds=5.133333f, boostSeconds=flightSeconds/1.15f;
            const string path="rig/root.x/arm_stretch.l";
            // Identical normalized source motion with only Boost's duration changed.
            clips[0].SetCurve(path,typeof(Transform),"localPosition.x",AnimationCurve.Linear(0,1,flightSeconds,1+flightSeconds));
            clips[2].SetCurve(path,typeof(Transform),"localPosition.x",AnimationCurve.Linear(0,1,boostSeconds,1+flightSeconds));
            view.Configure(motion,model,clips[0],clips[1],clips[2],rigProfile:Profile());
            float phase=0, previous=1;
            void Step(float dt,bool boost)
            {
                view.Tick(dt,9000,boost,0,0,0,0); // Wall-clock time does not drive authored phase.
                phase+=dt*Mathf.Lerp(1/flightSeconds,1/boostSeconds,view.BoostWeight);
                Assert.That(wing.localPosition.x,Is.EqualTo(1+phase*flightSeconds).Within(.0003f));
                float delta=wing.localPosition.x-previous;
                Assert.That(delta,Is.InRange(dt-.0003f,dt*1.15f+.0003f),"Crossfading must not add a second wing velocity.");
                previous=wing.localPosition.x;
            }
            Step(.25f,false); Step(.25f,false); Step(.25f,false);
            for(int i=0;i<5;i++) Step(.1f,true);
            view.SetPaused(true); view.Tick(.25f,10000,true,0,0,0,0);
            Assert.AreEqual(previous,wing.localPosition.x);
            view.SetPaused(false); Step(.1f,true);
            for(int i=0;i<3;i++) Step(.1f,false);
            view.ResetPose(); phase=0; previous=1; Step(.1f,false);
        }

        void AddSpacecraftSockets()
        {
            Child("socket_wing_l",wing);
            var opposite=Child("arm_stretch.r",root);opposite.localPosition=new Vector3(-1,.5f,0);
            Child("socket_wing_r",opposite);
        }

        [Test] public void SpacecraftHoldsExportedGlidePoseThroughBoostAndFullRollButKeepsJawAttack()
        {
            AddSpacecraftSockets();
            // Even a future animated Glide must remain fixed at its authored
            // start pose in spacecraft mode; neither thrust nor time flaps it.
            clips[1].SetCurve("rig/root.x/arm_stretch.l",typeof(Transform),"localPosition.x",AnimationCurve.Linear(0,1.4f,1,2.4f));
            var position=actor.transform.position;var rotation=actor.transform.rotation;
            view.Configure(motion,model,clips[0],clips[1],clips[2],rigProfile:Profile(),spacecraft:true);
            Assert.True(view.UsesSpacecraftMode);Assert.True(view.UsesAuthoredClips);Assert.True(view.IsGliding);
            Assert.AreEqual("ShipCruise",view.ActiveState);Assert.AreEqual(1120,view.PropulsionTriangles);
            Assert.AreSame(muzzle,view.MuzzleTransform);Assert.AreSame(muzzle,view.DamageAttachment(2));
            var heldWing=wing.localRotation;
            for(int i=0;i<=24;i++)
            {
                float roll=i*Mathf.PI/12;
                view.SetPropulsion(1,true,false,true);
                view.Tick(.1f,i*.1f,true,.22f,roll,-.32f,1.4f);
                Assert.That(wing.localPosition.x,Is.EqualTo(1.4f).Within(.0001f));
                Assert.That(wing.localScale.y,Is.EqualTo(1.4f).Within(.0001f));
                Assert.That(root.localPosition.y,Is.EqualTo(.4f).Within(.0001f));
                Assert.Less(Quaternion.Angle(heldWing,wing.localRotation),.02f);
                Assert.Less(Quaternion.Angle(Quaternion.AngleAxis((.22f+roll)*Mathf.Rad2Deg,Vector3.forward),motion.localRotation),.03f);
            }
            var expectedJaw=Quaternion.Euler(9,0,0)*Quaternion.AngleAxis(-.32f*Mathf.Rad2Deg,Vector3.up);
            Assert.Less(Quaternion.Angle(expectedJaw,jaw.localRotation),.02f);
            Assert.AreEqual(position,actor.transform.position);Assert.AreEqual(rotation,actor.transform.rotation);
            Assert.AreEqual(Vector3.zero,motion.localPosition);Assert.AreEqual(Quaternion.identity,basis.localRotation);
            Assert.AreEqual("ShipBoost",view.ActiveState);Assert.Greater(view.PropulsionLevel,1.7f);
            float level=view.PropulsionLevel;var frozen=motion.localRotation;
            view.SetPaused(true);view.SetPropulsion(0,false,true,true);view.Tick(.2f,100,false,0,0,0,0);
            Assert.AreEqual(level,view.PropulsionLevel);Assert.AreEqual(frozen,motion.localRotation);
            view.SetPaused(false);view.Tick(.25f,100,false,0,0,0,0);
            Assert.Less(view.PropulsionLevel,level);Assert.AreEqual("ShipBrake",view.ActiveState);
            view.ResetPose();Assert.AreEqual("ShipCruise",view.ActiveState);
            Assert.That(view.PropulsionLevel,Is.EqualTo(.6f));Assert.AreEqual(Quaternion.identity,motion.localRotation);
        }

        [Test] public void SpacecraftAttachmentsFollowWingsWithoutPhysicsAndCleanupAllowsOriginalFlightRollback()
        {
            AddSpacecraftSockets();
            view.Configure(motion,model,clips[0],clips[1],clips[2],rigProfile:Profile(),spacecraft:true);
            Assert.AreSame(view.LaserMuzzleLeft,view.Socket("socket_laser_l"));
            Assert.AreSame(view.NozzleRight,view.Socket("socket_wing_exhaust_r"));
            Assert.AreNotSame(view.LaserMuzzleLeft,view.LaserMuzzleRight);
            Assert.Greater(Vector3.Dot(view.LaserMuzzleLeft.position-view.NozzleLeft.position,view.LaserMuzzleLeft.forward),1.2f);
            Assert.True(view.LaserMuzzleLeft.IsChildOf(wing));
            Assert.AreEqual(0,model.GetComponentsInChildren<Collider>(true).Length);
            Assert.AreEqual(0,model.GetComponentsInChildren<Rigidbody>(true).Length);
            Assert.AreEqual(0,model.GetComponentsInChildren<Animator>(true).Length);
            foreach(var renderer in model.GetComponentsInChildren<Renderer>(true))
                if(renderer.name.StartsWith("Exhaust",StringComparison.Ordinal)||renderer.name=="Engine aperture")
                    Assert.AreEqual(UnityEngine.Rendering.ShadowCastingMode.Off,renderer.shadowCastingMode);
            view.SetPropulsion(float.NaN,false,false,false);view.Tick(.25f,1,false,0,0,0,0);
            Assert.False(float.IsNaN(view.PropulsionLevel));
            view.ResetPose();
            view.Configure(motion,model,clips[0],clips[1],clips[2],rigProfile:Profile());
            Assert.False(view.UsesSpacecraftMode);Assert.IsNull(view.LaserMuzzleLeft);Assert.IsNull(view.Socket("socket_laser_l"));
            Assert.AreEqual(0,view.PropulsionTriangles);Assert.AreEqual(0,model.GetComponentsInChildren<MeshRenderer>(true).Length);
            view.Tick(.1f,.1f,false,0,0,0,0);
            Assert.That(wing.localPosition.x,Is.EqualTo(1.2f).Within(.0001f));
        }

        [Test] public void MetallicWingInstancesReuseSourceMapsAndRestoreOriginalMaterialsOnRollback()
        {
            AddSpacecraftSockets();
            var shader=Shader.Find(WingPropulsion.WingShader);Assert.NotNull(shader);
            var material=new Material(shader) {name="OscarGame_CUERPO_1032_512"};
            var body=new Material(shader) {name="OscarGame_CUERPO_1015_512"};
            var texture=new Texture2D(4,4);var normal=new Texture2D(4,4);var mask=new Texture2D(4,4);var emission=new Texture2D(4,4);
            var renderer=Child("Measured wing material test",model).gameObject.AddComponent<MeshRenderer>();
            try
            {
                material.SetTexture("_BaseMap",texture);material.SetTexture("_NormalMap",normal);
                material.SetTexture("_MaskMap",mask);material.SetTexture("_EmissionMap",emission);
                material.SetTextureScale("_BaseMap",new Vector2(2,3));material.SetFloat("_Metallic",.2f);
                renderer.sharedMaterials=new[]{material,body};
                view.Configure(motion,model,clips[0],clips[1],clips[2],rigProfile:Profile(),spacecraft:true);
                Assert.AreEqual(1,view.WingMaterialCount);var replacement=renderer.sharedMaterials[0];
                Assert.AreNotSame(material,replacement);Assert.AreSame(body,renderer.sharedMaterials[1]);
                Assert.AreSame(texture,replacement.GetTexture("_BaseMap"));Assert.AreSame(normal,replacement.GetTexture("_NormalMap"));
                Assert.AreSame(mask,replacement.GetTexture("_MaskMap"));Assert.AreSame(emission,replacement.GetTexture("_EmissionMap"));
                Assert.AreEqual(new Vector2(2,3),replacement.GetTextureScale("_BaseMap"));
                Assert.That(material.GetFloat("_Metallic"),Is.EqualTo(.2f));Assert.That(replacement.GetFloat("_Metallic"),Is.EqualTo(.72f));
                Assert.That(replacement.GetFloat("_Smoothness"),Is.EqualTo(.45f));Assert.That(replacement.GetFloat("_NormalStrength"),Is.EqualTo(.22f));
                Assert.That(Vector4.Distance(replacement.GetColor("_PlateColor"),new Color(.32f,.36f,.40f)),Is.LessThan(.0001f));
                view.Configure(motion,model,clips[0],clips[1],clips[2],rigProfile:Profile());
                Assert.AreSame(material,renderer.sharedMaterials[0]);Assert.AreSame(body,renderer.sharedMaterials[1]);
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(actor);actor=null;
                foreach(var resource in new UnityEngine.Object[]{material,body,texture,normal,mask,emission})UnityEngine.Object.DestroyImmediate(resource);
            }
        }

        [Test] public void SpacecraftModeRequiresMeasuredOscarRigAndBothWingSockets()
        {
            Assert.Throws<ArgumentException>(()=>view.Configure(motion,model,clips[0],clips[1],clips[2],spacecraft:true));
            var other=Profile();other.id="different-rig";
            Assert.Throws<ArgumentException>(()=>view.Configure(motion,model,clips[0],clips[1],clips[2],rigProfile:other,spacecraft:true));
            Assert.Throws<ArgumentException>(()=>view.Configure(motion,model,clips[0],clips[1],clips[2],rigProfile:Profile(),spacecraft:true));
            Assert.False(view.UsesSpacecraftMode);
        }
    }
}
