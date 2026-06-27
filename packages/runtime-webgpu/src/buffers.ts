/** Round `size` up to the next multiple of `alignment` (both positive integers). */
export function alignTo(size: number, alignment: number): number {
	if (alignment <= 0) {
		throw new RangeError('alignment must be positive');
	}
	if (size < 0) {
		throw new RangeError('size must be non-negative');
	}
	return Math.ceil(size / alignment) * alignment;
}

export function rgba8BufferByteLength(width: number, height: number): number {
	if (width <= 0 || height <= 0) {
		throw new RangeError('width and height must be positive');
	}
	return width * height * 4;
}

export interface StorageBufferDescriptor {
	label?: string;
	size: number;
	usage?: GPUBufferUsageFlags;
}

export function createStorageBuffer(
	device: GPUDevice,
	descriptor: StorageBufferDescriptor
): GPUBuffer {
	const usage = descriptor.usage ?? GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
	return device.createBuffer({
		label: descriptor.label,
		size: alignTo(descriptor.size, 4),
		usage
	});
}

export function writeWholeBuffer(device: GPUDevice, buffer: GPUBuffer, data: BufferSource): void {
	device.queue.writeBuffer(buffer, 0, data);
}
