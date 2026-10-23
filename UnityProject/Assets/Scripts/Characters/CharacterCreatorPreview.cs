using UnityEngine;
using UnityEngine.UI;

namespace EuroLife
{
    /// <summary>Simple runtime placeholder preview. Replace primitive body with licensed rigged models later.</summary>
    public sealed class CharacterCreatorPreview : MonoBehaviour
    {
        [SerializeField] private CharacterProfileController profile;
        [SerializeField] private Renderer bodyRenderer;
        [SerializeField] private Renderer headRenderer;
        [SerializeField] private Renderer outfitRenderer;
        [SerializeField] private Text nameLabel;
        [SerializeField] private Color[] skinTones =
        {
            new Color(.95f,.75f,.60f), new Color(.76f,.52f,.36f), new Color(.53f,.32f,.22f),
            new Color(.36f,.22f,.16f), new Color(.25f,.15f,.11f), new Color(.91f,.68f,.49f)
        };
        [SerializeField] private Color[] outfits =
        {
            new Color(.12f,.20f,.34f), new Color(.20f,.36f,.26f), new Color(.55f,.18f,.16f),
            new Color(.18f,.18f,.20f), new Color(.72f,.62f,.42f), new Color(.35f,.25f,.45f)
        };

        private void Start() { Refresh(); }
        public void Refresh()
        {
            if (profile == null) return;
            CharacterProfile p = profile.Profile;
            Color skin = skinTones[Mathf.Clamp(p.skinToneIndex,0,skinTones.Length-1)];
            Color outfit = outfits[Mathf.Clamp(p.outfitIndex,0,outfits.Length-1)];
            if (bodyRenderer != null) bodyRenderer.material.color = skin;
            if (headRenderer != null) headRenderer.material.color = skin;
            if (outfitRenderer != null) outfitRenderer.material.color = outfit;
            if (nameLabel != null) nameLabel.text = p.characterName;
        }
        public void ChooseSkin(int index) { if(profile==null)return; profile.SetSkinTone(index); Refresh(); }
        public void ChooseOutfit(int index) { if(profile==null)return; profile.SetOutfit(index); Refresh(); }
        public void ChooseBodyType(int index) { if(profile==null)return; profile.SetBodyType(index); Refresh(); }
    }
}