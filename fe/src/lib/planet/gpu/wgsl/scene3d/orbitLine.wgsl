// Unlit orbit ellipse polylines for the scene-3d viewport. Positions are eye-relative
// (camera at the origin) for precision at planetary distances.

struct Uniforms {
	viewProj : mat4x4<f32>,
	color : vec4<f32>,
};

@group(0) @binding(0) var<uniform> u : Uniforms;

struct VSOut {
	@builtin(position) clip : vec4<f32>,
};

struct FSOut {
	@location(0) color : vec4<f32>,
	@location(1) surface_t : f32,
};

@vertex
fn vs(@location(0) pos : vec3<f32>) -> VSOut {
	var out : VSOut;
	out.clip = u.viewProj * vec4<f32>(pos, 1.0);
	return out;
}

@fragment
fn fs() -> FSOut {
	var out : FSOut;
	out.color = u.color;
	out.surface_t = -1.0; // not a solid surface — atmosphere pass ignores these pixels
	return out;
}
