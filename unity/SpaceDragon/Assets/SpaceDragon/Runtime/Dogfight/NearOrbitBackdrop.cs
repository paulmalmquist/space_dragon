using UnityEngine;

namespace SpaceDragon.Dogfight
{
    /// <summary>
    /// Distant scenery keeps a fixed apparent altitude in this unrestricted combat lab.
    /// Translation follows the camera; rotation never does. This is not a traversable planet.
    /// No gameplay transforms, velocity, collision or save state are changed.
    /// </summary>
    [DefaultExecutionOrder(1000)]
    public sealed class NearOrbitBackdrop : MonoBehaviour
    {
        // Directly below: yawing through any heading retains the same broad horizon.
        // 800 m above the opaque deck / 592 m above the visual atmosphere shell.
        public Vector3 CameraOffset = new Vector3(0, -26800, 0);
        Transform view;

        void LateUpdate()
        {
            if (view == null && Camera.main != null) view = Camera.main.transform;
            if (view != null) transform.position = view.position + CameraOffset;
        }
    }
}
