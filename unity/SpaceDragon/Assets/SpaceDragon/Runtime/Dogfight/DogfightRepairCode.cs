using UnityEngine.InputSystem;

namespace SpaceDragon.Dogfight
{
    public sealed partial class DogfightEncounter
    {
        RepairCodeState repairCode;
        public RepairCodeState RepairCode => repairCode;
        public RepairCodeMode RepairMode { get; private set; } = RepairCodeMode.Numbers;
        public void SetRepairCodeMode(string value)
        {
            if(!System.Enum.TryParse<RepairCodeMode>(value,true,out var mode))return;
            RepairMode=mode;
            if(Tactics.IsRepairing)repairCode.Start(mode);else repairCode.Cancel();
        }
        public void CycleRepairCodeMode() => SetRepairCodeMode(((RepairCodeMode)(((int)RepairMode+1)%3)).ToString());
        void ReadRepairCode(Keyboard keyboard,bool wasRepairing)
        {
            // A digit selecting Tab's repair cannot answer the new prompt in the same frame.
            if(!wasRepairing||!Tactics.IsRepairing||!repairCode.Active||keyboard==null)return;
            foreach(var key in keyboard.allKeys)
                if(key.wasPressedThisFrame&&key.name.Length==1&&key.name[0]>='0'&&key.name[0]<='9'&&repairCode.PressDigit(key.name[0]-'0'))
                    if(Tactics.ApplyRepairSpeedBonus(tuning.RepairBonusRemainingMultiplier))
                    {sound.PlayRepair();Message("Repair boost — remaining time halved");}
        }
    }
}
