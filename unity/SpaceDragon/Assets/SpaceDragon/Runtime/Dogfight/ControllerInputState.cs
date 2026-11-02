using System;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    public enum ControllerContext { Flight, Paused, Disabled, Comeback }

    /// <summary>Standard Gamepad layout, named by position rather than platform glyph.
    /// South/East/West/North are PlayStation Cross/Circle/Square/Triangle.</summary>
    public struct ControllerSample
    {
        public bool Connected;
        public int DeviceId;
        public Vector2 LeftStick, RightStick;
        public float LeftTrigger, RightTrigger;
        public bool South, East, West, North, LeftShoulder, RightShoulder, RightStickPress;
        public bool Start, Select, Up, Down, Left, Right;
    }

    public struct ControllerActions
    {
        public Vector2 Steer, Aim;
        public float Throttle;
        public int RollDirection, BankDirection, RepairChoice, MenuAction;
        public bool Fire, Zoom, Boost, Break, CenterAim, Missile, Breath, Assist, Wingman;
        public bool RepairSelector, TogglePause, RequestPause, Activity, ConnectionChanged;
        public static ControllerActions None => new ControllerActions { RepairChoice = -1, MenuAction = -1 };
    }

    /// <summary>SD-089 input semantics only. No scene, rewards, hardware API, saves or
    /// global clock. Reconnect, context changes and explicit blocking require a fully
    /// neutral controller before any action can fire. Menu and repair actions are edges.</summary>
    public sealed class ControllerInputState
    {
        readonly float deadzone, triggerThreshold, repairHoldSeconds;
        ControllerSample previous;
        ControllerContext context;
        bool contextKnown, repairConsumed;
        float repairHeld;
        int deviceId;
        public bool Connected { get; private set; }
        public bool Armed { get; private set; }
        public int MenuIndex { get; private set; }

        public ControllerInputState(float stickDeadzone, float triggerThreshold, float repairHoldSeconds)
        {
            if (!Finite(stickDeadzone) || stickDeadzone < 0 || stickDeadzone >= 1 ||
                !Finite(triggerThreshold) || triggerThreshold <= 0 || triggerThreshold > 1 ||
                !Finite(repairHoldSeconds) || repairHoldSeconds < 0)
                throw new ArgumentException("Controller thresholds must be finite and within their usable input ranges.");
            deadzone = stickDeadzone; this.triggerThreshold = triggerThreshold; this.repairHoldSeconds = repairHoldSeconds;
        }

        public void RequireRelease()
        { Armed = false; repairHeld = 0; repairConsumed = false; previous = default; }

        // An encounter restart must not pretend the still-connected device disconnected.
        public void Reset()
        { RequireRelease(); MenuIndex = 0; contextKnown = false; }

        public ControllerActions Read(ControllerSample sample, float dt, ControllerContext current, bool repairing = false, bool independentBank = true)
        {
            var result = ControllerActions.None;
            sample.LeftStick = Filter(sample.LeftStick); sample.RightStick = Filter(sample.RightStick);
            sample.LeftTrigger = SafeTrigger(sample.LeftTrigger); sample.RightTrigger = SafeTrigger(sample.RightTrigger);
            result.Activity = sample.Connected && !Neutral(sample);
            bool connectionChanged = sample.Connected != Connected || (sample.Connected && sample.DeviceId != deviceId);
            if (connectionChanged)
            {
                Connected = sample.Connected; deviceId = sample.DeviceId; RequireRelease();
                result.ConnectionChanged = result.RequestPause = true;
                context = current; contextKnown = true; previous = sample;
                return result;
            }
            if (!Connected) { previous = sample; return result; }
            if (!contextKnown || context != current)
            {
                RequireRelease(); context = current; contextKnown = true;
                if (current == ControllerContext.Paused) MenuIndex = 0;
                if (current == ControllerContext.Disabled) MenuIndex = 4;
            }
            if (!Armed)
            {
                if (Neutral(sample)) Armed = true;
                previous = sample; return result;
            }

            bool start = sample.Start && !previous.Start;
            bool south = sample.South && !previous.South, east = sample.East && !previous.East;
            bool up = sample.Up && !previous.Up, down = sample.Down && !previous.Down;
            bool left = sample.Left && !previous.Left, right = sample.Right && !previous.Right;

            if (current == ControllerContext.Disabled)
            {
                MenuIndex = 4;
                if (south || start) result.MenuAction = 4;
            }
            else if (start) result.TogglePause = true;
            else if (current == ControllerContext.Paused)
            {
                if (up != down) MenuIndex = (MenuIndex + (down ? 1 : 4)) % 5;
                if (south) result.MenuAction = MenuIndex;
                else if (east) result.MenuAction = 0;
            }
            else if (current == ControllerContext.Comeback)
            {
                // Share/Create continues to reserve the D-pad; releasing it cannot
                // turn an old repair selection into an assisted SONG completion.
                result.Assist = !sample.Select && up;
            }
            else
            {
                result.Steer = sample.LeftStick; result.Aim = sample.RightStick;
                result.CenterAim = sample.RightStickPress && !previous.RightStickPress;
                result.Zoom = sample.LeftTrigger >= triggerThreshold;
                result.Boost = sample.South; result.Break = sample.East;
                if (sample.Select)
                {
                    if (Finite(dt) && dt > 0) repairHeld += dt;
                    result.RepairSelector = !repairConsumed && !repairing && repairHeld >= repairHoldSeconds;
                    if (result.RepairSelector)
                    {
                        if (left) result.RepairChoice = 0;
                        else if (up) result.RepairChoice = 1;
                        else if (right) result.RepairChoice = 2;
                        if (result.RepairChoice >= 0) repairConsumed = true;
                    }
                }
                else
                {
                    repairHeld = 0; repairConsumed = false;
                    result.Throttle = (sample.Right ? 1 : 0) - (sample.Left ? 1 : 0);
                    result.Assist = up; result.Wingman = down;
                }
                if (!result.RepairSelector)
                {
                    result.Fire = sample.RightTrigger >= triggerThreshold;
                    result.Missile = sample.West && !previous.West;
                    result.Breath = sample.North && !previous.North;
                }
                if (result.Zoom && independentBank)
                    result.BankDirection = (sample.LeftShoulder ? 1 : 0) - (sample.RightShoulder ? 1 : 0);
                else if (sample.LeftShoulder && !previous.LeftShoulder) result.RollDirection = -1;
                else if (sample.RightShoulder && !previous.RightShoulder) result.RollDirection = 1;
            }
            previous = sample;
            return result;
        }

        Vector2 Filter(Vector2 value)
        {
            if (!Finite(value.x) || !Finite(value.y)) return Vector2.zero;
            float magnitude = value.magnitude;
            if (!Finite(magnitude) || magnitude <= deadzone) return Vector2.zero;
            return value / magnitude * Mathf.Clamp01((magnitude - deadzone) / (1 - deadzone));
        }
        bool Neutral(ControllerSample sample) => sample.LeftStick == Vector2.zero && sample.RightStick == Vector2.zero &&
            sample.LeftTrigger < triggerThreshold && sample.RightTrigger < triggerThreshold &&
            !(sample.South || sample.East || sample.West || sample.North || sample.LeftShoulder || sample.RightShoulder ||
              sample.RightStickPress || sample.Start || sample.Select || sample.Up || sample.Down || sample.Left || sample.Right);
        static float SafeTrigger(float value) => Finite(value) ? Mathf.Clamp01(value) : 0;
        static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
    }
}
