using System;
using UnityEngine;

namespace SpaceDragon.TownDrive.Runtime
{
    public interface ITownDrivePreferences { string Read(string key); void Write(string key, string value); void Flush(); }
    public sealed class TownDrivePlayerPreferences : ITownDrivePreferences
    {
        public string Read(string key) => PlayerPrefs.HasKey(key) ? PlayerPrefs.GetString(key) : null;
        public void Write(string key, string value) => PlayerPrefs.SetString(key, value);
        public void Flush() => PlayerPrefs.Save();
    }
    [Serializable] public sealed class TownDriveCheckpointSave
    { public int version; public string routeId, checkpointId; public string[] visited; public bool completed, assist; }

    /// <summary>Checkpoint-only, separate from browser and First Contact saves. Unknown newer data is never overwritten.</summary>
    public sealed class TownDriveSave
    {
        public const string Key = "space-dragon.unity.drive.v1", BackupKey = Key + ".backup";
        public string Status { get; private set; } = "Ready";
        public bool WritesProtected { get; private set; }
        private readonly ITownDrivePreferences store;
        private readonly DriveSimulation simulation;
        private string lastWritten;
        public TownDriveSave(ITownDrivePreferences store, DriveSimulation simulation) { this.store = store; this.simulation = simulation; }
        public bool Valid(TownDriveCheckpointSave save)
        {
            if(save==null||save.version!=1||save.routeId!=simulation.Route.Data.id||save.visited==null||save.visited.Length<1||save.visited.Length>simulation.Route.Data.checkpoints.Length)return false;
            for(int i=0;i<save.visited.Length;i++)if(save.visited[i]!=simulation.Route.Data.checkpoints[i].id)return false;
            return save.completed ? save.visited.Length==simulation.Route.Data.checkpoints.Length&&save.checkpointId=="home" : save.checkpointId==save.visited[save.visited.Length-1];
        }
        private TownDriveCheckpointSave Parse(string json)
        {
            if(string.IsNullOrWhiteSpace(json)||json.Length>16384)return null;
            try{return JsonUtility.FromJson<TownDriveCheckpointSave>(json);}catch(ArgumentException){return null;}
        }
        public DriveState Load()
        {
            var initial=simulation.CreateState();
            try
            {
                string raw=store.Read(Key);var save=Parse(raw);
                if(save!=null&&save.version>1){WritesProtected=true;Status="Newer save kept — this drive is temporary";return initial;}
                if(!Valid(save))
                {
                    var backup=Parse(store.Read(BackupKey));
                    if(backup!=null&&backup.version>1){WritesProtected=true;Status="Newer backup kept — this drive is temporary";return initial;}
                    if(Valid(backup)){save=backup;Status="Recovered previous checkpoint";}
                    else{Status=string.IsNullOrEmpty(raw)?"Ready":"Invalid save kept — starting at home";return initial;}
                }
                else{lastWritten=raw;Status="Checkpoint restored";}
                initial.checkpointId=save.checkpointId;initial.visited=(string[])save.visited.Clone();initial.completed=save.completed;initial.assist=save.assist;
                return simulation.Reset(initial);
            }
            catch(Exception){WritesProtected=true;Status="Storage unavailable — this drive is temporary";return initial;}
        }
        public bool Save(DriveState state)
        {
            if(WritesProtected)return false;
            var save=new TownDriveCheckpointSave{version=1,routeId=simulation.Route.Data.id,checkpointId=state.checkpointId,visited=state.visited,completed=state.completed,assist=state.assist};
            if(!Valid(save))throw new ArgumentException("Cannot save invalid drive progress.",nameof(state));
            string json=JsonUtility.ToJson(save);if(json==lastWritten)return true;
            try
            {
                string previous=store.Read(Key);var existing=Parse(previous);var backup=Parse(store.Read(BackupKey));
                if((existing!=null&&existing.version>1)||(backup!=null&&backup.version>1)){WritesProtected=true;Status="Newer save kept — this drive is temporary";return false;}
                if(Valid(existing)&&previous!=json)store.Write(BackupKey,previous);
                store.Write(Key,json);store.Flush();lastWritten=json;Status="Checkpoint saved";return true;
            }
            catch(Exception){Status="Save unavailable — progress is temporary";return false;}
        }
    }
}
