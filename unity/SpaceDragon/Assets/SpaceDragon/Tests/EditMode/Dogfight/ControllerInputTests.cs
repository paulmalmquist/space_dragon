using System;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class ControllerInputTests
    {
        static ControllerSample Neutral => new ControllerSample { Connected = true, DeviceId = 7 };
        static ControllerInputState Mapper() => new ControllerInputState(.16f, .2f, .15f);
        static ControllerInputState Armed(ControllerContext context = ControllerContext.Flight)
        {
            var state = Mapper();
            Assert.That(state.Read(Neutral, .02f, context).RequestPause, Is.True);
            state.Read(Neutral, .02f, context); Assert.That(state.Armed, Is.True);
            return state;
        }
        static void Release(ControllerInputState state, ControllerContext context = ControllerContext.Flight)
            => state.Read(Neutral, .02f, context);

        [Test]
        public void MissingControllerDoesNotAlterKeyboardOrRequestPause()
        {
            var state = Mapper(); var actions = state.Read(default, .02f, ControllerContext.Flight);
            Assert.That(state.Connected || state.Armed || actions.RequestPause || actions.Activity, Is.False);
            Assert.That(actions.Steer, Is.EqualTo(Vector2.zero)); Assert.That(actions.RepairChoice, Is.EqualTo(-1));
            Assert.That(actions.MenuAction, Is.EqualTo(-1));
        }

        [Test]
        public void ConnectionWithHeldTriggersRequiresNeutralThenAFreshInput()
        {
            var state = Mapper(); var held = Neutral;
            held.RightTrigger = held.LeftTrigger = 1; held.South = held.West = true;
            var connected = state.Read(held, .02f, ControllerContext.Flight);
            Assert.That(connected.RequestPause && connected.ConnectionChanged, Is.True);
            for (int i = 0; i < 20; i++)
            {
                var blocked = state.Read(held, .02f, ControllerContext.Flight);
                Assert.That(blocked.Fire || blocked.Boost || blocked.Missile || blocked.Zoom || state.Armed, Is.False);
            }
            Release(state); var fresh = state.Read(held, .02f, ControllerContext.Flight);
            Assert.That(fresh.Fire && fresh.Boost && fresh.Missile && fresh.Zoom && state.Armed, Is.True);
        }

        [Test]
        public void StandardPlayStationPositionsMapToExistingFlightAndCombatActions()
        {
            var state = Armed(); var sample = Neutral;
            sample.LeftStick = new Vector2(.8f, .6f); sample.RightStick = new Vector2(-.6f, .8f);
            sample.RightTrigger = sample.LeftTrigger = 1;
            sample.South = sample.East = sample.West = sample.North = sample.RightStickPress = true;
            sample.Up = sample.Down = sample.Right = true;
            var mapped = state.Read(sample, .02f, ControllerContext.Flight);
            Assert.That(mapped.Steer.x, Is.GreaterThan(0)); Assert.That(mapped.Steer.y, Is.GreaterThan(0));
            Assert.That(mapped.Aim.x, Is.LessThan(0)); Assert.That(mapped.Aim.y, Is.GreaterThan(0));
            Assert.That(mapped.Fire && mapped.Zoom && mapped.Boost && mapped.Break, Is.True);
            Assert.That(mapped.Missile && mapped.Breath && mapped.CenterAim && mapped.Assist && mapped.Wingman, Is.True);
            Assert.That(mapped.Throttle, Is.EqualTo(1));
            var repeated = state.Read(sample, .02f, ControllerContext.Flight);
            Assert.That(repeated.Missile || repeated.Breath || repeated.CenterAim || repeated.Assist || repeated.Wingman, Is.False);
            Assert.That(repeated.Fire && repeated.Boost && repeated.Break, Is.True, "Continuous controls stay held; deliberate calls do not repeat.");
        }

        [TestCase(true, -1)] [TestCase(false, 1)]
        public void ShoulderRollsAreFreshPressesAndZoomModifierBanksWithoutRolling(bool left, int roll)
        {
            var state = Armed(); var sample = Neutral;
            sample.LeftShoulder = left; sample.RightShoulder = !left;
            Assert.That(state.Read(sample, .02f, ControllerContext.Flight).RollDirection, Is.EqualTo(roll));
            Assert.That(state.Read(sample, .02f, ControllerContext.Flight).RollDirection, Is.Zero);
            Release(state); sample.LeftTrigger = 1;
            var bank = state.Read(sample, .02f, ControllerContext.Flight);
            Assert.That(bank.BankDirection, Is.EqualTo(-roll)); Assert.That(bank.RollDirection, Is.Zero);
            sample.LeftTrigger = 0;
            var unmodifiedHeldShoulder = state.Read(sample, .02f, ControllerContext.Flight);
            Assert.That(unmodifiedHeldShoulder.RollDirection, Is.Zero, "Releasing zoom while holding a shoulder must not spend a roll.");
            Assert.That(unmodifiedHeldShoulder.BankDirection, Is.Zero);
            Release(state);
            Assert.That(state.Read(sample, .02f, ControllerContext.Flight).RollDirection, Is.EqualTo(roll));
        }

        [Test]
        public void DisabledBankSwitchKeepsTheOriginalShoulderRollEvenWhileZooming()
        {
            var state = Armed(); var sample = Neutral; sample.LeftShoulder = true; sample.LeftTrigger = 1;
            var result = state.Read(sample, .02f, ControllerContext.Flight, independentBank: false);
            Assert.That(result.RollDirection, Is.EqualTo(-1)); Assert.That(result.BankDirection, Is.Zero);
        }

        [Test]
        public void StickDeadzoneInvalidAxesAndDiagonalMagnitudeStayBounded()
        {
            var state = Armed(); var sample = Neutral;
            sample.LeftStick = new Vector2(.1f, .1f); sample.RightStick = new Vector2(float.NaN, 1);
            sample.RightTrigger = float.PositiveInfinity;
            var idle = state.Read(sample, .02f, ControllerContext.Flight);
            Assert.That(idle.Steer, Is.EqualTo(Vector2.zero)); Assert.That(idle.Aim, Is.EqualTo(Vector2.zero));
            Assert.That(idle.Fire || idle.Activity, Is.False);
            sample.LeftStick = new Vector2(1, 1); sample.RightStick = new Vector2(-10, 0);
            var movement = state.Read(sample, .02f, ControllerContext.Flight);
            Assert.That(movement.Steer.magnitude, Is.EqualTo(1).Within(.000001));
            Assert.That(movement.Aim, Is.EqualTo(Vector2.left));
        }

        [TestCase(0)] [TestCase(1)] [TestCase(2)]
        public void HeldShareSelectsOneRepairWithoutFiringAssistanceOrThrottle(int system)
        {
            var state = Armed(); var sample = Neutral; sample.Select = true;
            Assert.That(state.Read(sample, .1f, ControllerContext.Flight).RepairSelector, Is.False);
            Assert.That(state.Read(sample, .06f, ControllerContext.Flight).RepairSelector, Is.True);
            sample.Left = system == 0; sample.Up = system == 1; sample.Right = system == 2;
            var select = state.Read(sample, .02f, ControllerContext.Flight);
            Assert.That(select.RepairChoice, Is.EqualTo(system));
            Assert.That(select.Assist || select.Wingman || select.Fire, Is.False); Assert.That(select.Throttle, Is.Zero);
            var repeated = state.Read(sample, .02f, ControllerContext.Flight);
            Assert.That(repeated.RepairChoice, Is.EqualTo(-1)); Assert.That(repeated.RepairSelector, Is.False);
            sample.Select = false;
            Assert.That(state.Read(sample, .02f, ControllerContext.Flight).Assist, Is.False, "Releasing Share does not reissue a held Up as assistance.");
        }

        [Test]
        public void RepairChordSuppressesEarlyDpadAssistanceAndDoesNotReopenDuringRepair()
        {
            var state = Armed(); var sample = Neutral; sample.Select = sample.Up = true;
            var early = state.Read(sample, .05f, ControllerContext.Flight);
            Assert.That(early.Assist || early.RepairSelector, Is.False); Assert.That(early.RepairChoice, Is.EqualTo(-1));
            var held = state.Read(sample, .2f, ControllerContext.Flight, repairing: true);
            Assert.That(held.Assist || held.RepairSelector, Is.False); Assert.That(held.RepairChoice, Is.EqualTo(-1));
        }

        [Test]
        public void PauseMenuWrapsAndUsesFreshEdgesForAllFiveActions()
        {
            var state = Armed(ControllerContext.Paused); var sample = Neutral; sample.Up = true;
            state.Read(sample, .02f, ControllerContext.Paused); Assert.That(state.MenuIndex, Is.EqualTo(4));
            state.Read(sample, .02f, ControllerContext.Paused); Assert.That(state.MenuIndex, Is.EqualTo(4));
            Release(state, ControllerContext.Paused); sample = Neutral; sample.Down = true;
            state.Read(sample, .02f, ControllerContext.Paused); Assert.That(state.MenuIndex, Is.Zero);
            for (int menu = 0; menu < 5; menu++)
            {
                Release(state, ControllerContext.Paused); sample = Neutral; sample.South = true;
                Assert.That(state.Read(sample, .02f, ControllerContext.Paused).MenuAction, Is.EqualTo(menu));
                Assert.That(state.Read(sample, .02f, ControllerContext.Paused).MenuAction, Is.EqualTo(-1));
                Release(state, ControllerContext.Paused); sample = Neutral; sample.Down = true;
                state.Read(sample, .02f, ControllerContext.Paused);
            }
            Release(state, ControllerContext.Paused); sample = Neutral; sample.East = true;
            Assert.That(state.Read(sample, .02f, ControllerContext.Paused).MenuAction, Is.Zero, "Circle resumes from any menu row.");
        }

        [Test]
        public void PauseResumeAndExplicitBlockCannotRearmHeldWeaponsOrBoost()
        {
            var state = Armed(); var sample = Neutral; sample.South = true; sample.RightTrigger = 1;
            Assert.That(state.Read(sample, .02f, ControllerContext.Flight).Fire, Is.True);
            var paused = state.Read(sample, .02f, ControllerContext.Paused);
            Assert.That(paused.MenuAction, Is.EqualTo(-1)); Assert.That(state.Armed, Is.False);
            Release(state, ControllerContext.Paused);
            var resumedHeld = state.Read(sample, .02f, ControllerContext.Flight);
            Assert.That(resumedHeld.Fire || resumedHeld.Boost || state.Armed, Is.False);
            Release(state); Assert.That(state.Read(sample, .02f, ControllerContext.Flight).Fire, Is.True);
            state.RequireRelease();
            Assert.That(state.Read(sample, .02f, ControllerContext.Flight).Fire, Is.False);
            Release(state); Assert.That(state.Read(sample, .02f, ControllerContext.Flight).Fire, Is.True);
        }

        [Test]
        public void OptionsTogglesPauseOnceAndNeverAlsoFiresOtherHeldControls()
        {
            var state = Armed(); var sample = Neutral; sample.Start = sample.West = sample.North = true; sample.RightTrigger = 1;
            var options = state.Read(sample, .02f, ControllerContext.Flight);
            Assert.That(options.TogglePause, Is.True); Assert.That(options.Fire || options.Missile || options.Breath, Is.False);
            var paused = state.Read(sample, .02f, ControllerContext.Paused);
            Assert.That(paused.TogglePause, Is.False); Assert.That(paused.MenuAction, Is.EqualTo(-1));
        }

        [Test]
        public void ComebackUpIsAnAssistedActionAndNeverAlsoFiresOrAnswersAnOldRepairChord()
        {
            var state = Armed(); var sample = Neutral; sample.Select = sample.Up = true;
            state.Read(sample, .2f, ControllerContext.Flight);
            Assert.That(state.Read(sample, .02f, ControllerContext.Comeback).Assist, Is.False);
            sample.Select = false;
            Assert.That(state.Read(sample, .02f, ControllerContext.Comeback).Assist, Is.False);
            Release(state, ControllerContext.Comeback); sample = Neutral;
            sample.Up = sample.West = sample.North = sample.South = true; sample.RightTrigger = 1;
            var action = state.Read(sample, .02f, ControllerContext.Comeback);
            Assert.That(action.Assist, Is.True); Assert.That(action.Fire || action.Missile || action.Breath || action.Boost, Is.False);
            Assert.That(state.Read(sample, .02f, ControllerContext.Comeback).Assist, Is.False);
        }

        [Test]
        public void DisconnectAndDeviceReplacementPauseOnceAndClearRepairSelection()
        {
            var state = Armed(); var sample = Neutral; sample.Select = true;
            Assert.That(state.Read(sample, .2f, ControllerContext.Flight).RepairSelector, Is.True);
            var disconnected = state.Read(default, .02f, ControllerContext.Flight);
            Assert.That(disconnected.RequestPause && disconnected.ConnectionChanged, Is.True);
            Assert.That(state.Connected || state.Armed || disconnected.RepairSelector, Is.False);
            Assert.That(state.Read(default, .02f, ControllerContext.Flight).RequestPause, Is.False);
            sample = Neutral; sample.DeviceId = 11; sample.RightTrigger = 1;
            Assert.That(state.Read(sample, .02f, ControllerContext.Paused).RequestPause, Is.True);
            Assert.That(state.Read(sample, .02f, ControllerContext.Paused).Fire, Is.False);
        }

        [Test]
        public void SwitchingToAnotherConnectedDeviceRequiresReleaseBeforeAssistance()
        {
            var state = Armed(); var sample = Neutral; sample.DeviceId = 9; sample.Up = true;
            var changed = state.Read(sample, .02f, ControllerContext.Flight);
            Assert.That(changed.ConnectionChanged && changed.RequestPause, Is.True); Assert.That(changed.Assist, Is.False);
            Assert.That(state.Read(sample, .02f, ControllerContext.Flight).Assist, Is.False);
            sample.Up = false; state.Read(sample, .02f, ControllerContext.Flight);
            sample.Up = true; Assert.That(state.Read(sample, .02f, ControllerContext.Flight).Assist, Is.True);
        }

        [Test]
        public void NonNeutralSticksCannotRearmAfterFocusLossButSmallDriftCan()
        {
            var state = Armed(); state.RequireRelease(); var sample = Neutral; sample.LeftStick = new Vector2(.6f, 0);
            var blocked = state.Read(sample, .02f, ControllerContext.Flight);
            Assert.That(state.Armed, Is.False); Assert.That(blocked.Steer, Is.EqualTo(Vector2.zero));
            sample.LeftStick = new Vector2(.05f, .05f); state.Read(sample, .02f, ControllerContext.Flight);
            Assert.That(state.Armed, Is.True);
            sample.LeftStick = Vector2.right;
            Assert.That(state.Read(sample, .02f, ControllerContext.Flight).Steer, Is.EqualTo(Vector2.right));
        }

        [Test]
        public void DisabledScreenUsesCrossOrOptionsToRestartAndNeverRepeats()
        {
            var state = Armed(ControllerContext.Disabled); var sample = Neutral; sample.South = true;
            Assert.That(state.Read(sample, .02f, ControllerContext.Disabled).MenuAction, Is.EqualTo(4));
            Assert.That(state.Read(sample, .02f, ControllerContext.Disabled).MenuAction, Is.EqualTo(-1));
            Release(state, ControllerContext.Disabled); sample = Neutral; sample.Start = true;
            Assert.That(state.Read(sample, .02f, ControllerContext.Disabled).MenuAction, Is.EqualTo(4));
        }

        [Test]
        public void RestartPreservesConnectionFactsButRequiresFreshNeutralInput()
        {
            var state = Armed(); var sample = Neutral; sample.North = true;
            state.Read(sample, .02f, ControllerContext.Flight); state.Reset();
            Assert.That(state.Connected, Is.True); Assert.That(state.Armed, Is.False); Assert.That(state.MenuIndex, Is.Zero);
            var held = state.Read(sample, .02f, ControllerContext.Flight);
            Assert.That(held.Breath || held.RequestPause, Is.False);
            Release(state); Assert.That(state.Read(sample, .02f, ControllerContext.Flight).Breath, Is.True);
        }

        [Test]
        public void InvalidControllerThresholdsAreRejected()
        {
            Assert.Throws<ArgumentException>(() => new ControllerInputState(float.NaN, .2f, .15f));
            Assert.Throws<ArgumentException>(() => new ControllerInputState(1, .2f, .15f));
            Assert.Throws<ArgumentException>(() => new ControllerInputState(.16f, 0, .15f));
            Assert.Throws<ArgumentException>(() => new ControllerInputState(.16f, .2f, -1));
        }

        [Test]
        public void SyntheticInputSystemGamepadReachesTheReaderWithStandardButtonPositions()
        {
            // Software device only: verifies real InputSystem state/layout plumbing,
            // never represents physical DualShock/DualSense or browser compatibility.
            Gamepad pad = null; var previous = Gamepad.current;
            try
            {
                pad = InputSystem.AddDevice<Gamepad>();
                var input = new GamepadState
                { leftStick = new Vector2(.7f, -.4f), rightStick = new Vector2(-.5f, .6f), leftTrigger = .7f, rightTrigger = .9f }
                    .WithButton(GamepadButton.South).WithButton(GamepadButton.East).WithButton(GamepadButton.West)
                    .WithButton(GamepadButton.North).WithButton(GamepadButton.LeftShoulder).WithButton(GamepadButton.RightShoulder)
                    .WithButton(GamepadButton.RightStick).WithButton(GamepadButton.Start).WithButton(GamepadButton.Select)
                    .WithButton(GamepadButton.DpadUp).WithButton(GamepadButton.DpadLeft);
                InputSystem.QueueStateEvent(pad, input); InputSystem.Update();
                var sample = DogfightControllerReader.Read(pad);
                Assert.That(sample.Connected, Is.True); Assert.That(sample.DeviceId, Is.EqualTo(pad.deviceId));
                Assert.That(sample.LeftStick.x, Is.GreaterThan(0)); Assert.That(sample.LeftStick.y, Is.LessThan(0));
                Assert.That(sample.RightStick.x, Is.LessThan(0)); Assert.That(sample.RightStick.y, Is.GreaterThan(0));
                Assert.That(sample.LeftTrigger, Is.EqualTo(.7f).Within(.000001)); Assert.That(sample.RightTrigger, Is.EqualTo(.9f).Within(.000001));
                Assert.That(sample.South && sample.East && sample.West && sample.North && sample.LeftShoulder && sample.RightShoulder &&
                    sample.RightStickPress && sample.Start && sample.Select && sample.Up && sample.Left, Is.True);
                Assert.That(sample.Down || sample.Right, Is.False);
                InputSystem.RemoveDevice(pad);
                Assert.That(DogfightControllerReader.Read(pad).Connected, Is.False);
                pad = null;
            }
            finally
            {
                if (pad != null && pad.added) InputSystem.RemoveDevice(pad);
                if (previous != null && previous.added) previous.MakeCurrent();
            }
        }
    }
}
