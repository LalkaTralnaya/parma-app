import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { FeedbackLimiter, validateFeedback } from '$lib/server/feedback';
import { sendFeedback, smtpSettings } from '$lib/server/feedbackMail';
import type { Actions, PageServerLoad } from './$types';
const limiter = new FeedbackLimiter();
export const load: PageServerLoad = () => ({ feedbackEnabled: Boolean(smtpSettings(env)) });
export const actions: Actions = {
 feedback: async ({ request, url, getClientAddress }) => {
  if (request.headers.get('origin') !== url.origin) return fail(403, { feedbackError: 'Откройте форму в приложении и попробуйте снова.' });
  if (Number(request.headers.get('content-length') ?? 0) > 20000) return fail(413, { feedbackError: 'Сообщение слишком большое.' });
  let values: Record<string, string>;
  try { const body = await request.formData(); values = Object.fromEntries(['name','replyEmail','topic','subject','message','website'].map(key => [key, typeof body.get(key) === 'string' ? String(body.get(key)) : ''])); }
  catch { return fail(400, { feedbackError: 'Не удалось прочитать форму. Попробуйте снова.' }); }
  let feedback;
  try { feedback = validateFeedback(values); }
  catch (error) { return fail(400, { feedbackError: (error as Error).message, values }); }
  if (!smtpSettings(env)) return fail(503, { feedbackError: 'Отправка пока не настроена. Текст сообщения сохранён в форме.', values });
  if (!limiter.reserve(getClientAddress())) return fail(429, { feedbackError: 'Слишком много обращений. Попробуйте через 10 минут.', values });
  try { await sendFeedback(feedback, env); }
  catch { return fail(502, { feedbackError: 'Не удалось отправить письмо. Текст остался в форме — попробуйте позже.', values }); }
  return { feedbackSent: true };
 }
};
