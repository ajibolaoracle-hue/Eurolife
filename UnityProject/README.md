# EURO LIFE — Unity Mobile Prototype

This folder is the **separate Unity mobile-game foundation**. The existing web prototype at the repository root is intentionally untouched.

## Target for milestone 1
- Unity 2022.3 LTS or newer LTS, Universal Render Pipeline (URP)
- Portrait/landscape decision deferred; prototype defaults to landscape
- Third-person player movement and follow camera
- Mobile-friendly touch controls, with keyboard fallback for editor testing
- Small Paris-inspired street block using placeholder geometry first

## Create the project
1. Install Unity Hub and a supported Unity LTS Editor on a desktop/cloud desktop. The Unity Editor cannot run natively on iPhone.
2. Create a **3D (URP)** project named `EuroLifeMobile`.
3. Copy the `Assets` folder from this directory into the new project's root.
4. Open the project and create a scene named `ParisPrototype` under `Assets/Scenes`.
5. Add a Plane (scale 8,1,8), directional light, and a capsule named `Player`. Add a CharacterController to Player and attach `Scripts/Player/ThirdPersonPlayerController.cs`.
6. Create a Camera, attach `Scripts/Camera/ThirdPersonFollowCamera.cs`, and drag Player into its target field.
7. Press Play and use WASD/arrow keys in the Editor. For touch, create a Canvas with a UI joystick and connect its horizontal/vertical values to the controller's `SetMoveInput` method (see script comments).

## Important
This is a code foundation, not a compiled or tested mobile build. The scene, licensed art assets, iOS signing, and Android/iOS build configuration still need to be completed and tested on a supported build machine/service. Do not treat this folder as a playable release yet.


## Supabase multiplayer connection (backend staging)

The backend project URL is `https://xkyjeonqbfaaxnmujybn.supabase.co`. The Unity client calls deployed Edge Functions directly; it does **not** embed a service-role key.

1. Copy `Assets/Scripts/Multiplayer/EuroLifeSupabaseClient.cs` into the Unity project.
2. In Unity, create an asset using **EURO LIFE → Supabase Client Config**. Set the project's public anon/publishable key in that asset. A public client key is expected in client apps; never put the service-role/secret key here.
3. Implement `IEuroLifeAccessTokenProvider` using the authenticated Supabase session and return the current user's access JWT. Do not use an arbitrary player ID or a hard-coded token as identity.
4. Construct `EuroLifeSupabaseClient` after sign-in and call `SaveProfileAsync`, `BrowseJobsAsync`, `CreateJobAsync`, `ApplyForJobAsync`, `HireApplicantAsync`, `ChangeJobActionAsync`, `CreateConversationAsync`, `SendMessageAsync`, `BlockPlayerAsync`, `UnblockPlayerAsync`, or `ReportPlayerAsync`.
5. Treat the response JSON as a transport response only; parse and validate each response DTO before changing local HUD/wallet state. Server wallet balance is authoritative. Do not award client-side cash for online jobs.

### Important integration limitations
- The current Unity project still has no bundled sign-in UI or concrete `IEuroLifeAccessTokenProvider`. Online calls fail closed until the project integrates Supabase Auth and supplies the signed-in user's JWT.
- The old `UnityRestMultiplayerGateway.cs` is a scaffold for a different REST route shape and depends on project interfaces/DTOs not present in this folder; use the new direct Edge Function client for the current Supabase backend.
- No Unity Editor compile, mobile build, authenticated end-to-end test, or paid job lifecycle test has been run in this environment. Backend deployment status is not proof that gameplay is fully connected.
- Before production, address remaining security-advisor findings, add persistent chat rate limiting/moderation, configure production CORS as appropriate, add unique display-name enforcement, and run concurrent/idempotency tests for job escrow and payment. Do not use real money in testing.


## Supabase Auth + safe smoke test

New scripts:
- `Assets/Scripts/Multiplayer/EuroLifeSupabaseAuth.cs`: email/password sign-in, in-memory access/refresh tokens, refresh near expiry, local sign-out, and `IEuroLifeAccessTokenProvider`.
- `Assets/Scripts/Multiplayer/EuroLifeBackendSmokeTest.cs`: manual sign-in + job-board + profile smoke test.
- `Assets/Scripts/Multiplayer/EuroLifeSupabaseClient.cs`: Edge Function client. Job browsing uses GET to match the deployed `list-jobs` endpoint; mutations use POST.

### Unity setup
1. Open the Unity project on a computer with a supported Unity Editor.
2. Let Unity compile the scripts. Resolve any errors before proceeding; this repository has not yet been compiled in Unity.
3. In the Project window, create an asset from **EURO LIFE → Supabase Client Config** and set the Supabase public anon/publishable key. The project URL is prefilled. Never use a service-role key.
4. Add `EuroLifeSupabaseAuth` and `EuroLifeBackendSmokeTest` to a test GameObject. Assign the config asset and auth component in the Inspector.
5. Use a disposable test account created in Supabase Auth. Enter its credentials only in the local Unity Inspector for this test. Do not commit credentials or capture them in screenshots/logs.
6. Run **Run sign-in + read-only backend checks** from the component's Inspector context menu. Confirm sign-in succeeds, job listing responds, and profile save responds. Then check the Unity Console for errors.
7. Repeat with a second disposable account to validate separate identities. Do not test payments with real money.

### What this smoke test does not prove
- It is not an automated Unity Test Framework suite and does not compile/build an APK.
- It does not exercise job creation, application, hiring, approval/payment, direct chat, blocking, or reporting end to end.
- The backend may reject profile saves if the schema/policies/configuration are not aligned. Investigate the response without logging tokens/passwords.
- The current auth session is memory-only; app restart requires sign-in again. Add a proper sign-in screen and lifecycle handling before shipping.
- No successful Unity Editor compile, Android/iOS build, or test-account run has yet been observed from this environment.
