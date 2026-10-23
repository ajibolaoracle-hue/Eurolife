using System;
using System.IO;
using UnityEngine;

namespace EuroLife
{
    /// <summary>
    /// Local JSON save slots using Application.persistentDataPath.
    /// Saves profile, player position, and rotation; connect to menu buttons later.
    /// </summary>
    public sealed class SaveSystem : MonoBehaviour
    {
        [SerializeField] private CharacterProfileController profileController;
        [SerializeField] private Transform player;
        [SerializeField, Range(1, 3)] private int slot = 1;

        [Serializable]
        private sealed class SaveData
        {
            public CharacterProfile profile;
            public float px, py, pz;
            public float rx, ry, rz, rw;
            public string savedAtUtc;
        }

        public bool Save()
        {
            if (profileController == null) return false;
            SaveData data = new SaveData { profile = profileController.Profile, savedAtUtc = DateTime.UtcNow.ToString("O") };
            if (player != null)
            {
                Vector3 p = player.position; Quaternion r = player.rotation;
                data.px = p.x; data.py = p.y; data.pz = p.z;
                data.rx = r.x; data.ry = r.y; data.rz = r.z; data.rw = r.w;
            }

            try
            {
                string path = GetPath(slot);
                Directory.CreateDirectory(Path.GetDirectoryName(path));
                string temp = path + ".tmp";
                File.WriteAllText(temp, JsonUtility.ToJson(data, true));
                if (File.Exists(path)) File.Delete(path);
                File.Move(temp, path);
                return true;
            }
            catch (Exception e)
            {
                Debug.LogError("EURO LIFE save failed: " + e.Message);
                return false;
            }
        }

        public bool Load()
        {
            if (profileController == null) return false;
            try
            {
                string path = GetPath(slot);
                if (!File.Exists(path)) return false;
                SaveData data = JsonUtility.FromJson<SaveData>(File.ReadAllText(path));
                if (data == null || data.profile == null) return false;
                CharacterProfile target = profileController.Profile;
                target.characterName = data.profile.characterName;
                target.bodyType = data.profile.bodyType;
                target.skinToneIndex = data.profile.skinToneIndex;
                target.hairstyleIndex = data.profile.hairstyleIndex;
                target.outfitIndex = data.profile.outfitIndex;
                target.cash = data.profile.cash;
                target.day = data.profile.day;
                target.energy = data.profile.energy;
                target.hunger = data.profile.hunger;
                if (player != null)
                {
                    player.position = new Vector3(data.px, data.py, data.pz);
                    player.rotation = new Quaternion(data.rx, data.ry, data.rz, data.rw);
                }
                return true;
            }
            catch (Exception e)
            {
                Debug.LogError("EURO LIFE load failed: " + e.Message);
                return false;
            }
        }

        public void SetSlot(int value) => slot = Mathf.Clamp(value, 1, 3);
        private static string GetPath(int value) =>
            Path.Combine(Application.persistentDataPath, "saves", "slot" + value + ".json");
    }
}
