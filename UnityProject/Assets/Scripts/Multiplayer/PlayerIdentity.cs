using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Local profile/preferences model for the multiplayer prototype.
/// Authentication and moderation actions must be enforced by the online service.
/// </summary>
[Serializable]
public class PlayerIdentity
{
    public string playerId;
    public string displayName;
    public string characterProfileId;
    public long createdUtcUnix;
    public List<string> blockedPlayerIds = new List<string>();

    public bool IsValid()
    {
        return !string.IsNullOrWhiteSpace(playerId)
            && !string.IsNullOrWhiteSpace(displayName)
            && displayName.Trim().Length <= 24;
    }

    public bool HasBlocked(string otherPlayerId)
    {
        return !string.IsNullOrWhiteSpace(otherPlayerId)
            && blockedPlayerIds != null
            && blockedPlayerIds.Contains(otherPlayerId);
    }

    public bool TryBlock(string otherPlayerId)
    {
        if (string.IsNullOrWhiteSpace(otherPlayerId) || otherPlayerId == playerId)
            return false;
        if (blockedPlayerIds == null)
            blockedPlayerIds = new List<string>();
        if (blockedPlayerIds.Contains(otherPlayerId))
            return true;
        blockedPlayerIds.Add(otherPlayerId);
        return true;
    }

    public bool Unblock(string otherPlayerId)
    {
        return blockedPlayerIds != null && blockedPlayerIds.Remove(otherPlayerId);
    }
}

[Serializable]
public class PlayerReport
{
    public string reportId;
    public string reporterPlayerId;
    public string reportedPlayerId;
    public string category;
    public string details;
    public long createdUtcUnix;

    public static bool TryCreate(string reporterId, string reportedId, string reportCategory,
        string reportDetails, out PlayerReport report, out string error)
    {
        report = null;
        error = null;
        if (string.IsNullOrWhiteSpace(reporterId) || string.IsNullOrWhiteSpace(reportedId))
            return Fail("Reporter and reported player IDs are required.", out error);
        if (reporterId == reportedId)
            return Fail("You cannot report your own account.", out error);
        if (string.IsNullOrWhiteSpace(reportCategory))
            return Fail("Choose a report category.", out error);

        report = new PlayerReport
        {
            reportId = Guid.NewGuid().ToString("N"),
            reporterPlayerId = reporterId,
            reportedPlayerId = reportedId,
            category = reportCategory.Trim(),
            details = string.IsNullOrWhiteSpace(reportDetails) ? string.Empty : reportDetails.Trim(),
            createdUtcUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        };
        return true;
    }

    private static bool Fail(string message, out string error)
    {
        error = message;
        return false;
    }
}
