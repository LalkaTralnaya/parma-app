import { SITE_URL } from '$lib/site-seo';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => new Response(
  `User-agent: *\nDisallow: /api/\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } }
);
