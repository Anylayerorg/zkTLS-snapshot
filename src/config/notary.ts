/**
 * TLSNotary Notary Server Configuration
 * 
 * This is the single source of truth for notary settings.
 * Supports environment variable override (TLSNOTARY_NOTARY_URL) and
 * chrome.storage.sync for user-level overrides.
 */

export interface NotaryConfig {
  url: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Default notary configuration
 * 
 * Uses public TLSNotary notary server by default (dev/test only)
 * For production, configure your own notary server via:
 * - Environment variable: TLSNOTARY_NOTARY_URL
 * - Extension options page (chrome.storage.sync)
 * 
 * Environment URLs:
 * - Dev: https://notary.pse.dev (public notary - no setup required)
 * - Staging: https://notary-staging.anylayer.com (self-hosted - see NOTARY_SERVER_SETUP.md)
 * - Prod: https://notary.anylayer.com (self-hosted - see NOTARY_SERVER_SETUP.md)
 * 
 * For self-hosted setup instructions, see: NOTARY_SERVER_SETUP.md
 */
export const defaultNotaryConfig: NotaryConfig = {
  // Public TLSNotary notary server (dev/test only)
  // Override via TLSNOTARY_NOTARY_URL env var or extension options
  url: (typeof process !== 'undefined' && process.env?.TLSNOTARY_NOTARY_URL) || 'https://notary.pse.dev',
  
  // Request timeout (30 seconds)
  timeout: 30000,
  
  // Maximum retries on failure
  maxRetries: 3,
  
  // Delay between retries (1 second)
  retryDelay: 1000,
};

/**
 * Storage key for user-overridden notary URL
 */
const STORAGE_KEY_NOTARY_CONFIG = 'tlsnotary_notary_config';

/**
 * Get notary configuration
 * 
 * Priority order:
 * 1. chrome.storage.sync (user override via options page)
 * 2. Environment variable (TLSNOTARY_NOTARY_URL)
 * 3. Default (public notary for dev/test)
 * 
 * @returns Notary configuration
 */
export async function getNotaryConfig(): Promise<NotaryConfig> {
  // Try to load from chrome.storage.sync (user override)
  if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
    try {
      const stored = await chrome.storage.sync.get(STORAGE_KEY_NOTARY_CONFIG);
      if (stored[STORAGE_KEY_NOTARY_CONFIG]) {
        const userConfig = stored[STORAGE_KEY_NOTARY_CONFIG] as Partial<NotaryConfig>;
        return {
          ...defaultNotaryConfig,
          ...userConfig,
          // Ensure URL is set
          url: userConfig.url || defaultNotaryConfig.url,
        };
      }
    } catch (error) {
      console.warn('[NotaryConfig] Failed to load from chrome.storage.sync:', error);
    }
  }
  
  // Fall back to defaults (which include env var check)
  return { ...defaultNotaryConfig };
}

/**
 * Set notary configuration in chrome.storage.sync
 * Used by extension options page for user overrides
 * 
 * @param config - Partial notary configuration to save
 */
export async function setNotaryConfig(config: Partial<NotaryConfig>): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.sync) {
    throw new Error('chrome.storage.sync not available');
  }
  
  const current = await getNotaryConfig();
  const merged = {
    ...current,
    ...config,
  };
  
  // Validate before saving
  if (!validateNotaryConfig(merged)) {
    throw new Error('Invalid notary configuration');
  }
  
  await chrome.storage.sync.set({
    [STORAGE_KEY_NOTARY_CONFIG]: merged,
  });
  
  console.log('[NotaryConfig] Saved notary configuration:', merged.url);
}

/**
 * Validate notary configuration
 */
export function validateNotaryConfig(config: NotaryConfig): boolean {
  try {
    const url = new URL(config.url);
    return url.protocol === 'https:' && config.timeout > 0 && config.maxRetries >= 0;
  } catch {
    return false;
  }
}

