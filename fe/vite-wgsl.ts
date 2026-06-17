import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const WGSL_EXT = /\.wgsl$/;
const INCLUDE_RE = /^#include\s+"([^"]+)"/gm;

function escapeTemplateLiteral(source: string): string {
	return source.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function resolveIncludes(source: string, basedir: string, included = new Set<string>()): string {
	return source.replace(INCLUDE_RE, (_match, includePath: string) => {
		const resolved = path.resolve(basedir, includePath);
		if (included.has(resolved)) {
			return '';
		}
		included.add(resolved);
		const content = fs.readFileSync(resolved, 'utf-8');
		return resolveIncludes(content, path.dirname(resolved), included);
	});
}

/** Inline `#include "…"` directives for imported WGSL shader files. */
export function wgsl(): Plugin {
	return {
		name: 'vite-wgsl',
		transform(code, id) {
			if (!WGSL_EXT.test(id)) return null;
			const resolved = resolveIncludes(code, path.dirname(id));
			return {
				code: `export default \`${escapeTemplateLiteral(resolved)}\`;`
			};
		},
		handleHotUpdate(ctx) {
			if (!WGSL_EXT.test(ctx.file)) return;
			const defaultRead = ctx.read;
			ctx.read = async () =>
				resolveIncludes(await defaultRead(), path.dirname(ctx.file));
		}
	};
}
