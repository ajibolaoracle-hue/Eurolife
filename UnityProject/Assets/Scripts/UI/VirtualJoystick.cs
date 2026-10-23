using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace EuroLife
{
    /// <summary>
    /// Add to a UI object with a background Image and a child handle Image.
    /// Assign the handle, then connect the player controller.
    /// </summary>
    public sealed class VirtualJoystick : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
    {
        [SerializeField] private RectTransform handle;
        [SerializeField] private ThirdPersonPlayerController player;
        [SerializeField, Range(0.2f, 1f)] private float handleRange = 0.65f;
        private RectTransform area;
        private Vector2 input;

        private void Awake()
        {
            area = transform as RectTransform;
            if (handle == null && area != null && area.childCount > 0)
                handle = area.GetChild(0) as RectTransform;
        }

        public void OnPointerDown(PointerEventData eventData) => OnDrag(eventData);

        public void OnDrag(PointerEventData eventData)
        {
            if (area == null) return;
            if (RectTransformUtility.ScreenPointToLocalPointInRectangle(
                area, eventData.position, eventData.pressEventCamera, out Vector2 local))
            {
                Vector2 half = area.rect.size * 0.5f;
                input = new Vector2(
                    half.x > 0 ? local.x / half.x : 0,
                    half.y > 0 ? local.y / half.y : 0);
                input = Vector2.ClampMagnitude(input, 1f);
                if (handle != null) handle.anchoredPosition = input * Mathf.Min(half.x, half.y) * handleRange;
                if (player != null) player.SetMoveInput(input);
            }
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            input = Vector2.zero;
            if (handle != null) handle.anchoredPosition = Vector2.zero;
            if (player != null) player.SetMoveInput(Vector2.zero);
        }

        public void SetPlayer(ThirdPersonPlayerController controller) => player = controller;
    }
}
