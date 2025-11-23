/**
 * edX provider adapter
 */

import { BaseProviderAdapter } from './base';
import { ProviderId, SnapshotType } from '../types';
import { TLSNotaryService } from '../services/tlsnotary';

export interface EdXAttributes {
  username: string;
  coursesCompleted: number;
  certificatesEarned: number;
  coursesEnrolled: number;
  accountAgeDays: number;
}

export class EdXAdapter extends BaseProviderAdapter {
  id: ProviderId = 'edx';
  hostPatterns = ['edx.org', '*.edx.org'];
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
        // Check for edX session cookies
        const hasSessionCookie = document.cookie.split(';').some(c => 
          c.trim().startsWith('edxloggedin=') || 
          c.trim().startsWith('sessionid=') ||
          c.trim().startsWith('csrftoken=')
        );
        
        // Check for user menu
        const hasUserMenu = document.querySelector('.user-dropdown') !== null ||
                           document.querySelector('[data-testid="user-menu"]') !== null ||
                           document.querySelector('.global-header .dropdown-user-menu') !== null;
        
        const hasProfileLink = document.querySelector('a[href*="/u/"]') !== null ||
                              document.querySelector('a[href*="/dashboard"]') !== null;
        
        console.log('[edX Adapter] Login check:', { hasSessionCookie, hasUserMenu, hasProfileLink });
        
        return hasSessionCookie || hasUserMenu || hasProfileLink;
      });
    } catch (error) {
      console.error('[edX Adapter] Error checking login status:', error);
      return false;
    }
  }

  async fetchAttributes(tab: chrome.tabs.Tab): Promise<EdXAttributes> {
    if (!tab.id) {
      throw new Error('No tab ID');
    }

    const attributes = await this.executeScript<EdXAttributes>(tab.id, () => {
      // Get username from profile or user menu
      const usernameEl = document.querySelector('.user-dropdown .username') ||
                        document.querySelector('[data-testid="user-name"]') ||
                        document.querySelector('.profile-username');
      const username = usernameEl?.textContent?.trim() || '';

      // Count enrolled courses (from dashboard)
      const enrolledElements = document.querySelectorAll('.course-card') ||
                              document.querySelectorAll('[data-testid="enrolled-course"]');
      const coursesEnrolled = enrolledElements.length;

      // Count completed courses
      const completedElements = document.querySelectorAll('.course-card[data-status="completed"]') ||
                               document.querySelectorAll('.completed-course');
      const coursesCompleted = completedElements.length;

      // Count certificates (from accomplishments/certificates page)
      const certificateElements = document.querySelectorAll('.certificate-card') ||
                                 document.querySelectorAll('[data-testid="certificate"]');
      const certificatesEarned = certificateElements.length;

      // Account age (not easily available)
      const accountAgeDays = 0;

      return {
        username,
        coursesCompleted,
        certificatesEarned,
        coursesEnrolled,
        accountAgeDays
      };
    });

    return this.normalizeAttributes(attributes);
  }

  normalizeAttributes(raw: any): EdXAttributes {
    return {
      username: String(raw.username || ''),
      coursesCompleted: Number(raw.coursesCompleted || 0),
      certificatesEarned: Number(raw.certificatesEarned || 0),
      coursesEnrolled: Number(raw.coursesEnrolled || 0),
      accountAgeDays: Number(raw.accountAgeDays || 0)
    };
  }

  getTLSNotaryEndpoint(): string {
    return '/api/user/v1/me'; // edX API endpoint
  }
}
