export const FEEDBACK_RECIPIENT = 'vlad.malcev.2013@gmail.com';
export const FEEDBACK_TOPICS: Record<string, string> = {
	bug: 'Ошибка в приложении',
	idea: 'Предложение',
	question: 'Вопрос',
	other: 'Другое'
};

export interface Feedback {
	name: string;
	replyEmail: string;
	topic: string;
	subject: string;
	message: string;
}

const emailPattern = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

export function validateFeedback(input: Record<string, unknown>): Feedback {
	const field = (key: string) => typeof input[key] === 'string' ? input[key].trim() : '';
	if (field('website')) throw new Error('Не удалось отправить сообщение.');
	const feedback = {
		name: field('name'),
		replyEmail: field('replyEmail'),
		topic: field('topic'),
		subject: field('subject'),
		message: field('message')
	};
	if (!Object.hasOwn(FEEDBACK_TOPICS, feedback.topic)) throw new Error('Выберите тему обращения.');
	if (!feedback.subject || feedback.subject.length > 120 || /[\r\n]/.test(feedback.subject)) {
		throw new Error('Заголовок должен содержать от 1 до 120 символов без переноса строки.');
	}
	if (feedback.message.length < 10 || feedback.message.length > 5000) {
		throw new Error('Сообщение должно содержать от 10 до 5000 символов.');
	}
	if (feedback.name.length > 80 || /[\r\n]/.test(feedback.name)) {
		throw new Error('Имя должно содержать не более 80 символов без переноса строки.');
	}
	if (feedback.replyEmail && (feedback.replyEmail.length > 254 || !emailPattern.test(feedback.replyEmail))) {
		throw new Error('Проверьте адрес для ответа.');
	}
	return feedback;
}

export function feedbackMail(feedback: Feedback, from: string) {
	return {
		from,
		to: FEEDBACK_RECIPIENT,
		...(feedback.replyEmail ? { replyTo: feedback.replyEmail } : {}),
		subject: `[Парма · ${FEEDBACK_TOPICS[feedback.topic]}] ${feedback.subject}`,
		text: `Обратная связь из приложения Парма\n\nИмя или логин: ${feedback.name || 'Не указано'}\nАдрес для ответа: ${feedback.replyEmail || 'Не указан'}\nТема: ${FEEDBACK_TOPICS[feedback.topic]}\nЗаголовок: ${feedback.subject}\n\n${feedback.message}`,
		disableFileAccess: true,
		disableUrlAccess: true
	};
}

/** Per-process fallback protection; use a shared store at the edge for multi-instance deployments. */
export class FeedbackLimiter {
	private attempts = new Map<string, number[]>();

	reserve(key: string, now = Date.now()): boolean {
		const windowMs = 10 * 60 * 1000;
		for (const [address, times] of this.attempts) {
			if (!times.some((time) => time > now - windowMs)) this.attempts.delete(address);
		}

		const times = (this.attempts.get(key) ?? []).filter((time) => time > now - windowMs);
		if (times.length >= 3) return false;

		// Keep memory bounded without permanently rejecting new visitors when full.
		if (!this.attempts.has(key) && this.attempts.size >= 5000) {
			const oldestKey = this.attempts.keys().next().value;
			if (oldestKey !== undefined) this.attempts.delete(oldestKey);
		}
		this.attempts.set(key, [...times, now]);
		return true;
	}
}
