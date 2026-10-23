using System;
using UnityEngine;

namespace EuroLife
{
    public enum CharacterBodyType { Masculine, Feminine }

    [Serializable]
    public sealed class CharacterProfile
    {
        public string characterName = "Alex";
        public CharacterBodyType bodyType = CharacterBodyType.Masculine;
        [Range(0, 5)] public int skinToneIndex;
        [Range(0, 7)] public int hairstyleIndex;
        [Range(0, 5)] public int outfitIndex;
        public int cash = 1200;
        public int day = 1;
        public float energy = 100f;
        public float hunger = 100f;
    }

    /// <summary>Attach to a scene object and connect the UI creator controls later.</summary>
    public sealed class CharacterProfileController : MonoBehaviour
    {
        [SerializeField] private CharacterProfile profile = new CharacterProfile();
        public CharacterProfile Profile => profile;

        public void SetName(string value)
        {
            if (!string.IsNullOrWhiteSpace(value))
                profile.characterName = value.Trim().Substring(0, Mathf.Min(24, value.Trim().Length));
        }

        public void SetBodyType(int value) =>
            profile.bodyType = (CharacterBodyType)Mathf.Clamp(value, 0, 1);

        public void SetSkinTone(int value) => profile.skinToneIndex = Mathf.Clamp(value, 0, 5);
        public void SetHairstyle(int value) => profile.hairstyleIndex = Mathf.Clamp(value, 0, 7);
        public void SetOutfit(int value) => profile.outfitIndex = Mathf.Clamp(value, 0, 5);

        public void ApplyNeeds(float energy, float hunger)
        {
            profile.energy = Mathf.Clamp(energy, 0f, 100f);
            profile.hunger = Mathf.Clamp(hunger, 0f, 100f);
        }

        public void ApplyWallet(int cash, int day)
        {
            profile.cash = Mathf.Max(0, cash);
            profile.day = Mathf.Max(1, day);
        }
    }
}
