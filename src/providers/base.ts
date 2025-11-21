/**
 * Base provider adapter interface and registry
 */

import { ProviderAdapter, ProviderId, SnapshotType, ProviderAttributes } from '../types';
import { TLSNotaryService } from '../services/tlsnotary';
import type { TLSNotaryProof } from '../services/tlsnotary';

/**
 * Provider registry
 */
class ProviderRegistry {
  private adapters: Map<ProviderId, ProviderAdapter> = new Map();

  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: ProviderId): ProviderAdapter | undefined {
    return this.adapters.get(id);
  }

  getAll(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  findByHost(host: string): ProviderAdapter | undefined {
    for (const adapter of this.adapters.values()) {
      for (const pattern of adapter.hostPatterns) {
        if (matchesHostPattern(host, pattern)) {
          return adapter;
        }
      }
    }
    return undefined;
  }
}

/**
 * Check if host matches pattern (supports wildcards)
 */
function matchesHostPattern(host: string, pattern: string): boolean {
  if (pattern === host) {
    return true;
  }

  // Convert wildcard pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(host);
}

export const providerRegistry = new ProviderRegistry();

/**
 * Base adapter implementation
 */
export abstract class BaseProviderAdapter implements ProviderAdapter {
  abstract id: ProviderId;
  abstract hostPatterns: string[];
  abstract getSnapshotType(): SnapshotType;
  abstract getDefaultExpiry(): number;

  abstract isLoggedIn(tab: chrome.tabs.Tab): Promise<boolean>;
  abstract fetchAttributes(tab: chrome.tabs.Tab): Promise<ProviderAttributes>;
  abstract normalizeAttributes(raw: any): ProviderAttributes;
  
  /**
   * Get API endpoint for TLSNotary capture
   * Override in subclasses to specify provider-specific endpoints
   */
  abstract getTLSNotaryEndpoint(): string;
  
  /**
   * Get HTTP method for TLSNotary capture
   */
  getTLSNotaryMethod(): string {
    return 'GET';
  }
  
  /**
   * Get additional headers for TLSNotary capture
   * Override in subclasses to add auth headers, etc.
   */
  async getTLSNotaryHeaders(tab: chrome.tabs.Tab): Promise<Record<string, string>> {
    return {};
  }
  
  /**
   * Capture TLS proof using TLSNotary
   * 
   * All TLSNotary operations go through TLSNotaryService singleton.
   * This ensures consistent configuration and error handling.
   */
  protected async captureTLSProof(tab: chrome.tabs.Tab): Promise<TLSNotaryProof> {
    // Use singleton instance to ensure consistent configuration
    const { tlsNotaryService } = await import('../services/tlsnotary');
    const endpoint = this.getTLSNotaryEndpoint();
    const method = this.getTLSNotaryMethod();
    const headers = await this.getTLSNotaryHeaders(tab);
    
    return await tlsNotaryService.captureTLSProof(
      this.id,
      endpoint,
      method,
      headers
    );
  }

  /**
   * Helper: Execute script in tab context
   */
  protected async executeScript<T>(
    tabId: number,
    func: () => T
  ): Promise<T> {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: func as () => any
    });

    if (results.length === 0 || results[0].result === undefined) {
      throw new Error('Script execution failed');
    }

    return results[0].result as T;
  }

  /**
   * Helper: Get current tab
   */
  protected async getCurrentTab(): Promise<chrome.tabs.Tab> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }
    return tab;
  }
}

