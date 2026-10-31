using System;
using UnityEngine;

namespace SpaceDragon.TownDrive.Runtime
{
    public struct TownDriveCameraFrame
    {
        public Vector3 position;
        public Quaternion rotation;
        public float fieldOfView;
        public static readonly Vector3 DriverEye = new Vector3(-.46f,1.42f,.42f);
        public static TownDriveCameraFrame At(DrivePose pose,bool cabin,double lookYaw,double framedSpeed)
        {
            var origin=new Vector3((float)pose.x,0,(float)pose.z);
            var heading=Quaternion.Euler(0,(float)(pose.yaw*Mathf.Rad2Deg),0);
            var looking=heading*Quaternion.Euler(0,(float)(lookYaw*Mathf.Rad2Deg),0);
            if(cabin)return new TownDriveCameraFrame{position=origin+heading*DriverEye,rotation=looking,fieldOfView=64.17f};
            var position=origin+looking*new Vector3(0,3.55f,(float)(-8.2-framedSpeed*1.4));
            return new TownDriveCameraFrame{position=position,rotation=Quaternion.LookRotation(origin+heading*new Vector3(0,1.05f,2.3f)-position,Vector3.up),fieldOfView=(float)((.88+framedSpeed*.08)*Mathf.Rad2Deg)};
        }
    }
}
