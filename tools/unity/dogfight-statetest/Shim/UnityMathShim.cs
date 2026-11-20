// Hand-written stand-ins for the small part of UnityEngine that the Dogfight state classes
// and their EditMode tests use: Mathf, Vector2, Vector3, Quaternion, ScriptableObject and a
// few inspector attributes.
//
// Why this exists: the public UnityEngine reference assemblies are metadata only and cannot
// execute outside the engine, so `dotnet test` needs managed code for these types.
//
// What it is not: Unity. It follows Unity's documented conventions (left-handed, +Z forward,
// +Y up, degrees for Quaternion angles, clamped Lerp, approximate == on vectors). Results can
// differ from the engine in the last bits of a float and at degenerate inputs such as exactly
// opposite directions. A pass here means the state rules hold under this arithmetic. It does
// not replace the Unity EditMode run on the pinned Editor.
//
// Keep it small. Add a member only when a state class or its test needs it.
using System;
using System.Globalization;

namespace UnityEngine
{
    public static class Mathf
    {
        public const float PI = (float)Math.PI;
        public const float Infinity = float.PositiveInfinity;
        public const float NegativeInfinity = float.NegativeInfinity;
        public const float Deg2Rad = PI * 2f / 360f;
        public const float Rad2Deg = 1f / Deg2Rad;
        public static readonly float Epsilon = float.Epsilon;

        public static float Sin(float f) => (float)Math.Sin(f);
        public static float Cos(float f) => (float)Math.Cos(f);
        public static float Tan(float f) => (float)Math.Tan(f);
        public static float Asin(float f) => (float)Math.Asin(f);
        public static float Acos(float f) => (float)Math.Acos(f);
        public static float Atan(float f) => (float)Math.Atan(f);
        public static float Atan2(float y, float x) => (float)Math.Atan2(y, x);
        public static float Sqrt(float f) => (float)Math.Sqrt(f);
        public static float Exp(float power) => (float)Math.Exp(power);
        public static float Pow(float f, float p) => (float)Math.Pow(f, p);
        public static float Log(float f) => (float)Math.Log(f);
        public static float Abs(float f) => Math.Abs(f);
        public static int Abs(int value) => Math.Abs(value);
        public static float Floor(float f) => (float)Math.Floor(f);
        public static float Ceil(float f) => (float)Math.Ceiling(f);
        public static float Round(float f) => (float)Math.Round(f);
        public static int FloorToInt(float f) => (int)Math.Floor(f);
        public static int CeilToInt(float f) => (int)Math.Ceiling(f);
        public static int RoundToInt(float f) => (int)Math.Round(f);
        public static float Sign(float f) => f >= 0f ? 1f : -1f;

        public static float Min(float a, float b) => a < b ? a : b;
        public static int Min(int a, int b) => a < b ? a : b;
        public static float Max(float a, float b) => a > b ? a : b;
        public static int Max(int a, int b) => a > b ? a : b;
        public static float Min(params float[] values)
        {
            if (values.Length == 0) return 0f;
            float m = values[0];
            for (int i = 1; i < values.Length; i++) if (values[i] < m) m = values[i];
            return m;
        }
        public static float Max(params float[] values)
        {
            if (values.Length == 0) return 0f;
            float m = values[0];
            for (int i = 1; i < values.Length; i++) if (values[i] > m) m = values[i];
            return m;
        }

        public static float Clamp(float value, float min, float max)
        {
            if (value < min) value = min; else if (value > max) value = max;
            return value;
        }
        public static int Clamp(int value, int min, int max)
        {
            if (value < min) value = min; else if (value > max) value = max;
            return value;
        }
        public static float Clamp01(float value) => value < 0f ? 0f : value > 1f ? 1f : value;

        public static float Lerp(float a, float b, float t) => a + (b - a) * Clamp01(t);
        public static float LerpUnclamped(float a, float b, float t) => a + (b - a) * t;
        public static float InverseLerp(float a, float b, float value) => a != b ? Clamp01((value - a) / (b - a)) : 0f;
        public static float SmoothStep(float from, float to, float t)
        {
            t = Clamp01(t);
            t = -2f * t * t * t + 3f * t * t;
            return to * t + from * (1f - t);
        }
        public static float MoveTowards(float current, float target, float maxDelta) =>
            Abs(target - current) <= maxDelta ? target : current + Sign(target - current) * maxDelta;
        public static float Repeat(float t, float length) => Clamp(t - Floor(t / length) * length, 0f, length);
        public static float DeltaAngle(float current, float target)
        {
            float delta = Repeat(target - current, 360f);
            if (delta > 180f) delta -= 360f;
            return delta;
        }
        public static bool Approximately(float a, float b) =>
            Abs(b - a) < Max(1E-06f * Max(Abs(a), Abs(b)), Epsilon * 8f);
    }

    public struct Vector2 : IEquatable<Vector2>
    {
        public float x, y;
        public Vector2(float x, float y) { this.x = x; this.y = y; }

        public static Vector2 zero => new Vector2(0f, 0f);
        public static Vector2 one => new Vector2(1f, 1f);
        public static Vector2 up => new Vector2(0f, 1f);
        public static Vector2 down => new Vector2(0f, -1f);
        public static Vector2 left => new Vector2(-1f, 0f);
        public static Vector2 right => new Vector2(1f, 0f);

        public float magnitude => (float)Math.Sqrt(x * x + y * y);
        public float sqrMagnitude => x * x + y * y;
        public Vector2 normalized
        {
            get { float m = magnitude; return m > 1E-05f ? this / m : zero; }
        }
        public void Normalize() { this = normalized; }

        public static float Dot(Vector2 a, Vector2 b) => a.x * b.x + a.y * b.y;
        public static float Distance(Vector2 a, Vector2 b) => (a - b).magnitude;
        public static Vector2 Lerp(Vector2 a, Vector2 b, float t)
        {
            t = Mathf.Clamp01(t);
            return new Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
        }
        public static Vector2 ClampMagnitude(Vector2 vector, float maxLength)
        {
            float sqr = vector.sqrMagnitude;
            if (sqr <= maxLength * maxLength) return vector;
            float m = (float)Math.Sqrt(sqr);
            return new Vector2(vector.x / m * maxLength, vector.y / m * maxLength);
        }

        public static Vector2 operator +(Vector2 a, Vector2 b) => new Vector2(a.x + b.x, a.y + b.y);
        public static Vector2 operator -(Vector2 a, Vector2 b) => new Vector2(a.x - b.x, a.y - b.y);
        public static Vector2 operator -(Vector2 a) => new Vector2(-a.x, -a.y);
        public static Vector2 operator *(Vector2 a, float d) => new Vector2(a.x * d, a.y * d);
        public static Vector2 operator *(float d, Vector2 a) => new Vector2(a.x * d, a.y * d);
        public static Vector2 operator /(Vector2 a, float d) => new Vector2(a.x / d, a.y / d);
        public static bool operator ==(Vector2 lhs, Vector2 rhs)
        {
            float dx = lhs.x - rhs.x, dy = lhs.y - rhs.y;
            return dx * dx + dy * dy < 9.99999944E-11f;
        }
        public static bool operator !=(Vector2 lhs, Vector2 rhs) => !(lhs == rhs);
        public static implicit operator Vector2(Vector3 v) => new Vector2(v.x, v.y);
        public static implicit operator Vector3(Vector2 v) => new Vector3(v.x, v.y, 0f);

        public bool Equals(Vector2 other) => x == other.x && y == other.y;
        public override bool Equals(object other) => other is Vector2 v && Equals(v);
        public override int GetHashCode() => x.GetHashCode() ^ (y.GetHashCode() << 2);
        public override string ToString() => string.Format(CultureInfo.InvariantCulture, "({0:F2}, {1:F2})", x, y);
    }

    public struct Vector3 : IEquatable<Vector3>
    {
        public const float kEpsilon = 1E-05f;
        public float x, y, z;
        public Vector3(float x, float y, float z) { this.x = x; this.y = y; this.z = z; }
        public Vector3(float x, float y) { this.x = x; this.y = y; z = 0f; }

        public static Vector3 zero => new Vector3(0f, 0f, 0f);
        public static Vector3 one => new Vector3(1f, 1f, 1f);
        public static Vector3 forward => new Vector3(0f, 0f, 1f);
        public static Vector3 back => new Vector3(0f, 0f, -1f);
        public static Vector3 up => new Vector3(0f, 1f, 0f);
        public static Vector3 down => new Vector3(0f, -1f, 0f);
        public static Vector3 left => new Vector3(-1f, 0f, 0f);
        public static Vector3 right => new Vector3(1f, 0f, 0f);

        public float this[int index]
        {
            get
            {
                switch (index) { case 0: return x; case 1: return y; case 2: return z; default: throw new IndexOutOfRangeException("Invalid Vector3 index!"); }
            }
            set
            {
                switch (index) { case 0: x = value; break; case 1: y = value; break; case 2: z = value; break; default: throw new IndexOutOfRangeException("Invalid Vector3 index!"); }
            }
        }

        public float magnitude => (float)Math.Sqrt(x * x + y * y + z * z);
        public float sqrMagnitude => x * x + y * y + z * z;
        public Vector3 normalized => Normalize(this);
        public static Vector3 Normalize(Vector3 value)
        {
            float m = Magnitude(value);
            return m > kEpsilon ? value / m : zero;
        }
        public void Normalize() { this = Normalize(this); }
        public static float Magnitude(Vector3 v) => (float)Math.Sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        public static float SqrMagnitude(Vector3 v) => v.x * v.x + v.y * v.y + v.z * v.z;

        public static float Dot(Vector3 a, Vector3 b) => a.x * b.x + a.y * b.y + a.z * b.z;
        public static Vector3 Cross(Vector3 a, Vector3 b) =>
            new Vector3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
        public static float Distance(Vector3 a, Vector3 b)
        {
            float dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
            return (float)Math.Sqrt(dx * dx + dy * dy + dz * dz);
        }
        public static Vector3 Scale(Vector3 a, Vector3 b) => new Vector3(a.x * b.x, a.y * b.y, a.z * b.z);
        public static Vector3 Lerp(Vector3 a, Vector3 b, float t)
        {
            t = Mathf.Clamp01(t);
            return new Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
        }
        public static Vector3 LerpUnclamped(Vector3 a, Vector3 b, float t) =>
            new Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
        public static Vector3 ClampMagnitude(Vector3 vector, float maxLength)
        {
            float sqr = vector.sqrMagnitude;
            if (sqr <= maxLength * maxLength) return vector;
            float m = (float)Math.Sqrt(sqr);
            return new Vector3(vector.x / m * maxLength, vector.y / m * maxLength, vector.z / m * maxLength);
        }
        public static Vector3 MoveTowards(Vector3 current, Vector3 target, float maxDistanceDelta)
        {
            float dx = target.x - current.x, dy = target.y - current.y, dz = target.z - current.z;
            float sqr = dx * dx + dy * dy + dz * dz;
            if (sqr == 0f || (maxDistanceDelta >= 0f && sqr <= maxDistanceDelta * maxDistanceDelta)) return target;
            float dist = (float)Math.Sqrt(sqr);
            return new Vector3(current.x + dx / dist * maxDistanceDelta, current.y + dy / dist * maxDistanceDelta, current.z + dz / dist * maxDistanceDelta);
        }
        public static float Angle(Vector3 from, Vector3 to)
        {
            float denominator = (float)Math.Sqrt(from.sqrMagnitude * to.sqrMagnitude);
            if (denominator < 1E-15f) return 0f;
            float dot = Mathf.Clamp(Dot(from, to) / denominator, -1f, 1f);
            return (float)Math.Acos(dot) * Mathf.Rad2Deg;
        }
        public static Vector3 Project(Vector3 vector, Vector3 onNormal)
        {
            float sqr = Dot(onNormal, onNormal);
            if (sqr < Mathf.Epsilon) return zero;
            return onNormal * (Dot(vector, onNormal) / sqr);
        }
        public static Vector3 ProjectOnPlane(Vector3 vector, Vector3 planeNormal)
        {
            float sqr = Dot(planeNormal, planeNormal);
            if (sqr < Mathf.Epsilon) return vector;
            return vector - planeNormal * (Dot(vector, planeNormal) / sqr);
        }

        /// <summary>Turns <paramref name="current"/> toward <paramref name="target"/> by at most the given angle and length change.</summary>
        public static Vector3 RotateTowards(Vector3 current, Vector3 target, float maxRadiansDelta, float maxMagnitudeDelta)
        {
            float currentLength = current.magnitude, targetLength = target.magnitude;
            if (currentLength <= kEpsilon || targetLength <= kEpsilon) return MoveTowards(current, target, maxMagnitudeDelta);
            Vector3 from = current / currentLength, to = target / targetLength;
            float length = Mathf.MoveTowards(currentLength, targetLength, maxMagnitudeDelta);
            float dot = Mathf.Clamp(Dot(from, to), -1f, 1f);
            if (dot > 1f - 1E-06f) return to * length;
            float angle = (float)Math.Acos(dot);
            Vector3 axis = dot < -1f + 1E-06f ? Perpendicular(from) : Normalize(Cross(from, to));
            float step = Mathf.Min(maxRadiansDelta, angle);
            return (Quaternion.AngleAxis(step * Mathf.Rad2Deg, axis) * from) * length;
        }
        internal static Vector3 Perpendicular(Vector3 unit)
        {
            Vector3 axis = Cross(unit, right);
            if (axis.sqrMagnitude < 1E-06f) axis = Cross(unit, up);
            return Normalize(axis);
        }

        public static Vector3 operator +(Vector3 a, Vector3 b) => new Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
        public static Vector3 operator -(Vector3 a, Vector3 b) => new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
        public static Vector3 operator -(Vector3 a) => new Vector3(-a.x, -a.y, -a.z);
        public static Vector3 operator *(Vector3 a, float d) => new Vector3(a.x * d, a.y * d, a.z * d);
        public static Vector3 operator *(float d, Vector3 a) => new Vector3(a.x * d, a.y * d, a.z * d);
        public static Vector3 operator /(Vector3 a, float d) => new Vector3(a.x / d, a.y / d, a.z / d);
        public static bool operator ==(Vector3 lhs, Vector3 rhs)
        {
            float dx = lhs.x - rhs.x, dy = lhs.y - rhs.y, dz = lhs.z - rhs.z;
            return dx * dx + dy * dy + dz * dz < 9.99999944E-11f;
        }
        public static bool operator !=(Vector3 lhs, Vector3 rhs) => !(lhs == rhs);

        public bool Equals(Vector3 other) => x == other.x && y == other.y && z == other.z;
        public override bool Equals(object other) => other is Vector3 v && Equals(v);
        public override int GetHashCode() => x.GetHashCode() ^ (y.GetHashCode() << 2) ^ (z.GetHashCode() >> 2);
        public override string ToString() => string.Format(CultureInfo.InvariantCulture, "({0:F2}, {1:F2}, {2:F2})", x, y, z);
    }

    public struct Quaternion : IEquatable<Quaternion>
    {
        public const float kEpsilon = 1E-06f;
        public float x, y, z, w;
        public Quaternion(float x, float y, float z, float w) { this.x = x; this.y = y; this.z = z; this.w = w; }

        public static Quaternion identity => new Quaternion(0f, 0f, 0f, 1f);

        public Quaternion normalized => Normalize(this);
        public static Quaternion Normalize(Quaternion q)
        {
            float m = (float)Math.Sqrt(Dot(q, q));
            return m < Mathf.Epsilon ? identity : new Quaternion(q.x / m, q.y / m, q.z / m, q.w / m);
        }
        public void Normalize() { this = Normalize(this); }

        public static float Dot(Quaternion a, Quaternion b) => a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;

        /// <summary>Degrees about an axis. A zero axis gives no rotation.</summary>
        public static Quaternion AngleAxis(float angle, Vector3 axis)
        {
            float m = axis.magnitude;
            if (m < 1E-06f) return identity;
            float half = angle * Mathf.Deg2Rad * .5f;
            float s = (float)Math.Sin(half) / m;
            return new Quaternion(axis.x * s, axis.y * s, axis.z * s, (float)Math.Cos(half));
        }

        /// <summary>Degrees. Applied as roll about Z, then pitch about X, then yaw about Y.</summary>
        public static Quaternion Euler(float x, float y, float z) =>
            AngleAxis(y, Vector3.up) * AngleAxis(x, Vector3.right) * AngleAxis(z, Vector3.forward);
        public static Quaternion Euler(Vector3 euler) => Euler(euler.x, euler.y, euler.z);

        public static Quaternion Inverse(Quaternion rotation)
        {
            float sqr = Dot(rotation, rotation);
            if (sqr < Mathf.Epsilon) return identity;
            return new Quaternion(-rotation.x / sqr, -rotation.y / sqr, -rotation.z / sqr, rotation.w / sqr);
        }

        public static float Angle(Quaternion a, Quaternion b)
        {
            float dot = Mathf.Min(Mathf.Abs(Dot(a, b)), 1f);
            return dot > 1f - kEpsilon ? 0f : (float)Math.Acos(dot) * 2f * Mathf.Rad2Deg;
        }

        public static Quaternion Slerp(Quaternion a, Quaternion b, float t) => SlerpUnclamped(a, b, Mathf.Clamp01(t));
        public static Quaternion SlerpUnclamped(Quaternion a, Quaternion b, float t)
        {
            float dot = Dot(a, b);
            if (dot < 0f) { b = new Quaternion(-b.x, -b.y, -b.z, -b.w); dot = -dot; }
            float wa, wb;
            if (dot > .9995f) { wa = 1f - t; wb = t; }
            else
            {
                float theta = (float)Math.Acos(dot), sin = (float)Math.Sin(theta);
                wa = (float)Math.Sin((1f - t) * theta) / sin;
                wb = (float)Math.Sin(t * theta) / sin;
            }
            return Normalize(new Quaternion(a.x * wa + b.x * wb, a.y * wa + b.y * wb, a.z * wa + b.z * wb, a.w * wa + b.w * wb));
        }
        public static Quaternion RotateTowards(Quaternion from, Quaternion to, float maxDegreesDelta)
        {
            float angle = Angle(from, to);
            if (angle == 0f) return to;
            return SlerpUnclamped(from, to, Mathf.Min(1f, maxDegreesDelta / angle));
        }

        /// <summary>Shortest rotation that takes one direction to another.</summary>
        public static Quaternion FromToRotation(Vector3 fromDirection, Vector3 toDirection)
        {
            Vector3 from = fromDirection.normalized, to = toDirection.normalized;
            if (from.sqrMagnitude < .5f || to.sqrMagnitude < .5f) return identity;
            float dot = Mathf.Clamp(Vector3.Dot(from, to), -1f, 1f);
            if (dot > 1f - kEpsilon) return identity;
            if (dot < -1f + kEpsilon) return AngleAxis(180f, Vector3.Perpendicular(from));
            return AngleAxis((float)Math.Acos(dot) * Mathf.Rad2Deg, Vector3.Cross(from, to));
        }

        /// <summary>Rotation whose +Z points along forward and whose +Y leans toward upwards.</summary>
        public static Quaternion LookRotation(Vector3 forward) => LookRotation(forward, Vector3.up);
        public static Quaternion LookRotation(Vector3 forward, Vector3 upwards)
        {
            Vector3 f = forward.normalized;
            if (f.sqrMagnitude < .5f) return identity;
            Vector3 r = Vector3.Cross(upwards, f);
            if (r.sqrMagnitude < 1E-10f) return FromToRotation(Vector3.forward, f);
            r = r.normalized;
            Vector3 u = Vector3.Cross(f, r);
            // Columns of the rotation matrix are r, u, f.
            float m00 = r.x, m01 = u.x, m02 = f.x, m10 = r.y, m11 = u.y, m12 = f.y, m20 = r.z, m21 = u.z, m22 = f.z;
            float trace = m00 + m11 + m22;
            Quaternion q;
            if (trace > 0f)
            {
                float s = (float)Math.Sqrt(trace + 1f) * 2f;
                q = new Quaternion((m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, .25f * s);
            }
            else if (m00 > m11 && m00 > m22)
            {
                float s = (float)Math.Sqrt(1f + m00 - m11 - m22) * 2f;
                q = new Quaternion(.25f * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s);
            }
            else if (m11 > m22)
            {
                float s = (float)Math.Sqrt(1f + m11 - m00 - m22) * 2f;
                q = new Quaternion((m01 + m10) / s, .25f * s, (m12 + m21) / s, (m02 - m20) / s);
            }
            else
            {
                float s = (float)Math.Sqrt(1f + m22 - m00 - m11) * 2f;
                q = new Quaternion((m02 + m20) / s, (m12 + m21) / s, .25f * s, (m10 - m01) / s);
            }
            return Normalize(q);
        }

        public static Quaternion operator *(Quaternion lhs, Quaternion rhs) => new Quaternion(
            lhs.w * rhs.x + lhs.x * rhs.w + lhs.y * rhs.z - lhs.z * rhs.y,
            lhs.w * rhs.y + lhs.y * rhs.w + lhs.z * rhs.x - lhs.x * rhs.z,
            lhs.w * rhs.z + lhs.z * rhs.w + lhs.x * rhs.y - lhs.y * rhs.x,
            lhs.w * rhs.w - lhs.x * rhs.x - lhs.y * rhs.y - lhs.z * rhs.z);

        public static Vector3 operator *(Quaternion rotation, Vector3 point)
        {
            float x2 = rotation.x * 2f, y2 = rotation.y * 2f, z2 = rotation.z * 2f;
            float xx = rotation.x * x2, yy = rotation.y * y2, zz = rotation.z * z2;
            float xy = rotation.x * y2, xz = rotation.x * z2, yz = rotation.y * z2;
            float wx = rotation.w * x2, wy = rotation.w * y2, wz = rotation.w * z2;
            return new Vector3(
                (1f - (yy + zz)) * point.x + (xy - wz) * point.y + (xz + wy) * point.z,
                (xy + wz) * point.x + (1f - (xx + zz)) * point.y + (yz - wx) * point.z,
                (xz - wy) * point.x + (yz + wx) * point.y + (1f - (xx + yy)) * point.z);
        }

        public static bool operator ==(Quaternion lhs, Quaternion rhs) => Dot(lhs, rhs) > 1f - kEpsilon;
        public static bool operator !=(Quaternion lhs, Quaternion rhs) => !(lhs == rhs);

        public bool Equals(Quaternion other) => x == other.x && y == other.y && z == other.z && w == other.w;
        public override bool Equals(object other) => other is Quaternion q && Equals(q);
        public override int GetHashCode() => x.GetHashCode() ^ (y.GetHashCode() << 2) ^ (z.GetHashCode() >> 2) ^ (w.GetHashCode() >> 1);
        public override string ToString() => string.Format(CultureInfo.InvariantCulture, "({0:F5}, {1:F5}, {2:F5}, {3:F5})", x, y, z, w);
    }

    public class Object
    {
        public string name;
        public static void Destroy(Object obj) { }
        public static void DestroyImmediate(Object obj) { }
        public static T Instantiate<T>(T original) where T : Object => (T)original.MemberwiseClone();
        public static implicit operator bool(Object exists) => exists != null;
    }

    public class ScriptableObject : Object
    {
        public static T CreateInstance<T>() where T : ScriptableObject => (T)Activator.CreateInstance(typeof(T));
    }

    public static class Debug
    {
        public static void Log(object message) { }
        public static void LogWarning(object message) { }
        public static void LogError(object message) { }
    }

    [AttributeUsage(AttributeTargets.Field, AllowMultiple = true)]
    public sealed class HeaderAttribute : Attribute { public HeaderAttribute(string header) { } }
    [AttributeUsage(AttributeTargets.Field)]
    public sealed class TooltipAttribute : Attribute { public TooltipAttribute(string tooltip) { } }
    [AttributeUsage(AttributeTargets.Field)]
    public sealed class MinAttribute : Attribute { public MinAttribute(float min) { } }
    [AttributeUsage(AttributeTargets.Field)]
    public sealed class RangeAttribute : Attribute { public RangeAttribute(float min, float max) { } }
    [AttributeUsage(AttributeTargets.Field)]
    public sealed class HideInInspector : Attribute { }
    [AttributeUsage(AttributeTargets.Field)]
    public sealed class SerializeField : Attribute { }
    [AttributeUsage(AttributeTargets.Class)]
    public sealed class CreateAssetMenuAttribute : Attribute
    {
        public string menuName { get; set; }
        public string fileName { get; set; }
        public int order { get; set; }
    }
}
