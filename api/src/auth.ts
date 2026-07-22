import type { AdminSession, Bindings } from './bindings';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DEFAULT_AUTH_SECRET = 'emberroot-local-only-change-me';

function base64UrlEncode(value: string): string {
	const bytes = encoder.encode(value);
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlDecode(value: string): string | null {
	try {
		const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((value.length + 3) % 4);
		const binary = atob(padded);
		return decoder.decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
	} catch {
		return null;
	}
}

async function sign(value: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
	let binary = '';
	for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function timingSafeEqual(left: string, right: string): boolean {
	const leftBytes = encoder.encode(left);
	const rightBytes = encoder.encode(right);
	if (leftBytes.length !== rightBytes.length) return false;
	let difference = 0;
	for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
	return difference === 0;
}

function authSecret(env: Bindings): string {
	return env.AUTH_SECRET || DEFAULT_AUTH_SECRET;
}

export async function createAdminToken(env: Bindings): Promise<{ token: string; expiresAt: number }> {
	const expiresAt = Math.floor(Date.now() / 1000) + 8 * 60 * 60;
	const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
	const payload = base64UrlEncode(JSON.stringify({ sub: 'admin', exp: expiresAt }));
	const signature = await sign(`${header}.${payload}`, authSecret(env));
	return { token: `${header}.${payload}.${signature}`, expiresAt };
}

export async function verifyAdminToken(token: string, env: Bindings): Promise<AdminSession | null> {
	const [header, payload, signature] = token.split('.');
	if (!header || !payload || !signature) return null;
	const expected = await sign(`${header}.${payload}`, authSecret(env));
	if (!timingSafeEqual(signature, expected)) return null;
	const decoded = base64UrlDecode(payload);
	if (!decoded) return null;
	try {
		const tokenPayload: unknown = JSON.parse(decoded);
		if (
			typeof tokenPayload !== 'object' ||
			tokenPayload === null ||
			(tokenPayload as { sub?: unknown }).sub !== 'admin' ||
			typeof (tokenPayload as { exp?: unknown }).exp !== 'number' ||
			(tokenPayload as { exp: number }).exp <= Math.floor(Date.now() / 1000)
		) {
			return null;
		}
		return { sub: 'admin', expiresAt: (tokenPayload as { exp: number }).exp };
	} catch {
		return null;
	}
}

export function credentialsMatch(username: string, password: string, env: Bindings): boolean {
	return timingSafeEqual(username, env.ADMIN_USERNAME || 'admin') && timingSafeEqual(password, env.ADMIN_PASSWORD || 'admin');
}

export function ingestKeyMatches(value: string | undefined, env: Bindings): boolean {
	return Boolean(env.INGEST_API_KEY && value && timingSafeEqual(value, env.INGEST_API_KEY));
}
