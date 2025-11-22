/**
 * Twitter provider adapter
 */

import { BaseProviderAdapter } from './base';
import { ProviderId, SnapshotType, TwitterAttributes } from '../types';
import { TLSNotaryService } from '../services/tlsnotary';

export class TwitterAdapter extends BaseProviderAdapter {
  id: ProviderId = 'twitter';
  hostPatterns = ['*.twitter.com', '*.x.com'];
  snapshotType: SnapshotType = 'social';
  defaultExpiryDays = 30;

  getSnapshotType(): SnapshotType {
    return this.snapshotType;
  }

  getDefaultExpiry(): number {
    return this.defaultExpiryDays * 24 * 60 * 60 * 1000; // 30 days in ms
  }

  async isLoggedIn(tab: chrome.tabs.Tab): Promise<boolean> {
    if (!tab.id) return false;

    try {
      const isLoggedIn = await this.executeScript<boolean>(tab.id, () => {
        // Check for Twitter login indicators
        const authToken = document.cookie
          .split(';')
          .find(c => c.trim().startsWith('auth_token='));
        
        // Check for user menu or profile link
        const userMenu = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]') ||
                         document.querySelector('[aria-label*="Account menu"]');
        
        return !!(authToken || userMenu);
      });

      return isLoggedIn;
    } catch (error) {
      console.error('[TwitterAdapter] Error checking login status:', error);
      return false;
    }
  }

  async fetchAttributes(tab: chrome.tabs.Tab): Promise<TwitterAttributes> {
    if (!tab.id) {
      throw new Error('Tab ID required');
    }

    const raw = await this.executeScript<any>(tab.id, () => {
      // Try to extract from GraphQL API response (if available)
      // Fallback to DOM scraping
      
      // Method 1: Check for GraphQL data in window
      const gqlData = (window as any).__INITIAL_STATE__ || 
                      (window as any).__NEXT_DATA__;

      // Method 2: DOM scraping from profile page
      const followersText = document.querySelector('[data-testid="UserFollowersStat"]')?.textContent ||
                           document.querySelector('a[href*="/followers"]')?.textContent;
      
      const followingText = document.querySelector('[data-testid="UserFollowingStat"]')?.textContent ||
                           document.querySelector('a[href*="/following"]')?.textContent;

      // Check for blue check
      const blueCheck = !!document.querySelector('[data-testid="UserBadge"]') ||
                       !!document.querySelector('svg[aria-label*="Verified"]');

      // Check if follows AnyLayer (search for @AnyLayer in following)
      const followsAnyLayer = false; // Would need to check following list

      // Extract account creation date (if available)
      const accountAgeDays = 0; // Would need to parse from profile

      // Parse followers count
      let followers = 0;
      if (followersText) {
        const match = followersText.match(/([\d.]+)\s*(K|M|B)?/i);
        if (match) {
          let num = parseFloat(match[1]);
          const suffix = match[2]?.toUpperCase();
          if (suffix === 'K') num *= 1000;
          else if (suffix === 'M') num *= 1000000;
          else if (suffix === 'B') num *= 1000000000;
          followers = Math.floor(num);
        }
      }

      return {
        followers,
        hasBlueCheck: blueCheck,
        followsAnyLayer,
        accountAgeDays
      };
    });

    return this.normalizeAttributes(raw);
  }

  normalizeAttributes(raw: any): TwitterAttributes {
    return {
      followers: BigInt(Math.max(0, Math.floor(raw.followers || 0))),
      hasBlueCheck: Boolean(raw.hasBlueCheck),
      followsAnyLayer: Boolean(raw.followsAnyLayer),
      accountAgeDays: BigInt(Math.max(0, Math.floor(raw.accountAgeDays || 0)))
    };
  }

  /**
   * Get Twitter API endpoint for TLSNotary capture
   */
  getTLSNotaryEndpoint(): string {
    // Twitter API v2 endpoint for user profile
    return '/2/users/me?user.fields=public_metrics,verified,created_at';
  }

  /**
   * Get headers including auth token from browser
   */
  async getTLSNotaryHeaders(tab: chrome.tabs.Tab): Promise<Record<string, string>> {
    if (!tab.id) return {};

    try {
      // Extract auth token from cookies
      const cookies = await chrome.cookies.getAll({ domain: '.twitter.com' });
      const authToken = cookies.find(c => c.name === 'auth_token')?.value;
      
      if (authToken) {
        // Twitter API v2 uses Bearer token
        // Note: In production, you'd need to get the actual API bearer token
        // This is a placeholder - real implementation would extract from browser storage
        return {
          'Authorization': `Bearer ${authToken}`, // Placeholder
          'Content-Type': 'application/json',
        };
      }
    } catch (error) {
      console.error('[TwitterAdapter] Error getting headers:', error);
    }

    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch attributes using TLSNotary
   * This is the preferred method for generating snapshots
   */
  async fetchAttributesWithTLSNotary(tab: chrome.tabs.Tab): Promise<TwitterAttributes> {
    // Capture TLS proof (uses TLSNotaryService singleton)
    const tlsProof = await this.captureTLSProof(tab);
    
    // Extract attributes from TLSNotary response
    // Use singleton instance for consistency
    const { tlsNotaryService } = await import('../services/tlsnotary');
    const rawAttrs = tlsNotaryService.extractAttributes(tlsProof.response, this.id);
    
    return this.normalizeAttributes(rawAttrs);
  }
}

