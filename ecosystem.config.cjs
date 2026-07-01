/** @type {import('pm2').StartOptions} */
module.exports = {
	apps: [
		{
			name: 'world-lab-scene-editor',
			cwd: './apps/scene-editor',
			script: 'build/index.js',
			instances: 1,
			exec_mode: 'fork',
			autorestart: true,
			watch: false,
			max_memory_restart: '1G',
			env: {
				NODE_ENV: 'production',
				PORT: 5002,
				HOST: '0.0.0.0',
				ORIGIN: process.env.ORIGIN,
				PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL
			}
		}
	]
};
