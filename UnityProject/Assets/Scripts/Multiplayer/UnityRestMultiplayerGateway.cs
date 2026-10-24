using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

/// <summary>
/// UnityWebRequest REST transport scaffold.
/// Requires a deployed backend implementing the documented routes and an access-token provider.
/// No server is bundled; calls will fail until a real API is configured.
/// </summary>
public sealed class UnityRestMultiplayerGateway : IMultiplayerGateway
{
    private readonly MultiplayerBackendConfig config;
    private readonly IAccessTokenProvider tokenProvider;

    public UnityRestMultiplayerGateway(MultiplayerBackendConfig backendConfig, IAccessTokenProvider accessTokenProvider)
    {
        config = backendConfig;
        tokenProvider = accessTokenProvider;
    }

    public Task<GatewayResult<PlayerPublicProfile>> GetProfileAsync(string playerId) =>
        Get<PlayerPublicProfile>("/profiles/" + Uri.EscapeDataString(playerId));

    public async Task<GatewayResult<IReadOnlyList<JobListingDto>>> BrowseJobsAsync(string status)
    {
        string query = string.IsNullOrWhiteSpace(status) ? "open" : status.Trim();
        GatewayResult<JobListingDto[]> response =
            await Get<JobListResponse>("/jobs?status=" + Uri.EscapeDataString(query));
        if (!response.success)
            return GatewayResult<IReadOnlyList<JobListingDto>>.Failure(response.errorCode, response.errorMessage);

        return GatewayResult<IReadOnlyList<JobListingDto>>.Success(response.data.items ?? new JobListingDto[0]);
    }

    public Task<GatewayResult<JobListingDto>> PostJobAsync(PostJobRequest request, string idempotencyKey) =>
        Send<JobListingDto>("POST", "/jobs", request, idempotencyKey);

    public Task<GatewayResult<JobListingDto>> ApplyForJobAsync(string jobId, string workerPlayerId, string idempotencyKey) =>
        Send<JobListingDto>("POST", "/jobs/" + Uri.EscapeDataString(jobId) + "/applications",
            new PlayerActionRequest { playerId = workerPlayerId }, idempotencyKey);

    public Task<GatewayResult<JobListingDto>> HireApplicantAsync(string jobId, string employerPlayerId, string workerPlayerId, string idempotencyKey) =>
        Send<JobListingDto>("POST", "/jobs/" + Uri.EscapeDataString(jobId) + "/hire",
            new HireApplicantRequest { employerPlayerId = employerPlayerId, workerPlayerId = workerPlayerId }, idempotencyKey);

    public Task<GatewayResult<JobListingDto>> ChangeJobStatusAsync(string jobId, string playerId, string action, string idempotencyKey) =>
        Send<JobListingDto>("POST", "/jobs/" + Uri.EscapeDataString(jobId) + "/" + Uri.EscapeDataString(action),
            new PlayerActionRequest { playerId = playerId }, idempotencyKey);

    public Task<GatewayResult<ChatMessageDto>> SendChatMessageAsync(SendChatMessageRequest request, string idempotencyKey) =>
        Send<ChatMessageDto>("POST", "/conversations/" + Uri.EscapeDataString(request.conversationId) + "/messages",
            request, idempotencyKey);

    private Task<GatewayResult<T>> Get<T>(string path) => Send<T>("GET", path, null, null);

    private async Task<GatewayResult<T>> Send<T>(string method, string path, object body, string idempotencyKey)
    {
        if (config == null || !config.IsConfigured)
            return GatewayResult<T>.Failure("backend_not_configured", "Set the multiplayer backend URL before connecting.");
        if (!config.IsHttps && !config.BaseUrl.StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase)
            && !config.BaseUrl.StartsWith("http://127.0.0.1", StringComparison.OrdinalIgnoreCase))
            return GatewayResult<T>.Failure("https_required", "The multiplayer API must use HTTPS outside local development.");
        if (tokenProvider == null)
            return GatewayResult<T>.Failure("auth_unavailable", "No access-token provider has been configured.");

        string token = await tokenProvider.GetAccessTokenAsync();
        if (string.IsNullOrWhiteSpace(token))
            return GatewayResult<T>.Failure("not_authenticated", "Sign in before using online features.");

        string url = config.BaseUrl + path;
        using (var request = new UnityWebRequest(url, method))
        {
            request.downloadHandler = new DownloadHandlerBuffer();
            if (body != null)
            {
                byte[] bytes = Encoding.UTF8.GetBytes(JsonUtility.ToJson(body));
                request.uploadHandler = new UploadHandlerRaw(bytes);
                request.SetRequestHeader("Content-Type", "application/json");
            }
            request.SetRequestHeader("Authorization", "Bearer " + token);
            if (!string.IsNullOrWhiteSpace(idempotencyKey))
                request.SetRequestHeader("Idempotency-Key", idempotencyKey);

            var operation = request.SendWebRequest();
            while (!operation.isDone)
                await Task.Yield();

            if (request.result != UnityWebRequest.Result.Success)
            {
                string code = "network_error";
                if (request.responseCode == 401) code = "unauthorized";
                else if (request.responseCode == 403) code = "forbidden";
                else if (request.responseCode == 404) code = "not_found";
                else if (request.responseCode == 409) code = "conflict";
                else if (request.responseCode >= 500) code = "server_error";
                return GatewayResult<T>.Failure(code, "Request failed (HTTP " + request.responseCode + ").");
            }

            try
            {
                T data = JsonUtility.FromJson<T>(request.downloadHandler.text);
                if (data == null)
                    return GatewayResult<T>.Failure("invalid_response", "The server returned an empty or invalid response.");
                return GatewayResult<T>.Success(data);
            }
            catch (Exception)
            {
                return GatewayResult<T>.Failure("invalid_response", "The server response could not be parsed.");
            }
        }
    }

    [Serializable] private class JobListResponse { public JobListingDto[] items; }\n    [Serializable] private class PlayerActionRequest { public string playerId; }
    [Serializable] private class HireApplicantRequest { public string employerPlayerId; public string workerPlayerId; }
}

public interface IAccessTokenProvider
{
    Task<string> GetAccessTokenAsync();
}
