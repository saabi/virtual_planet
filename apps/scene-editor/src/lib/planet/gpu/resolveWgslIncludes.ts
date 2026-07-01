import fs from 'node:fs';
import path from 'node:path';

const INCLUDE_RE = /^#include\s+"([^"]+)"/gm;

export function resolveWgslIncludes(filePath: string, included = new Set<string>()): string {
	const abs = path.resolve(filePath);
	if (included.has(abs)) {
		return '';
	}
	included.add(abs);

	let source = fs.readFileSync(abs, 'utf8');
	source = source.replace(INCLUDE_RE, (_match, includePath: string) => {
		const resolved = path.resolve(path.dirname(abs), includePath);
		return resolveWgslIncludes(resolved, included);
	});
	return source;
}
