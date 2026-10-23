using UnityEngine;
using UnityEngine.EventSystems;

namespace EuroLife
{
    /// <summary>
    /// Put on a transparent UI panel covering the right half of the screen.
    /// Do not overlap the joystick area. Assign the follow camera and player.
    /// </summary>
    public sealed class MobileCameraSwipe : MonoBehaviour, IPointerDownHandler, IDragHandler
    {
        [SerializeField] private Transform target;
        [SerializeField] private float sensitivity = 0.18f;
        [SerializeField] private float minPitch = -12f;
        [SerializeField] private float maxPitch = 30f;
        private float yaw;
        private float pitch = 12f;
        private Vector2 lastPointer;

        public void SetTarget(Transform value) => target = value;

        public void OnPointerDown(PointerEventData eventData)
        {
            lastPointer = eventData.position;
            if (target != null) yaw = target.eulerAngles.y;
        }

        public void OnDrag(PointerEventData eventData)
        {
            Vector2 delta = eventData.position - lastPointer;
            lastPointer = eventData.position;
            yaw += delta.x * sensitivity;
            pitch = Mathf.Clamp(pitch - delta.y * sensitivity, minPitch, maxPitch);
            if (target != null)
            {
                target.rotation = Quaternion.Euler(0f, yaw, 0f);
                ThirdPersonFollowCamera follow = Camera.main != null
                    ? Camera.main.GetComponent<ThirdPersonFollowCamera>() : null;
                if (follow != null) follow.SetOrbit(pitch, yaw);
            }
        }
    }
}
