# EURO LIFE — Unity Mobile Prototype

This folder contains the Unity mobile-game foundation. The existing root web prototype is kept separate.

## Unity project

- Editor target: Unity 2022.3.62f1 LTS
- Packages/manifest.json installs Unity UI and the Unity Test Framework.
- Assets/Editor/EuroLifeBuild.cs creates a bootstrap scene if missing and provides an Android build entry point.
- The scene bootstrap generates a placeholder Paris street and third-person capsule player. This is a prototype foundation, not final realistic character art or a release build.

Open UnityProject directly with Unity Hub on a desktop/cloud build machine. Unity Editor cannot run natively on iPhone. Allow Unity to import assets and check the Console for compile errors.

## Supabase connection

Project URL: https://xkyjeonqbfaaxnmujybn.supabase.co

Unity scripts included:
- EuroLifeSupabaseAuth.cs — email/password sign-in, in-memory access/refresh tokens, token refresh, and access-token provider implementation.
- EuroLifeSupabaseClient.cs — authenticated calls to deployed Edge Functions for profile, jobs, chat, blocks, and reports.
- EuroLifeBackendSmokeTest.cs — manual sign-in + job listing + profile endpoint smoke test.

### Connect it locally
1. Open the Unity project and wait for scripts to compile.
2. In Unity, create an asset via EURO LIFE → Supabase Client Config.
3. Enter the project's public anon/publishable key. Never use a service-role or secret key in a client build.
4. Add EuroLifeSupabaseAuth and EuroLifeBackendSmokeTest to a temporary scene GameObject; assign the config and auth references.
5. Use a disposable Supabase Auth test account and enter credentials only in the local Inspector. Do not commit credentials.
6. Run “Run sign-in + read-only backend checks” from the smoke-test component's Inspector menu. Confirm sign-in, job listing, and profile save results in the Unity Console.

Online calls fail closed when config, public key, or signed-in token is missing. The server is authoritative for online wallet balances; never award online job cash client-side.

## Build automation

The workflow at .github/workflows/unity-android-build.yml validates project structure on pushes. To attempt an Android build, enable the UNITY_BUILD_ENABLED Actions variable and provide valid Unity license credentials through UNITY_LICENSE (and, if required by the license flow, UNITY_EMAIL / UNITY_PASSWORD secrets). The build has not been run here, and the APK is not verified.

## Not yet verified

No Unity Editor compilation, Android/iOS build, authenticated test-account journey, or full job/chat/block/report end-to-end test has been completed from this environment. The current auth session is memory-only. Before production, add an in-game sign-in UI and session lifecycle handling, validate response DTOs, address remaining Supabase security-advisor findings, add chat rate limiting/moderation, and run concurrency/idempotency tests with disposable accounts. Do not test payments with real money.
