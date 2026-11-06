import nodemailer from 'nodemailer';
import { feedbackMail, type Feedback } from './feedback';
type MailEnv = Record<string, string | undefined>;
const mailboxPattern = /^[a-z0-9.!#$%&'*+/=?^_\x60{}|~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
export function smtpSettings(env: MailEnv) {
 const port = Number(env.SMTP_PORT || '587');
 const host = env.SMTP_HOST?.trim(), from = env.FEEDBACK_FROM?.trim();
 const user = env.SMTP_USER?.trim();
 const to = env.FEEDBACK_TO?.trim() || user;
 const pass = host?.toLowerCase() === 'smtp.gmail.com' ? env.SMTP_PASS?.replace(/\s/g, '') : env.SMTP_PASS;
 if (!host || !from || /[\r\n]/.test(from) || !user || !to || to.length > 254 || !mailboxPattern.test(to) || !pass || !Number.isInteger(port) || port < 1 || port > 65535) return null;
 return { from, to, transport: { host, port, secure: port === 465, requireTLS: port !== 465, auth: { user, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000, disableFileAccess: true, disableUrlAccess: true } };
}
export async function sendFeedback(feedback: Feedback, env: MailEnv) {
 const settings = smtpSettings(env);
 if (!settings) throw new Error('SMTP_NOT_CONFIGURED');
 const transport = nodemailer.createTransport(settings.transport);
 try {
  const result = await transport.sendMail(feedbackMail(feedback, settings.from, settings.to));
  if (!result.accepted.some(address => String(address).toLowerCase() === settings.to.toLowerCase())) throw new Error('RECIPIENT_REJECTED');
 } finally { transport.close(); }
}
