using System;
using System.Collections.Generic;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    public enum DogfightAlarm { None = 0, Caution = 1, Critical = 2, Incoming = 3, HullEmergency = 4 }

    /// <summary>
    /// Opt-in local mix: five licensed layered Sonniss cues, recorded weapon
    /// transients and synthetic interface tones. No network or gameplay timing.
    /// One alarm AudioSource, bounded transient voices, no PlayOneShot stacking.
    /// </summary>
    public sealed class DogfightAudio : MonoBehaviour
    {
        [SerializeField, Range(0,1)] float masterVolume = .8f;
        [SerializeField, Range(0,1)] float effectsVolume = .85f;
        [SerializeField, Range(0,1)] float warningVolume = .62f;
        const int TransientVoices = 6;
        readonly AudioSource[] transients = new AudioSource[TransientVoices];
        readonly float[] transientGains = new float[TransientVoices];
        readonly List<AudioClip> synthesized = new List<AudioClip>();
        readonly Dictionary<string,AudioClip> tones = new Dictionary<string,AudioClip>();
        AudioSource alarmVoice, engineVoice, breathVoice, roarVoice;
        AudioClip roar, breath, blast, metal, boost;
        bool initialized, optedIn, paused, cautionPlayed;
        int nextVoice;
        float alarmClock, fireClock, lockClock, hitClock, engineGain, roarGain;
        DogfightAlarm alarm;
        public bool SoundEnabled => optedIn;
        public bool IsPaused => paused;
        public DogfightAlarm CurrentAlarm => alarm;
        public int AlarmPlayCount { get; private set; }
        public int AlarmVoices => alarmVoice != null && alarmVoice.isPlaying ? 1 : 0;
        public int LiveVoices
        {
            get
            {
                int count = AlarmVoices;
                if (engineVoice != null && engineVoice.isPlaying) count++;
                if (breathVoice != null && breathVoice.isPlaying) count++;
                if (roarVoice != null && roarVoice.isPlaying) count++;
                foreach (var source in transients) if (source != null && source.isPlaying) count++;
                return count;
            }
        }
        public bool HasAllRecordedCues => roar != null && breath != null && blast != null && metal != null && boost != null;
        public bool HasUpgradedRecordedCues => HasAllRecordedCues && roar.name.Contains("v002") && breath.name.Contains("v002")
            && blast.name.Contains("v002") && metal.name.Contains("v002") && boost.name.Contains("v002");
        public string CueStatus => HasUpgradedRecordedCues ? "Five layered licensed Sonniss v002 cues; protected roar/beam, ducking and peak headroom; human mix review pending"
            : HasAllRecordedCues ? "Legacy recorded cues with improved weapon layers and protected mix; v002 asset bindings still required"
            : "Missing recorded cue(s); synthesized prototype fallback; human mix review pending";

        public void Configure(AudioClip roarClip, AudioClip breathClip, AudioClip blastClip, AudioClip metalClip, AudioClip boostClip)
        {
            EnsureInitialized(); StopAll();
            roar = roarClip; breath = breathClip; blast = blastClip; metal = metalClip; boost = boostClip;
            ReplaceTone("fire", WeaponCue("Recorded plasma body", blastClip, false));
            ReplaceTone("launch", WeaponCue("Recorded missile ignition", boostClip, true));
            ResetEncounter();
        }
        void EnsureInitialized()
        {
            if (initialized) return;
            for (int i = 0; i < TransientVoices; i++) transients[i] = Voice("Bounded combat voice " + (i+1));
            alarmVoice = Voice("Single prioritized alarm"); alarmVoice.priority = 32;
            engineVoice = Voice("Boost recording loop"); engineVoice.loop = true; engineVoice.priority = 160;
            breathVoice = Voice("Charged breath beam"); breathVoice.priority = 80;
            roarVoice = Voice("Protected dragon roar"); roarVoice.priority = 72;
            // These are authored synthetic UI effects, deliberately not family voices.
            tones.Add("caution", Tone("Synthetic caution", .22f, 650, 650, .5f, 1));
            tones.Add("critical", Tone("Synthetic system critical", .38f, 420, 420, .65f, 2));
            tones.Add("incoming", Tone("Synthetic incoming missile", .30f, 1050, 850, .6f, 3));
            tones.Add("hull", Tone("Synthetic hull emergency", .55f, 260, 620, .65f, 3));
            tones.Add("lockStart", Tone("Synthetic lock acquisition", .13f, 700, 920, .35f, 1));
            tones.Add("locked", Tone("Synthetic lock confirmed", .25f, 1000, 1480, .5f, 2));
            tones.Add("launch", WeaponCue("Fallback missile ignition", null, true));
            tones.Add("fire", WeaponCue("Fallback plasma body", null, false));
            tones.Add("repair", Tone("Synthetic completed repair", .35f, 530, 1060, .4f, 3));
            initialized = true;
        }
        AudioSource Voice(string name)
        {
            var obj = new GameObject(name); obj.transform.SetParent(transform,false);
            var source = obj.AddComponent<AudioSource>(); source.playOnAwake = false;
            source.spatialBlend = 0; source.volume = 0; source.priority = 128;
            source.dopplerLevel = 0; return source;
        }
        bool CanPlay => initialized && optedIn && !paused;
        public void SetEnabled(bool value)
        {
            EnsureInitialized(); optedIn = value;
            if (!value) StopAll();
            alarmClock = 0;
        }
        public void SetPaused(bool value)
        {
            paused = value;
            // Stop rather than queue/resume stale attack, lock, or warning cues.
            if (value) StopAll();
            alarmClock = 0; fireClock = lockClock = hitClock = 0;
        }
        public void ResetEncounter()
        {
            StopAll(); alarm = DogfightAlarm.None; cautionPlayed = false;
            alarmClock = fireClock = lockClock = hitClock = 0; nextVoice = 0; AlarmPlayCount = 0;
        }
        /// <summary>Caller supplies the highest current warning; None clears it.</summary>
        public void SetAlarm(DogfightAlarm highestCurrentAlarm)
        {
            EnsureInitialized();
            if (highestCurrentAlarm == alarm) return;
            alarm = highestCurrentAlarm; alarmVoice.Stop(); alarmClock = 0;
            if (alarm == DogfightAlarm.None) cautionPlayed = false;
        }
        public static float AlarmInterval(DogfightAlarm value) => value == DogfightAlarm.HullEmergency ? .78f
            : value == DogfightAlarm.Incoming ? .48f : value == DogfightAlarm.Critical ? 2.4f : float.PositiveInfinity;

        public void Tick(float dt, bool boosting)
        {
            if (!CanPlay || dt <= 0 || float.IsNaN(dt) || float.IsInfinity(dt)) return;
            dt = Mathf.Min(dt,.25f); fireClock = Mathf.Max(0,fireClock-dt);
            lockClock = Mathf.Max(0,lockClock-dt); hitClock = Mathf.Max(0,hitClock-dt);
            alarmClock -= dt;
            if (alarm != DogfightAlarm.None && alarmClock <= 0 && !(alarm == DogfightAlarm.Caution && cautionPlayed))
            {
                string key = alarm == DogfightAlarm.HullEmergency ? "hull" : alarm == DogfightAlarm.Incoming ? "incoming"
                    : alarm == DogfightAlarm.Critical ? "critical" : "caution";
                alarmVoice.Stop(); alarmVoice.clip = tones[key]; alarmVoice.pitch = 1;
                alarmVoice.volume = 0; alarmVoice.Play(); AlarmPlayCount++;
                if (alarm == DogfightAlarm.Caution) cautionPlayed = true;
                alarmClock = AlarmInterval(alarm);
            }
            if (boosting && boost != null)
            {
                if (!engineVoice.isPlaying) { engineVoice.clip = boost; engineVoice.Play(); }
                engineGain = Mathf.MoveTowards(engineGain,.43f,dt*1.6f);
                engineVoice.pitch = Mathf.MoveTowards(engineVoice.pitch,1.02f,dt*.35f);
            }
            else
            {
                engineGain = Mathf.MoveTowards(engineGain,0,dt*2.5f);
                if (engineGain <= .001f) engineVoice.Stop();
            }
            if (breathVoice.isPlaying) roarGain = Mathf.MoveTowards(roarGain,.23f,dt*2.8f);
            UpdateMix();
        }
        public void PlayFire()
        {
            if (!CanPlay || fireClock > 0) return;
            fireClock = .11f; Play(tones["fire"],.68f,1);
        }
        public void PlayLaunch() { if (CanPlay) Play(tones["launch"],.9f,1); }
        public void PlayExplosion() { if (CanPlay) Play(blast != null ? blast : tones["launch"],1,1); }
        public void PlayHit()
        {
            if (!CanPlay || hitClock > 0) return;
            hitClock = .12f; Play(metal != null ? metal : tones["fire"],.8f,1);
        }
        public void PlayLockStart()
        {
            if (!CanPlay || lockClock > 0) return;
            lockClock = .7f; Play(tones["lockStart"],.5f,1);
        }
        public void PlayLockConfirmed() { if (CanPlay) Play(tones["locked"],.65f,1); }
        public void PlayPerfectRoll()
        {
            if (!CanPlay) return;
            // Reuse the recorded surge as a short dodge whoosh and an existing
            // quiet confirmation tone; both stay within the bounded effects bus.
            Play(boost != null ? boost : tones["launch"],.65f,1.15f);
            Play(tones["locked"],.22f,1);
        }
        public void PlayBreathWindup()
        {
            if (!CanPlay) return;
            roarVoice.Stop(); roarVoice.clip = roar != null ? roar : tones["launch"];
            roarVoice.pitch = 1; roarGain = 1; roarVoice.volume = 0; roarVoice.Play(); UpdateMix();
        }
        public void PlayBreathBeam()
        {
            if (!CanPlay) return;
            breathVoice.Stop(); breathVoice.clip = breath != null ? breath : tones["launch"];
            breathVoice.pitch = 1; breathVoice.volume = 0; breathVoice.Play(); UpdateMix();
        }
        public void StopBreath() { if (breathVoice != null) breathVoice.Stop(); if (roarVoice != null) roarVoice.Stop(); roarGain = 0; }
        /// <summary>On loss, stop held loops/old cues before the one final explosion.</summary>
        public void StopCombat()
        {
            StopAll(); alarm = DogfightAlarm.None; alarmClock = 0;
            fireClock = lockClock = hitClock = 0;
        }
        public void PlayRepair() { if (CanPlay) Play(tones["repair"],.55f,1); }

        void Play(AudioClip clip, float volume, float pitch)
        {
            if (clip == null) return;
            // Prefer idle voice; bounded round-robin replacement under sustained fire.
            int chosen = nextVoice;
            for (int i = 0; i < TransientVoices; i++)
            { int candidate = (nextVoice+i)%TransientVoices; if (!transients[candidate].isPlaying) { chosen = candidate; break; } }
            nextVoice = (chosen+1)%TransientVoices;
            var source = transients[chosen]; source.Stop(); source.clip = clip;
            transientGains[chosen] = Mathf.Clamp01(volume); source.pitch = pitch; source.volume = 0; source.Play(); UpdateMix();
        }
        void UpdateMix()
        {
            // Priority is audible, not merely a voice-virtualization hint. The
            // current warning ducks the whole effects bus; breath also makes room
            // by gently lowering ordinary weapon/impact transients and boost.
            float warning = alarmVoice.isPlaying ? masterVolume*warningVolume : 0;
            bool focused = roarVoice.isPlaying || breathVoice.isPlaying;
            float duck = warning > 0 ? .45f : 1;
            float background = focused ? .70f : 1;
            float sum = 0;
            for (int i=0;i<TransientVoices;i++) if (transients[i].isPlaying) sum += transientGains[i]*background;
            if (engineVoice.isPlaying) sum += engineGain*background;
            if (roarVoice.isPlaying) sum += roarGain;
            if (breathVoice.isPlaying) sum += 1;
            float effectGain = masterVolume*effectsVolume*duck;
            // All prepared recordings peak below0.54 and local synth below0.65.
            // A conservative0.8 peak bound leaves margin for sample interpolation.
            // Even coherent worst-case voice summing is kept below0.90 FS.
            float budget = Mathf.Max(0,(.90f-warning*.8f)/.8f);
            float scale = Mathf.Min(1,budget/Mathf.Max(.0001f,sum*effectGain));
            effectGain *= scale;
            alarmVoice.volume = warning;
            for (int i=0;i<TransientVoices;i++) transients[i].volume = transientGains[i]*background*effectGain;
            engineVoice.volume = engineGain*background*effectGain;
            roarVoice.volume = roarGain*effectGain;
            breathVoice.volume = effectGain;
        }
        void StopAll()
        {
            foreach (var source in transients) if (source != null) source.Stop();
            if (alarmVoice != null) alarmVoice.Stop();
            if (engineVoice != null) { engineVoice.Stop(); engineVoice.volume = 0; }
            if (breathVoice != null) breathVoice.Stop();
            if (roarVoice != null) roarVoice.Stop();
            engineGain = roarGain = 0;
        }
        void ReplaceTone(string key, AudioClip clip)
        {
            if (tones.TryGetValue(key,out AudioClip old)) { synthesized.Remove(old); Destroy(old); }
            tones[key] = clip;
        }
        AudioClip WeaponCue(string name, AudioClip recording, bool missile)
        {
            const int rate = 48000;
            float duration = missile ? .48f : .27f;
            var data = new float[Mathf.CeilToInt(duration*rate)];
            float[] recorded = null;
            if (recording != null)
            {
                var samples = new float[recording.samples*recording.channels];
                if (recording.GetData(samples,0)) recorded = samples;
            }
            double phase = 0; uint seed = 51911; float filtered = 0, peak = 0;
            for (int i=0;i<data.Length;i++)
            {
                float t = i/(float)rate, p = t/duration;
                phase += 2*Math.PI*Mathf.Lerp(missile ? 78 : 112,missile ? 38 : 48,p)/rate;
                seed = unchecked(seed*1664525u+1013904223u);
                float noise = seed/4294967296f*2-1;
                filtered += (noise-filtered)*.12f;
                float sample = 0;
                if (recorded != null)
                {
                    int index = Mathf.Min(recording.samples-1,(int)(t*recording.frequency*(missile ? .9f : 1.2f)));
                    for (int c=0;c<recording.channels;c++) sample += recorded[index*recording.channels+c]/recording.channels;
                }
                float body = (float)(Math.Sin(phase)*.32+Math.Sin(phase*1.98)*.10)*Mathf.Exp(-t*(missile ? 7 : 15));
                float ignition = (noise-filtered)*.12f*Mathf.Exp(-t*65)+filtered*.20f*Mathf.Exp(-t*9);
                float envelope = Mathf.Min(1,t/.0025f)*Mathf.Min(1,(duration-t)/.05f);
                data[i] = (body+ignition+sample*.9f)*envelope;
                peak = Mathf.Max(peak,Mathf.Abs(data[i]));
            }
            float gain = .62f/Mathf.Max(.001f,peak);
            for (int i=0;i<data.Length;i++) data[i] *= gain;
            var clip = AudioClip.Create(name,data.Length,1,rate,false); clip.SetData(data,0); synthesized.Add(clip); return clip;
        }
        AudioClip Tone(string name, float duration, float fromHz, float toHz, float gain, int pulses, float noiseMix = 0)
        {
            const int rate = 24000;
            var data = new float[Mathf.CeilToInt(duration*rate)];
            double phase = 0; uint seed = 73031;
            for (int i = 0; i < data.Length; i++)
            {
                float t = i/(float)rate, progress = t/duration;
                phase += 2*Math.PI*Mathf.Lerp(fromHz,toHz,progress)/rate;
                float envelope = Mathf.Min(1,t/.008f)*Mathf.Min(1,(duration-t)/.035f);
                float pulse = Mathf.Repeat(progress*pulses,1);
                envelope *= pulse < .74f ? Mathf.Min(1,pulse/.07f)*Mathf.Min(1,(.74f-pulse)/.08f) : 0;
                seed = unchecked(seed*1664525u+1013904223u);
                float noise = seed/4294967296f*2-1;
                float harmonic = (float)(Math.Sin(phase)*.75+Math.Sin(phase*2)*.15);
                data[i] = Mathf.Clamp((harmonic*(1-noiseMix)+noise*noiseMix)*envelope*gain,-.85f,.85f);
            }
            var clip = AudioClip.Create(name,data.Length,1,rate,false); clip.SetData(data,0); synthesized.Add(clip); return clip;
        }
        void OnDestroy()
        {
            StopAll(); foreach (var clip in synthesized) if (clip != null) Destroy(clip);
            synthesized.Clear(); tones.Clear();
        }
    }
}
