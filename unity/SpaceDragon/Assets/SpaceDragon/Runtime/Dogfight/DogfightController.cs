using UnityEngine;
using UnityEngine.InputSystem;

namespace SpaceDragon.Dogfight
{
    /// <summary>InputSystem's standard Gamepad layout maps PS4/PS5 Cross/Circle/
    /// Square/Triangle to south/east/west/north, including browser standard mapping.
    /// This reader claims logical mapping, not a physical controller/browser test.</summary>
    public static class DogfightControllerReader
    {
        public static ControllerSample Read(Gamepad pad)
        {
            if (pad == null || !pad.added) return default;
            return new ControllerSample
            {
                Connected = true, DeviceId = pad.deviceId,
                // The plain mapper owns the tunable radial deadzone. Do not apply
                // InputSystem's default stick deadzone a second time here.
                LeftStick = pad.leftStick.ReadUnprocessedValue(), RightStick = pad.rightStick.ReadUnprocessedValue(),
                LeftTrigger = pad.leftTrigger.ReadValue(), RightTrigger = pad.rightTrigger.ReadValue(),
                South = pad.buttonSouth.isPressed, East = pad.buttonEast.isPressed,
                West = pad.buttonWest.isPressed, North = pad.buttonNorth.isPressed,
                LeftShoulder = pad.leftShoulder.isPressed, RightShoulder = pad.rightShoulder.isPressed,
                RightStickPress = pad.rightStickButton.isPressed, Start = pad.startButton.isPressed,
                Select = pad.selectButton.isPressed, Up = pad.dpad.up.isPressed, Down = pad.dpad.down.isPressed,
                Left = pad.dpad.left.isPressed, Right = pad.dpad.right.isPressed
            };
        }
    }

    public sealed partial class DogfightEncounter
    {
        ControllerInputState controllerInput;
        ControllerActions controllerActions = ControllerActions.None;
        bool controllerSelectorOwned;
        public bool ControllerConnected => controllerInput != null && controllerInput.Connected;
        public bool ControllerArmed => controllerInput != null && controllerInput.Armed;
        public bool UsingController { get; private set; }
        public int ControllerMenuIndex => controllerInput != null ? controllerInput.MenuIndex : 0;
        public string ControllerDeviceName { get; private set; } = "";
        public bool ControllerZoomHeld => controllerActions.Zoom && !Paused && !Dead && !comeback.Active && !RepairSelectorOpen;

        void EnsureControllerInput()
        {
            if (controllerInput == null) controllerInput = new ControllerInputState(tuning.ControllerStickDeadzone,
                tuning.ControllerTriggerThreshold, tuning.ControllerRepairHoldSeconds);
        }
        void ResetControllerInput()
        {
            EnsureControllerInput(); controllerInput.Reset(); controllerActions = ControllerActions.None;
            controllerSelectorOwned = false; UsingController = false;
        }
        void BlockControllerUntilRelease()
        {
            controllerInput?.RequireRelease(); controllerActions = ControllerActions.None;
            if (controllerSelectorOwned) RepairSelectorOpen = false;
            controllerSelectorOwned = false;
        }

        /// <summary>Once per rendered Update, before pause/death early returns.
        /// Polling remains live in menus; gameplay timers remain in the encounter.</summary>
        void PollController(float realDt)
        {
            EnsureControllerInput();
            var pad = Gamepad.current; var sample = DogfightControllerReader.Read(pad);
            ControllerDeviceName = sample.Connected ? pad.displayName : "";
            var context = Dead ? ControllerContext.Disabled : Paused ? ControllerContext.Paused :
                comeback.Active ? ControllerContext.Comeback : ControllerContext.Flight;
            controllerActions = controllerInput.Read(sample, realDt, context, Tactics.IsRepairing, tuning.EnableIndependentBank);
            if (!sample.Connected) UsingController = false;
            else if (controllerActions.Activity) { UsingController = true; pointerActive = false; }
            else if ((Keyboard.current != null && Keyboard.current.anyKey.wasPressedThisFrame) ||
                (Mouse.current != null && (Mouse.current.delta.ReadValue().sqrMagnitude > 0 ||
                    Mouse.current.leftButton.wasPressedThisFrame || Mouse.current.rightButton.wasPressedThisFrame))) UsingController = false;

            if (controllerActions.RequestPause)
            {
                SetPaused(true);
                Message(sample.Connected ? "Controller connected — release controls, then Options to resume" : "Controller disconnected — flight paused");
                return;
            }
            if (controllerActions.TogglePause) { TogglePause(); return; }
            switch (controllerActions.MenuAction)
            {
                case 0: if (!Dead) SetPaused(false); break;
                case 1: SetSoundEnabled(SoundEnabled ? "false" : "true"); break;
                case 2: SetReducedMotion(ReducedMotion ? "false" : "true"); break;
                case 3: CycleRepairCodeMode(); break;
                case 4: RestartEncounter(); break;
            }
        }

        /// <summary>Merge after keyboard/mouse ReadInput. The independent controller
        /// release gate is essential: neutral keyboard input cannot arm a held trigger.</summary>
        void MergeControllerInput(ref FlightInput input, ref bool fire, ref bool launch, ref bool breathFire, float dt)
        {
            if (!ControllerConnected || !ControllerArmed || Paused || Dead || comeback.Active) return;
            var actions = controllerActions;
            if (actions.Activity) pointerActive = false;
            var keyboard = Keyboard.current;
            bool keyboardSteering = keyboard != null && (keyboard.leftArrowKey.isPressed || keyboard.rightArrowKey.isPressed ||
                keyboard.upArrowKey.isPressed || keyboard.downArrowKey.isPressed);
            if (actions.Steer != Vector2.zero || (UsingController && !keyboardSteering)) input.Steer = actions.Steer;
            if (actions.Throttle != 0) input.Throttle = actions.Throttle;
            if (actions.CenterAim) { aim = Vector2.zero; pointerActive = false; }
            else if (actions.Aim != Vector2.zero)
            { aim += actions.Aim * Mathf.Max(0, dt) * tuning.ControllerAimRate; pointerActive = false; }
            aim = new Vector2(Mathf.Clamp(aim.x, -.94f, .94f), Mathf.Clamp(aim.y, -.88f, .88f));
            if (actions.RepairSelector)
            {
                controllerSelectorOwned = true; RepairSelectorOpen = true;
                if (actions.RepairChoice >= 0) { ChooseRepair(actions.RepairChoice); controllerSelectorOwned = false; }
            }
            else if (controllerSelectorOwned)
            {
                if (keyboard == null || !keyboard.tabKey.isPressed) RepairSelectorOpen = false;
                controllerSelectorOwned = false;
            }
            if (actions.RollDirection != 0) RequestCombatRoll(actions.RollDirection);
            if (actions.BankDirection != 0)
            { input.IndependentBankRadians = actions.BankDirection * tuning.IndependentBankDegrees * Mathf.Deg2Rad; independentBankInput = input.IndependentBankRadians; }
            input.Boost |= actions.Boost; input.BreakHeld |= actions.Break;
            fire |= actions.Fire && !RepairSelectorOpen; launch |= actions.Missile && !RepairSelectorOpen;
            breathFire |= actions.Breath && !RepairSelectorOpen;
            if (actions.Assist) { Breath.Assist(); Message("Assisted charge ready. Keep dodging and track a target."); }
            if (actions.Wingman && tuning.EnableWingman) SendWingman();
        }

        void ReadControllerComeback()
        {
            if (ControllerArmed && comeback.Active && controllerActions.Assist) comeback.Assist();
        }
    }
}
