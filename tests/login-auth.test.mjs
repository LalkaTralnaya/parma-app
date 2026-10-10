import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLogin, loginToAuthEmail, signInIdentifier, accountLabel, registerWithLogin } from '../src/lib/supabase/login.ts';

test('logins normalize consistently; Cyrillic and punctuation round-trip through case-insensitive auth emails', () => {
	for (const login of ['ВоЛхВ', 'hero_7', 'ё'.repeat(24), 'a.b-c', '123']) {
		const email = loginToAuthEmail(login);
		assert.equal(email, email.toLowerCase());
		assert.ok(email.split('@')[0].length <= 64);
		assert.equal(accountLabel({email,user_metadata:{login:'wrong'}}),normalizeLogin(login));
		assert.equal(signInIdentifier(login),email);
	}
	assert.equal(loginToAuthEmail('  ВОЛХВ '),loginToAuthEmail('волхв'));
	assert.notEqual(loginToAuthEmail('hero_7'),loginToAuthEmail('hero-7'));
	for (const invalid of ['ab','x'.repeat(25),'user@example.org','a b','<script>','_hero','汉字英雄']) assert.throws(()=>loginToAuthEmail(invalid));
});

test('existing email accounts retain their identifier and display', () => {
	assert.equal(signInIdentifier(' old@example.org '),'old@example.org');
	assert.equal(accountLabel({email:'old@example.org',user_metadata:{}}),'old@example.org');
});

test('registration never invokes signUp when email confirmation is enabled or settings cannot be read', async () => {
	let calls = 0;
	const auth = {signUp:async () => {calls++; throw new Error('must not call');}};
	for (const settings of [{mailer_autoconfirm:false},{},{mailer_autoconfirm:true,disable_signup:true}]) {
		await assert.rejects(registerWithLogin(auth,'hero','password123',async()=>settings));
	}
	await assert.rejects(registerWithLogin(auth,'hero','password123',async()=>{throw new Error('offline');}));
	await assert.rejects(registerWithLogin(auth,'hero','short',async()=>({mailer_autoconfirm:true})));
	assert.equal(calls,0);
});

test('registration uses Supabase password auth with login metadata and requires an active session', async () => {
	let payload;
	const auth={signUp:async args=>{payload=args;return {data:{session:{user:{id:'test'}}},error:null};}};
	await registerWithLogin(auth,'Волхв','password123',async()=>({mailer_autoconfirm:true}));
	assert.deepEqual(payload,{email:loginToAuthEmail('волхв'),password:'password123',options:{data:{login:'волхв'}}});
	const duplicate={signUp:async()=>({data:{session:null},error:{message:'User already registered',code:'user_already_exists'}})};
	await assert.rejects(registerWithLogin(duplicate,'hero','password123',async()=>({mailer_autoconfirm:true})),e=>e.code==='user_already_exists');
	await assert.rejects(registerWithLogin({signUp:async()=>({data:{session:null},error:null})},'hero','password123',async()=>({mailer_autoconfirm:true})));
});
