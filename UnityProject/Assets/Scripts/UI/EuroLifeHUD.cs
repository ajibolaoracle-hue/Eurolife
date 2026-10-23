using UnityEngine;
using UnityEngine.UI;

namespace EuroLife
{
    /// <summary>
    /// Minimal runtime HUD foundation. Add to a Canvas object and assign labels.
    /// This is a starter system; save persistence and full job interactions come later.
    /// </summary>
    public sealed class EuroLifeHUD : MonoBehaviour
    {
        [SerializeField] private Text cashLabel;
        [SerializeField] private Text dayLabel;
        [SerializeField] private Text needsLabel;
        [SerializeField] private int startingCash = 1200;
        [SerializeField] private float dayLengthMinutes = 18f;

        public int Cash { get; private set; }
        public int Day { get; private set; } = 1;
        public float Energy { get; private set; } = 100f;
        public float Hunger { get; private set; } = 100f;
        private float elapsed;

        private void Start()
        {
            Cash = startingCash;
            Refresh();
        }

        private void Update()
        {
            elapsed += Time.deltaTime;
            float daySeconds = Mathf.Max(60f, dayLengthMinutes * 60f);
            float normalized = elapsed / daySeconds;
            int newDay = 1 + Mathf.FloorToInt(normalized);
            if (newDay != Day) Day = newDay;

            float hour = (8f + (normalized % 1f) * 24f) % 24f;
            // Needs gently decay over the in-game day.
            Energy = Mathf.Clamp(100f - (normalized % 1f) * 28f, 0f, 100f);
            Hunger = Mathf.Clamp(100f - (normalized % 1f) * 38f, 0f, 100f);
            if (dayLabel != null)
                dayLabel.text = $"DAY {Day}  {Mathf.FloorToInt(hour):00}:{Mathf.FloorToInt((hour % 1f) * 60f):00}";
            Refresh();
        }

        public bool TrySpend(int amount)
        {
            if (amount < 0 || Cash < amount) return false;
            Cash -= amount;
            Refresh();
            return true;
        }

        public void Earn(int amount)
        {
            if (amount <= 0) return;
            Cash += amount;
            Refresh();
        }

        public void Rest(float amount = 25f) => Energy = Mathf.Clamp(Energy + amount, 0f, 100f);
        public void Eat(float amount = 30f) => Hunger = Mathf.Clamp(Hunger + amount, 0f, 100f);

        private void Refresh()
        {
            if (cashLabel != null) cashLabel.text = "€" + Cash.ToString("N0");
            if (needsLabel != null) needsLabel.text = $"ENERGY {Mathf.RoundToInt(Energy)}   FOOD {Mathf.RoundToInt(Hunger)}";
        }
    }
}
