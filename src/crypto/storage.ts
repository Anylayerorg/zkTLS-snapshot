/**
 * Encrypted storage for TLSSnapshotSecret
 * Uses wallet-derived encryption key for strictest privacy
 */

import { TLSSnapshotSecret } from '../types';

const STORAGE_KEY_PREFIX = 'zktls_snapshot_';
const ENCRYPTION_KEY_KEY = 'zktls_encryption_key';

/**
 * Derive encryption key from wallet signature
 */
export async function deriveEncryptionKey(
  userAddress: string,
  signature: string
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`${userAddress}:${signature}:AnyLayer zkTLS key`),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('anylayer-zktls-salt-v1'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return encryptionKey;
}

/**
 * Store encryption key in memory (not persisted)
 */
let encryptionKeyCache: CryptoKey | null = null;

export function setEncryptionKey(key: CryptoKey): void {
  encryptionKeyCache = key;
}

export function getEncryptionKey(): CryptoKey | null {
  return encryptionKeyCache;
}

/**
 * Encrypt snapshot secret
 */
export async function encryptSnapshot(
  snapshot: TLSSnapshotSecret,
  key: CryptoKey
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = JSON.stringify({
    ...snapshot,
    attrs: serializeBigInts(snapshot.attrs),
    randomness: snapshot.randomness.toString()
  });

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    new TextEncoder().encode(data)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt snapshot secret
 */
export async function decryptSnapshot(
  encrypted: string,
  key: CryptoKey
): Promise<TLSSnapshotSecret> {
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    data
  );

  const json = JSON.parse(new TextDecoder().decode(decrypted));
  return {
    ...json,
    attrs: deserializeBigInts(json.attrs),
    randomness: BigInt(json.randomness)
  };
}

/**
 * Store encrypted snapshot in chrome.storage.local
 */
export async function storeSnapshot(
  snapshot: TLSSnapshotSecret,
  key: CryptoKey
): Promise<void> {
  const encrypted = await encryptSnapshot(snapshot, key);
  const storageKey = `${STORAGE_KEY_PREFIX}${snapshot.snapshotId}`;

  await chrome.storage.local.set({
    [storageKey]: encrypted
  });
}

/**
 * Retrieve and decrypt snapshot from chrome.storage.local
 */
export async function retrieveSnapshot(
  snapshotId: string,
  key: CryptoKey
): Promise<TLSSnapshotSecret | null> {
  const storageKey = `${STORAGE_KEY_PREFIX}${snapshotId}`;
  const result = await chrome.storage.local.get(storageKey);

  if (!result[storageKey]) {
    return null;
  }

  return decryptSnapshot(result[storageKey], key);
}

/**
 * List all snapshot IDs for a user
 */
export async function listSnapshotIds(userAddress: string): Promise<string[]> {
  const all = await chrome.storage.local.get(null);
  const prefix = STORAGE_KEY_PREFIX;
  const snapshotIds: string[] = [];

  for (const key in all) {
    if (key.startsWith(prefix)) {
      const snapshotId = key.substring(prefix.length);
      // Verify it belongs to this user by decrypting (if key available)
      snapshotIds.push(snapshotId);
    }
  }

  return snapshotIds;
}

/**
 * Delete snapshot from storage
 */
export async function deleteSnapshot(snapshotId: string): Promise<void> {
  const storageKey = `${STORAGE_KEY_PREFIX}${snapshotId}`;
  await chrome.storage.local.remove(storageKey);
}

/**
 * Helper: serialize BigInt values in objects
 */
function serializeBigInts(obj: any): any {
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInts);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = serializeBigInts(obj[key]);
    }
    return result;
  }
  return obj;
}

/**
 * Helper: deserialize BigInt values from strings
 */
function deserializeBigInts(obj: any): any {
  if (typeof obj === 'string' && /^\d+$/.test(obj)) {
    return BigInt(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(deserializeBigInts);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = deserializeBigInts(obj[key]);
    }
    return result;
  }
  return obj;
}

