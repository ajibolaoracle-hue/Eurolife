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
