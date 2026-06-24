// Transparent sea-level shells drawn after terrain into the shared scene depth buffer.
#include "../planet/eclipse.wgsl"

struct Uniforms {
	viewProj : mat4x4<f32>,
	lightPos : vec4<f32>,
	lightColor : vec4<f32>,
	ambient : vec4<f32>,
	waterGloss : f32,
	exposure : f32,
	waterOpacity : f32,
	waterDebug : u32,
	viewport : vec2<f32>,
	time : f32,
	waveStrength : f32,
	glintStrength : f32,
	absorptionStrength : f32,
	_pad0 : vec2<u32>,
};

@group(0) @binding(0) var<uniform> u : Uniforms;
@group(0) @binding(1) var<uniform> eclipse : EclipseUniforms;
@group(1) @binding(0) var scene_depth : texture_depth_2d;
@group(1) @binding(1) var scene_color : texture_2d<f32>;
@group(1) @binding(2) var scene_sampler : sampler;

const SHALLOW_WATER : vec3f = vec3f(0.12, 0.35, 0.55);
const DEEP_WATER : vec3f = vec3f(0.01, 0.04, 0.12);
const FOAM_TINT : vec3f = vec3f(0.72, 0.9, 1.0);

struct VSIn {
	@location(0) pos : vec3f,
	@location(1) normal : vec3f,
	@location(2) m0 : vec4<f32>,
	@location(3) m1 : vec4<f32>,
	@location(4) m2 : vec4<f32>,
	@location(5) m3 : vec4<f32>,
};

struct VSOut {
	@builtin(position) clip : vec4<f32>,
	@location(0) normal : vec3<f32>,
	@location(1) worldPos : vec3<f32>,
	@location(2) localDir : vec3<f32>,
};

struct CopyVSOut {
	@builtin(position) clip : vec4<f32>,
	@location(0) uv : vec2<f32>,
};

@vertex
fn vs_fullscreen(@builtin(vertex_index) vid : u32) -> CopyVSOut {
	let pos = array<vec2f, 3>(
		vec2f(-1.0, -1.0),
		vec2f(3.0, -1.0),
		vec2f(-1.0, 3.0)
	);
	let p = pos[vid];
	var out : CopyVSOut;
	out.clip = vec4f(p, 0.0, 1.0);
	out.uv = vec2f(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
	return out;
}

@fragment
fn fs_copy_scene(in : CopyVSOut) -> @location(0) vec4<f32> {
	return textureSampleLevel(scene_color, scene_sampler, in.uv, 0.0);
}

@vertex
fn vs(in : VSIn) -> VSOut {
	let model = mat4x4<f32>(in.m0, in.m1, in.m2, in.m3);
	let unit = normalize(in.pos);
	let world = model * vec4<f32>(unit, 1.0);
	var out : VSOut;
	out.clip = u.viewProj * vec4<f32>(world.xyz, 1.0);
	out.normal = normalize(world.xyz - model[3].xyz);
	out.worldPos = world.xyz;
	out.localDir = unit;
	return out;
}

fn water_latlong_grid(dir: vec3f) -> vec3f {
	let d = normalize(dir);
	let base = d * 0.5 + 0.5;
	let lat = asin(clamp(d.y, -1.0, 1.0));
	let lon = atan2(d.z, d.x);
	let step = radians(15.0);
	let lat_u = lat / step;
	let lon_u = lon / step;
	let lat_d = abs(fract(lat_u + 0.5) - 0.5);
	let lon_d = abs(fract(lon_u + 0.5) - 0.5);
	let lat_aa = max(fwidth(lat_u) * 0.75, 1e-5);
	let lon_aa = max(fwidth(lon_u) * 0.75, 1e-5);
	let line = max(1.0 - smoothstep(0.0, lat_aa, lat_d), 1.0 - smoothstep(0.0, lon_aa, lon_d));
	return mix(base, vec3f(1.0), line);
}

fn wave_normal(in : VSOut, base_n : vec3f) -> vec3f {
	let d = normalize(in.localDir);
	let lat = asin(clamp(d.y, -1.0, 1.0));
	let lon = atan2(d.z, d.x);
	let t = u.time * 0.12;
	let w0 = sin(lon * 18.0 + lat * 7.0 + t * 1.4);
	let w1 = sin(lon * -11.0 + lat * 15.0 + t * 0.9);
	let w2 = sin((lon + lat) * 26.0 - t * 1.7);
	let dx = w0 * 0.55 + w1 * 0.25 + w2 * 0.2;
	let dy = w0 * -0.2 + w1 * 0.5 + w2 * 0.3;
	let tangent_a = cross(vec3f(0.0, 1.0, 0.0), base_n);
	let tangent_b = cross(vec3f(1.0, 0.0, 0.0), base_n);
	let tangent = normalize(select(tangent_b, tangent_a, dot(tangent_a, tangent_a) > 1e-4));
	let bitangent = normalize(cross(base_n, tangent));
	return normalize(base_n + (tangent * dx + bitangent * dy) * clamp(u.waveStrength, 0.0, 1.0) * 0.055);
}

fn water_thickness(depth_gap : f32) -> f32 {
	return clamp(1.0 - exp(-max(depth_gap, 0.0) * 4200.0 * max(u.absorptionStrength, 0.0)), 0.0, 1.0);
}

fn shade_water(in : VSOut, depth_gap : f32, background : vec3f) -> vec3<f32> {
	let shell_n = normalize(in.normal);
	let n = wave_normal(in, shell_n);
	let l = normalize(u.lightPos.xyz - in.worldPos);
	let v = normalize(-in.worldPos);
	let r = reflect(-l, n);
	let ndl = max(dot(n, l), 0.0);
	let ndv = max(dot(n, v), 0.0);
	let eclipse_vis = body_eclipse_visibility(in.worldPos, eclipse);
	let rough = clamp(0.045 / max(u.waterGloss, 0.1), 0.012, 0.35);
	let glint = pow(max(dot(r, v), 0.0), mix(24.0, 420.0, 1.0 - rough));
	let fresnel = pow(1.0 - ndv, 5.0);
	let thickness = water_thickness(depth_gap);
	let shallow = 1.0 - thickness;
	let grazing = pow(1.0 - ndv, 2.0);
	let base = mix(SHALLOW_WATER, DEEP_WATER, thickness);
	let absorb = mix(vec3f(0.9, 0.97, 1.0), vec3f(0.08, 0.22, 0.5), thickness);
	let transmitted = background * absorb;
	let lit = u.ambient.rgb * 0.45 + u.lightColor.rgb * u.lightColor.w * ndl * eclipse_vis;
	let diffuse = base * lit * (0.12 + thickness * 0.45);
	let rim_scatter = SHALLOW_WATER * fresnel * (0.5 + 0.7 * grazing);
	let foam_hint = FOAM_TINT * smoothstep(0.86, 1.0, shallow) * 0.08;
	let specular = u.lightColor.rgb * u.lightColor.w * glint * eclipse_vis * u.glintStrength * (0.08 + 1.4 * fresnel);
	let surface = (diffuse + rim_scatter + foam_hint + specular) * u.exposure;
	let surface_mix = clamp(u.waterOpacity * (0.18 + 0.55 * thickness + 0.45 * fresnel), 0.0, 1.0);
	return mix(transmitted, surface, surface_mix);
}

fn is_camera_facing_shell(in : VSOut) -> bool {
	let n = normalize(in.normal);
	let to_camera = normalize(-in.worldPos);
	return dot(n, to_camera) > 0.0;
}

@fragment
fn fs_water(in : VSOut) -> @location(0) vec4<f32> {
	if (!is_camera_facing_shell(in)) {
		discard;
	}
	let scene_d = textureLoad(scene_depth, frag_texel(in.clip), 0);
	let water_d = in.clip.z;
	let depth_gap = scene_d - water_d;
	if (depth_gap < -2.0e-5) {
		discard;
	}
	let size = textureDimensions(scene_color);
	let texel = frag_texel(in.clip);
	let uv = (vec2f(f32(texel.x), f32(texel.y)) + vec2f(0.5)) / vec2f(size);
	let background = textureSampleLevel(scene_color, scene_sampler, uv, 0.0).rgb;
	var rgb = shade_water(in, depth_gap, background);
	if (u.waterDebug == 1u) {
		rgb = vec3f(0.1, 0.85, 1.0);
	} else if (u.waterDebug == 2u) {
		rgb = water_latlong_grid(in.normal);
	}
	return vec4<f32>(rgb, 1.0);
}

fn frag_texel(frag : vec4<f32>) -> vec2<i32> {
	let size = textureDimensions(scene_depth);
	let max_xy = vec2f(vec2<u32>(max(size.x, 1u), max(size.y, 1u))) - vec2f(1.0);
	return vec2<i32>(clamp(floor(frag.xy), vec2f(0.0), max_xy));
}

@fragment
fn fs_depth_debug(in : VSOut) -> @location(0) vec4<f32> {
	if (!is_camera_facing_shell(in)) {
		discard;
	}
	// In fragment stage @builtin(position) is framebuffer position with depth in z.
	let scene_d = textureLoad(scene_depth, frag_texel(in.clip), 0);
	let water_d = in.clip.z;
	let delta = scene_d - water_d;
	let eps = 2.0e-5;
	if (delta > eps) {
		return vec4f(0.1, 0.85, 1.0, 0.88);
	}
	if (delta < -eps) {
		return vec4f(1.0, 0.08, 0.04, 0.88);
	}
	return vec4f(1.0, 0.9, 0.05, 0.88);
}
