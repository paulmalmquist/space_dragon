// Compile-only shapes of the Input System members the Dogfight runtime reads. Not shipped.
// They return nothing useful: this project checks that the code compiles, it never runs it.
using System.Collections.Generic;

namespace UnityEngine.InputSystem
{
    namespace Controls
    {
        public class ButtonControl
        {
            public string name => "";
            public bool isPressed => false;
            public bool wasPressedThisFrame => false;
            public bool wasReleasedThisFrame => false;
            public float ReadValue() => 0;
        }
        public class KeyControl : ButtonControl { }
        public class AnyKeyControl : ButtonControl { }
        public class Vector2Control { public Vector2 ReadValue() => default; public Vector2 ReadUnprocessedValue() => default; }
        public class StickControl : Vector2Control { }
        public class DeltaControl : Vector2Control { }
        public class DpadControl : Vector2Control { public ButtonControl up, down, left, right; }
    }

    public class InputDevice
    {
        public bool added => false;
        public int deviceId => 0;
        public string displayName => "";
    }

    public class Keyboard : InputDevice
    {
        public static Keyboard current => null;
        public Controls.AnyKeyControl anyKey;
        public IEnumerable<Controls.KeyControl> allKeys => new Controls.KeyControl[0];
        public Controls.KeyControl aKey, bKey, dKey, eKey, fKey, mKey, qKey, rKey, sKey, tKey, wKey, xKey, zKey;
        public Controls.KeyControl digit1Key, digit2Key, digit3Key, f1Key;
        public Controls.KeyControl spaceKey, enterKey, escapeKey, tabKey, leftShiftKey, rightShiftKey;
        public Controls.KeyControl leftArrowKey, rightArrowKey, upArrowKey, downArrowKey;
    }

    public class Gamepad : InputDevice
    {
        public static Gamepad current => null;
        public Controls.StickControl leftStick, rightStick;
        public Controls.DpadControl dpad;
        public Controls.ButtonControl buttonSouth, buttonWest, buttonEast, buttonNorth, startButton, selectButton,
            leftStickButton, rightStickButton, rightTrigger, leftTrigger, leftShoulder, rightShoulder;
    }

    public class Mouse : InputDevice
    {
        public static Mouse current => null;
        public Controls.ButtonControl leftButton, rightButton, middleButton;
        public Controls.DeltaControl delta;
        public Controls.Vector2Control position;
    }
}
