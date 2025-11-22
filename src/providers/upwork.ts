import { BaseProviderAdapter } from './base';
import { ProviderId, SnapshotType, FreelanceAttributes } from '../types';

export class UpworkAdapter extends BaseProviderAdapter {
  id: ProviderId = 'upwork';
  hostPatterns = ['*.upwork.com'];
  snapshotType: SnapshotType = 'freelance';
  defaultExpiryDays = 180;

  getSnapshotType(): SnapshotType {
    return this.snapshotType;
  }

  getDefaultExpiry(): number {
    return this.defaultExpiryDays * 24 * 60 * 60 * 1000;
  }

  getTLSNotaryEndpoint(): string {
    return '/api/profiles/v1/providers/me';
  }

  async isLoggedIn(tab: chrome.tabs.Tab): Promise<boolean> {
    if (!tab.id) return false;
    try {
      return await this.executeScript<boolean>(tab.id, () => {
        const authToken = document.cookie.split(';').find(c => c.trim().startsWith('oauth_token='));
        return !!authToken;
      });
    } catch {
      return false;
    }
  }

  async fetchAttributes(tab: chrome.tabs.Tab): Promise<FreelanceAttributes> {
    if (!tab.id) throw new Error('Tab ID required');
    const raw = await this.executeScript<any>(tab.id, () => {
      const jobsText = document.querySelector('[class*="jobs-completed"]')?.textContent || '';
      const jobsMatch = jobsText.match(/([\d,]+)/);
      const completedJobs = jobsMatch ? parseInt(jobsMatch[1].replace(/,/g, ''), 10) : 0;
      
      const ratingText = document.querySelector('[class*="rating"]')?.textContent || '';
      const ratingMatch = ratingText.match(/([\d.]+)/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
      
      const earningsText = document.querySelector('[class*="earnings"]')?.textContent || '';
      const earningsMatch = earningsText.match(/([\d,]+)/);
      const earnings = earningsMatch ? parseInt(earningsMatch[1].replace(/,/g, ''), 10) : 0;
      
      let earningsBucket = 0;
      if (earnings >= 10000) earningsBucket = 2;
      else if (earnings >= 1000) earningsBucket = 1;
      
      return {
        completedJobs,
        ratingTimes10: Math.floor(rating * 10),
        earningsBucket
      };
    });
    return this.normalizeAttributes(raw);
  }

  normalizeAttributes(raw: any): FreelanceAttributes {
    return {
      completedJobs: BigInt(Math.max(0, Math.floor(raw.completedJobs || 0))),
      ratingTimes10: BigInt(Math.max(0, Math.min(50, Math.floor(raw.ratingTimes10 || 0)))),
      earningsBucket: BigInt(Math.max(0, Math.min(2, Math.floor(raw.earningsBucket || 0))))
    };
  }
}

