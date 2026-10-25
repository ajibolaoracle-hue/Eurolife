# EURO LIFE — Build and Launch Plan

This is the launch runbook for the Unity mobile prototype. It deliberately separates **prototype testing** from a public release.

## Current verified status

- The Unity project structure and build entry point are committed on `unity-mobile-foundation`.
- GitHub Actions has a structure-validation job.
- The Unity Android job requires a valid Unity licence and the repository Actions variable `UNITY_BUILD_ENABLED=true`.
- A successful structure check is **not** a Unity compile. An APK, real-device test, and store-ready release are not yet verified.
- The current Unity scene is a generated prototype environment with placeholder character geometry; it is not yet the final realistic Sims/GTA-style game.

## A. One-time computer setup

Unity Editor cannot run on iPhone. Use a Windows PC or Mac with enough disk space.

1. Install Unity Hub: https://unity.com/download
2. In Unity Hub → Installs → Install Editor, install **Unity 2022.3.62f1 LTS**.
3. In the module selection, include **Android Build Support**, **Android SDK & NDK Tools**, and **OpenJDK**.
4. Sign in to Unity Hub and activate a licence that permits your intended build use.
5. Download/clone this repository and open the **UnityProject** folder (not the repository root) from Unity Hub.
6. Wait for package import and compilation. Open Window → General → Console and resolve every red error before continuing.
7. Open the generated/committed scene at `Assets/Scenes/ParisPrototype.unity` if it exists, then press Play. Confirm the scene appears, the character moves, the camera follows, and mobile controls are usable.

## B. Build an Android test APK through GitHub Actions

Repository: https://github.com/ajibolaoracle-hue/Eurolife
Branch: `unity-mobile-foundation`

1. Obtain a Unity licence file through Unity's official licence activation process. For GameCI, the secret must be in the format supported by its licence instructions; an `.alf` file is an activation request, not the final licence file. Guide: https://game.ci/docs/github/activation
2. Open https://github.com/ajibolaoracle-hue/Eurolife/settings/secrets/actions and add repository secret:
   - Name: `UNITY_LICENSE`
   - Value: the full contents of the licence file, following GameCI's current instructions.
3. If your licence flow requires them, add `UNITY_EMAIL` and `UNITY_PASSWORD` as **repository secrets**. Never put these in source files, issues, or chat.
4. Open https://github.com/ajibolaoracle-hue/Eurolife/settings/variables/actions and add repository variable:
   - Name: `UNITY_BUILD_ENABLED`
   - Value: `true`
5. Open https://github.com/ajibolaoracle-hue/Eurolife/actions/workflows/unity-android-build.yml and select **Run workflow** on `unity-mobile-foundation`.
6. Open the newest run. Both **Validate Unity project structure** and **Build Android APK** must succeed.
7. When the run succeeds, open its Artifacts section and download `eurolife-android-build`. Extract the ZIP and locate `EuroLife.apk`.
8. Install the APK on an Android test phone (allow installation from that trusted source if Android prompts). Test launch, movement, camera, UI, jobs, save/load, and behaviour after closing/reopening the app.

If the build job is skipped, check that `UNITY_BUILD_ENABLED` is exactly `true`. If it fails, read the first relevant error in the Unity build logs; do not repeatedly rerun without fixing the cause.

## C. Supabase/backend smoke test

Do this only after the Unity Editor opens without compile errors.

1. Follow `UnityProject/README.md` to create the Supabase client config using the project's **public anon/publishable key**.
2. Never embed the Supabase service-role key or any secret key in the game client.
3. Create a disposable test account; use its credentials only locally in Unity.
4. Run the manual backend smoke test and verify sign-in, job listing, and profile save in the Unity Console.
5. Test jobs/chat/block/report with two disposable accounts before any public multiplayer test. Check backend rate limits, permissions, and database policies first.

## D. Launch gates — do not skip

### Closed prototype test
- [ ] Unity Editor compiles with zero errors.
- [ ] Android APK build succeeds.
- [ ] Installs and launches on at least one real Android device.
- [ ] Touch controls, camera, pause/resume, save/load and basic job progression work.
- [ ] No secrets are present in the client build or repository.
- [ ] Backend test journey passes with disposable accounts.

### Public beta
- [ ] Replace placeholder capsule/geometry with licensed, mobile-optimized character and environment assets.
- [ ] Add a proper sign-in, sign-up, recovery, privacy, and account deletion journey.
- [ ] Test on multiple devices and Android versions; profile memory, battery, frame rate, crashes and network loss.
- [ ] Review Supabase RLS/security advisor findings; validate job rewards server-side; add abuse controls, chat moderation and rate limits.
- [ ] Publish privacy policy, terms, support contact, age/content rating and store screenshots.
- [ ] Create Google Play Console account, app signing, application ID, versioning, store listing and internal-testing track.
- [ ] Upload and test an Android App Bundle (AAB) for Play distribution; an APK is for direct testing and is not the normal Play Store release artifact.
- [ ] Complete Google Play's current testing, data-safety and policy requirements before requesting production access.

### iOS
- [ ] A Mac with Xcode and Apple Developer account is required for normal iOS signing and App Store release.
- [ ] Add/build the iOS target, configure bundle ID and signing, test on a real iPhone, then submit through App Store Connect/TestFlight.

## E. What “launch” means

The first milestone is a **private Android test APK**, not a public store launch. Do not advertise it as a finished realistic 3D life simulator until the placeholder visuals have been replaced and the full player journey has been tested. Store submission comes only after the gates above are checked.

## Official references

- Unity Hub: https://unity.com/download
- GameCI GitHub activation: https://game.ci/docs/github/activation
- Google Play Console: https://play.google.com/console/
- Apple Developer: https://developer.apple.com/programs/
