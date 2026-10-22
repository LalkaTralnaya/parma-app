import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { FeedbackLimiter, validateFeedback } from '$lib/server/feedback';
import { readBoundedFormData, FeedbackTooLargeError } from '$lib/server/feedbackRequest';
import { sendFeedback, smtpSettings } from '$lib/server/feedbackMail';
import type { Actions, PageServerLoad } from './$types';

const limiter = new FeedbackLimiter();

export const load: PageServerLoad = () => ({ feedbackEnabled: Boolean(smtpSettings(env)) });

export const actions: Actions = {
	feedback: async ({ request, url, getClientAddress }) => {
		if (request.headers.get('origin') !== url.origin) {
			return fail(403, { feedbackError: 'Откройте форму в приложении и попробуйте снова.' });
		}

		let body: FormData;
		try {
			body = await readBoundedFormData(request);
		} catch (error) {
			if (error instanceof FeedbackTooLargeError) {
				return fail(413, { feedbackError: 'Сообщение слишком большое.' });
			}
			return fail(400, { feedbackError: 'Не удалось прочитать форму. Попробуйте снова.' });
		}

		const values = Object.fromEntries(
			['name', 'replyEmail', 'topic', 'subject', 'message', 'website'].map((key) => [
				key,
				typeof body.get(key) === 'string' ? String(body.get(key)) : ''
			])
		);

		let feedback;
		try {
			feedback = validateFeedback(values);
		} catch (error) {
			return fail(400, { feedbackError: (error as Error).message, values });
		}

		if (!smtpSettings(env)) {
			return fail(503, { feedbackError: 'Отправка пока не настроена. Текст сообщения сохранён в форме.', values });
		}
		if (!limiter.reserve(getClientAddress())) {
			return fail(429, { feedbackError: 'Слишком много обращений. Попробуйте через 10 минут.', values });
		}

		try {
			await sendFeedback(feedback, env);
		} catch {
			return fail(502, { feedbackError: 'Не удалось отправить письмо. Текст остался в форме — попробуйте позже.', values });
		}
		return { feedbackSent: true };
	}
};
