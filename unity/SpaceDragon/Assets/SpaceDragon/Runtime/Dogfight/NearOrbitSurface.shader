Shader "SpaceDragon/Dogfight/Near Orbit Surface"
{
    Properties
    {
        _BaseMap("Global satellite RGB, land alpha", 2D) = "white" {}
        _RegionMap("Detailed regional satellite RGB, land alpha", 2D) = "white" {}
        _RegionUv("Region UV minimum and size", Vector) = (.433333,.2,.2,.2)
        _TerrainMap("Regional elevation and tangent slopes", 2D) = "gray" {}
        _CloudMap("Satellite cloud density and slopes", 2D) = "black" {}
        _CloudDetailMap("Periodic billow height and slopes", 2D) = "gray" {}
        _CloudRepeat("Local cloud repeats", Float) = 128
        _CloudHeight("Cloud layer height in metres", Float) = 140
        _PlanetRadius("Surface radius in metres", Float) = 26000
        _HazeColor("Atmospheric blue gray", Color) = (0.13,0.23,0.32,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="Geometry" }
        Pass
        {
            Tags { "LightMode"="UniversalForward" }
            Cull Back ZWrite On ZTest LEqual
            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            #include "NearOrbitGeography.hlsl"
            TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
            TEXTURE2D(_RegionMap); SAMPLER(sampler_RegionMap);
            TEXTURE2D(_TerrainMap); SAMPLER(sampler_TerrainMap);
            TEXTURE2D(_CloudMap); SAMPLER(sampler_CloudMap);
            TEXTURE2D(_CloudDetailMap); SAMPLER(sampler_CloudDetailMap);
            CBUFFER_START(UnityPerMaterial)
                half4 _HazeColor;
                float4 _RegionUv;
                float _CloudRepeat, _CloudHeight, _PlanetRadius;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; float4 tangentOS : TANGENT; float2 uv : TEXCOORD0; };
            struct Varyings { float4 positionCS : SV_POSITION; float3 positionWS : TEXCOORD0; half3 normalWS : TEXCOORD1; float2 uv : TEXCOORD2; half3 tangentWS : TEXCOORD3; float3 directionOS : TEXCOORD4; };
            Varyings Vert(Attributes input)
            {
                Varyings output;
                output.positionWS = TransformObjectToWorld(input.positionOS.xyz);
                output.positionCS = TransformWorldToHClip(output.positionWS);
                output.normalWS = TransformObjectToWorldNormal(input.normalOS);
                output.tangentWS = TransformObjectToWorldDir(input.tangentOS.xyz);
                output.directionOS = input.normalOS;
                output.uv = input.uv;
                return output;
            }
            half4 Frag(Varyings input) : SV_Target
            {
                half3 n = normalize(input.normalWS);
                float3 viewVector = GetWorldSpaceViewDir(input.positionWS);
                half3 view = normalize(viewVector);
                half detailFade = NearOrbitDetailFade(input.uv,length(viewVector));
                half3 tangent = normalize(input.tangentWS - n * dot(n,input.tangentWS));
                half3 bitangent = cross(n,tangent);
                float2 regionalUv=(input.uv-_RegionUv.xy)/_RegionUv.zw;
                half regionWeight=NearOrbitRegionWeight(regionalUv);
                half4 globalColor=SAMPLE_TEXTURE2D(_BaseMap,sampler_BaseMap,input.uv);
                half4 regionalColor=SAMPLE_TEXTURE2D(_RegionMap,sampler_RegionMap,regionalUv);
                half4 terrain=SAMPLE_TEXTURE2D(_TerrainMap,sampler_TerrainMap,regionalUv);
                half4 satellite=lerp(globalColor,regionalColor,regionWeight);
                half land=satellite.a;
                // The normal field now follows measured macro terrain; remove the
                // repeated cellular fold tile that dominated the former close view.
                half2 slopes=(terrain.gb*2-1)*land*regionWeight;
                half3 reliefNormal = normalize(n - tangent*slopes.x - bitangent*slopes.y);
                Light sun = GetMainLight();
                half ndl = dot(n,sun.direction);
                half daylight = smoothstep(-.12h,.3h,ndl);
                half3 baseColor=lerp(half3(.008h,.025h,.045h),satellite.rgb,land);

                // Project the light ray up to the independent cloud layer. This
                // bounded local tangent approximation needs two map reads, no
                // global shadow cascade or volumetric loop for distant scenery.
                float3 sunOS = TransformWorldToObjectDir(sun.direction);
                float3 cloudDirection = normalize(input.directionOS + sunOS*(_CloudHeight/_PlanetRadius/max(.25,ndl)));
                float2 cloudUv = NearOrbitWeatherUv(NearOrbitUv(cloudDirection));
                // Preserve local derivatives across atan2's longitude wrap; a
                // 1-to-0 UV jump must not select a blurry mip stripe at the seam.
                float2 shadowDx=ddx(input.uv),shadowDy=ddy(input.uv),cloudTiles=float2(_CloudRepeat,_CloudRepeat*.5);
                half cloudBroad = SAMPLE_TEXTURE2D_GRAD(_CloudMap,sampler_CloudMap,cloudUv,shadowDx,shadowDy).r;
                half cloudFine = SAMPLE_TEXTURE2D_GRAD(_CloudDetailMap,sampler_CloudDetailMap,cloudUv*cloudTiles,shadowDx*cloudTiles,shadowDy*cloudTiles).r;
                half cloudShadow = NearOrbitCloudDensity(cloudBroad,cloudFine,detailFade)*daylight;
                half3 diffuse = half3(.035h,.05h,.065h) + sun.color*(.035h+.62h*saturate(dot(reliefNormal,sun.direction)));
                half3 color = baseColor*diffuse*(1-cloudShadow*.48h);
                half3 halfway = normalize(view+sun.direction);
                half fresnel = .025h+.16h*pow(1-saturate(dot(reliefNormal,view)),5);
                half glint = pow(saturate(dot(reliefNormal,halfway)),110.0h);
                color += sun.color*glint*fresnel*(1-land)*daylight*(1-cloudShadow*.85h);
                // A quiet reflected sky gradient makes water read as a surface,
                // instead of a constant navy cutout behind the photographic coast.
                half oceanView=pow(1-saturate(dot(n,view)),3);
                color += half3(.006h,.018h,.03h)*oceanView*(1-land)*daylight*(1-cloudShadow*.5h);
                half limb = pow(1-saturate(dot(n,view)),4);
                half aerial=1-exp2(-length(viewVector)*.00024);
                color = lerp(color,_HazeColor.rgb*(.15h+daylight*.8h),max(limb*.3h,aerial*.75h));
                return half4(color,1);
            }
            ENDHLSL
        }
    }
}
