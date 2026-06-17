import fs from 'node:fs';
import path from 'node:path';

const INCLUDE_RE = /^#include\s+"([^"]+)"/gm;

/**
 * Resolve #include "relative/path.wgsl" recursively.
 * @param {string} filePath
 * @param {Set<string>} [seen]
 */
export function resolveWgslIncludes(filePath, seen = new Set()) {
	const abs = path.resolve(filePath);
	if (seen.has(abs)) {
		throw new Error(`WGSL include cycle detected at ${abs}`);
	}
	seen.add(abs);

	let source = fs.readFileSync(abs, 'utf8');
	source = source.replace(INCLUDE_RE, (_match, includePath) => {
		const resolved = path.resolve(path.dirname(abs), includePath);
		return resolveWgslIncludes(resolved, seen);
	});
	return source;
}
