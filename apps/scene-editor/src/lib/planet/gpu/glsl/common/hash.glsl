#pragma glslify: export(hash, hash1)

vec3 hash( vec3 x ) {
  x = vec3( dot(x,vec3(127.1,311.7, 74.7)),
            dot(x,vec3(269.5,183.3,246.1)),
            dot(x,vec3(113.5,271.9,124.6)));
  return fract(sin(x)*43758.5453123);
}

float hash1( float n ) {
    return fract( n*17.0*fract( n*0.3183099 ) );
}
