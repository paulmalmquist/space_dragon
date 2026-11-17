// Compile-only shapes of the Input System members the playground and the arena read. Not shipped.
namespace UnityEngine.InputSystem
{
    namespace Controls
    {
        public class ButtonControl { public bool isPressed => false; public bool wasPressedThisFrame => false; public float ReadValue() => 0; }
        public class KeyControl : ButtonControl { }
        public class Vector2Control { public Vector2 ReadValue() => default; }
        public class StickControl : Vector2Control { }
        public class DeltaControl : Vector2Control { }
    }

    public class Keyboard
    {
        public static Keyboard current => null;
        public Controls.KeyControl aKey, dKey, wKey, sKey, qKey, eKey, rKey, pKey, fKey, gKey, jKey, kKey, tKey, lKey, spaceKey, enterKey, escapeKey, leftShiftKey, rightShiftKey;
        public Controls.KeyControl leftArrowKey, rightArrowKey, upArrowKey, downArrowKey;
    }

    public class Gamepad
    {
        public static Gamepad current => null;
        public Controls.StickControl leftStick, rightStick;
        public Controls.ButtonControl buttonSouth, buttonWest, buttonEast, buttonNorth, startButton, rightStickButton, rightTrigger, leftTrigger, leftShoulder, rightShoulder;
    }

    public class Mouse
    {
        public static Mouse current => null;
        public Controls.ButtonControl leftButton, rightButton;
        public Controls.DeltaControl delta;
        public Controls.Vector2Control position;
    }
}
