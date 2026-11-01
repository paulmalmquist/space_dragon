Shader "SpaceDragon/Dogfight/Near Orbit Surface"
{
    Properties
    {
        _BaseMap("Cloud deck color", 2D) = "white" {}
        _CloudMap("Upper cloud density", 2D) = "black" {}
        _DetailCloudMap("Periodic billow height and slopes", 2D) = "gray" {}
        _DetailRepeat("Longitude tile repeats", Float) = 48
        _DetailStrength("Local billow slope strength", Range(0,1)) = 0.22
        _HazeColor("Atmospheric blue gray", Color) = (0.17,0.25,0.33,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="Geometry" }
        Pass
        {
            Tags { "LightMode"="UniversalForward" }
            Cull Back ZWrite On ZTest LEqual
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
            TEXTURE2D(_CloudMap); SAMPLER(sampler_CloudMap);
            TEXTURE2D(_DetailCloudMap); SAMPLER(sampler_DetailCloudMap);
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                half4 _HazeColor;
                float _DetailRepeat;
                half _DetailStrength;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; float4 tangentOS : TANGENT; float2 uv : TEXCOORD0; };
            struct Varyings { float4 positionCS : SV_POSITION; float3 positionWS : TEXCOORD0; half3 normalWS : TEXCOORD1; float2 uv : TEXCOORD2; half3 tangentWS : TEXCOORD3; };
            Varyings Vert(Attributes input)
            {
                Varyings output;
                output.positionWS = TransformObjectToWorld(input.positionOS.xyz);
                output.positionCS = TransformWorldToHClip(output.positionWS);
                output.normalWS = TransformObjectToWorldNormal(input.normalOS);
                output.tangentWS = TransformObjectToWorldDir(input.tangentOS.xyz);
                output.uv = TRANSFORM_TEX(input.uv, _BaseMap);
                return output;
            }
            half4 Frag(Varyings input) : SV_Target
            {
                half3 n = normalize(input.normalWS);
                half3 view = normalize(GetWorldSpaceViewDir(input.positionWS));
                Light sun = GetMainLight();
                half ndl = dot(n, sun.direction);
                half daylight = smoothstep(-0.12h, 0.3h, ndl);
                half3 deck = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, input.uv).rgb;
                half upper = SAMPLE_TEXTURE2D(_CloudMap, sampler_CloudMap, input.uv).r;
                half displaced = SAMPLE_TEXTURE2D(_CloudMap, sampler_CloudMap, input.uv + float2(.0025,.0015)).r;
                half4 billow = SAMPLE_TEXTURE2D(_DetailCloudMap, sampler_DetailCloudMap, input.uv * float2(_DetailRepeat, _DetailRepeat * .5));
                float distanceToDeck = length(GetWorldSpaceViewDir(input.positionWS));
                half nearDetail = 1 - smoothstep(4000.0, 15000.0, distanceToDeck);
                // Fade the coordinate singularity at the exact poles rather than stretching it.
                nearDetail *= smoothstep(0.0, .04, input.uv.y) * (1 - smoothstep(.96, 1.0, input.uv.y));
                half3 tangent = normalize(input.tangentWS - n * dot(n, input.tangentWS));
                half3 bitangent = cross(n, tangent);
                half3 billowNormal = normalize(n - (tangent * (billow.g * 2 - 1) + bitangent * (billow.b * 2 - 1)) * (_DetailStrength * nearDetail));
                // Cheap static upper-cloud shading supplies scale without a volume raymarch.
                half shadow = saturate(displaced - upper);
                deck *= 1 - shadow * .38h;
                deck = lerp(deck, half3(.64h,.69h,.72h), upper * .52h);
                deck *= 1 + ((billow.r - .5h) * .16h - billow.a * .06h) * nearDetail * (.35h + upper * .65h);
                half lighting = .035h + saturate(dot(billowNormal, sun.direction) * .7h + .25h) * .8h;
                half3 color = deck * (half3(.11h,.15h,.22h) + sun.color * lighting);
                half limb = pow(1 - saturate(dot(n, view)), 3.0h);
                color = lerp(color, _HazeColor.rgb * (.18h + daylight * .9h), limb * .5h);
                return half4(color, 1);
            }
            ENDHLSL
        }
    }
}
