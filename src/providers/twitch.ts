import { BaseProviderAdapter } from './base';
import { ProviderId, SnapshotType, CreatorAttributes } from '../types';

export class TwitchAdapter extends BaseProviderAdapter {
  id: ProviderId = 'twitch';
  hostPatterns = ['*.twitch.tv'];
  snapshotType: SnapshotType = 'streaming';
  defaultExpiryDays = 90;

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
        const authToken = document.cookie.split(';').find(c => c.trim().startsWith('auth-token='));
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
      const followersMatch = followersText.match(/([\d,]+)/);
      const followers = followersMatch ? parseInt(followersMatch[1].replace(/,/g, ''), 10) : 0;
      
      const viewsText = document.querySelector('[class*="view-count"]')?.textContent || '';
      const viewsMatch = viewsText.match(/([\d,]+)/);
      const views = viewsMatch ? parseInt(viewsMatch[1].replace(/,/g, ''), 10) : 0;
      
      let viewsBucket = 0;
      if (views >= 1000000) viewsBucket = 2;
      else if (views >= 100000) viewsBucket = 1;
      
      const partnerStatus = !!document.querySelector('[class*="partner-badge"]');
      
      return {
        subsOrFollowers: followers,
        totalViewsBucket: viewsBucket,
        partnerStatus
      };
    });
    return this.normalizeAttributes(raw);
  }

  normalizeAttributes(raw: any): CreatorAttributes {
    return {
      subsOrFollowers: BigInt(Math.max(0, Math.floor(raw.subsOrFollowers || 0))),
      totalViewsBucket: BigInt(Math.max(0, Math.min(2, Math.floor(raw.totalViewsBucket || 0)))),
      partnerStatus: Boolean(raw.partnerStatus)
    };
  }
}

