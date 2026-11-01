#ifndef SPACE_DRAGON_NEAR_ORBIT_GEOGRAPHY
#define SPACE_DRAGON_NEAR_ORBIT_GEOGRAPHY
float2 NearOrbitUv(float3 direction)
{
    direction = normalize(direction);
    return float2(frac(atan2(direction.z,direction.x)/6.28318530718),acos(clamp(direction.y,-1.0,1.0))/3.14159265359);
}
float2 NearOrbitWeatherUv(float2 geographyUv)
{
    // Compose the Atlantic weather front over the visible Mediterranean cap.
    // The historic cloud reference was almost clear there. This is an artistic
    // 19.8-degree longitude rotation, shared by clouds and their surface shadows.
    return float2(frac(geographyUv.x-.055),geographyUv.y);
}
half NearOrbitDetailFade(float2 uv,float distanceMetres)
{
    // Fade tile detail before it shimmers at the horizon and at the polar UV
    // singularity. Macro geography is sampled spherically and remains seamless.
    return (1-smoothstep(3500.0,14000.0,distanceMetres))
        *smoothstep(.015,.055,uv.y)*(1-smoothstep(.945,.985,uv.y));
}
half NearOrbitCloudDensity(half broad,half fine,half detailFade)
{
    // Real sheared satellite weather fronts supply structure. Fine noise erodes
    // only their edges; it must not turn the atlas back into repeated blobs.
    half density=saturate(broad+(fine-.5h)*detailFade*.11h);
    return smoothstep(.055h,.73h,density)*.92h;
}
half NearOrbitRegionWeight(float2 uv)
{
    // Regional crop is a high-resolution view of the same globe. Feather to its
    // lower-resolution parent without seams when a camera looks past the cap.
    float2 edge=min(uv,1-uv);
    return smoothstep(0.0,.045,min(edge.x,edge.y));
}
#endif
