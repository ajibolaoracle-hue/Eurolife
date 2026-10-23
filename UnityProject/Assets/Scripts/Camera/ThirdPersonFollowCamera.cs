using UnityEngine;

namespace EuroLife
{
    /// <summary>Simple smooth follow camera starter; Cinemachine can replace this later.</summary>
    public sealed class ThirdPersonFollowCamera : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private Vector3 offset = new Vector3(0f, 3.2f, -5.2f);
        [SerializeField, Min(0.1f)] private float followSmoothness = 8f;
        [SerializeField, Min(0.1f)] private float lookHeight = 1.4f;

        public void SetTarget(Transform newTarget) => target = newTarget;

        private void LateUpdate()
        {
            if (target == null) return;

            Vector3 desiredPosition = target.TransformPoint(offset);
            transform.position = Vector3.Lerp(
                transform.position, desiredPosition, followSmoothness * Time.deltaTime);

            Vector3 lookPoint = target.position + Vector3.up * lookHeight;
            Quaternion desiredRotation = Quaternion.LookRotation(lookPoint - transform.position);
            transform.rotation = Quaternion.Slerp(
                transform.rotation, desiredRotation, followSmoothness * Time.deltaTime);
        }
    }
}
