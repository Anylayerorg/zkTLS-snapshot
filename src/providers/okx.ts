import { BaseProviderAdapter } from './base';
import { ProviderId, SnapshotType, ExchangeAttributes } from '../types';

export class OKXAdapter extends BaseProviderAdapter {
  id: ProviderId = 'okx';
  hostPatterns = ['*.okx.com'];
  snapshotType: SnapshotType = 'kyc';
  defaultExpiryDays = 180;

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
        const authToken = document.cookie.split(';').find(c => c.trim().startsWith('token='));
        return !!authToken;
      });
    } catch {
      return false;
    }
  }

  async fetchAttributes(tab: chrome.tabs.Tab): Promise<ExchangeAttributes> {
    if (!tab.id) throw new Error('Tab ID required');
    const raw = await this.executeScript<any>(tab.id, () => {
      const kycLevelText = document.querySelector('[class*="kyc"]')?.textContent || '';
      const match = kycLevelText.match(/level\s*(\d+)/i);
      return {
        kycLevel: match ? parseInt(match[1], 10) : 0,
        countryCode: 0,
        isCorporate: false,
        accountAgeDays: 0
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

