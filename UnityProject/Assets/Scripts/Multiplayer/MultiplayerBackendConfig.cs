using UnityEngine;

/// <summary>
/// Configure the online backend per environment. Leave base URL empty until a real HTTPS API is deployed.
/// Do not put private API keys or server secrets in a Unity client build.
/// </summary>
[CreateAssetMenu(fileName = "MultiplayerBackendConfig", menuName = "EURO LIFE/Multiplayer Backend Config")]
public sealed class MultiplayerBackendConfig : ScriptableObject
{
    [SerializeField] private string baseUrl = "";
    [SerializeField] private bool useDevelopmentEnvironment;

    public string BaseUrl => baseUrl == null ? string.Empty : baseUrl.Trim().TrimEnd('/');
    public bool IsConfigured => !string.IsNullOrWhiteSpace(BaseUrl);
    public bool IsHttps => BaseUrl.StartsWith("https://", System.StringComparison.OrdinalIgnoreCase);
    public bool UseDevelopmentEnvironment => useDevelopmentEnvironment;

#if UNITY_EDITOR
    private void OnValidate()
    {
        if (!string.IsNullOrWhiteSpace(baseUrl) &&
            !baseUrl.StartsWith("https://", System.StringComparison.OrdinalIgnoreCase) &&
            !baseUrl.StartsWith("http://localhost", System.StringComparison.OrdinalIgnoreCase) &&
            !baseUrl.StartsWith("http://127.0.0.1", System.StringComparison.OrdinalIgnoreCase))
        {
            Debug.LogWarning("EURO LIFE backend should use HTTPS outside local development.");
        }
    }
#endif
}
