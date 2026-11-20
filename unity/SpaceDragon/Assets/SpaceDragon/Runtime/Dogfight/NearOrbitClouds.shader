Shader "SpaceDragon/Dogfight/Near Orbit Clouds"
{
    Properties
    {
        _CloudMap("Satellite density and tangent slopes", 2D) = "black" {}
        _CloudDetailMap("Periodic billow height and slopes", 2D) = "gray" {}
        _CloudRepeat("Local cloud repeats", Float) = 128
        _HazeColor("Atmospheric blue gray", Color) = (0.13,0.23,0.32,1)
    }
    SubShader
    {
        Tags { "RenderType"="Transparent" "RenderPipeline"="UniversalPipeline" "Queue"="Transparent-20" }
        Pass
        {
            Tags { "LightMode"="UniversalForward" }
            Blend SrcAlpha OneMinusSrcAlpha
            Cull Back ZWrite Off ZTest LEqual
            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            #include "NearOrbitGeography.hlsl"
            TEXTURE2D(_CloudMap); SAMPLER(sampler_CloudMap);
            TEXTURE2D(_CloudDetailMap); SAMPLER(sampler_CloudDetailMap);
            CBUFFER_START(UnityPerMaterial)
                half4 _HazeColor;
                float _CloudRepeat;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; float4 tangentOS : TANGENT; float2 uv : TEXCOORD0; };
            struct Varyings { float4 positionCS : SV_POSITION; float3 positionWS : TEXCOORD0; half3 normalWS : TEXCOORD1; half3 tangentWS : TEXCOORD2; float2 uv : TEXCOORD3; };
            Varyings Vert(Attributes input)
            {
                Varyings output;
                output.positionWS=TransformObjectToWorld(input.positionOS.xyz);
                output.positionCS=TransformWorldToHClip(output.positionWS);
                output.normalWS=TransformObjectToWorldNormal(input.normalOS);
                output.tangentWS=TransformObjectToWorldDir(input.tangentOS.xyz);
                output.uv=input.uv;
                return output;
            }
            half4 Frag(Varyings input) : SV_Target
            {
                half3 n=normalize(input.normalWS);
                float3 viewVector=GetWorldSpaceViewDir(input.positionWS);
                half3 view=normalize(viewVector);
                half detailFade=NearOrbitDetailFade(input.uv,length(viewVector));
                float2 weatherUv=NearOrbitWeatherUv(input.uv);
                // Explicit derivatives avoid a mip stripe at the rotated UV seam.
                half3 weather=SAMPLE_TEXTURE2D_GRAD(_CloudMap,sampler_CloudMap,weatherUv,ddx(input.uv),ddy(input.uv)).rgb;
                half broad=weather.r;
                float2 tiles=float2(_CloudRepeat,_CloudRepeat*.5);
                half4 billow=SAMPLE_TEXTURE2D_GRAD(_CloudDetailMap,sampler_CloudDetailMap,weatherUv*tiles,ddx(input.uv)*tiles,ddy(input.uv)*tiles);
                half alpha=NearOrbitCloudDensity(broad,billow.r,detailFade);
                half3 tangent=normalize(input.tangentWS-n*dot(n,input.tangentWS));
                half3 bitangent=cross(n,tangent);
                half2 slopes=(weather.gb*2-1)+(billow.gb*2-1)*.22h*detailFade;
                half3 cloudNormal=normalize(n-tangent*slopes.x-bitangent*slopes.y);
                Light sun=GetMainLight();
                half day=smoothstep(-.12h,.3h,dot(n,sun.direction));
                half3 lighting=half3(.13h,.17h,.22h)+sun.color*(.045h+.47h*saturate(dot(cloudNormal,sun.direction)));
                half lobes=smoothstep(.28h,.64h,billow.r);
                half billowShade=lerp(1.0h,lerp(.88h,1.0h,lobes),detailFade);
                half depthShade=billowShade*lerp(.72h,1.0h,smoothstep(.1h,.7h,broad));
                half3 color=half3(.72h,.75h,.78h)*lighting*depthShade;
                half limb=pow(1-saturate(dot(n,view)),4);
                half aerial=1-exp2(-length(viewVector)*.00022);
                color=lerp(color,_HazeColor.rgb*(.2h+day*.85h),max(limb*.45h,aerial*.6h));
                return half4(color,alpha);
            }
            ENDHLSL
        }
    }
}
