using UnityEngine;

namespace EuroLife
{
    /// <summary>
    /// Starter interaction: approach this object and press the Interact UI button.
    /// Assign HUD and player in Inspector. One shift pays a fixed prototype wage.
    /// </summary>
    public sealed class PrototypeInteraction : MonoBehaviour
    {
        [SerializeField] private string interactionName = "Cafe Shift";
        [SerializeField] private int wage = 85;
        [SerializeField] private float interactionDistance = 3f;
        [SerializeField] private EuroLifeHUD hud;
        [SerializeField] private Transform player;
        private bool shiftCompleted;

        public string InteractionName => interactionName;
        public bool ShiftCompleted => shiftCompleted;

        public bool Interact()
        {
            if (hud == null || player == null) return false;
            if (Vector3.Distance(player.position, transform.position) > interactionDistance) return false;
            if (shiftCompleted) return false;
            shiftCompleted = true;
            hud.Earn(wage);
            Debug.Log($"EURO LIFE: completed {interactionName}; earned €{wage}.");
            return true;
        }

        public void ResetShift() => shiftCompleted = false;
    }
}
