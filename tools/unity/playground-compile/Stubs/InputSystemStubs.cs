// Compile-only shapes of the Input System members the playground reads. Not shipped.
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
        public Controls.KeyControl aKey, dKey, wKey, sKey, qKey, eKey, rKey, pKey, spaceKey, enterKey, escapeKey, leftShiftKey, rightShiftKey;
        public Controls.KeyControl leftArrowKey, rightArrowKey, upArrowKey, downArrowKey;
    }

    public class Gamepad
    {
        public static Gamepad current => null;
        public Controls.StickControl leftStick, rightStick;
        public Controls.ButtonControl buttonSouth, startButton, rightStickButton, rightTrigger, leftTrigger;
    }

    public class Mouse
    {
        public static Mouse current => null;
        public Controls.ButtonControl leftButton, rightButton;
        public Controls.DeltaControl delta;
        public Controls.Vector2Control position;
    }
}
