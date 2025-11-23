/**
 * Binance provider adapter
 */

import { BaseProviderAdapter } from './base';
import { ProviderId, SnapshotType, ExchangeAttributes } from '../types';

export class BinanceAdapter extends BaseProviderAdapter {
  id: ProviderId = 'binance';
  hostPatterns = ['binance.com', '*.binance.com'];
  snapshotType: SnapshotType = 'kyc';
  defaultExpiryDays = 180;

  getSnapshotType(): SnapshotType {
    return this.snapshotType;
  }

  getTLSNotaryEndpoint(): string {
    // Binance API endpoint for account info
    return '/api/v3/account';
  }

  getDefaultExpiry(): number {
    return this.defaultExpiryDays * 24 * 60 * 60 * 1000; // 180 days in ms
  }

  async isLoggedIn(tab: chrome.tabs.Tab): Promise<boolean> {
    if (!tab.id) return false;

    try {
      const isLoggedIn = await this.executeScript<boolean>(tab.id, () => {
        // Check for Binance login indicators
        const authToken = document.cookie
          .split(';')
          .find(c => c.trim().startsWith('auth_token=') || c.trim().startsWith('token='));
        
        // Check for user menu
        const userMenu = document.querySelector('[class*="user-menu"]') ||
                         document.querySelector('[data-testid="user-menu"]');
        
        return !!(authToken || userMenu);
      });

      return isLoggedIn;
    } catch (error) {
      console.error('[BinanceAdapter] Error checking login status:', error);
      return false;
    }
  }

  async fetchAttributes(tab: chrome.tabs.Tab): Promise<ExchangeAttributes> {
    if (!tab.id) {
      throw new Error('Tab ID required');
    }

    const raw = await this.executeScript<any>(tab.id, () => {
      // Navigate to account/security or KYC page
      // Extract KYC level from page
      
      // Method 1: Check KYC status page
      const kycLevelText = document.querySelector('[class*="kyc-level"]')?.textContent ||
                          document.querySelector('[data-testid="kyc-level"]')?.textContent ||
                          document.querySelector('span:contains("Level")')?.textContent;

      // Method 2: Check account settings
      const accountInfo = document.querySelector('[class*="account-info"]')?.textContent;

      // Parse KYC level (0 = unverified, 1 = basic, 2 = intermediate, 3 = advanced)
      let kycLevel = 0;
      if (kycLevelText) {
        const match = kycLevelText.match(/level\s*(\d+)/i) || 
                     kycLevelText.match(/kyc\s*(\d+)/i);
        if (match) {
          kycLevel = parseInt(match[1], 10);
        }
      }

      // Extract country code (if available)
      const countryCode = 0; // Would need to parse from profile

      // Check if corporate account
      const isCorporate = false; // Would need to check account type

      // Account age (if available)
      const accountAgeDays = 0; // Would need to parse from registration date

      return {
        kycLevel,
        countryCode,
        isCorporate,
        accountAgeDays
      };
    });

    return this.normalizeAttributes(raw);
  }

  normalizeAttributes(raw: any): ExchangeAttributes {
    return {
      kycLevel: BigInt(Math.max(0, Math.min(3, Math.floor(raw.kycLevel || 0)))),
      countryCode: BigInt(Math.max(0, Math.floor(raw.countryCode || 0))),
      isCorporate: Boolean(raw.isCorporate),
      accountAgeDays: BigInt(Math.max(0, Math.floor(raw.accountAgeDays || 0)))
    };
  }
}

