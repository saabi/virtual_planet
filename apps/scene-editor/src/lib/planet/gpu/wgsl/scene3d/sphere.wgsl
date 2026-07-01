// Instanced body spheres for the scene-3d viewport. One unit sphere, drawn once per
// body with a per-instance model matrix (translate · radius) + color. Lambert lit by
// the sun as a POINT light (per-fragment direction from the sun's world position, so
// the terminator is radial/correct per body) + ambient; stars (emissive) full-bright.
// See _docs/specs/scene-3d-viewport.md.
//
// Eclipse: sphere-LOD bodies also receive body-to-body eclipse shadows (so a planet
// shadows its moon even when the moon is too small to be procedural). The occluder set is
// scene-wide and eye-relative (matching worldPos here); a body never occludes itself
// because a surface fragment sits within its own radius.
#include "../planet/eclipse.wgsl"

struct Uniforms {
	viewProj : mat4x4<f32>,
	lightPos : vec4<f32>,   // xyz = world position of the sun (point light)
	lightColor : vec4<f32>, // rgb = colour, w = intensity
	ambient : vec4<f32>,    // rgb = ambient colour
};

@group(0) @binding(0) var<uniform> u : Uniforms;
@group(0) @binding(1) var<uniform> eclipse : EclipseUniforms;

struct VSIn {
	@location(0) pos : vec3<f32>,
	@location(1) normal : vec3<f32>,
	@location(2) m0 : vec4<f32>,
	@location(3) m1 : vec4<f32>,
	@location(4) m2 : vec4<f32>,
	@location(5) m3 : vec4<f32>,
	@location(6) color : vec4<f32>, // rgb + emissive flag in w
	@location(7) flags : vec4<f32>, // x = marker (pin to far plane); yzw reserved
};

struct VSOut {
	@builtin(position) clip : vec4<f32>,
	@location(0) normal : vec3<f32>,
	@location(1) color : vec4<f32>,
	@location(2) worldPos : vec3<f32>,
};

struct FSOut {
	@location(0) color : vec4<f32>,
	@location(1) surface_t : f32,
};

@vertex
fn vs(in : VSIn) -> VSOut {
	let model = mat4x4<f32>(in.m0, in.m1, in.m2, in.m3);
	let world = model * vec4<f32>(in.pos, 1.0);
	var out : VSOut;
	out.clip = u.viewProj * world;
	// Distant bodies (dot LOD) are pinned just inside the far plane so a near-fit far
	// plane never clips them; they still depth-test behind real geometry (z ∈ [0,1]).
	if (in.flags.x > 0.5) {
		out.clip.z = out.clip.w * 0.9999;
	}
	// Model is translate · uniform-scale, so the object-space normal survives as-is.
	out.normal = in.normal;
	out.color = in.color;
	out.worldPos = world.xyz;
	return out;
}

@fragment
fn fs(in : VSOut) -> FSOut {
	let base = in.color.rgb;
	var out : FSOut;
	out.surface_t = -1.0;
	if (in.color.w > 0.5) {
		out.color = vec4<f32>(base, 1.0); // emissive (stars)
		return out;
	}
	let n = normalize(in.normal);
	let l = normalize(u.lightPos.xyz - in.worldPos); // toward the sun's position
	let ndl = max(dot(n, l), 0.0);
	// Body-to-body eclipse dims the direct sun term (umbra → 0, penumbra graded); ambient
	// is unaffected, like the terrain shadowFill floor.
	let eclipse_vis = body_eclipse_visibility(in.worldPos, eclipse);
	let lit = base * (u.ambient.rgb + u.lightColor.rgb * u.lightColor.w * ndl * eclipse_vis);
	out.color = vec4<f32>(lit, 1.0);
	return out;
}
