using System;
using System.IO;
using System.Text;
using System.Runtime.Serialization.Json;
using UnityEngine;

namespace SpaceDragon.TownDrive.UnityRuntime
{
    /// <summary>Read-only bridge from Unity's serializer to the engine-independent drive model.</summary>
    public static class TownDriveJson
    {
        // Unity's native JsonUtility parser can move a decimal double one ULP.
        // At an exact polyline knot that changes its outgoing segment and lane.
        // The managed BCL parser preserves the same IEEE-754 value as the TS export.
        public static T Read<T>(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) throw new ArgumentException("Town Drive JSON is empty.", nameof(json));
            using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(json)))
                return (T)new DataContractJsonSerializer(typeof(T)).ReadObject(stream);
        }
        // The eventual Town Drive scene explicitly references its own data asset.
        // Keeping data outside Resources avoids adding it to unrelated player builds.
        public static TownDriveData Load(TextAsset asset)
        {
            if (asset == null) throw new ArgumentNullException(nameof(asset));
            return Parse(asset.text);
        }

        public static TownDriveData Parse(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) throw new ArgumentException("Town Drive route JSON is empty.", nameof(json));
            var data = Read<TownDriveData>(json);
            if (data == null || data.schemaVersion != 1 || data.routeId != "town-drive-v1" ||
                data.route == null || data.route.id != data.routeId || data.config == null || !data.config.IsValid() ||
                data.sourceFingerprint == null || data.sourceFingerprint.Length != 64 || data.closureObstacles == null)
                throw new ArgumentException("Unsupported or incomplete Town Drive route data.", nameof(json));
            _ = new DriveRoute(data.route);
            return data;
        }
    }
}
