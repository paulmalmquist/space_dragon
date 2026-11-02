Shader "SpaceDragon/Dogfight/Weapon Energy"
{
    Properties
    {
        _NoiseTex("Periodic energy breakup",2D)="white"{}
        _Tint("Energy tint",Color)=(1,.3,.04,1)
        _Phase("Simulation phase",Float)=0
        _Flame("Fire breakup",Float)=1
    }
    SubShader
    {
        Tags {"RenderPipeline"="UniversalPipeline" "Queue"="Transparent+5" "RenderType"="Transparent"}
        Pass
        {
            Blend SrcAlpha One
            Cull Off ZWrite Off ZTest LEqual
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            TEXTURE2D(_NoiseTex); SAMPLER(sampler_NoiseTex);
            CBUFFER_START(UnityPerMaterial)
                half4 _Tint;
                float _Phase,_Flame;
            CBUFFER_END
            struct A {float4 vertex:POSITION;float2 uv:TEXCOORD0;};
            struct V {float4 position:SV_POSITION;float2 uv:TEXCOORD0;};
            V Vert(A i) {V o;o.position=TransformObjectToHClip(i.vertex.xyz);o.uv=i.uv;return o;}
            half4 Frag(V i):SV_Target
            {
                half n=SAMPLE_TEXTURE2D(_NoiseTex,sampler_NoiseTex,i.uv*float2(7,2)+float2(-_Phase*2.4,_Phase*.19)).r;
                half fine=SAMPLE_TEXTURE2D(_NoiseTex,sampler_NoiseTex,i.uv*float2(19,4)+float2(-_Phase*4.2,.37)).g;
                half edge=1-abs(i.uv.y*2-1);
                half density=smoothstep(.04h,.75h,edge+_Flame*(n-.5h)*.65h);
                half breakup=lerp(1.0h,.38h+n*.56h+fine*.35h,_Flame);
                half heat=saturate(edge*.65h+n*.35h);
                half3 color=lerp(_Tint.rgb*.65h,_Tint.rgb,heat);
                return half4(color,density*breakup*_Tint.a);
            }
            ENDHLSL
        }
    }
}
