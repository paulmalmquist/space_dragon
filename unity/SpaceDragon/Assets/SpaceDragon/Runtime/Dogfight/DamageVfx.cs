using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace SpaceDragon.Dogfight
{
    /// <summary>Bounded, render-only machine damage. No health or repair rewards live here.</summary>
    public sealed class DamageVfx : MonoBehaviour
    {
        const int PoolSize = 48;
        static readonly string[] Systems = { "hull", "propulsion", "weapons" };
        readonly float[] damage = new float[3];
        readonly float[] smokeClocks = new float[3];
        readonly int[] patches = new int[3];
        readonly Transform[] anchors = new Transform[3];
        readonly Transform[] scars = new Transform[3];
        readonly Transform[,] patchPanels = new Transform[3,3];
        readonly Transform[] drones = new Transform[2];
        readonly LineRenderer[] repairBeams = new LineRenderer[2];
        readonly List<UnityEngine.Object> resources = new List<UnityEngine.Object>();
        readonly List<GameObject> objects = new List<GameObject>();
        readonly Particle[] particles = new Particle[PoolSize];
        Material sparkMaterial, smokeMaterial, patchMaterial, darkMaterial, droneMaterial;
        Mesh plateMesh, cubeMesh, smokeMesh;
        Transform root, model, worldEffects;
        float time, repairProgress;
        int repairSystem = -1, nextParticle;
        bool paused, configured;
        uint rng = 20903;
        Vector3 previousPosition, inheritedVelocity;
        sealed class Particle { public Transform transform; public Renderer renderer; public float life, duration; public Vector3 velocity; public bool smoke; }

        public int ActiveParticles { get; private set; }
        public int ActiveSmoke { get; private set; }
        public int VisibleDrones => repairSystem >= 0 ? 2 : 0;
        public int PatchCount => patches[0] + patches[1] + patches[2];
        public string RepairSystem => repairSystem >= 0 ? Systems[repairSystem] : "";
        public float RepairProgress => repairProgress;

        public void Configure(Transform gameplayRoot, DragonPresentation presentation)
        {
            if (gameplayRoot == null || presentation == null || presentation.ModelRoot == null)
                throw new ArgumentException("DamageVfx requires an imported dragon presentation.");
            Release(); root = gameplayRoot; model = presentation.ModelRoot;
            darkMaterial = Material("Damaged scale: charred metal", new Color(.037f,.029f,.026f), .45f, .17f, false);
            patchMaterial = Material("Recovered patch: brushed steel", new Color(.31f,.39f,.41f), .75f, .48f, false);
            droneMaterial = Material("Family maintenance drone: crimson", new Color(.39f,.045f,.035f), .4f, .4f, false);
            sparkMaterial = Material("Welding and damage sparks", new Color(3.8f,1.25f,.12f), 0, 0, true);
            smokeMaterial = Material("Intermittent machine smoke", new Color(.075f,.087f,.095f,.3f), 0, 0, true, true);
            plateMesh = MakePlate(); cubeMesh = MakePrimitiveMesh(PrimitiveType.Cube); smokeMesh = MakePrimitiveMesh(PrimitiveType.Sphere);
            worldEffects = Object("Dogfight bounded damage particles", null).transform;
            // Rest-surface heights measured from the actual GLB triangles,
            // with the importer's X mirror accounted for. Avoid buried scars.
            var positions = new[] { new Vector3(.30f,.815f,.30f), new Vector3(.52f,.32f,1.1f), new Vector3(-.25f,1.12f,-2.65f) };
            Transform boneRoot = presentation.Socket("Root") ?? model;
            for (int system = 0; system < 3; system++)
            {
                anchors[system] = Object("Damage anchor: " + Systems[system], boneRoot).transform;
                anchors[system].position = model.TransformPoint(positions[system]);
                anchors[system].rotation = model.rotation;
                scars[system] = MeshObject("Dark bent scales: " + Systems[system], anchors[system], plateMesh, darkMaterial).transform;
                scars[system].localScale = new Vector3(.65f,.045f,.55f);
                scars[system].localRotation = Quaternion.Euler(0,18,8);
                for (int p = 0; p < 3; p++)
                {
                    patchPanels[system,p] = MeshObject("Recovered patch " + Systems[system] + " " + (p+1), anchors[system], plateMesh, patchMaterial).transform;
                    patchPanels[system,p].localPosition = new Vector3((p-1)*.14f,.047f+p*.008f,(p-1)*.09f);
                    patchPanels[system,p].localScale = new Vector3(.28f,.024f,.38f);
                    patchPanels[system,p].localRotation = Quaternion.Euler(0, p*11-14, 0);
                }
            }
            for (int i = 0; i < PoolSize; i++)
            {
                var obj = MeshObject("Pooled damage particle " + i, worldEffects, cubeMesh, sparkMaterial);
                particles[i] = new Particle { transform = obj.transform, renderer = obj.GetComponent<Renderer>() };
                obj.SetActive(false);
            }
            for (int i = 0; i < 2; i++)
            {
                var drone = Object("Family maintenance drone " + (i+1), model); drones[i] = drone.transform;
                var body = MeshObject("Crimson service shell", drones[i], plateMesh, droneMaterial);
                body.transform.localScale = new Vector3(.29f,.13f,.38f);
                for (int side = -1; side <= 1; side += 2)
                {
                    var arm = MeshObject("Repair manipulator", drones[i], cubeMesh, patchMaterial);
                    arm.transform.localPosition = new Vector3(side*.18f,-.045f,-.08f);
                    arm.transform.localScale = new Vector3(.05f,.05f,.30f);
                }
                var light = MeshObject("Maintenance status light", drones[i], cubeMesh, sparkMaterial);
                light.transform.localPosition = new Vector3(0,.075f,-.13f); light.transform.localScale = new Vector3(.1f,.025f,.04f);
                var beamObject = Object("Repair welding beam", drones[i]);
                var beam = beamObject.AddComponent<LineRenderer>(); repairBeams[i] = beam;
                beam.sharedMaterial = sparkMaterial; beam.useWorldSpace = true; beam.positionCount = 2;
                beam.startWidth = .015f; beam.endWidth = .005f; beam.shadowCastingMode = ShadowCastingMode.Off;
                beam.receiveShadows = false; beam.numCapVertices = 2;
            }
            configured = true; Clear();
        }

        public void SetDamage(string systemId, float severity01)
        {
            int system = Index(systemId); if (!configured || system < 0) return;
            float severity = Mathf.Clamp01(severity01);
            if (!paused && severity > damage[system] + .015f) Burst(anchors[system].position, 7 + Mathf.RoundToInt(severity * 7));
            damage[system] = severity; scars[system].gameObject.SetActive(severity > .08f);
            scars[system].localScale = new Vector3(.45f + severity*.35f,.035f+severity*.055f,.38f+severity*.25f);
        }
        public void BeginRepair(string systemId)
        {
            int system = Index(systemId); if (!configured || system < 0 || paused) return;
            if (repairSystem == system) return;
            repairSystem = system; repairProgress = 0;
            foreach (var drone in drones) drone.gameObject.SetActive(true);
        }
        /// <summary>Progress comes from authoritative four-second repair state, never our timer.</summary>
        public void SetRepairProgress(float progress01) => repairProgress = Mathf.Clamp01(progress01);
        public void CancelRepair()
        {
            repairSystem = -1; repairProgress = 0;
            foreach (var drone in drones) if (drone != null) drone.gameObject.SetActive(false);
        }
        /// <summary>Absolute count is idempotent. Presentation cannot consume resources or heal.</summary>
        public void CompleteRepair(string systemId, int patchCount)
        {
            int system = Index(systemId); if (!configured || system < 0) return;
            patches[system] = Mathf.Clamp(patchCount, 0, 3);
            for (int p = 0; p < 3; p++) patchPanels[system,p].gameObject.SetActive(p < patches[system]);
            CancelRepair();
        }
        public void SetPaused(bool value) { paused = value; if (root != null) previousPosition = root.position; }

        public void Tick(float dt)
        {
            if (!configured || paused || dt <= 0 || float.IsNaN(dt) || float.IsInfinity(dt)) return;
            dt = Mathf.Min(dt,.25f); time += dt;
            inheritedVelocity = Vector3.ClampMagnitude((root.position - previousPosition)/Mathf.Max(dt,.001f), 180);
            previousPosition = root.position;
            for (int s = 0; s < 3; s++)
            {
                smokeClocks[s] -= dt;
                if (damage[s] > .3f && smokeClocks[s] <= 0)
                {
                    smokeClocks[s] = Mathf.Lerp(1.2f,.22f,damage[s]) + Random01()*.25f;
                    Spawn(anchors[s].position, true, inheritedVelocity*.72f + model.up*(.4f+Random01()*.5f));
                    if (damage[s] > .68f) Burst(anchors[s].position, 2);
                }
            }
            if (repairSystem >= 0)
            {
                var center = anchors[repairSystem].position;
                for (int i = 0; i < 2; i++)
                {
                    float sign = i == 0 ? -1 : 1;
                    Vector3 offset = new Vector3(sign*(.48f+Mathf.Sin(time*1.5f+i)*.08f),.45f+Mathf.Sin(time*2+i)*.06f,.15f);
                    drones[i].position = center + model.TransformVector(offset);
                    drones[i].rotation = Quaternion.LookRotation(center - drones[i].position, model.up);
                    Vector3 tool = drones[i].TransformPoint(new Vector3(0,0,.15f));
                    Vector3 weld = center + model.right * Mathf.Sin(repairProgress*16+i)*.18f;
                    repairBeams[i].SetPosition(0, tool); repairBeams[i].SetPosition(1, weld);
                    repairBeams[i].enabled = Mathf.Sin(time*24+i) > -.4f;
                    if (Random01() < dt*14) Spawn(weld, false, inheritedVelocity + model.up*(.7f+Random01()));
                }
            }
            ActiveParticles = ActiveSmoke = 0;
            foreach (var particle in particles)
            {
                if (particle.life <= 0) continue;
                particle.life -= dt;
                if (particle.life <= 0) { particle.transform.gameObject.SetActive(false); continue; }
                ActiveParticles++; if (particle.smoke) ActiveSmoke++;
                particle.transform.position += particle.velocity * dt;
                if (particle.smoke)
                {
                    float age = 1-particle.life/particle.duration;
                    particle.transform.localScale = Vector3.one*(.12f+age*.75f)*Mathf.Min(1,particle.life*4);
                }
                else
                {
                    particle.velocity *= Mathf.Exp(-dt*2);
                    particle.transform.localScale = new Vector3(.018f,.018f,.07f)*Mathf.Clamp01(particle.life*5);
                }
            }
        }

        public void Burst(Vector3 position, int count = 12)
        {
            if (!configured || paused) return;
            for (int i = 0; i < Mathf.Clamp(count,0,24); i++)
            {
                Vector3 direction = new Vector3(Random01()-.5f,Random01(),Random01()-.5f).normalized;
                Spawn(position, false, inheritedVelocity*.8f + direction*(1.5f+Random01()*4));
            }
        }
        void Spawn(Vector3 position, bool smoke, Vector3 velocity)
        {
            // Fixed pool overwrites the oldest slot; even repeated explosions cannot allocate.
            var p = particles[nextParticle]; nextParticle = (nextParticle+1)%PoolSize;
            p.smoke = smoke; p.duration = p.life = smoke ? 1.15f + Random01()*.7f : .3f+Random01()*.55f;
            p.velocity = velocity; p.transform.position = position;
            p.transform.rotation = velocity.sqrMagnitude > .01f ? Quaternion.LookRotation(velocity) : Quaternion.identity;
            p.transform.GetComponent<MeshFilter>().sharedMesh = smoke ? smokeMesh : cubeMesh;
            p.renderer.sharedMaterial = smoke ? smokeMaterial : sparkMaterial;
            p.transform.localScale = Vector3.one*(smoke ? .12f : .025f); p.transform.gameObject.SetActive(true);
        }
        public void Clear()
        {
            CancelRepair(); time = 0; nextParticle = 0; ActiveParticles = ActiveSmoke = 0;
            if (root != null) previousPosition = root.position;
            inheritedVelocity = Vector3.zero;
            for (int s = 0; s < 3; s++)
            {
                damage[s] = smokeClocks[s] = 0; patches[s] = 0;
                if (scars[s] != null) scars[s].gameObject.SetActive(false);
                for (int p = 0; p < 3; p++) if (patchPanels[s,p] != null) patchPanels[s,p].gameObject.SetActive(false);
            }
            foreach (var p in particles) if (p != null) { p.life = 0; p.transform.gameObject.SetActive(false); }
        }
        static int Index(string id) => id == "hull" ? 0 : id == "propulsion" ? 1 : id == "weapons" ? 2 : -1;
        float Random01() { rng = unchecked(rng*1664525u+1013904223u); return rng/4294967296f; }
        GameObject Object(string name, Transform parent)
        {
            var obj = new GameObject(name); obj.transform.SetParent(parent,false); objects.Add(obj); return obj;
        }
        GameObject MeshObject(string name, Transform parent, Mesh mesh, Material material)
        {
            var obj = Object(name,parent); obj.AddComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = obj.AddComponent<MeshRenderer>(); renderer.sharedMaterial = material;
            renderer.shadowCastingMode = ShadowCastingMode.Off; renderer.receiveShadows = false; return obj;
        }
        Material Material(string name, Color color, float metallic, float smoothness, bool unlit, bool transparent = false)
        {
            var shader = Shader.Find(unlit ? "Universal Render Pipeline/Unlit" : "Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            if (shader == null) throw new InvalidOperationException("Retain URP Lit/Unlit in the generated Dogfight scene.");
            var material = new Material(shader) { name = name }; resources.Add(material);
            material.SetColor("_BaseColor",color); material.SetColor("_Color",color);
            material.SetFloat("_Metallic",metallic); material.SetFloat("_Smoothness",smoothness);
            if (transparent)
            {
                material.SetFloat("_Surface",1); material.SetFloat("_Blend",0); material.SetFloat("_ZWrite",0);
                material.SetFloat("_SrcBlend",(float)BlendMode.SrcAlpha); material.SetFloat("_DstBlend",(float)BlendMode.OneMinusSrcAlpha);
                material.EnableKeyword("_SURFACE_TYPE_TRANSPARENT"); material.renderQueue = (int)RenderQueue.Transparent;
                material.SetOverrideTag("RenderType","Transparent");
            }
            return material;
        }
        Mesh MakePlate()
        {
            var vertices = new List<Vector3>(); var triangles = new List<int>();
            DragonPresentation.AppendPlate(vertices,triangles,Matrix4x4.identity);
            var mesh = new Mesh { name = "Damage/repair bevelled shield" };
            mesh.SetVertices(vertices); mesh.SetTriangles(triangles,0); mesh.RecalculateNormals(); mesh.RecalculateBounds(); resources.Add(mesh); return mesh;
        }
        Mesh MakePrimitiveMesh(PrimitiveType type)
        {
            var temporary = GameObject.CreatePrimitive(type);
            var mesh = Instantiate(temporary.GetComponent<MeshFilter>().sharedMesh); mesh.name = "Pooled " + type;
            temporary.SetActive(false); Destroy(temporary); resources.Add(mesh); return mesh;
        }
        void Release()
        {
            configured = false;
            foreach (var obj in objects) if (obj != null) Destroy(obj);
            foreach (var resource in resources) if (resource != null) Destroy(resource);
            objects.Clear(); resources.Clear();
        }
        void OnDestroy() => Release();
    }
}
