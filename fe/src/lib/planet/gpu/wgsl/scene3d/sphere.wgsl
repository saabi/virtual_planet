// Instanced body spheres for the scene-3d viewport. One unit sphere, drawn once per
// body with a per-instance model matrix (translate · radius) + color. Lambert under a
// single directional light + ambient; stars (emissive flag) render full-bright.
// See _docs/specs/scene-3d-viewport.md.

struct Uniforms {
	viewProj : mat4x4<f32>,
	lightDir : vec4<f32>,   // xyz = unit direction toward the light
	lightColor : vec4<f32>, // rgb = colour, w = intensity
	ambient : vec4<f32>,    // rgb = ambient colour
};

@group(0) @binding(0) var<uniform> u : Uniforms;

struct VSIn {
	@location(0) pos : vec3<f32>,
	@location(1) normal : vec3<f32>,
	@location(2) m0 : vec4<f32>,
	@location(3) m1 : vec4<f32>,
	@location(4) m2 : vec4<f32>,
	@location(5) m3 : vec4<f32>,
	@location(6) color : vec4<f32>, // rgb + emissive flag in w
};

struct VSOut {
	@builtin(position) clip : vec4<f32>,
	@location(0) normal : vec3<f32>,
	@location(1) color : vec4<f32>,
};

@vertex
fn vs(in : VSIn) -> VSOut {
	let model = mat4x4<f32>(in.m0, in.m1, in.m2, in.m3);
	let world = model * vec4<f32>(in.pos, 1.0);
	var out : VSOut;
	out.clip = u.viewProj * world;
	// Model is translate · uniform-scale, so the object-space normal survives as-is.
	out.normal = in.normal;
	out.color = in.color;
	return out;
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4<f32> {
	let base = in.color.rgb;
	if (in.color.w > 0.5) {
		return vec4<f32>(base, 1.0); // emissive (stars)
	}
	let n = normalize(in.normal);
	let l = normalize(u.lightDir.xyz);
	let ndl = max(dot(n, l), 0.0);
	let lit = base * (u.ambient.rgb + u.lightColor.rgb * u.lightColor.w * ndl);
	return vec4<f32>(lit, 1.0);
}
