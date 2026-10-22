import test from 'node:test';
import assert from 'node:assert/strict';
import { readBoundedFormData, FeedbackTooLargeError } from '../src/lib/server/feedbackRequest.ts';

test('bounded feedback form parser accepts normal URL-encoded submissions', async () => {
	const request = new Request('https://parma.invalid/account?/feedback', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: 'topic=bug&subject=Help&message=Something+is+wrong'
	});
	const form = await readBoundedFormData(request);
	assert.equal(form.get('topic'), 'bug');
	assert.equal(form.get('message'), 'Something is wrong');
});

test('bounded feedback parser rejects oversized bodies even without Content-Length', async () => {
	const request = new Request('https://parma.invalid/account?/feedback', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: `message=${'x'.repeat(20_001)}`
	});
	assert.equal(request.headers.get('content-length'), null);
	await assert.rejects(readBoundedFormData(request), FeedbackTooLargeError);
});
