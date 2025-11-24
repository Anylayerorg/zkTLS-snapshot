/**
 * GitHub provider adapter
 */

import { BaseProviderAdapter } from './base';
import { ProviderId, SnapshotType } from '../types';
import { TLSNotaryService } from '../services/tlsnotary';

export interface GitHubAttributes {
  username: string;
  contributions: number;
  publicRepos: number;
  followers: number;
  following: number;
  orgMemberships: number;
  accountAgeDays: number;
}

export class GitHubAdapter extends BaseProviderAdapter {
  id: ProviderId = 'github';
  hostPatterns = ['github.com', '*.github.com'];
  snapshotType: SnapshotType = 'education';
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
        // Check for GitHub session cookie
        const cookies = document.cookie.split(';');
        const hasUserSession = cookies.some(c => 
          c.trim().startsWith('user_session=') || 
          c.trim().startsWith('logged_in=') ||
          c.trim().startsWith('_gh_sess=')
        );
        
        // Check for user menu in DOM (comprehensive checks like overlay)
        const domChecks = [
          document.querySelector('[data-test-selector="nav-avatar"]'),
          document.querySelector('.Header-link[href^="/settings"]'),
          document.querySelector('meta[name="user-login"]'),
          document.querySelector('button[aria-label*="Account"]'),
          document.querySelector('summary[aria-label*="Account"]'),
          document.querySelector('.Header-item[href*="/settings"]'),
          document.querySelector('[data-testid="avatar-button"]')
        ];
        const hasUserMenu = domChecks.some(el => el !== null);
        
        // Also check for dashboard-specific elements
        const hasDashboardElements = !!(
          document.querySelector('[data-testid="dashboard"]') ||
          document.querySelector('.dashboard-sidebar') ||
          document.querySelector('nav[aria-label="User account"]')
        );
        
        const isLoggedIn = hasUserSession || hasUserMenu || hasDashboardElements;
        console.log('[GitHub Adapter] Login check:', { 
          hasUserSession, 
          hasUserMenu, 
          hasDashboardElements,
          isLoggedIn 
        });
        
        return isLoggedIn;
      });
    } catch (error) {
      console.error('[GitHub Adapter] Error checking login status:', error);
      return false;
    }
  }

  async fetchAttributes(tab: chrome.tabs.Tab): Promise<GitHubAttributes> {
    if (!tab.id) {
      throw new Error('No tab ID');
    }

    const attributes = await this.executeScript<GitHubAttributes>(tab.id, () => {
      // Get username from meta tag or profile page
      const usernameMeta = document.querySelector('meta[name="user-login"]') as HTMLMetaElement;
      const username = usernameMeta?.content || '';

      // Get contribution count (from profile page)
      const contributionsEl = document.querySelector('.js-yearly-contributions h2');
      const contributionsText = contributionsEl?.textContent || '0';
      const contributionsMatch = contributionsText.match(/[\d,]+/);
      const contributions = parseInt(contributionsMatch ? contributionsMatch[0].replace(/,/g, '') : '0', 10);

      // Get public repos count
      const reposEl = document.querySelector('a[data-tab-item="repositories"] span.Counter') ||
                      document.querySelector('.Counter[title*="public repositories"]');
      const publicRepos = parseInt(reposEl?.textContent?.trim() || '0', 10);

      // Get followers count
      const followersEl = document.querySelector('a[href*="/followers"] span.text-bold') ||
                          document.querySelector('.vcard-stat[href*="/followers"] .text-bold');
      const followers = parseInt(followersEl?.textContent?.trim().replace(/,/g, '') || '0', 10);

      // Get following count
      const followingEl = document.querySelector('a[href*="/following"] span.text-bold') ||
                          document.querySelector('.vcard-stat[href*="/following"] .text-bold');
      const following = parseInt(followingEl?.textContent?.trim().replace(/,/g, '') || '0', 10);

      // Get organization memberships
      const orgElements = document.querySelectorAll('a[data-hovercard-type="organization"]');
      const orgMemberships = orgElements.length;

      // Try to get account age from profile page
      const joinedDateEl = document.querySelector('relative-time');
      let accountAgeDays = 0;
      if (joinedDateEl) {
        const joinedDate = new Date(joinedDateEl.getAttribute('datetime') || '');
        const now = new Date();
        accountAgeDays = Math.floor((now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        username,
        contributions,
        publicRepos,
        followers,
        following,
        orgMemberships,
        accountAgeDays
      };
    });

    return this.normalizeAttributes(attributes);
  }

  normalizeAttributes(raw: any): GitHubAttributes {
    return {
      username: String(raw.username || ''),
      contributions: Number(raw.contributions || 0),
      publicRepos: Number(raw.publicRepos || 0),
      followers: Number(raw.followers || 0),
      following: Number(raw.following || 0),
      orgMemberships: Number(raw.orgMemberships || 0),
      accountAgeDays: Number(raw.accountAgeDays || 0)
    };
  }

  getTLSNotaryEndpoint(): string {
    return '/user'; // GitHub API endpoint for authenticated user
  }
}
