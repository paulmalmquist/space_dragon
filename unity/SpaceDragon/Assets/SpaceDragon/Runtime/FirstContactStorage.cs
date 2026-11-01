using System;
using UnityEngine;

namespace SpaceDragon.FirstContact
{
    public interface IContactPreferenceStore
    {
        bool HasKey(string key);
        string Read(string key);
        void Write(string key, string value);
        void Flush();
    }

    public sealed class ContactPlayerPrefsStore : IContactPreferenceStore
    {
        public bool HasKey(string key) => PlayerPrefs.HasKey(key);
        public string Read(string key) => PlayerPrefs.GetString(key, "");
        public void Write(string key, string value) => PlayerPrefs.SetString(key, value);
        public void Flush() => PlayerPrefs.Save();
    }

    /// <summary>This candidate has its own namespace; it never reads or writes Babylon saves.</summary>
    public sealed class FirstContactStorage
    {
        public const string SaveKey = "space-dragon.unity.first-contact.v1";
        private readonly IContactPreferenceStore store;
        private bool writable = true;
        public string Notice { get; private set; } = "Candidate progress saves on this device.";

        public FirstContactStorage(IContactPreferenceStore preferenceStore) { store = preferenceStore; }

        public void ReportPositionRecovery(bool safeSpawnFound)
        {
            Notice = safeSpawnFound
                ? "Saved place was blocked; returned to the safe starting place. Pod progress is retained."
                : "Saved place and starting place are blocked. Pod progress is retained; position recovery is unavailable.";
        }

        public FirstContactCheckpoint Load()
        {
            try
            {
                if (!store.HasKey(SaveKey)) return new FirstContactCheckpoint();
                var checkpoint = JsonUtility.FromJson<FirstContactCheckpoint>(store.Read(SaveKey));
                if (!FirstContactProgress.IsValidCheckpoint(checkpoint))
                {
                    writable = false;
                    Notice = "Existing Unity save is incompatible; it is preserved. This session is temporary.";
                    return new FirstContactCheckpoint();
                }
                return checkpoint;
            }
            catch (Exception)
            {
                writable = false;
                Notice = "Local Unity save is unavailable; this session is temporary.";
                return new FirstContactCheckpoint();
            }
        }

        public bool Save(FirstContactCheckpoint checkpoint)
        {
            if (!writable || !FirstContactProgress.IsValidCheckpoint(checkpoint)) return false;
            try
            {
                store.Write(SaveKey, JsonUtility.ToJson(checkpoint));
                store.Flush();
                Notice = "Unity candidate checkpoint saved.";
                return true;
            }
            catch (Exception)
            {
                Notice = "Progress remains in this session; device storage could not be saved.";
                return false;
            }
        }
    }
}
