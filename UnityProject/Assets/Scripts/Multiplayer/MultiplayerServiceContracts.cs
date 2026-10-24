using System;
using System.Collections.Generic;
using System.Threading.Tasks;

/// <summary>
/// Transport-neutral contracts for the future multiplayer backend.
/// Implement with an authenticated HTTPS/WebSocket client. No network implementation is included yet.
/// </summary>
public interface IMultiplayerGateway
{
    Task<GatewayResult<PlayerPublicProfile>> GetProfileAsync(string playerId);
    Task<GatewayResult<IReadOnlyList<JobListingDto>>> BrowseJobsAsync(string status);
    Task<GatewayResult<JobListingDto>> PostJobAsync(PostJobRequest request, string idempotencyKey);
    Task<GatewayResult<JobListingDto>> ApplyForJobAsync(string jobId, string workerPlayerId, string idempotencyKey);
    Task<GatewayResult<JobListingDto>> HireApplicantAsync(string jobId, string employerPlayerId, string workerPlayerId, string idempotencyKey);
    Task<GatewayResult<JobListingDto>> ChangeJobStatusAsync(string jobId, string playerId, string action, string idempotencyKey);
    Task<GatewayResult<ChatMessageDto>> SendChatMessageAsync(SendChatMessageRequest request, string idempotencyKey);
}

[Serializable]
public class GatewayResult<T>
{
    public bool success;
    public string errorCode;
    public string errorMessage;
    public T data;

    public static GatewayResult<T> Success(T value) =>
        new GatewayResult<T> { success = true, data = value };

    public static GatewayResult<T> Failure(string code, string message) =>
        new GatewayResult<T> { success = false, errorCode = code, errorMessage = message };
}

[Serializable]
public class PlayerPublicProfile
{
    public string playerId;
    public string displayName;
    public string avatarId;
    public int reputation;
    public bool online;
}

[Serializable]
public class JobListingDto
{
    public string jobId;
    public string employerPlayerId;
    public string employerDisplayName;
    public string businessName;
    public string title;
    public string description;
    public int wageEuros;
    public int estimatedMinutes;
    public string status;
    public string workerPlayerId;
    public string workerDisplayName;
    public long createdUtcUnix;
    public long updatedUtcUnix;
}

[Serializable]
public class PostJobRequest
{
    public string businessName;
    public string title;
    public string description;
    public int wageEuros;
    public int estimatedMinutes;
}

[Serializable]
public class SendChatMessageRequest
{
    public string conversationId;
    public string senderPlayerId;
    public string text;
    public string clientMessageId;
}

[Serializable]
public class ChatMessageDto
{
    public string messageId;
    public string conversationId;
    public string senderPlayerId;
    public string senderDisplayName;
    public string text;
    public long sentUtcUnix;
}
