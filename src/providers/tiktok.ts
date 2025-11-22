import { BaseProviderAdapter } from './base';
import { ProviderId, SnapshotType, CreatorAttributes } from '../types';

export class TikTokAdapter extends BaseProviderAdapter {
  id: ProviderId = 'tiktok';
  hostPatterns = ['*.tiktok.com'];
  snapshotType: SnapshotType = 'video';
  defaultExpiryDays = 90;

  getSnapshotType(): SnapshotType {
    return this.snapshotType;
  }

  getDefaultExpiry(): number {
    return this.defaultExpiryDays * 24 * 60 * 60 * 1000;
  }

  getTLSNotaryEndpoint(): string {
    return '/api/user/info';
  }

  async isLoggedIn(tab: chrome.tabs.Tab): Promise<boolean> {
    if (!tab.id) return false;
    try {
      return await this.executeScript<boolean>(tab.id, () => {
        const authToken = document.cookie.split(';').find(c => c.trim().startsWith('tt_chain_token='));
        return !!authToken;
      });
    } catch {
      return false;
    }
  }

  async fetchAttributes(tab: chrome.tabs.Tab): Promise<CreatorAttributes> {
    if (!tab.id) throw new Error('Tab ID required');
    const raw = await this.executeScript<any>(tab.id, () => {
      const followersText = document.querySelector('[class*="follower-count"]')?.textContent || '';
      const followersMatch = followersText.match(/([\d.]+)\s*(K|M|B)?/i);
      let followers = 0;
      if (followersMatch) {
        let num = parseFloat(followersMatch[1]);
        const suffix = followersMatch[2]?.toUpperCase();
        if (suffix === 'K') num *= 1000;
        else if (suffix === 'M') num *= 1000000;
        else if (suffix === 'B') num *= 1000000000;
        followers = Math.floor(num);
      }
      
      const viewsText = document.querySelector('[class*="video-views"]')?.textContent || '';
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
      
      let viewsBucket = 0;
      if (views >= 1000000) viewsBucket = 2;
      else if (views >= 100000) viewsBucket = 1;
      
      const partnerStatus = false; // TikTok Creator Fund status
      
      // Account age (would need to parse from channel creation date)
      const accountAgeDays = 0; // Placeholder - would need to extract from channel info
      
      return {
        subsOrFollowers: followers,
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

