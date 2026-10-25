using System;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

/// <summary>
/// Direct Unity-to-Supabase Edge Function client for EURO LIFE.
/// Put only the Supabase project URL and anon/publishable key in this asset.
/// Never put a service-role/secret key in a Unity build.
/// The token provider must return the signed-in Supabase user's access token.
/// </summary>
[CreateAssetMenu(fileName = "EuroLifeSupabaseConfig", menuName = "EURO LIFE/Supabase Client Config")]
public sealed class EuroLifeSupabaseConfig : ScriptableObject
{
    [SerializeField] private string projectUrl = "https://xkyjeonqbfaaxnmujybn.supabase.co";
    [SerializeField] private string anonOrPublishableKey = "";

    public string ProjectUrl => (projectUrl ?? "").Trim().TrimEnd('/');
    public string PublicKey => (anonOrPublishableKey ?? "").Trim();
    public bool IsConfigured => Uri.TryCreate(ProjectUrl, UriKind.Absolute, out var uri)
        && uri.Scheme == Uri.UriSchemeHttps
        && !string.IsNullOrWhiteSpace(PublicKey);
}

public sealed class EuroLifeSupabaseClient
{
    private readonly EuroLifeSupabaseConfig config;
    private readonly IEuroLifeAccessTokenProvider tokenProvider;

    public EuroLifeSupabaseClient(EuroLifeSupabaseConfig config, IEuroLifeAccessTokenProvider tokenProvider)
    {
        this.config = config;
        this.tokenProvider = tokenProvider;
    }

    public Task<EuroLifeApiResult> SaveProfileAsync(string displayName, string avatarId) =>
        Post("create-profile", new ProfilePayload { displayName = displayName, avatarId = avatarId });

    public Task<EuroLifeApiResult> BrowseJobsAsync(string status, int limit = 20, int offset = 0) =>
        Post("list-jobs", new JobsPayload { status = string.IsNullOrWhiteSpace(status) ? "open" : status, limit = Mathf.Clamp(limit, 1, 50), offset = Mathf.Max(0, offset) });

    public Task<EuroLifeApiResult> CreateJobAsync(string businessName, string title, string description, int wageEuros, int estimatedMinutes, string idempotencyKey) =>
        Post("create-job", new CreateJobPayload { businessName = businessName, title = title, description = description, wageEuros = wageEuros, estimatedMinutes = estimatedMinutes }, idempotencyKey);

    public Task<EuroLifeApiResult> ApplyForJobAsync(string jobId, string idempotencyKey) =>
        Post("job-action", new JobActionPayload { jobId = jobId, action = "apply" }, idempotencyKey);

    public Task<EuroLifeApiResult> HireApplicantAsync(string jobId, string workerUserId, string idempotencyKey) =>
        Post("job-action", new JobActionPayload { jobId = jobId, action = "hire", targetWorkerId = workerUserId }, idempotencyKey);

    public Task<EuroLifeApiResult> ChangeJobActionAsync(string jobId, string action, string idempotencyKey) =>
        Post("job-action", new JobActionPayload { jobId = jobId, action = action }, idempotencyKey);

    public Task<EuroLifeApiResult> CreateConversationAsync(string kind, string targetUserId, string title = null) =>
        Post("create-conversation", new ConversationPayload { kind = kind, targetUserId = targetUserId, title = title });

    public Task<EuroLifeApiResult> SendMessageAsync(string conversationId, string text) =>
        Post("send-chat-message", new ChatPayload { conversationId = conversationId, text = text });

    public Task<EuroLifeApiResult> BlockPlayerAsync(string targetPlayerId) =>
        Post("manage-block", new BlockPayload { targetPlayerId = targetPlayerId, action = "block" });

    public Task<EuroLifeApiResult> UnblockPlayerAsync(string targetPlayerId) =>
        Post("manage-block", new BlockPayload { targetPlayerId = targetPlayerId, action = "unblock" });

    public Task<EuroLifeApiResult> ReportPlayerAsync(string reportedPlayerId, string category, string details) =>
        Post("report-player", new ReportPayload { reportedPlayerId = reportedPlayerId, category = category, details = details });

    private async Task<EuroLifeApiResult> Post(string functionName, object payload, string idempotencyKey = null)
    {
        if (config == null || !config.IsConfigured)
            return EuroLifeApiResult.Fail("backend_not_configured", "Set the Supabase HTTPS URL and public anon/publishable key.");
        if (tokenProvider == null)
            return EuroLifeApiResult.Fail("auth_unavailable", "Attach an authenticated Supabase access-token provider.");
        string token = await tokenProvider.GetAccessTokenAsync();
        if (string.IsNullOrWhiteSpace(token))
            return EuroLifeApiResult.Fail("not_authenticated", "Sign in before using online features.");

        string url = config.ProjectUrl + "/functions/v1/" + functionName;
        using (var request = new UnityWebRequest(url, "POST"))
        {
            byte[] bytes = Encoding.UTF8.GetBytes(JsonUtility.ToJson(payload));
            request.uploadHandler = new UploadHandlerRaw(bytes);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            request.SetRequestHeader("apikey", config.PublicKey);
            request.SetRequestHeader("Authorization", "Bearer " + token);
            if (!string.IsNullOrWhiteSpace(idempotencyKey))
                request.SetRequestHeader("Idempotency-Key", idempotencyKey);

            var operation = request.SendWebRequest();
            while (!operation.isDone) await Task.Yield();

            string responseBody = request.downloadHandler == null ? "" : request.downloadHandler.text;
            if (request.result != UnityWebRequest.Result.Success)
            {
                string code = request.responseCode == 401 ? "unauthorized"
                    : request.responseCode == 403 ? "forbidden"
                    : request.responseCode == 404 ? "not_found"
                    : request.responseCode == 409 ? "conflict"
                    : request.responseCode >= 500 ? "server_error" : "request_failed";
                return EuroLifeApiResult.Fail(code, "Backend request failed (HTTP " + request.responseCode + ").", responseBody);
            }
            return EuroLifeApiResult.Ok(responseBody);
        }
    }

    [Serializable] private sealed class ProfilePayload { public string displayName; public string avatarId = "default"; }
    [Serializable] private sealed class JobsPayload { public string status; public int limit = 20; public int offset; }
    [Serializable] private sealed class CreateJobPayload { public string businessName; public string title; public string description; public int wageEuros; public int estimatedMinutes; }
    [Serializable] private sealed class JobActionPayload { public string jobId; public string action; public string targetWorkerId; }
    [Serializable] private sealed class ConversationPayload { public string kind = "direct"; public string targetUserId; public string title; }
    [Serializable] private sealed class ChatPayload { public string conversationId; public string text; }
    [Serializable] private sealed class BlockPayload { public string targetPlayerId; public string action; }
    [Serializable] private sealed class ReportPayload { public string reportedPlayerId; public string category; public string details; }
}

public interface IEuroLifeAccessTokenProvider
{
    Task<string> GetAccessTokenAsync();
}

public sealed class EuroLifeApiResult
{
    public bool success;
    public string errorCode;
    public string message;
    public string responseJson;

    public static EuroLifeApiResult Ok(string json) => new EuroLifeApiResult { success = true, responseJson = json ?? "" };
    public static EuroLifeApiResult Fail(string code, string message, string json = "") =>
        new EuroLifeApiResult { success = false, errorCode = code, message = message, responseJson = json ?? "" };
}
