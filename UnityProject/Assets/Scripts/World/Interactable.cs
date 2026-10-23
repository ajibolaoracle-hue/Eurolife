using UnityEngine;

namespace EuroLife
{
    public enum InteractionKind { Job, Rest, Eat, Shop, Apartment }

    /// <summary>Reusable interactable marker for scene objects and future UI prompts.</summary>
    public sealed class Interactable : MonoBehaviour
    {
        [SerializeField] private string displayName = "Interact";
        [SerializeField] private InteractionKind kind = InteractionKind.Job;
        [SerializeField, Min(0.5f)] private float range = 2.5f;
        public string DisplayName => displayName;
        public InteractionKind Kind => kind;
        public float Range => range;

        public bool IsInRange(Transform actor) =>
            actor != null && Vector3.Distance(actor.position, transform.position) <= range;
    }
}
