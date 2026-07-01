import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		setupFiles: ['./test/webgpuSetup.ts'],
		environment: 'happy-dom',
		pool: 'forks'
	}
});
