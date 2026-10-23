using UnityEngine;

namespace EuroLife
{
    /// <summary>
    /// Optional convenience bootstrap for quick smoke testing.
    /// Add to an empty GameObject in the ParisPrototype scene.
    /// Builds the street and a capsule player when none is assigned.
    /// </summary>
    public sealed class PrototypeBootstrap : MonoBehaviour
    {
        [SerializeField] private bool createPlayerIfMissing = true;
        [SerializeField] private bool createCameraIfMissing = true;

        private void Start()
        {
            if (FindObjectOfType<ParisPrototypeBuilder>() == null)
            {
                gameObject.AddComponent<ParisPrototypeBuilder>();
            }

            GameObject player = GameObject.Find("Player");
            if (player == null && createPlayerIfMissing)
            {
                player = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                player.name = "Player";
                player.transform.position = new Vector3(0, 1.2f, -20f);
                Collider collider = player.GetComponent<Collider>();
                if (collider != null) Destroy(collider);
                var cc = player.AddComponent<CharacterController>();
                cc.height = 1.8f;
                cc.radius = 0.35f;
                player.AddComponent<ThirdPersonPlayerController>();
            }

            Camera camera = Camera.main;
            if (camera == null && createCameraIfMissing)
            {
                GameObject cameraObject = new GameObject("Main Camera");
                cameraObject.tag = "MainCamera";
                camera = cameraObject.AddComponent<Camera>();
                cameraObject.AddComponent<AudioListener>();
            }

            if (camera != null && player != null)
            {
                ThirdPersonFollowCamera follow = camera.GetComponent<ThirdPersonFollowCamera>();
                if (follow == null) follow = camera.gameObject.AddComponent<ThirdPersonFollowCamera>();
                follow.SetTarget(player.transform);
                camera.transform.position = player.transform.position + new Vector3(0, 3, -5);
            }

            if (FindObjectOfType<Light>() == null)
            {
                var lightObject = new GameObject("Sun");
                var light = lightObject.AddComponent<Light>();
                light.type = LightType.Directional;
                light.intensity = 1.2f;
                lightObject.transform.rotation = Quaternion.Euler(45f, -30f, 0f);
            }
        }
    }
}
