import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const ssr = true;

export const load: PageServerLoad = ({ url, setHeaders }) => {
 const testEnabled = dev || env.PARMA_ADVENTURE_REPORT_TEST === '1';
 const localHosts = ['localhost', '127.0.0.1', '[::1]'];
 const testMode = url.searchParams.has('test');
 if (testMode && (!testEnabled || !localHosts.includes(url.hostname) || url.searchParams.get('test') !== '1')) {
  error(404, 'Страница не найдена');
 }
 setHeaders({ 'cache-control': 'no-store' });
 return { testMode };
};
