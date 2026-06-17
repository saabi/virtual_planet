/** Invert a 4×4 column-major matrix (WebGL / WGSL layout). Returns identity on failure. */
export function invert4(m: Float32Array): Float32Array {
	const out = new Float32Array(16);
	const m0 = m[0];
	const m1 = m[1];
	const m2 = m[2];
	const m3 = m[3];
	const m4 = m[4];
	const m5 = m[5];
	const m6 = m[6];
	const m7 = m[7];
	const m8 = m[8];
	const m9 = m[9];
	const m10 = m[10];
	const m11 = m[11];
	const m12 = m[12];
	const m13 = m[13];
	const m14 = m[14];
	const m15 = m[15];

	const b00 = m0 * m5 - m1 * m4;
	const b01 = m0 * m6 - m2 * m4;
	const b02 = m0 * m7 - m3 * m4;
	const b03 = m1 * m6 - m2 * m5;
	const b04 = m1 * m7 - m3 * m5;
	const b05 = m2 * m7 - m3 * m6;
	const b06 = m8 * m13 - m9 * m12;
	const b07 = m8 * m14 - m10 * m12;
	const b08 = m8 * m15 - m11 * m12;
	const b09 = m9 * m14 - m10 * m13;
	const b10 = m9 * m15 - m11 * m13;
	const b11 = m10 * m15 - m11 * m14;

	let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
	if (Math.abs(det) < 1e-12) {
		out[0] = 1;
		out[5] = 1;
		out[10] = 1;
		out[15] = 1;
		return out;
	}
	det = 1.0 / det;

	out[0] = (m5 * b11 - m6 * b10 + m7 * b09) * det;
	out[1] = (m2 * b10 - m1 * b11 - m3 * b09) * det;
	out[2] = (m13 * b05 - m14 * b04 + m15 * b03) * det;
	out[3] = (m10 * b04 - m9 * b05 - m11 * b03) * det;
	out[4] = (m6 * b08 - m4 * b11 - m7 * b07) * det;
	out[5] = (m0 * b11 - m2 * b08 + m3 * b07) * det;
	out[6] = (m14 * b02 - m12 * b05 - m15 * b01) * det;
	out[7] = (m8 * b05 - m10 * b02 + m11 * b01) * det;
	out[8] = (m4 * b10 - m5 * b08 + m7 * b06) * det;
	out[9] = (m1 * b08 - m0 * b10 - m3 * b06) * det;
	out[10] = (m12 * b04 - m13 * b02 + m15 * b00) * det;
	out[11] = (m9 * b02 - m8 * b04 - m11 * b00) * det;
	out[12] = (m5 * b07 - m4 * b09 - m6 * b06) * det;
	out[13] = (m0 * b09 - m1 * b07 + m2 * b06) * det;
	out[14] = (m13 * b01 - m12 * b03 - m14 * b00) * det;
	out[15] = (m8 * b03 - m9 * b01 + m10 * b00) * det;

	return out;
}
