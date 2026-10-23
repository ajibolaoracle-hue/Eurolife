using System;
using UnityEngine;

namespace EuroLife
{
    public enum JobType { CafeWorker, WarehouseHelper, DeliveryRider }

    [Serializable]
    public sealed class JobDefinition
    {
        public JobType type;
        public string displayName;
        [Min(1)] public int wage = 85;
        [Min(1)] public float shiftSeconds = 30f;
        [Min(0)] public float energyCost = 18f;
    }

    /// <summary>Prototype shift loop. Connect a UI button to StartShift and HUD to FinishShift.</summary>
    public sealed class JobSystem : MonoBehaviour
    {
        [SerializeField] private JobDefinition[] jobs =
        {
            new JobDefinition { type = JobType.CafeWorker, displayName = "Café Worker", wage = 85, shiftSeconds = 30f, energyCost = 18f },
            new JobDefinition { type = JobType.WarehouseHelper, displayName = "Warehouse Helper", wage = 110, shiftSeconds = 40f, energyCost = 28f },
            new JobDefinition { type = JobType.DeliveryRider, displayName = "Delivery Rider", wage = 95, shiftSeconds = 35f, energyCost = 23f }
        };
        [SerializeField] private EuroLifeHUD hud;
        [SerializeField] private int selectedJob;
        private float shiftElapsed;

        public bool IsWorking { get; private set; }
        public float ShiftProgress => IsWorking && jobs.Length > 0
            ? Mathf.Clamp01(shiftElapsed / Mathf.Max(1f, jobs[selectedJob].shiftSeconds)) : 0f;

        public bool SelectJob(int index)
        {
            if (IsWorking || index < 0 || index >= jobs.Length) return false;
            selectedJob = index;
            return true;
        }

        public bool StartShift()
        {
            if (IsWorking || hud == null || jobs == null || jobs.Length == 0) return false;
            if (hud.Energy < jobs[selectedJob].energyCost) return false;
            IsWorking = true;
            shiftElapsed = 0f;
            return true;
        }

        private void Update()
        {
            if (!IsWorking) return;
            shiftElapsed += Time.deltaTime;
            if (shiftElapsed >= Mathf.Max(1f, jobs[selectedJob].shiftSeconds))
            {
                IsWorking = false;
                hud.Earn(jobs[selectedJob].wage);
                Debug.Log("EURO LIFE: shift complete — " + jobs[selectedJob].displayName +
                          ", earned €" + jobs[selectedJob].wage);
            }
        }

        public void CancelShift() => IsWorking = false;
        public string GetSelectedJobName() =>
            jobs != null && jobs.Length > 0 ? jobs[Mathf.Clamp(selectedJob, 0, jobs.Length - 1)].displayName : "No jobs";
    }
}
