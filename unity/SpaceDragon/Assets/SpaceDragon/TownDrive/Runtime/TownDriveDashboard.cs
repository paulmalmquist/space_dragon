using System;
using UnityEngine;

namespace SpaceDragon.TownDrive.Runtime
{
    /// <summary>Replaces only the baked central speed digits; the source dial and labels remain intact.</summary>
    public sealed class TownDriveDashboard : IDisposable
    {
        public readonly GameObject Root;
        public int Mph {get;private set;}=-1;
        private readonly Texture2D texture;
        private readonly Material material;
        private readonly Mesh mesh;
        private readonly Color32[] pixels=new Color32[128*72];
        private static readonly int[] Digits={63,6,91,79,102,109,125,7,127,111};
        private static readonly Color32 Background=new Color32(12,18,25,255),Foreground=new Color32(239,248,255,255);
        private TownDriveDashboard(Transform car,Material source)
        {
            Root=new GameObject("drive.car.live-speed");Root.transform.SetParent(car,false);Root.transform.localPosition=new Vector3(-.46f,1.171f,1.069f);
            mesh=new Mesh{name="TownDrive dashboard digits"};mesh.vertices=new[]{new Vector3(-.062f,-.031f,0),new Vector3(.062f,-.031f,0),new Vector3(.062f,.031f,0),new Vector3(-.062f,.031f,0)};
            mesh.uv=new[]{Vector2.zero,Vector2.right,Vector2.one,Vector2.up};mesh.triangles=new[]{0,2,1,0,3,2};mesh.RecalculateNormals();mesh.RecalculateBounds();
            Root.AddComponent<MeshFilter>().sharedMesh=mesh;
            material=new Material(source){name="drive.car.live-speed-material"};
            texture=new Texture2D(128,72,TextureFormat.RGBA32,false){name="TownDrive live speed",filterMode=FilterMode.Bilinear,wrapMode=TextureWrapMode.Clamp};
            foreach(string property in new[]{"_BaseMap","_MainTex","baseColorTexture"})if(material.HasProperty(property)){material.SetTexture(property,texture);material.SetTextureScale(property,Vector2.one);material.SetTextureOffset(property,Vector2.zero);}
            foreach(string property in new[]{"_BaseColor","_Color","baseColorFactor"})if(material.HasProperty(property))material.SetColor(property,Color.white);
            var renderer=Root.AddComponent<MeshRenderer>();renderer.sharedMaterial=material;renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;renderer.receiveShadows=false;Update(0);
        }
        public static TownDriveDashboard Create(Transform car)
        {
            foreach(var renderer in car.GetComponentsInChildren<Renderer>(true))foreach(var material in renderer.sharedMaterials)
                if(material!=null&&material.name.IndexOf("digital-instruments",StringComparison.Ordinal)>=0)return new TownDriveDashboard(car,material);
            return null;
        }
        private void Rect(int x,int y,int width,int height)
        {for(int py=y;py<y+height;py++)for(int px=x;px<x+width;px++)pixels[py*128+px]=Foreground;}
        private void DrawDigit(int digit,int x)
        {
            int bits=Digits[digit],y=14;
            if((bits&1)!=0)Rect(x+4,y+40,16,4);
            if((bits&2)!=0)Rect(x+20,y+23,4,17);
            if((bits&4)!=0)Rect(x+20,y+4,4,17);
            if((bits&8)!=0)Rect(x+4,y,16,4);
            if((bits&16)!=0)Rect(x,y+4,4,17);
            if((bits&32)!=0)Rect(x,y+23,4,17);
            if((bits&64)!=0)Rect(x+4,y+20,16,4);
        }
        public void Update(double metresPerSecond)
        {
            int mph=(int)Math.Round(Math.Abs(metresPerSecond)*2.236936);mph=Math.Max(0,Math.Min(99,mph));if(mph==Mph)return;Mph=mph;
            for(int i=0;i<pixels.Length;i++)pixels[i]=Background;
            if(mph<10)DrawDigit(mph,52);else{DrawDigit(mph/10,36);DrawDigit(mph%10,68);}
            texture.SetPixels32(pixels);texture.Apply(false,false);
        }
        public void Dispose(){UnityEngine.Object.Destroy(Root);UnityEngine.Object.Destroy(texture);UnityEngine.Object.Destroy(material);UnityEngine.Object.Destroy(mesh);}
    }
}
