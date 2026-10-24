using System;
using UnityEngine;

public enum EmploymentStatus
{
    Open, Applied, Hired, InProgress, Submitted, Completed, Cancelled, Disputed
}

/// <summary>
/// Data model only. Online versions must validate all state changes and payments server-side.
/// </summary>
[Serializable]
public class EmploymentContract
{
    public string contractId;
    public string employerPlayerId;
    public string employerDisplayName;
    public string workerPlayerId;
    public string workerDisplayName;
    public string businessName;
    public string title;
    [TextArea] public string description;
    public int wageEuros;
    public int estimatedMinutes;
    public EmploymentStatus status;
    public long createdUtcUnix;

    public EmploymentContract()
    {
        contractId = Guid.NewGuid().ToString("N");
        status = EmploymentStatus.Open;
        createdUtcUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
    }
}
