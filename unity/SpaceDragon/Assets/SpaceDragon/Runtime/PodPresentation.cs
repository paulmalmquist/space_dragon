using UnityEngine;

namespace SpaceDragon.FirstContact
{
    /// <summary>Animation observes progress; neither clip events nor replay can grant a reward.</summary>
    internal sealed class PodPresentation
    {
        private readonly Transform root;
        private readonly Transform hinge;
        private readonly AnimationClip clip;
        private readonly Animator animator;
        private readonly Quaternion closedRotation;
        private readonly Quaternion openRotation;
        private readonly int animatorState;
        private float openness;
        private bool targetOpen;
        public string Mode { get; }

        public PodPresentation(Transform podRoot, Transform lidHinge, Animator podAnimator, AnimationClip importedClip, Vector3 lidOpenEuler)
        {
            root = podRoot;
            hinge = lidHinge;
            animator = podAnimator;
            clip = importedClip;
            if (clip == null)
            {
                var legacy = root.GetComponentInChildren<Animation>(true);
                if (legacy != null) clip = legacy.GetClip("pod_open");
            }
            closedRotation = hinge != null ? hinge.localRotation : Quaternion.identity;
            openRotation = closedRotation * Quaternion.Euler(lidOpenEuler);
            animatorState = Animator.StringToHash("pod_open");
            bool playableAnimator = animator != null && animator.runtimeAnimatorController != null && animator.HasState(0, animatorState);
            Mode = clip != null ? "imported pod_open clip" : playableAnimator ? "pod_open Animator state" : hinge != null ? "configured hinge fallback" : "no lid animation available";
            if (animator != null) animator.enabled = playableAnimator && clip == null;
            if (animator != null && animator.enabled) animator.speed = 0;
        }

        public void SetOpen(bool open, bool immediate = false)
        {
            targetOpen = open;
            if (immediate) { openness = open ? 1 : 0; Apply(); }
        }

        public void Tick(float seconds)
        {
            float previous = openness;
            openness = Mathf.MoveTowards(openness, targetOpen ? 1 : 0, seconds / 1.1f);
            if (openness == previous) return;
            Apply();
        }

        private void Apply()
        {
            if (clip != null) clip.SampleAnimation(root.gameObject, openness * clip.length);
            else if (animator != null && animator.enabled)
            {
                animator.Play(animatorState, 0, openness);
                animator.Update(0);
            }
            else if (hinge != null) hinge.localRotation = Quaternion.Slerp(closedRotation, openRotation, Mathf.SmoothStep(0, 1, openness));
        }
    }
}
