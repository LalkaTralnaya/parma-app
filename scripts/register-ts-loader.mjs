import { registerHooks } from 'node:module';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier.startsWith('$lib/')) {
			const target = resolve(root, 'src/lib', specifier.slice('$lib/'.length)) + '.ts';
			return nextResolve(pathToFileURL(target).href, context);
		}
		if (specifier.startsWith('.') && !extname(specifier)) {
			try { return nextResolve(specifier, context); }
			catch { return nextResolve(`${specifier}.ts`, context); }
		}
		return nextResolve(specifier, context);
	}
});
