import type { Handle } from '@sveltejs/kit';
import { isPublicPage, WORLD_MAP_IMAGE } from '$lib/site-seo';

// These routes render public documents without using account or room data on the server.
const compressiblePages = new Set(['/', '/mechanics', '/lore', '/adventures/[slug]']);

function acceptsGzip(acceptEncoding: string): boolean {
  const qualities = new Map<string, number>();
  for (const entry of acceptEncoding.toLowerCase().split(',')) {
    const [coding, ...parameters] = entry.trim().split(';');
    if (!coding) continue;
    const quality = parameters.find(parameter => /^q\s*=/.test(parameter.trim()));
    const value = quality === undefined ? 1 : Number(quality.split('=')[1]);
    qualities.set(coding.trim(), value >= 0 && value <= 1 ? value : 0);
  }
  const gzip = qualities.get('gzip') ?? qualities.get('*') ?? 0;
  return gzip > 0 && gzip >= (qualities.get('identity') ?? 0);
}

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  const headers = response.headers;
  const routeId = event.route.id;
  const isHtml = headers.get('content-type')?.startsWith('text/html');
  if ((!isPublicPage(routeId) || response.status >= 400) && isHtml) {
    headers.set('X-Robots-Tag', 'noindex, follow');
  }

  if (!isHtml || response.status !== 200) return response;
  const { request } = event;
  if (routeId === '/lore/map' && request.method === 'GET') {
    headers.append('Link', `<${WORLD_MAP_IMAGE}>; rel=preload; as=image`);
  }

  if (!routeId || !compressiblePages.has(routeId) || (request.method !== 'GET' && request.method !== 'HEAD')
    || headers.has('content-encoding') || headers.has('set-cookie') || request.headers.has('range')
    || /\bno-transform\b/i.test(headers.get('cache-control') ?? '')) return response;

  const vary = headers.get('vary')?.toLowerCase().split(',').map(value => value.trim()) ?? [];
  if (!vary.includes('*') && !vary.includes('accept-encoding')) headers.append('Vary', 'Accept-Encoding');
  if (request.method !== 'GET' || !response.body || !acceptsGzip(request.headers.get('accept-encoding') ?? '')) {
    return response;
  }

  headers.set('Content-Encoding', 'gzip');
  headers.delete('Content-Length');
  // A strong validator for the original bytes does not describe the compressed representation.
  if (!headers.get('etag')?.startsWith('W/')) headers.delete('ETag');
  return new Response(response.body.pipeThrough(new CompressionStream('gzip')), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};
