import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { glslify } from './vite-glslify';
import { wgsl } from './vite-wgsl';

export default defineConfig({
	envPrefix: ['VITE_', 'PUBLIC_'],
	plugins: [
		sveltekit({
			// Transpile TS in node_modules .svelte (e.g. @xyflow) before Rolldown parses them.
			// See sveltejs/vite-plugin-svelte#1360; fixed in svelte 5.56.4+.
			preprocess: vitePreprocess({ script: true }),
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => {
					if (filename.split(/[/\\]/).includes('node_modules')) return undefined;
					return true;
				}
			},
			adapter: adapter()
		}),
		glslify(),
		wgsl()
	],
	// @xyflow/svelte ships .svelte sources; Rolldown dep-prebundle parses them as JS.
	optimizeDeps: {
		exclude: ['@xyflow/svelte', '@xyflow/system']
	},
	// Workspace packages use .ts sources with .js import specifiers; bundle them in SSR
	// so Vite resolves relatives instead of Node looking for missing .js files on disk.
	ssr: {
		noExternal: [/^@world-lab\//],
		// graph-editor imports xyflow; keep xyflow external so SSR does not parse .svelte as JS.
		external: ['@xyflow/svelte', '@xyflow/system']
	}
});
