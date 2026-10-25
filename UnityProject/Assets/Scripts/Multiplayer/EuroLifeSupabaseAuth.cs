using System;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

/// <summary>
/// Minimal Supabase Auth password sign-in for the EURO LIFE Unity prototype.
/// Tokens stay in memory only (not PlayerPrefs); sign out clears them.
/// Use a test account and HTTPS. Never log passwords or tokens.
/// </summary>
public sealed class EuroLifeSupabaseAuth : MonoBehaviour, IEuroLifeAccessTokenProvider
{
    [SerializeField] private EuroLifeSupabaseConfig config;
    [SerializeField] private bool refreshBeforeExpiry = true;

    private string accessToken;
    private string refreshToken;
    private string userId;
    private long expiresAtUnix;
    private bool busy;

    public bool IsSignedIn => !string.IsNullOrEmpty(accessToken) && !string.IsNullOrEmpty(userId);
    public string UserId => userId;

    [Serializable] private sealed class PasswordSignInBody
    {
        public string email;
        public string password;
    }

    [Serializable] private sealed class RefreshBody { public string refresh_token; }

    [Serializable] private sealed class AuthSession
    {
        public string access_token;
        public string refresh_token;
        public int expires_in;
        public string token_type;
        public AuthUser user;
    }

    [Serializable] private sealed class AuthUser { public string id; public string email; }

    public async Task<EuroLifeApiResult> SignInWithPasswordAsync(string email, string password)
    {
        if (busy) return EuroLifeApiResult.Fail("auth_busy", "An authentication request is already running.");
        if (config == null || !config.IsConfigured)
            return EuroLifeApiResult.Fail("backend_not_configured", "Configure the Supabase URL and public key first.");
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrEmpty(password))
            return EuroLifeApiResult.Fail("missing_credentials", "Enter your test-account email and password.");

        busy = true;
        try
        {
            var result = await SendAuthRequest(
                config.ProjectUrl + "/auth/v1/token?grant_type=password",
                JsonUtility.ToJson(new PasswordSignInBody { email = email.Trim(), password = password }));
            if (!result.success) return result;
            var session = JsonUtility.FromJson<AuthSession>(result.responseJson);
            if (session == null || string.IsNullOrWhiteSpace(session.access_token) ||
                string.IsNullOrWhiteSpace(session.refresh_token) || session.user == null ||
                string.IsNullOrWhiteSpace(session.user.id))
                return EuroLifeApiResult.Fail("invalid_auth_response", "Supabase returned an incomplete session.");

            accessToken = session.access_token;
            refreshToken = session.refresh_token;
            userId = session.user.id;
            expiresAtUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + Math.Max(60, session.expires_in);
            return EuroLifeApiResult.Ok(JsonUtility.ToJson(new SignedInUser { userId = userId, email = session.user.email }));
        }
        finally { busy = false; }
    }

    public void SignOut()
    {
        accessToken = null;
        refreshToken = null;
        userId = null;
        expiresAtUnix = 0;
    }

    public async Task<string> GetAccessTokenAsync()
    {
        if (!IsSignedIn) return null;
        long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (refreshBeforeExpiry && now >= expiresAtUnix - 60)
        {
            if (busy || string.IsNullOrWhiteSpace(refreshToken)) return null;
            busy = true;
            try
            {
                var result = await SendAuthRequest(
                    config.ProjectUrl + "/auth/v1/token?grant_type=refresh_token",
                    JsonUtility.ToJson(new RefreshBody { refresh_token = refreshToken }));
                if (!result.success) { SignOut(); return null; }
                var session = JsonUtility.FromJson<AuthSession>(result.responseJson);
                if (session == null || string.IsNullOrWhiteSpace(session.access_token) ||
                    string.IsNullOrWhiteSpace(session.refresh_token) || session.user == null ||
                    session.user.id != userId)
                {
                    SignOut();
                    return null;
                }
                accessToken = session.access_token;
                refreshToken = session.refresh_token;
                expiresAtUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + Math.Max(60, session.expires_in);
            }
            finally { busy = false; }
        }
        return accessToken;
    }

    private async Task<EuroLifeApiResult> SendAuthRequest(string url, string json)
    {
        using (var request = new UnityWebRequest(url, "POST"))
        {
            request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            request.SetRequestHeader("apikey", config.PublicKey);
            var operation = request.SendWebRequest();
            while (!operation.isDone) await Task.Yield();
            string response = request.downloadHandler == null ? "" : request.downloadHandler.text;
            if (request.result != UnityWebRequest.Result.Success)
            {
                // Do not expose response bodies: auth errors may include sensitive metadata.
                string code = request.responseCode == 400 || request.responseCode == 401
                    ? "invalid_credentials" : request.responseCode >= 500 ? "auth_server_error" : "auth_request_failed";
                return EuroLifeApiResult.Fail(code, "Supabase sign-in/refresh failed (HTTP " + request.responseCode + ").");
            }
            return EuroLifeApiResult.Ok(response);
        }
    }

    [Serializable] private sealed class SignedInUser { public string userId; public string email; }
}
