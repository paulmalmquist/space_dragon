Shader "SpaceDragon/Dogfight/Near Orbit Atmosphere"
{
    Properties
    {
        _AtmosphereColor("Scattering tint", Color) = (0.17,0.27,0.38,1)
        _PlanetRadius("Opaque radius in metres", Float) = 26000
        _AtmosphereRadius("Outer radius in metres", Float) = 26208
        _Density("Scattering strength", Range(0,2)) = 0.45
    }
    SubShader
    {
        Tags { "RenderType"="Transparent" "RenderPipeline"="UniversalPipeline" "Queue"="Transparent-10" }
        Pass
        {
            Tags { "LightMode"="UniversalForward" }
            Blend SrcAlpha One
            Cull Back ZWrite Off ZTest LEqual
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            CBUFFER_START(UnityPerMaterial)
                half4 _AtmosphereColor;
                float _PlanetRadius;
                float _AtmosphereRadius;
                half _Density;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; };
            struct Varyings { float4 positionCS : SV_POSITION; float3 positionWS : TEXCOORD0; float3 centerWS : TEXCOORD1; half3 normalWS : TEXCOORD2; };
            Varyings Vert(Attributes input)
            {
                Varyings output;
                output.positionWS = TransformObjectToWorld(input.positionOS.xyz);
                output.positionCS = TransformWorldToHClip(output.positionWS);
                output.centerWS = TransformObjectToWorld(float3(0,0,0));
                output.normalWS = TransformObjectToWorldNormal(input.normalOS);
                return output;
            }
            half4 Frag(Varyings input) : SV_Target
            {
                // Analytic shell chord, no sampling loop. Density tends to zero at the
                // outer tangent, avoiding the hard neon outline of a simple Fresnel shell.
                float3 offset = _WorldSpaceCameraPos - input.centerWS;
                float3 ray = normalize(input.positionWS - _WorldSpaceCameraPos);
                float along = dot(offset, ray);
                float impact2 = max(0, dot(offset, offset) - along * along);
                float outerChord = sqrt(max(0, _AtmosphereRadius * _AtmosphereRadius - impact2));
                float innerChord = sqrt(max(0, _PlanetRadius * _PlanetRadius - impact2));
                float tangent = sqrt(max(1, _AtmosphereRadius * _AtmosphereRadius - _PlanetRadius * _PlanetRadius));
                half depth = saturate((outerChord - innerChord) / tangent);
                Light sun = GetMainLight();
                half day = smoothstep(-.2h, .35h, dot(normalize(input.normalWS), sun.direction));
                half3 tint = lerp(_AtmosphereColor.rgb * .12h, _AtmosphereColor.rgb, day);
                return half4(tint, depth * _Density);
            }
            ENDHLSL
        }
    }
}
