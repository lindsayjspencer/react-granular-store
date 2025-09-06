import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		globals: true,
	},
	resolve: {
		dedupe: ['react', 'react-dom'],
	},
});
