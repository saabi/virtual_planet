import path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { wgsl } from './vite-wgsl';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			}
		}),
		wgsl()
	],
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, 'src/lib')
		}
	},
	test: {
		include: ['src/**/*.test.ts']
	}
});
