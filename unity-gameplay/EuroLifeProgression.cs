using System;
using UnityEngine;

namespace EuroLife.Gameplay
{
    /// <summary>Offline gameplay prototype. Attach to a GameObject in a Unity scene.</summary>
    public sealed class EuroLifeProgression : MonoBehaviour
    {
        [Header("Starting State")]
        [SerializeField] private int startingCash = 0;
        [SerializeField] private int startingDay = 1;
        [SerializeField] private int dailyHousingCost = 12;
        [SerializeField] private int startingReputation = 50;

        public int Cash { get; private set; }
        public int Day { get; private set; }
        public int Energy { get; private set; }
        public int Food { get; private set; }
        public int Reputation { get; private set; }
        public int SuccessfulShifts { get; private set; }
        public bool RadioChatUnlocked => SuccessfulShifts >= 5;
        public bool CanAffordHousing => Cash >= dailyHousingCost;

        public event Action StateChanged;

        private void Awake()
        {
            Cash = Mathf.Max(0, startingCash);
            Day = Mathf.Max(1, startingDay);
            Energy = 100;
            Food = 100;
            Reputation = Mathf.Clamp(startingReputation, 0, 100);
            SuccessfulShifts = 0;
            Notify();
        }

        public bool TryWork(int pay, int energyCost = 25, int foodCost = 15)
        {
            if (pay < 0 || energyCost < 0 || foodCost < 0 ||
                Energy < energyCost || Food < foodCost) return false;

            Cash += pay;
            Energy = Mathf.Clamp(Energy - energyCost, 0, 100);
            Food = Mathf.Clamp(Food - foodCost, 0, 100);
            Reputation = Mathf.Clamp(Reputation + 1, 0, 100);
            SuccessfulShifts++;
            Notify();
            return true;
        }

        public bool TryBuyFood(int cost, int foodGain = 35)
        {
            if (cost < 0 || foodGain < 0 || Cash < cost) return false;
            Cash -= cost;
            Food = Mathf.Clamp(Food + foodGain, 0, 100);
            Notify();
            return true;
        }

        public bool TryTravel(int fare, int energyCost = 10)
        {
            if (fare < 0 || energyCost < 0 || Cash < fare || Energy < energyCost) return false;
            Cash -= fare;
            Energy = Mathf.Clamp(Energy - energyCost, 0, 100);
            Notify();
            return true;
        }

        public void Rest(int energyGain = 40)
        {
            Energy = Mathf.Clamp(Energy + Mathf.Max(0, energyGain), 0, 100);
            Notify();
        }

        /// <summary>Advance one day and charge housing; unpaid housing lowers reputation.</summary>
        public void AdvanceDay()
        {
            Day++;
            Food = Mathf.Clamp(Food - 10, 0, 100);
            Energy = Mathf.Clamp(Energy + 30, 0, 100);
            if (Cash >= dailyHousingCost) Cash -= dailyHousingCost;
            else Reputation = Mathf.Clamp(Reputation - 5, 0, 100);
            Notify();
        }

        private void Notify() => StateChanged?.Invoke();
    }
}
