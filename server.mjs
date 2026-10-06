import { createServer } from 'node:http';
import { createProxyServer } from 'http-proxy-3';
import { handler } from './build/handler.js';

const prefix = '/api/supabase';
const upstream = process.env.PUBLIC_SUPABASE_URL;

if (!upstream) throw new Error('PUBLIC_SUPABASE_URL is required for the Supabase proxy');

const proxy = createProxyServer({
	target: new URL(upstream).origin,
	changeOrigin: true,
	ws: true,
	secure: true
});

proxy.on('error', (error, _request, response) => {
	console.error('Supabase proxy error:', error.code || error.name);
	if ('writeHead' in response) {
		if (!response.headersSent) response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
		response.end('Supabase is temporarily unavailable');
	} else {
		response.destroy();
	}
});

function isSupabaseRequest(url = '') {
	if (!url.startsWith(`${prefix}/`)) return false;
	return /^\/(?:rest|auth|realtime|storage|functions)\/v1(?:\/|\?|$)/.test(url.slice(prefix.length));
}

function stripPrefix(request) {
	request.url = request.url.slice(prefix.length);
}

const server = createServer((request, response) => {
	if (isSupabaseRequest(request.url)) {
		stripPrefix(request);
		proxy.web(request, response);
		return;
	}
	handler(request, response);
});

server.on('upgrade', (request, socket, head) => {
	if (!isSupabaseRequest(request.url)) {
		socket.destroy();
		return;
	}
	stripPrefix(request);
	proxy.ws(request, socket, head);
});

server.listen(Number(process.env.PORT || 8080), process.env.HOST || '0.0.0.0');
