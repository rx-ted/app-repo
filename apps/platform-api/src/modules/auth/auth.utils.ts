import { scrypt } from '@noble/hashes/scrypt';
import { sha256 } from '@noble/hashes/sha2';
import { randomBytes, bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { CACHE_KEYS, DEFAULTS } from '@/constants';
import { AUTH } from '@/constants/auth';

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_DK_LEN = 64;

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function pbkdf2Derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt.slice(), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    PBKDF2_DK_LEN * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const saltBytes = randomBytes(DEFAULTS.SALT_BYTES);
  const salt = bytesToHex(saltBytes);
  const derivedKey = await pbkdf2Derive(password, saltBytes);
  return `$pbkdf2$${salt}$${bytesToHex(derivedKey)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith('$pbkdf2$')) {
    const parts = stored.split('$');
    const saltBytes = hexToBytes(parts[2]);
    const derived = await pbkdf2Derive(password, saltBytes);
    return constantTimeEqual(bytesToHex(derived), parts[3]);
  }
  const colonIndex = stored.indexOf(':');
  if (colonIndex === -1) return false;
  try {
    const salt = stored.slice(0, colonIndex);
    const key = stored.slice(colonIndex + 1);
    const derived = scrypt(password, salt, {
      N: 16384,
      r: 8,
      p: 1,
      dkLen: DEFAULTS.SCRYPT_KEY_LEN,
    });
    return constantTimeEqual(bytesToHex(derived), key);
  } catch {
    return false;
  }
}

export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(AUTH.REFRESH_TOKEN_BYTES);
  const rawHex = bytesToHex(raw);
  const hash = bytesToHex(sha256(new TextEncoder().encode(rawHex)));
  return { raw: rawHex, hash };
}

export function hashRefreshToken(raw: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(raw)));
}

export function generateEmailCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 10 ** AUTH.EMAIL_CODE_LENGTH).padStart(AUTH.EMAIL_CODE_LENGTH, '0');
}

export function codeCacheKey(email: string, purpose: string): string {
  return CACHE_KEYS.emailCode(email, purpose);
}

export function cooldownCacheKey(email: string, purpose: string): string {
  return CACHE_KEYS.emailCooldown(email, purpose);
}
