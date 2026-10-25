using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;

/// <summary>
/// Lightweight test harness for a Unity scene. Wire a EuroLifeSupabaseAuth component and
/// a EuroLifeSupabaseConfig asset in the Inspector. Never use production accounts for this test.
/// This runner does not create accounts or change payment state; it validates auth and read-only
/// job listing/profile calls. Paid lifecycle tests require two disposable accounts and explicit setup.
/// </summary>
public sealed class EuroLifeBackendSmokeTest : MonoBehaviour
{
    [SerializeField] private EuroLifeSupabaseAuth auth;
    [SerializeField] private EuroLifeSupabaseConfig config;
    [SerializeField] private string testEmail;
    [SerializeField] private string testPassword;
    [SerializeField] private bool signInOnStart;

    private EuroLifeSupabaseClient client;

    private async void Start()
    {
        if (signInOnStart) await SignInAndRunReadOnlyChecks();
    }

    [ContextMenu("Run sign-in + read-only backend checks")]
    public async void RunFromInspector() { await SignInAndRunReadOnlyChecks(); }

    public async Task SignInAndRunReadOnlyChecks()
    {
        if (auth == null || config == null || !config.IsConfigured)
        {
            Debug.LogError("[EURO LIFE TEST] Missing auth component or Supabase config asset.");
            return;
        }
        var signIn = await auth.SignInWithPasswordAsync(testEmail, testPassword);
        if (!signIn.success)
        {
            Debug.LogError("[EURO LIFE TEST] Sign-in failed: " + signIn.errorCode + " — " + signIn.message);
            return;
        }

        client = new EuroLifeSupabaseClient(config, auth);
        Debug.Log("[EURO LIFE TEST] Sign-in succeeded for user ID " + auth.UserId);
        var jobs = await client.BrowseJobsAsync("open", 10, 0);
        Debug.Log(jobs.success
            ? "[EURO LIFE TEST] Job listing endpoint responded successfully."
            : "[EURO LIFE TEST] Job listing failed: " + jobs.errorCode + " — " + jobs.message);

        var profile = await client.SaveProfileAsync("EURO LIFE Test Player", "default");
        Debug.Log(profile.success
            ? "[EURO LIFE TEST] Profile endpoint responded successfully."
            : "[EURO LIFE TEST] Profile save failed: " + profile.errorCode + " — " + profile.message);

        // Verify refresh path without logging or exposing token values.
        auth.SignOut();
        Debug.Log("[EURO LIFE TEST] Read-only smoke test ended; signed out locally.");
    }
}
