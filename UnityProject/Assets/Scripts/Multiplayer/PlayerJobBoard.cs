using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Local prototype job board. It is not a secure online economy.
/// In multiplayer, create/apply/hire/complete/payment actions must be
/// authenticated and validated by a trusted server.
/// </summary>
public class PlayerJobBoard : MonoBehaviour
{
    [SerializeField] private int maximumOpenJobs = 30;
    private readonly List<EmploymentContract> jobs = new List<EmploymentContract>();

    public IReadOnlyList<EmploymentContract> Jobs => jobs.AsReadOnly();
    public event Action JobsChanged;

    public bool TryPostJob(string employerId, string employerName, string businessName,
        string title, string description, int wageEuros, int estimatedMinutes,
        out EmploymentContract contract, out string error)
    {
        contract = null;
        error = null;

        if (string.IsNullOrWhiteSpace(employerId))
            return Fail("Sign in before posting a job.", out error);
        if (string.IsNullOrWhiteSpace(title))
            return Fail("Enter a job title.", out error);
        if (wageEuros < 1 || wageEuros > 100000)
            return Fail("Enter a wage between €1 and €100,000.", out error);
        if (jobs.FindAll(j => j.status == EmploymentStatus.Open).Count >= maximumOpenJobs)
            return Fail("The job board is full.", out error);

        contract = new EmploymentContract
        {
            employerPlayerId = employerId,
            employerDisplayName = string.IsNullOrWhiteSpace(employerName) ? "Player" : employerName.Trim(),
            businessName = string.IsNullOrWhiteSpace(businessName) ? "Independent business" : businessName.Trim(),
            title = title.Trim(),
            description = description == null ? string.Empty : description.Trim(),
            wageEuros = wageEuros,
            estimatedMinutes = Mathf.Clamp(estimatedMinutes, 5, 1440),
            status = EmploymentStatus.Open
        };
        jobs.Add(contract);
        JobsChanged?.Invoke();
        return true;
    }

    public bool TryApply(string contractId, string workerId, string workerName, out string error)
    {
        error = null;
        EmploymentContract job = Find(contractId);
        if (job == null || job.status != EmploymentStatus.Open)
            return Fail("This job is no longer open.", out error);
        if (string.IsNullOrWhiteSpace(workerId))
            return Fail("Sign in before applying.", out error);
        if (workerId == job.employerPlayerId)
            return Fail("You cannot apply to your own job.", out error);

        job.workerPlayerId = workerId;
        job.workerDisplayName = string.IsNullOrWhiteSpace(workerName) ? "Player" : workerName.Trim();
        job.status = EmploymentStatus.Applied;
        JobsChanged?.Invoke();
        return true;
    }

    public bool TryHire(string contractId, string employerId, out string error)
    {
        error = null;
        EmploymentContract job = Find(contractId);
        if (job == null || job.employerPlayerId != employerId)
            return Fail("Only the job owner can hire an applicant.", out error);
        if (job.status != EmploymentStatus.Applied)
            return Fail("This job has no pending application.", out error);

        job.status = EmploymentStatus.Hired;
        JobsChanged?.Invoke();
        return true;
    }

    public bool TryStartWork(string contractId, string workerId, out string error)
    {
        error = null;
        EmploymentContract job = Find(contractId);
        if (job == null || job.workerPlayerId != workerId)
            return Fail("Only the hired worker can start this job.", out error);
        if (job.status != EmploymentStatus.Hired)
            return Fail("You must be hired before starting work.", out error);

        job.status = EmploymentStatus.InProgress;
        JobsChanged?.Invoke();
        return true;
    }

    public bool TrySubmitWork(string contractId, string workerId, out string error)
    {
        error = null;
        EmploymentContract job = Find(contractId);
        if (job == null || job.workerPlayerId != workerId)
            return Fail("Only the hired worker can submit this job.", out error);
        if (job.status != EmploymentStatus.InProgress)
            return Fail("This job is not in progress.", out error);

        job.status = EmploymentStatus.Submitted;
        JobsChanged?.Invoke();
        return true;
    }

    public bool TryApproveCompletion(string contractId, string employerId, out int wage, out string error)
    {
        wage = 0;
        error = null;
        EmploymentContract job = Find(contractId);
        if (job == null || job.employerPlayerId != employerId)
            return Fail("Only the employer can approve completion.", out error);
        if (job.status != EmploymentStatus.Submitted)
            return Fail("The worker has not submitted this job.", out error);

        // Prototype only: no real money is transferred here.
        job.status = EmploymentStatus.Completed;
        wage = job.wageEuros;
        JobsChanged?.Invoke();
        return true;
    }

    private EmploymentContract Find(string id) =>
        jobs.Find(j => j != null && j.contractId == id);

    private static bool Fail(string message, out string error)
    {
        error = message;
        return false;
    }
}
