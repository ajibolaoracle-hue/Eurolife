using UnityEngine;

namespace EuroLife
{
    /// <summary>Smooth follow camera with mobile orbit support.</summary>
    public sealed class ThirdPersonFollowCamera : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private Vector3 offset = new Vector3(0f, 3.2f, -5.2f);
        [SerializeField, Min(0.1f)] private float followSmoothness = 8f;
        [SerializeField, Min(0.1f)] private float lookHeight = 1.4f;
        [SerializeField] private bool orbitEnabled = true;
        private float orbitYaw;
        private float orbitPitch = 12f;

        public void SetTarget(Transform newTarget) => target = newTarget;

        public void SetOrbit(float pitch, float yaw)
        {
            if (!orbitEnabled) return;
            orbitPitch = Mathf.Clamp(pitch, -12f, 30f);
            orbitYaw = yaw;
        }

        private void LateUpdate()
        {
            if (target == null) return;
            Quaternion orbit = Quaternion.Euler(orbitPitch, orbitYaw, 0f);
            Vector3 desiredPosition = target.position + orbit * offset;
            transform.position = Vector3.Lerp(
                transform.position, desiredPosition, followSmoothness * Time.deltaTime);

            Vector3 lookPoint = target.position + Vector3.up * lookHeight;
            Quaternion desiredRotation = Quaternion.LookRotation(lookPoint - transform.position);
            transform.rotation = Quaternion.Slerp(
                transform.rotation, desiredRotation, followSmoothness * Time.deltaTime);
        }
    }
}
