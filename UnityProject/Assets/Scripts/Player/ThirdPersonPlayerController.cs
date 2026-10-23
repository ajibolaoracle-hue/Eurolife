using UnityEngine;

namespace EuroLife
{
    /// <summary>
    /// Starter third-person controller with keyboard fallback and a touch-input API.
    /// Add a CharacterController to the same GameObject.
    /// A UI joystick can call SetMoveInput(Vector2) as its value changes.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public sealed class ThirdPersonPlayerController : MonoBehaviour
    {
        [SerializeField] private Transform cameraTransform;
        [SerializeField, Min(0.1f)] private float moveSpeed = 4.2f;
        [SerializeField, Min(0.1f)] private float rotationSpeed = 12f;
        [SerializeField] private float gravity = -20f;

        private CharacterController controller;
        private Vector2 touchMoveInput;
        private float verticalVelocity;

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
            if (Camera.main != null && cameraTransform == null)
                cameraTransform = Camera.main.transform;
        }

        /// <summary>Connect a mobile joystick's normalized X/Y values here.</summary>
        public void SetMoveInput(Vector2 input)
        {
            touchMoveInput = Vector2.ClampMagnitude(input, 1f);
        }

        private void Update()
        {
            Vector2 keyboard = new Vector2(
                Input.GetAxisRaw("Horizontal"),
                Input.GetAxisRaw("Vertical"));

            // Keyboard is convenient in the Editor; touch input takes priority on device.
            Vector2 input = touchMoveInput.sqrMagnitude > 0.001f ? touchMoveInput : keyboard;
            Vector3 forward = Vector3.forward;
            Vector3 right = Vector3.right;

            if (cameraTransform != null)
            {
                forward = Vector3.ProjectOnPlane(cameraTransform.forward, Vector3.up).normalized;
                right = Vector3.ProjectOnPlane(cameraTransform.right, Vector3.up).normalized;
            }

            Vector3 direction = Vector3.ClampMagnitude(forward * input.y + right * input.x, 1f);
            if (direction.sqrMagnitude > 0.001f)
            {
                Quaternion targetRotation = Quaternion.LookRotation(direction, Vector3.up);
                transform.rotation = Quaternion.Slerp(
                    transform.rotation, targetRotation, rotationSpeed * Time.deltaTime);
            }

            if (controller.isGrounded && verticalVelocity < 0f)
                verticalVelocity = -2f;
            verticalVelocity += gravity * Time.deltaTime;

            Vector3 velocity = direction * moveSpeed;
            velocity.y = verticalVelocity;
            controller.Move(velocity * Time.deltaTime);
        }
    }
}
