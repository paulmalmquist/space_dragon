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
    }
}
