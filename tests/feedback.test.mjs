import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFeedback, feedbackMail, FEEDBACK_RECIPIENT, FeedbackLimiter } from '../src/lib/server/feedback.ts';
import nodemailer from 'nodemailer';
import { smtpSettings, sendFeedback } from '../src/lib/server/feedbackMail.ts';
const input = patch => ({ name:'Игрок',replyEmail:'',topic:'bug',subject:'Бинт',message:'После перевязки состояние осталось.',...patch });
test('feedback mail has a fixed recipient and accepts login-only users without email',()=>{
 const feedback=validateFeedback(input({to:'someone@example.com'}));const mail=feedbackMail(feedback,'parma@example.com');
 assert.equal(mail.to,FEEDBACK_RECIPIENT);assert.equal(mail.to,'vlad.malcev.2013@gmail.com');assert.equal(mail.replyTo,undefined);assert.match(mail.text,/После перевязки/);
 assert.equal(mail.html,undefined);assert.equal(mail.disableUrlAccess,true);
});
test('reply address is optional and never replaces the service sender',()=>{
 const mail=feedbackMail(validateFeedback(input({replyEmail:'player@example.com'})),'parma@example.com');assert.equal(mail.replyTo,'player@example.com');assert.equal(mail.from,'parma@example.com');
});
test('reject invalid fields, header injection, overlong messages and honeypot submissions',()=>{
 for(const patch of [{topic:'unknown'},{subject:''},{message:'Коротко'},{message:'a'.repeat(5001)},{replyEmail:'bad address'},{subject:'a\r\nBcc: x@y.com'},{name:'a\nBcc: x'},{website:'https://spam.invalid'}])assert.throws(()=>validateFeedback(input(patch)));
});
test('server configuration requires service credentials and keeps TLS enabled',()=>{
 assert.equal(smtpSettings({}),null);
 const env={SMTP_HOST:'smtp.example.com',SMTP_USER:'user',SMTP_PASS:'secret',FEEDBACK_FROM:'parma@example.com'};
 const settings=smtpSettings(env);assert.equal(settings.transport.port,587);assert.equal(settings.transport.requireTLS,true);
 assert.equal(smtpSettings({...env,SMTP_PORT:'465'}).transport.secure,true);assert.equal(smtpSettings({...env,SMTP_PORT:'NaN'}),null);
});
test('limit three attempts per address for ten minutes with independent addresses',()=>{
 const limiter=new FeedbackLimiter();for(let i=0;i<3;i++)assert.equal(limiter.reserve('one',1000+i),true);
 assert.equal(limiter.reserve('one',1004),false);assert.equal(limiter.reserve('two',1004),true);assert.equal(limiter.reserve('one',601003),true);
});

test('SMTP success requires acceptance by the fixed recipient; rejection and transport errors fail',async()=>{
 const original=nodemailer.createTransport;
 const env={SMTP_HOST:'smtp.example.com',SMTP_USER:'user',SMTP_PASS:'secret',FEEDBACK_FROM:'parma@example.com'};
 let sent,closed=0;
 try {
  nodemailer.createTransport=()=>({sendMail:async mail=>{sent=mail;return{accepted:[FEEDBACK_RECIPIENT]};},close:()=>closed++});
  await sendFeedback(validateFeedback(input()),env);assert.equal(sent.to,FEEDBACK_RECIPIENT);assert.equal(closed,1);
  nodemailer.createTransport=()=>({sendMail:async()=>({accepted:[]}),close:()=>closed++});
  await assert.rejects(sendFeedback(validateFeedback(input()),env),/RECIPIENT_REJECTED/);
  nodemailer.createTransport=()=>({sendMail:async()=>{throw new Error('SMTP failed');},close:()=>closed++});
  await assert.rejects(sendFeedback(validateFeedback(input()),env),/SMTP failed/);assert.equal(closed,3);
  await assert.rejects(sendFeedback(validateFeedback(input()),{}),/SMTP_NOT_CONFIGURED/);
 } finally {nodemailer.createTransport=original;}
});
