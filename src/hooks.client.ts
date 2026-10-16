import type { ClientInit } from '@sveltejs/kit';

const RELOAD_KEY = 'parma.stale-build-reload';

export const init: ClientInit = async () => {
	window.addEventListener('vite:preloadError', (event) => {
		event.preventDefault();
		try {
			if (sessionStorage.getItem(RELOAD_KEY)) return;
			sessionStorage.setItem(RELOAD_KEY, '1');
		} catch {
			// Keep the current page usable when browser storage is unavailable.
			return;
		}
		window.location.reload();
	});
};
