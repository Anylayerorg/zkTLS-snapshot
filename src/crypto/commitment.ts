/**
 * Commitment generation for snapshots
 * C = H(attrs, r) where H is Poseidon or Pedersen hash
 */

import { ProviderAttributes, CommitmentScheme } from '../types';

/**
 * Generate commitment from attributes and randomness
 * For MVP, using SHA-256. In production, use Poseidon/Pedersen via WASM
 */
export async function generateCommitment(
  attrs: ProviderAttributes,
  randomness: bigint,
  scheme: CommitmentScheme = 'poseidon'
): Promise<string> {
  // Serialize attributes deterministically
  const attrsStr = serializeAttributes(attrs);
  const combined = `${attrsStr}:${randomness.toString()}:${scheme}`;

  // Hash using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Verify commitment matches attributes and randomness
 */
export async function verifyCommitment(
  commitment: string,
  attrs: ProviderAttributes,
  randomness: bigint,
  scheme: CommitmentScheme = 'poseidon'
): Promise<boolean> {
  const computed = await generateCommitment(attrs, randomness, scheme);
  return computed === commitment;
}

/**
 * Generate random value for commitment
 */
export function generateRandomness(): bigint {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const hex = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return BigInt('0x' + hex);
}

/**
 * Serialize attributes deterministically for hashing
 */
function serializeAttributes(attrs: ProviderAttributes): string {
  // Sort keys for deterministic serialization
  const sorted = Object.keys(attrs)
    .sort()
    .map(key => `${key}:${attrs[key as keyof ProviderAttributes]}`)
    .join('|');
  return sorted;
}

