/**
 * UAE PASS provider adapter
 */

import { BaseProviderAdapter } from './base';
import { ProviderId, SnapshotType, UAEPassAttributes } from '../types';

export class UAEPassAdapter extends BaseProviderAdapter {
  id: ProviderId = 'uaepass';
  hostPatterns = ['uaepass.ae', '*.uaepass.ae'];
  snapshotType: SnapshotType = 'kyc';
  defaultExpiryDays = 365;

  getSnapshotType(): SnapshotType {
    return this.snapshotType;
  }

  getDefaultExpiry(): number {
    return this.defaultExpiryDays * 24 * 60 * 60 * 1000;
  }

  async isLoggedIn(tab: chrome.tabs.Tab): Promise<boolean> {
    if (!tab.id) return false;
    
    try {
      return await this.executeScript<boolean>(tab.id, () => {
        // Check for UAE PASS session indicators
        const cookies = document.cookie.split(';');
        const hasSessionCookie = cookies.some(c => 
          c.trim().startsWith('sessionid=') ||
          c.trim().startsWith('csrftoken=') ||
          c.trim().startsWith('uaepass_')
        );
        
        // Check for logged-in user elements
        const domChecks = [
          document.querySelector('[data-testid="user-menu"]'),
          document.querySelector('.user-profile'),
          document.querySelector('[aria-label*="Account"]'),
          document.querySelector('button[aria-label*="Profile"]'),
          document.querySelector('.verified-account'),
          document.querySelector('[class*="user"]')
        ];
        const hasDomElement = domChecks.some(el => el !== null);
        
        // Check if page shows logged-in state
        const hasLoggedInContent = !!(
          document.querySelector('text*="Sign Documents"') ||
          document.querySelector('text*="Verify Documents"') ||
          document.querySelector('[href*="/profile"]') ||
          document.querySelector('[href*="/dashboard"]')
        );
        
        const isLoggedIn = hasSessionCookie || hasDomElement || hasLoggedInContent;
        console.log('[UAEPass Adapter] Login check:', { 
          hasSessionCookie, 
          hasDomElement, 
          hasLoggedInContent,
          isLoggedIn 
        });
        
        return isLoggedIn;
      });
    } catch (error) {
      console.error('[UAEPass Adapter] Error checking login status:', error);
      return false;
    }
  }

  async fetchAttributes(tab: chrome.tabs.Tab): Promise<UAEPassAttributes> {
    if (!tab.id) {
      throw new Error('Tab ID required');
    }

    const raw = await this.executeScript<any>(tab.id, () => {
      // Extract verification status
      const verifiedBadge = document.querySelector('.verified-account') ||
                           document.querySelector('[aria-label*="Verified"]') ||
                           document.querySelector('text*="Verified Account"');
      const verified = !!verifiedBadge;

      // Extract account level/type
      let accountLevel = 'basic';
      const levelText = document.querySelector('.account-level')?.textContent ||
                       document.querySelector('[data-testid="account-level"]')?.textContent;
      if (levelText) {
        if (levelText.toLowerCase().includes('premium')) accountLevel = 'premium';
        else if (levelText.toLowerCase().includes('verified')) accountLevel = 'verified';
      }

      // Try to get account age (if available)
      const accountAgeDays = 0; // Would need to parse from profile if available

      return {
        verified,
        accountLevel,
        accountAgeDays
      };
    });

    return this.normalizeAttributes(raw);
  }

  normalizeAttributes(raw: any): UAEPassAttributes {
    return {
      verified: Boolean(raw.verified || false),
      accountLevel: String(raw.accountLevel || 'basic'),
      accountAgeDays: Number(raw.accountAgeDays || 0)
    };
  }

  getTLSNotaryEndpoint(): string {
    return '/api/v1/user/profile'; // UAE PASS API endpoint
  }
}

