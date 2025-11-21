/**
 * Verification Key Loader
 * 
 * Handles loading TLSNotary circuit verification keys from various sources:
 * 1. CDN (primary)
 * 2. Bundled assets (fallback)
 * 3. Environment variable override
 */

export interface VerificationKey {
  protocol: string;
  curve: string;
  nPublic: number;
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  vk_alphabeta_12: string[][];
  IC: string[][];
}

// Cache verification key
let cachedVkey: VerificationKey | null = null;

/**
 * Get verification key URL from configuration
 */
function getVerificationKeyUrl(): string {
  // 1. Check environment variable (build-time)
  if (typeof process !== 'undefined' && process.env?.TLSNOTARY_VKEY_URL) {
    return process.env.TLSNOTARY_VKEY_URL;
  }
  
  // 2. Default CDN URL
  return 'https://cdn.anylayer.com/vkeys/tlsnotary.vkey.json';
}

/**
 * Load verification key from CDN
 */
async function loadFromCDN(url: string): Promise<VerificationKey> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    // Cache for 1 hour
    cache: 'default',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to load verification key from CDN: ${response.status} ${response.statusText}`);
  }
  
  const vkey = await response.json();
  
  // Validate structure
  if (!validateVerificationKey(vkey)) {
    throw new Error('Invalid verification key structure');
  }
  
  return vkey;
}

/**
 * Load verification key from bundled assets (fallback)
 */
async function loadFromBundle(): Promise<VerificationKey> {
  try {
    // Try to import bundled verification key
    // This will be available if key is bundled with extension
    const bundledVkey = await import('../assets/vkeys/tlsnotary.vkey.json');
    const vkey = bundledVkey.default || bundledVkey;
    
    if (!validateVerificationKey(vkey)) {
      throw new Error('Invalid bundled verification key structure');
    }
    
    return vkey;
  } catch (error) {
    throw new Error(`Failed to load bundled verification key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate verification key structure
 */
function validateVerificationKey(vkey: any): vkey is VerificationKey {
  return (
    vkey &&
    typeof vkey === 'object' &&
    vkey.protocol === 'groth16' &&
    vkey.curve === 'bn128' &&
    typeof vkey.nPublic === 'number' &&
    Array.isArray(vkey.vk_alpha_1) &&
    Array.isArray(vkey.vk_beta_2) &&
    Array.isArray(vkey.vk_gamma_2) &&
    Array.isArray(vkey.vk_delta_2) &&
    Array.isArray(vkey.vk_alphabeta_12) &&
    Array.isArray(vkey.IC)
  );
}

/**
 * Get verification key
 * 
 * Loads from CDN first, falls back to bundled version if CDN fails.
 * Results are cached for performance.
 * 
 * @returns Verification key
 * @throws Error if key cannot be loaded
 */
export async function getVerificationKey(): Promise<VerificationKey> {
  // Return cached key if available
  if (cachedVkey) {
    return cachedVkey;
  }
  
  // Try CDN first
  try {
    const vkeyUrl = getVerificationKeyUrl();
    console.log(`[VKeyLoader] Loading verification key from: ${vkeyUrl}`);
    cachedVkey = await loadFromCDN(vkeyUrl);
    console.log('[VKeyLoader] Verification key loaded from CDN');
    return cachedVkey;
  } catch (cdnError) {
    console.warn('[VKeyLoader] CDN load failed, trying bundled version:', cdnError);
    
    // Fallback to bundled version
    try {
      cachedVkey = await loadFromBundle();
      console.log('[VKeyLoader] Verification key loaded from bundle');
      return cachedVkey;
    } catch (bundleError) {
      console.error('[VKeyLoader] Both CDN and bundle failed');
      throw new Error(
        `Failed to load verification key. CDN: ${cdnError instanceof Error ? cdnError.message : 'Unknown'}, ` +
        `Bundle: ${bundleError instanceof Error ? bundleError.message : 'Unknown'}`
      );
    }
  }
}

/**
 * Clear cached verification key
 * Useful for testing or key rotation
 */
export function clearVerificationKeyCache(): void {
  cachedVkey = null;
}

/**
 * Preload verification key
 * Call this early to avoid delays during proof verification
 */
export async function preloadVerificationKey(): Promise<void> {
  try {
    await getVerificationKey();
  } catch (error) {
    console.warn('[VKeyLoader] Preload failed:', error);
    // Don't throw - preload is optional
  }
}

