import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
	const { PUBLIC_SUPABASE_URL } = loadEnv(mode, '.', 'PUBLIC_');
	const proxy = PUBLIC_SUPABASE_URL
		? {
			'/api/supabase': {
				target: PUBLIC_SUPABASE_URL,
				changeOrigin: true,
				ws: true,
				rewrite: (path: string) => path.replace(/^\/api\/supabase(?=\/|\?|$)/, '') || '/'
			}
		}
		: undefined;

	return {
		plugins: [tailwindcss(), sveltekit()],
		server: { proxy },
		preview: { proxy }
	};
});
