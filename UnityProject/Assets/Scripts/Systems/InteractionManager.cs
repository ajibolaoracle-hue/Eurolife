using UnityEngine;

namespace EuroLife
{
    /// <summary>Finds the nearest usable object. Connect Interact() to a mobile UI button.</summary>
    public sealed class InteractionManager : MonoBehaviour
    {
        [SerializeField] private Transform player;
        [SerializeField] private float scanRadius = 3f;
        [SerializeField] private JobSystem jobs;
        [SerializeField] private EuroLifeHUD hud;
        private Interactable current;

        public string CurrentPrompt => current != null ? current.DisplayName : string.Empty;

        private void Update()
        {
            current = null;
            if (player == null) return;
            Interactable[] candidates = FindObjectsOfType<Interactable>();
            float best = scanRadius;
            foreach (Interactable item in candidates)
            {
                float distance = Vector3.Distance(player.position, item.transform.position);
                if (distance <= best) { best = distance; current = item; }
            }
        }

        public bool Interact()
        {
            if (current == null) return false;
            switch (current.Kind)
            {
                case InteractionKind.Job:
                    return jobs != null && jobs.StartShift();
                case InteractionKind.Rest:
                    if (hud == null) return false;
                    hud.Rest(35f);
                    return true;
                case InteractionKind.Eat:
                    if (hud == null || !hud.TrySpend(8)) return false;
                    hud.Eat(40f);
                    return true;
                case InteractionKind.Shop:
                    return hud != null && hud.TrySpend(15);
                case InteractionKind.Apartment:
                    if (hud == null) return false;
                    hud.Rest(15f);
                    return true;
                default:
                    return false;
            }
        }
    }
}
