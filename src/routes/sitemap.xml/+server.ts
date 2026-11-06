import { ADVENTURES } from '$lib/rules/adventures';
import { PUBLIC_PAGES, SITE_URL } from '$lib/site-seo';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
  const paths = [...Object.keys(PUBLIC_PAGES), ...ADVENTURES.map(({ slug }) => `/adventures/${encodeURIComponent(slug)}`)];
  const entries = paths.map(path => `  <url><loc>${new URL(path, SITE_URL).href}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' }
  });
};
