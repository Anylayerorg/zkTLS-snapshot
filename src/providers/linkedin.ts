import { BaseProviderAdapter } from './base';
import { ProviderId, SnapshotType, LinkedInAttributes } from '../types';

export class LinkedInAdapter extends BaseProviderAdapter {
  id: ProviderId = 'linkedin';
  hostPatterns = ['*.linkedin.com'];
  snapshotType: SnapshotType = 'employment';
  defaultExpiryDays = 365;

  getSnapshotType(): SnapshotType {
    return this.snapshotType;
  }

  getDefaultExpiry(): number {
    return this.defaultExpiryDays * 24 * 60 * 60 * 1000;
  }

  getTLSNotaryEndpoint(): string {
    return '/v2/me';
  }

  async isLoggedIn(tab: chrome.tabs.Tab): Promise<boolean> {
    if (!tab.id) return false;
    try {
      return await this.executeScript<boolean>(tab.id, () => {
        const authToken = document.cookie.split(';').find(c => c.trim().startsWith('li_at='));
        return !!authToken;
      });
    } catch {
      return false;
    }
  }

  async fetchAttributes(tab: chrome.tabs.Tab): Promise<LinkedInAttributes> {
    if (!tab.id) throw new Error('Tab ID required');
    const raw = await this.executeScript<any>(tab.id, () => {
      const connectionsText = document.querySelector('[class*="connections"]')?.textContent || '';
      const match = connectionsText.match(/([\d,]+)/);
      const connections = match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
      
      const headline = document.querySelector('[class*="headline"]')?.textContent || '';
      const headlineHash = headline.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      
      // Account age (would need to parse from profile creation date)
      const accountAgeDays = 0; // Placeholder - would need to extract from profile
      
      return {
        connections,
        headlineHash,
        hasVerifiedEmail: false,
        accountAgeDays
      };
    });
    return this.normalizeAttributes(raw);
  }

  normalizeAttributes(raw: any): LinkedInAttributes {
    return {
      connections: BigInt(Math.max(0, Math.floor(raw.connections || 0))),
      headlineHash: BigInt(Math.max(0, Math.floor(raw.headlineHash || 0))),
      hasVerifiedEmail: Boolean(raw.hasVerifiedEmail),
      accountAgeDays: BigInt(Math.max(0, Math.floor(raw.accountAgeDays || 0)))
    };
  }
}

