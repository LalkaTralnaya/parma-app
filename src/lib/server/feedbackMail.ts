import nodemailer from 'nodemailer';
import { feedbackMail, FEEDBACK_RECIPIENT, type Feedback } from './feedback';
type MailEnv = Record<string, string | undefined>;
export function smtpSettings(env: MailEnv) {
 const port = Number(env.SMTP_PORT || '587');
 const host = env.SMTP_HOST?.trim(), from = env.FEEDBACK_FROM?.trim();
 const pass = host?.toLowerCase() === 'smtp.gmail.com' ? env.SMTP_PASS?.replace(/\s/g, '') : env.SMTP_PASS;
 if (!host || !from || /[\r\n]/.test(from) || !env.SMTP_USER || !pass || !Number.isInteger(port) || port < 1 || port > 65535) return null;
 return { from, transport: { host, port, secure: port === 465, requireTLS: port !== 465, auth: { user: env.SMTP_USER, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000, disableFileAccess: true, disableUrlAccess: true } };
}
export async function sendFeedback(feedback: Feedback, env: MailEnv) {
 const settings = smtpSettings(env);
 if (!settings) throw new Error('SMTP_NOT_CONFIGURED');
 const transport = nodemailer.createTransport(settings.transport);
 try {
  const result = await transport.sendMail(feedbackMail(feedback, settings.from));
  if (!result.accepted.some(address => String(address).toLowerCase() === FEEDBACK_RECIPIENT)) throw new Error('RECIPIENT_REJECTED');
 } finally { transport.close(); }
}
