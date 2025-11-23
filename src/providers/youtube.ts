import { BaseProviderAdapter } from './base';
import { ProviderId, SnapshotType, CreatorAttributes } from '../types';

export class YouTubeAdapter extends BaseProviderAdapter {
  id: ProviderId = 'youtube';
  hostPatterns = ['youtube.com', '*.youtube.com'];
  snapshotType: SnapshotType = 'video';
  defaultExpiryDays = 90;

  getSnapshotType(): SnapshotType {
    return this.snapshotType;
  }

  getDefaultExpiry(): number {
    return this.defaultExpiryDays * 24 * 60 * 60 * 1000;
  }

  getTLSNotaryEndpoint(): string {
    return '/youtube/v3/channels?part=statistics&mine=true';
  }

  async isLoggedIn(tab: chrome.tabs.Tab): Promise<boolean> {
    if (!tab.id) return false;
    try {
      return await this.executeScript<boolean>(tab.id, () => {
        const authToken = document.cookie.split(';').find(c => c.trim().startsWith('LOGIN_INFO='));
        return !!authToken;
      });
    } catch {
      return false;
    }
  }

  async fetchAttributes(tab: chrome.tabs.Tab): Promise<CreatorAttributes> {
    if (!tab.id) throw new Error('Tab ID required');
    const raw = await this.executeScript<any>(tab.id, () => {
      const subsText = document.querySelector('[class*="subscriber-count"]')?.textContent || '';
      const subsMatch = subsText.match(/([\d.]+)\s*(K|M|B)?/i);
      let subs = 0;
      if (subsMatch) {
        let num = parseFloat(subsMatch[1]);
        const suffix = subsMatch[2]?.toUpperCase();
        if (suffix === 'K') num *= 1000;
        else if (suffix === 'M') num *= 1000000;
        else if (suffix === 'B') num *= 1000000000;
        subs = Math.floor(num);
      }
      
      const viewsText = document.querySelector('[class*="total-views"]')?.textContent || '';
      const viewsMatch = viewsText.match(/([\d.]+)\s*(K|M|B)?/i);
      let views = 0;
      if (viewsMatch) {
        let num = parseFloat(viewsMatch[1]);
        const suffix = viewsMatch[2]?.toUpperCase();
        if (suffix === 'K') num *= 1000;
        else if (suffix === 'M') num *= 1000000;
        else if (suffix === 'B') num *= 1000000000;
        views = Math.floor(num);
      }
      
      // Bucket views (0-100K, 100K-1M, 1M+)
      let viewsBucket = 0;
      if (views >= 1000000) viewsBucket = 2;
      else if (views >= 100000) viewsBucket = 1;
      
      const partnerStatus = !!document.querySelector('[class*="partner-badge"]');
      
      // Account age (would need to parse from channel creation date)
      const accountAgeDays = 0; // Placeholder - would need to extract from channel info
      
      return {
        subsOrFollowers: subs,
        totalViewsBucket: viewsBucket,
        partnerStatus,
        accountAgeDays
      };
    });
    return this.normalizeAttributes(raw);
  }

  normalizeAttributes(raw: any): CreatorAttributes {
    return {
      subsOrFollowers: BigInt(Math.max(0, Math.floor(raw.subsOrFollowers || 0))),
      totalViewsBucket: BigInt(Math.max(0, Math.min(2, Math.floor(raw.totalViewsBucket || 0)))),
      partnerStatus: Boolean(raw.partnerStatus),
      accountAgeDays: BigInt(Math.max(0, Math.floor(raw.accountAgeDays || 0)))
    };
  }
}

