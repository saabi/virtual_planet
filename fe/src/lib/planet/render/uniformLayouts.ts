/** WebGPU bind group layout indices and byte sizes — mirrors WGSL structs. */
export const BIND_GROUP = {
	frame: 0,
	planet: 1,
	scale: 2,
	patches: 3
} as const;

export const UNIFORM_ALIGN = 256;

export const VIEW_UNIFORM_SIZE = 64 * 4; // viewProj + view + cameraPos + debug

export interface ViewUniforms {
	viewProjection: Float32Array;
	view: Float32Array;
	cameraPos: [number, number, number, number];
	debug: [number, number, number, number]; // wireframe, faceColors, showPatches, time
}

export function writeViewUniforms(buffer: ArrayBuffer, u: ViewUniforms): void {
	const view = new DataView(buffer);
	for (let i = 0; i < 16; i++) view.setFloat32(i * 4, u.viewProjection[i], true);
	for (let i = 0; i < 16; i++) view.setFloat32(64 + i * 4, u.view[i], true);
	view.setFloat32(128, u.cameraPos[0], true);
	view.setFloat32(132, u.cameraPos[1], true);
	view.setFloat32(136, u.cameraPos[2], true);
	view.setFloat32(140, u.cameraPos[3], true);
	view.setFloat32(144, u.debug[0], true);
	view.setFloat32(148, u.debug[1], true);
	view.setFloat32(152, u.debug[2], true);
	view.setFloat32(156, u.debug[3], true);
}
