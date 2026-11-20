Shader "SpaceDragon/Dogfight/Wing Exhaust"
{
    Properties { [HDR] _Tint("Plasma tint",Color)=(.05,.5,1.7,.48) }
    SubShader
    {
        Tags {"RenderType"="Transparent" "RenderPipeline"="UniversalPipeline" "Queue"="Transparent+15"}
        Pass
        {
            Tags {"LightMode"="SRPDefaultUnlit"}
            Blend SrcAlpha One ZWrite Off Cull Off
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            CBUFFER_START(UnityPerMaterial)
                half4 _Tint;
            CBUFFER_END
            struct Attributes {float4 positionOS:POSITION;float2 uv:TEXCOORD0;};
            struct Varyings {float4 positionCS:SV_POSITION;float2 uv:TEXCOORD0;};
            Varyings Vert(Attributes input){Varyings o;o.positionCS=TransformObjectToHClip(input.positionOS.xyz);o.uv=input.uv;return o;}
            half4 Frag(Varyings input):SV_Target
            {
                half fade=pow(saturate(1-input.uv.y),1.3h);
                return half4(_Tint.rgb,_Tint.a*fade);
            }
            ENDHLSL
        }
    }
}
