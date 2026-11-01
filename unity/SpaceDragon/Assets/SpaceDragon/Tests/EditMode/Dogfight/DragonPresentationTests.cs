using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class DragonPresentationTests
    {
        GameObject actor;
        Transform motion, basis, model, jaw, wing;
        DragonPresentation view;
        static readonly string[] Names = { "Root", "Wing_L", "Wing_R", "Jaw", "Tail_0", "Tail_1", "Tail_2", "Tail_3", "Tail_4" };
        [SetUp] public void SetUp()
        {
            actor = new GameObject("Gameplay");
            motion = Child("VisualMotion", actor.transform); basis = Child("SourceBasis", motion);
            basis.localRotation = Quaternion.Euler(0,180,0); model = Child("ImportedModel", basis);
            foreach (string name in Names) Child(name,model);
            jaw = model.Find("Jaw"); wing = model.Find("Wing_L");
            Child("socket_muzzle",model).localPosition = new Vector3(0,.5f,-3.66f);
            view = actor.AddComponent<DragonPresentation>();
        }
        [TearDown] public void TearDown() { Object.DestroyImmediate(actor); }
        static Transform Child(string name, Transform parent)
        { var child = new GameObject(name).transform; child.SetParent(parent,false); return child; }

        [Test] public void PresentationNeverMovesGameplayOrBasisAndRespectsPause()
        {
            actor.transform.SetPositionAndRotation(new Vector3(12,8,90),Quaternion.Euler(6,28,0));
            Vector3 before = actor.transform.position; Quaternion rotation = actor.transform.rotation;
            Quaternion basisRotation = basis.localRotation;
            view.Configure(motion,model,null,null,null);
            view.Tick(.1f,.1f,true,.2f,1.5f,-.32f,.4f);
            Assert.AreEqual(before,actor.transform.position);
            Assert.Less(Quaternion.Angle(rotation,actor.transform.rotation),.0001f);
            Assert.Less(Quaternion.Angle(basisRotation,basis.localRotation),.0001f);
            Assert.Greater(Quaternion.Angle(Quaternion.identity,jaw.localRotation),15);
            Quaternion wingBefore = wing.localRotation; Quaternion motionBefore = motion.localRotation;
            view.SetPaused(true); view.Tick(.2f,10,false,-1,0,0,0);
            Assert.AreEqual(wingBefore,wing.localRotation); Assert.AreEqual(motionBefore,motion.localRotation);
            Assert.AreSame(model.Find("socket_muzzle"),view.MuzzleTransform);
        }

        [Test] public void AuthoredSamplesBlendAndIgnoreRootMotionAndJawChannels()
        {
            AnimationClip Clip(string name, float angle)
            {
                var clip = new AnimationClip { name = name, legacy = true };
                Quaternion q = Quaternion.Euler(0,0,angle);
                clip.SetCurve("Wing_L",typeof(Transform),"localRotation.x",AnimationCurve.Constant(0,1,q.x));
                clip.SetCurve("Wing_L",typeof(Transform),"localRotation.y",AnimationCurve.Constant(0,1,q.y));
                clip.SetCurve("Wing_L",typeof(Transform),"localRotation.z",AnimationCurve.Constant(0,1,q.z));
                clip.SetCurve("Wing_L",typeof(Transform),"localRotation.w",AnimationCurve.Constant(0,1,q.w));
                clip.SetCurve("Root",typeof(Transform),"localPosition.x",AnimationCurve.Linear(0,0,1,99));
                clip.SetCurve("Jaw",typeof(Transform),"localPosition.y",AnimationCurve.Constant(0,1,77));
                return clip;
            }
            var a = Clip("Flight",12); var b = Clip("Glide",7); var c = Clip("Boost",30);
            try
            {
                view.Configure(motion,model,a,b,c);
                Assert.True(view.UsesAuthoredClips);
                Assert.AreEqual(Vector3.zero,model.Find("Root").localPosition);
                Assert.AreEqual(Vector3.zero,jaw.localPosition);
                view.Tick(.1f,.1f,true,0,0,-.025f,0);
                Assert.That(view.BoostWeight,Is.GreaterThan(0).And.LessThan(1));
                Assert.That(view.FlightWeight+view.GlideWeight+view.BoostWeight,Is.EqualTo(1).Within(.0001f));
                Assert.AreEqual(Vector3.zero,model.Find("Root").localPosition);
                Assert.AreEqual(Vector3.zero,jaw.localPosition);
                Assert.Greater(Quaternion.Angle(Quaternion.identity,wing.localRotation),8);
                view.ResetPose(); Assert.Less(Quaternion.Angle(Quaternion.identity,wing.localRotation),.0001f);
            }
            finally { Object.DestroyImmediate(a); Object.DestroyImmediate(b); Object.DestroyImmediate(c); }
        }

        [Test] public void SeededCadenceHasSteadyGlidesAndResetIsRepeatable()
        {
            view.Configure(motion,model,null,null,null);
            bool sawGlide = false; int seen = 0;
            for (int i=0;i<700;i++) { view.Tick(.02f,i*.02f,false,0,0,-.025f,0); if(view.IsGliding) { sawGlide=true; seen++; } }
            Assert.True(sawGlide); Assert.Greater(seen,20);
            view.ResetPose(); view.Tick(.1f,.1f,false,0,0,-.025f,0); Quaternion first = wing.localRotation;
            view.ResetPose(); view.Tick(.1f,.1f,false,0,0,-.025f,0);
            Assert.Less(Quaternion.Angle(first,wing.localRotation),.0001f);
        }

        static readonly string[] OrganicNames = { "Neck", "Head", "Fore_L", "Fore_R", "Hind_L", "Hind_R" };
        static readonly string[] OrganicPaths = { "Root/Neck", "Root/Neck/Head", "Root/Fore_L", "Root/Fore_R", "Root/Hind_L", "Root/Hind_R" };

        Transform[] AddOrganicBones(bool omitLast = false)
        {
            var extra = new Transform[omitLast ? 5 : 6];
            for (int i = 0; i < extra.Length; i++)
            {
                extra[i] = Child(OrganicNames[i], i == 1 ? extra[0] : model.Find("Root"));
                extra[i].localPosition = new Vector3(.1f*i,.3f,-.2f);
                extra[i].localRotation = Quaternion.Euler(3*i,-2*i,4*i);
                extra[i].localScale = Vector3.one * (1 + .02f*i);
            }
            return extra;
        }

        static void RotationCurve(AnimationClip clip, string path, Quaternion q)
        {
            // Different clip durations exercise normalized authored sampling.
            float duration = clip.name == "Flight" ? 1.2f : clip.name == "Glide" ? 1.7f : .85f;
            clip.SetCurve(path,typeof(Transform),"localRotation.x",AnimationCurve.Constant(0,duration,q.x));
            clip.SetCurve(path,typeof(Transform),"localRotation.y",AnimationCurve.Constant(0,duration,q.y));
            clip.SetCurve(path,typeof(Transform),"localRotation.z",AnimationCurve.Constant(0,duration,q.z));
            clip.SetCurve(path,typeof(Transform),"localRotation.w",AnimationCurve.Constant(0,duration,q.w));
        }

        static AnimationClip OrganicClip(string name, Quaternion[] rotations)
        {
            var clip = new AnimationClip { name = name, legacy = true };
            for (int i = 0; i < rotations.Length; i++) RotationCurve(clip,OrganicPaths[i],rotations[i]);
            RotationCurve(clip,"Wing_L",Quaternion.Euler(11,7,name == "Boost" ? 31 : 16));
            RotationCurve(clip,"Wing_R",Quaternion.Euler(-11,7,name == "Boost" ? -31 : -16));
            RotationCurve(clip,"Tail_0",Quaternion.Euler(8,name == "Boost" ? 28 : 12,5));
            return clip;
        }

        [Test] public void OrganicNeckHeadAndLimbsBlendWithoutMechanicalOffsetsAndRestoreOnReset()
        {
            var extra = AddOrganicBones();
            var rests = new Quaternion[extra.Length]; var flight = new Quaternion[extra.Length];
            var glide = new Quaternion[extra.Length]; var boost = new Quaternion[extra.Length];
            for (int i = 0; i < extra.Length; i++)
            {
                rests[i] = extra[i].localRotation;
                flight[i] = rests[i] * Quaternion.Euler(10+i,3,-4);
                glide[i] = rests[i] * Quaternion.Euler(4,1,-2);
                boost[i] = rests[i] * Quaternion.Euler(35+i,8,-11);
            }
            var muzzle = model.Find("socket_muzzle"); muzzle.SetParent(extra[1],false);
            var a = OrganicClip("Flight",flight); var b = OrganicClip("Glide",glide); var c = OrganicClip("Boost",boost);
            // Runtime caches only rotations; even accidental transform channels
            // must leave the complete source hierarchy intact after sampling.
            a.SetCurve("Root",typeof(Transform),"localPosition.x",AnimationCurve.Constant(0,1.2f,99));
            b.SetCurve("Root/Neck",typeof(Transform),"localPosition.y",AnimationCurve.Constant(0,1.7f,77));
            c.SetCurve("Root/Neck/Head/socket_muzzle",typeof(Transform),"localScale.y",AnimationCurve.Constant(0,.85f,9));
            var transforms = model.GetComponentsInChildren<Transform>(true);
            var positions = new Vector3[transforms.Length]; var rotations = new Quaternion[transforms.Length]; var scales = new Vector3[transforms.Length];
            for (int i = 0; i < transforms.Length; i++)
            { positions[i] = transforms[i].localPosition; rotations[i] = transforms[i].localRotation; scales[i] = transforms[i].localScale; }
            var gameplayPosition = actor.transform.position; var gameplayRotation = actor.transform.rotation; var basisRotation = basis.localRotation;
            try
            {
                view.Configure(motion,model,a,b,c,organic:true);
                Assert.True(view.UsesOrganicRig); Assert.True(view.UsesAuthoredClips);
                for (int i = 0; i < transforms.Length; i++)
                {
                    Assert.AreEqual(positions[i],transforms[i].localPosition,transforms[i].name);
                    Assert.Less(Quaternion.Angle(rotations[i],transforms[i].localRotation),.03f,transforms[i].name);
                    Assert.AreEqual(scales[i],transforms[i].localScale,transforms[i].name);
                }
                view.Tick(.1f,.1f,true,.4f,.8f,-.32f,.75f);
                Assert.That(view.BoostWeight,Is.GreaterThan(0).And.LessThan(1));
                for (int i = 0; i < extra.Length; i++)
                    Assert.Less(Quaternion.Angle(Quaternion.Slerp(flight[i],boost[i],view.BoostWeight),extra[i].localRotation),.03f,OrganicNames[i]);
                Assert.Less(Quaternion.Angle(Quaternion.Slerp(Quaternion.Euler(11,7,16),Quaternion.Euler(11,7,31),view.BoostWeight),wing.localRotation),.03f,"Organic wings must not inherit mechanical neutral/bank offsets");
                Assert.Less(Quaternion.Angle(Quaternion.Slerp(Quaternion.Euler(8,12,5),Quaternion.Euler(8,28,5),view.BoostWeight),model.Find("Tail_0").localRotation),.03f,"Organic tail must not inherit the old local-Y steering offset");
                Assert.Less(Quaternion.Angle(Quaternion.AngleAxis(-.32f*Mathf.Rad2Deg,Vector3.right),jaw.localRotation),.03f);
                Assert.AreEqual(gameplayPosition,actor.transform.position);
                Assert.Less(Quaternion.Angle(gameplayRotation,actor.transform.rotation),.03f);
                Assert.Less(Quaternion.Angle(basisRotation,basis.localRotation),.03f);
                Assert.AreSame(muzzle,view.MuzzleTransform);
                Assert.Greater(Quaternion.Angle(Quaternion.identity,motion.localRotation),60);
                var pausedRotations = new Quaternion[extra.Length];
                for (int i = 0; i < extra.Length; i++) pausedRotations[i] = extra[i].localRotation;
                float phase = view.StrokePhase, weight = view.BoostWeight;
                var motionPosition = motion.localPosition; var motionRotation = motion.localRotation;
                view.SetPaused(true); view.Tick(.2f,20,false,-1,0,0,-1);
                for (int i = 0; i < extra.Length; i++) Assert.AreEqual(pausedRotations[i],extra[i].localRotation);
                Assert.AreEqual(phase,view.StrokePhase); Assert.AreEqual(weight,view.BoostWeight);
                Assert.AreEqual(motionPosition,motion.localPosition); Assert.AreEqual(motionRotation,motion.localRotation);
                view.ResetPose();
                for (int i = 0; i < extra.Length; i++) Assert.Less(Quaternion.Angle(rests[i],extra[i].localRotation),.03f,OrganicNames[i]);
                for (int i = 0; i < transforms.Length; i++)
                { Assert.AreEqual(positions[i],transforms[i].localPosition); Assert.AreEqual(scales[i],transforms[i].localScale); }
                Assert.AreEqual(Vector3.zero,motion.localPosition);
                Assert.Less(Quaternion.Angle(Quaternion.identity,motion.localRotation),.03f);
            }
            finally { Object.DestroyImmediate(a); Object.DestroyImmediate(b); Object.DestroyImmediate(c); }
        }

        [Test] public void OrganicRigRejectsMissingLimbInsteadOfSilentlyUsingMechanicalFallback()
        {
            AddOrganicBones(omitLast:true);
            var error = Assert.Throws<System.InvalidOperationException>(() => view.Configure(motion,model,null,null,null,organic:true));
            StringAssert.Contains("Hind_R",error.Message);
            Assert.False(view.UsesAuthoredClips);
        }

        [TestCase(0)] [TestCase(1)] [TestCase(2)]
        public void OrganicRigRequiresAllThreeAuthoredClips(int missing)
        {
            AddOrganicBones();
            var clips = new[] { OrganicClip("Flight",new Quaternion[0]), OrganicClip("Glide",new Quaternion[0]), OrganicClip("Boost",new Quaternion[0]) };
            try
            {
                var error = Assert.Throws<System.InvalidOperationException>(() => view.Configure(motion,model,
                    missing == 0 ? null : clips[0],missing == 1 ? null : clips[1],missing == 2 ? null : clips[2],organic:true));
                StringAssert.Contains("requires authored",error.Message);
                Assert.False(view.UsesAuthoredClips);
                view.Tick(.1f,.1f,true,1,1,-.32f,1);
                Assert.AreEqual(Quaternion.identity,wing.localRotation);
            }
            finally { foreach (var clip in clips) Object.DestroyImmediate(clip); }
        }

        [Test] public void AlarmCadencePrioritizesUrgencyWithoutContinuousStacking()
        {
            Assert.Greater((int)DogfightAlarm.HullEmergency,(int)DogfightAlarm.Incoming);
            Assert.Greater((int)DogfightAlarm.Incoming,(int)DogfightAlarm.Critical);
            Assert.True(float.IsPositiveInfinity(DogfightAudio.AlarmInterval(DogfightAlarm.Caution)));
            Assert.Greater(DogfightAudio.AlarmInterval(DogfightAlarm.Critical),2);
            Assert.Less(DogfightAudio.AlarmInterval(DogfightAlarm.Incoming),1);
        }
    }
}
