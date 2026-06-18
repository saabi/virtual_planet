// AssemblyScript port of the scheduler's projection hot path.
// Mirrors screenSpace.ts::projectWorldPoint for a batch of corners.
//
// Linear-memory layout (f32, byte offsets passed in):
//   vpPtr      : 16 floats — view-projection, column-major
//   cornersPtr : count*3 floats — world (x,y,z) per corner
//   outPtr     : count*3 floats — (screenX, screenY, behind[0|1]) per corner
//
// Only the x/y/w clip rows are needed (z is unused for screen bounds).
export function projectBatch(
	vpPtr: usize,
	cornersPtr: usize,
	count: i32,
	outPtr: usize,
	vw: f32,
	vh: f32
): void {
	const m0 = load<f32>(vpPtr);
	const m1 = load<f32>(vpPtr + 4);
	const m3 = load<f32>(vpPtr + 12);
	const m4 = load<f32>(vpPtr + 16);
	const m5 = load<f32>(vpPtr + 20);
	const m7 = load<f32>(vpPtr + 28);
	const m8 = load<f32>(vpPtr + 32);
	const m9 = load<f32>(vpPtr + 36);
	const m11 = load<f32>(vpPtr + 44);
	const m12 = load<f32>(vpPtr + 48);
	const m13 = load<f32>(vpPtr + 52);
	const m15 = load<f32>(vpPtr + 60);

	for (let i = 0; i < count; i++) {
		const cp = cornersPtr + (i * 3) * 4;
		const x = load<f32>(cp);
		const y = load<f32>(cp + 4);
		const z = load<f32>(cp + 8);

		const cx = m0 * x + m4 * y + m8 * z + m12;
		const cy = m1 * x + m5 * y + m9 * z + m13;
		const cw = m3 * x + m7 * y + m11 * z + m15;

		const op = outPtr + (i * 3) * 4;
		if (cw <= 1e-6) {
			store<f32>(op, 0);
			store<f32>(op + 4, 0);
			store<f32>(op + 8, 1); // behind camera
		} else {
			const invW: f32 = 1.0 / cw;
			const ndcX: f32 = cx * invW;
			const ndcY: f32 = cy * invW;
			store<f32>(op, (ndcX * 0.5 + 0.5) * vw);
			store<f32>(op + 4, (1.0 - (ndcY * 0.5 + 0.5)) * vh);
			store<f32>(op + 8, 0);
		}
	}
}
