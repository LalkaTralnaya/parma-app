export const MAX_FEEDBACK_BODY_BYTES = 20_000;

export class FeedbackTooLargeError extends Error {
	constructor() {
		super('Feedback request body is too large');
		this.name = 'FeedbackTooLargeError';
	}
}

/** Read a form body with a hard byte ceiling, including requests without Content-Length. */
export async function readBoundedFormData(
	request: Request,
	maxBytes = MAX_FEEDBACK_BODY_BYTES
): Promise<FormData> {
	const advertisedLength = Number(request.headers.get('content-length') ?? 0);
	if (Number.isFinite(advertisedLength) && advertisedLength > maxBytes) {
		throw new FeedbackTooLargeError();
	}

	const reader = request.body?.getReader();
	if (!reader) return request.formData();

	const chunks: Uint8Array[] = [];
	let totalBytes = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		totalBytes += value.byteLength;
		if (totalBytes > maxBytes) {
			await reader.cancel();
			throw new FeedbackTooLargeError();
		}
		chunks.push(value);
	}

	const body = new Uint8Array(totalBytes);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}

	const headers = new Headers(request.headers);
	headers.delete('content-length');
	headers.delete('transfer-encoding');
	return new Request(request.url, { method: request.method, headers, body }).formData();
}
