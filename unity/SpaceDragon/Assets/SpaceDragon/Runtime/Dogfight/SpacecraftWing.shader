Shader "SpaceDragon/Dogfight/Spacecraft Wing"
{
    Properties
    {
        _BaseMap("Original wing surface detail",2D)="white"{}
        _NormalMap("Original RGB tangent normal",2D)="bump"{}
        _MaskMap("Original occlusion and roughness",2D)="white"{}
        _EmissionMap("Original restrained emissive detail",2D)="black"{}
        _PlateColor("Metal alloy",Color)=(.26,.30,.34,1)
        _Metallic("Metallic",Range(0,1))=.88
        _Smoothness("Smoothness",Range(0,1))=.65
        _NormalStrength("Normal strength",Range(0,2))=.65
        [HideInInspector] _Cull("Cull",Float)=0
    }
    SubShader
    {
        Tags {"RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="Geometry"}
        Pass
        {
            Name "ForwardLit"
            Tags {"LightMode"="UniversalForward"}
            Cull Off ZWrite On
            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile_fragment _ _SHADOWS_SOFT
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            TEXTURE2D(_BaseMap);SAMPLER(sampler_BaseMap);
            TEXTURE2D(_NormalMap);SAMPLER(sampler_NormalMap);
            TEXTURE2D(_MaskMap);SAMPLER(sampler_MaskMap);
            TEXTURE2D(_EmissionMap);SAMPLER(sampler_EmissionMap);
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST,_NormalMap_ST,_MaskMap_ST,_EmissionMap_ST;
                half4 _PlateColor;
                half _Metallic,_Smoothness,_NormalStrength,_Cull;
            CBUFFER_END
            struct Attributes {float4 positionOS:POSITION;float3 normalOS:NORMAL;float4 tangentOS:TANGENT;float2 uv:TEXCOORD0;};
            struct Varyings {float4 positionCS:SV_POSITION;float3 positionWS:TEXCOORD0;half3 normalWS:TEXCOORD1;half4 tangentWS:TEXCOORD2;float2 uv:TEXCOORD3;};
            Varyings Vert(Attributes input)
            {
                Varyings output;VertexNormalInputs normals=GetVertexNormalInputs(input.normalOS,input.tangentOS);
                output.positionWS=TransformObjectToWorld(input.positionOS.xyz);output.positionCS=TransformWorldToHClip(output.positionWS);
                output.normalWS=normals.normalWS;output.tangentWS=half4(normals.tangentWS,input.tangentOS.w*GetOddNegativeScale());output.uv=input.uv;return output;
            }
            half4 Frag(Varyings input,FRONT_FACE_TYPE face:FRONT_FACE_SEMANTIC):SV_Target
            {
                half3 original=SAMPLE_TEXTURE2D(_BaseMap,sampler_BaseMap,TRANSFORM_TEX(input.uv,_BaseMap)).rgb;
                half3 normalTS=SAMPLE_TEXTURE2D(_NormalMap,sampler_NormalMap,TRANSFORM_TEX(input.uv,_NormalMap)).rgb*2-1;
                // glTF normals are RGB, not Unity's AG/DXT5nm encoding.
                normalTS.xy*=_NormalStrength;normalTS=normalize(normalTS);
                half4 mask=SAMPLE_TEXTURE2D(_MaskMap,sampler_MaskMap,TRANSFORM_TEX(input.uv,_MaskMap));
                half faceSign=IS_FRONT_VFACE(face,1.0h,-1.0h);
                half3 n=normalize(input.normalWS)*faceSign,t=normalize(input.tangentWS.xyz);
                half3 b=cross(n,t)*input.tangentWS.w;
                half3 normal=normalize(t*normalTS.x+b*normalTS.y+n*normalTS.z);
                half luminance=dot(original,half3(.2126h,.7152h,.0722h));
                // Retain authored wear/veins as embossed alloy relief, remove the
                // broad brown membrane tint and use restrained directional sheen.
                half detail=saturate(luminance*2.4h);
                half brush=sin(input.uv.y*640)*.025h*saturate(1-length(fwidth(input.uv))*600);
                SurfaceData surface=(SurfaceData)0;
                surface.albedo=_PlateColor.rgb*lerp(.62h,1.22h,detail);
                surface.metallic=_Metallic;surface.smoothness=clamp(_Smoothness+(1-mask.g)*.12h+brush,.25h,.82h);
                surface.normalTS=normalTS;surface.occlusion=lerp(.65h,1.0h,mask.r);surface.alpha=1;
                surface.emission=SAMPLE_TEXTURE2D(_EmissionMap,sampler_EmissionMap,TRANSFORM_TEX(input.uv,_EmissionMap)).rgb*.15h;
                InputData lighting=(InputData)0;
                lighting.positionWS=input.positionWS;lighting.normalWS=normal;lighting.viewDirectionWS=GetWorldSpaceNormalizeViewDir(input.positionWS);
                lighting.shadowCoord=TransformWorldToShadowCoord(input.positionWS);lighting.bakedGI=SampleSH(normal);
                lighting.vertexLighting=VertexLighting(input.positionWS,normal);
                lighting.normalizedScreenSpaceUV=GetNormalizedScreenSpaceUV(input.positionCS);lighting.shadowMask=half4(1,1,1,1);
                return UniversalFragmentPBR(lighting,surface);
            }
            ENDHLSL
        }
        UsePass "Universal Render Pipeline/Lit/ShadowCaster"
        UsePass "Universal Render Pipeline/Lit/DepthOnly"
    }
}
