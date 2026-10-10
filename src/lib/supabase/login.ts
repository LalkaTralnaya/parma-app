import type { SupabaseClient, User } from '@supabase/supabase-js';

const LOGIN_DOMAIN = 'accounts.parma.invalid';
const LOGIN_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789_.-абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
export const LOGIN_HINT = 'От 3 до 24 символов: русские или латинские буквы, цифры, точка, дефис и подчёркивание. Начните с буквы или цифры.';

export function normalizeLogin(value: string): string {
	const login = value.trim().normalize('NFC').toLowerCase();
	if (!/^[a-zа-яё0-9][a-zа-яё0-9_.-]{2,23}$/u.test(login)) throw new Error(LOGIN_HINT);
	return login;
}

// Supabase password auth uses an email identifier internally. These reserved
// addresses are deterministic login IDs, not user mailboxes.
export function loginToAuthEmail(value: string): string {
	const encoded = [...normalizeLogin(value)].map(c => LOGIN_ALPHABET.indexOf(c).toString(36).padStart(2, '0')).join('');
	return `u-${encoded}@${LOGIN_DOMAIN}`;
}

export function signInIdentifier(value: string): string {
	const identifier = value.trim();
	return identifier.includes('@') ? identifier : loginToAuthEmail(identifier);
}

export function accountLabel(user: Pick<User, 'email' | 'user_metadata'>): string {
	const email = user.email ?? '';
	if (!email.endsWith(`@${LOGIN_DOMAIN}`)) return email || 'Аккаунт Пармы';
	try {
		const encoded = email.split('@')[0];
		if (!/^u-(?:[0-9a-z]{2}){3,24}$/.test(encoded)) throw new Error('Invalid identifier');
		const login = encoded.slice(2).match(/../g)!.map(c => LOGIN_ALPHABET[parseInt(c, 36)] ?? '').join('');
		if (loginToAuthEmail(login) !== email) throw new Error('Invalid identifier');
		return login;
	} catch { return 'Аккаунт Пармы'; }
}

export interface AuthSettings { mailer_autoconfirm: boolean; disable_signup?: boolean }

export async function registerWithLogin(
	auth: Pick<SupabaseClient['auth'], 'signUp'>,
	identifier: string,
	password: string,
	getSettings: () => Promise<AuthSettings>
) {
	const login = normalizeLogin(identifier);
	if (password.length < 8) throw new Error('Пароль должен содержать не менее 8 символов.');
	const settings = await getSettings();
	if (settings.disable_signup) throw new Error('Регистрация отключена в настройках Supabase.');
	if (settings.mailer_autoconfirm !== true) {
		throw new Error('Регистрация пока недоступна: администратору нужно отключить Confirm email в Supabase.');
	}
	const { data, error } = await auth.signUp({ email: loginToAuthEmail(login), password, options: { data: { login } } });
	if (error) throw error;
	if (!data.session) throw new Error('Не удалось войти после регистрации. Проверьте настройки подтверждения в Supabase.');
	return data;
}
