import { createServer } from 'node:http';
import { createProxyServer } from 'http-proxy-3';
import { handler } from './build/handler.js';

const prefix = '/api/supabase';
const upstream = process.env.PUBLIC_SUPABASE_URL;

if (!upstream) throw new Error('PUBLIC_SUPABASE_URL is required for the Supabase proxy');

const securityHeaders = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
	'X-Permitted-Cross-Domain-Policies': 'none',
	'Strict-Transport-Security': 'max-age=31536000'
};

function applySecurityHeaders(response) {
	for (const [name, value] of Object.entries(securityHeaders)) response.setHeader(name, value);
}

const proxy = createProxyServer({
	target: new URL(upstream).origin,
	changeOrigin: true,
	ws: true,
	secure: true
});

proxy.on('proxyRes', (_proxyResponse, _request, response) => applySecurityHeaders(response));

function supabaseEndpointGroup(url = '') {
	const requestPath = url.split('?')[0];
	const path = requestPath.startsWith(prefix) ? requestPath.slice(prefix.length) : requestPath;
	const [area = 'unknown', version = ''] = path.split('/').filter(Boolean);
	return version ? `${area}/${version}` : area;
}

proxy.on('error', (error, request, response) => {
	console.error('Supabase proxy error:', JSON.stringify({
		code: error.code || error.name,
		method: request?.method || 'UNKNOWN',
		endpoint: supabaseEndpointGroup(request?.url || ''),
		clientDisconnected: Boolean(request?.destroyed || response?.destroyed)
	}));
	if (response && typeof response.writeHead === 'function') {
		if (!response.headersSent) response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
		response.end('Supabase is temporarily unavailable');
	} else {
		response?.destroy?.();
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
	applySecurityHeaders(response);
	if ((request.method === 'GET' || request.method === 'HEAD') && request.url?.split('?')[0] === '/favicon.ico') {
		response.writeHead(308, { Location: '/favicon.svg', 'Cache-Control': 'public, max-age=86400' });
		response.end();
		return;
	}
	if (isSupabaseRequest(request.url)) {
		stripPrefix(request);
		proxy.web(request, response);
		return;
	}

	// Keep document responses fresh so a browser cannot combine an older app
	// shell with hashed assets from a newer deployment.
	const isDocumentRequest =
		(request.method === 'GET' || request.method === 'HEAD') &&
		!request.url?.startsWith('/_app/') &&
		request.headers.accept?.includes('text/html');
	if (isDocumentRequest) {
		const writeHead = response.writeHead.bind(response);
		response.writeHead = (statusCode, statusMessageOrHeaders, headers) => {
			if (typeof statusMessageOrHeaders === 'string') {
				return writeHead(statusCode, statusMessageOrHeaders, {
					...headers,
					'Cache-Control': 'no-store'
				});
			}
			return writeHead(statusCode, { ...statusMessageOrHeaders, 'Cache-Control': 'no-store' });
		};
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
