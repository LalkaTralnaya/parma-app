import type { Handle } from '@sveltejs/kit';
import { isPublicPage } from '$lib/site-seo';

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  if ((!isPublicPage(event.route.id) || response.status >= 400)
    && response.headers.get('content-type')?.startsWith('text/html')) {
    response.headers.set('X-Robots-Tag', 'noindex, follow');
  }
  return response;
};
