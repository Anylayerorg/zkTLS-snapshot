/**
 * Udemy provider adapter
 */

import { BaseProviderAdapter } from './base';
import { ProviderId, SnapshotType } from '../types';
import { TLSNotaryService } from '../services/tlsnotary';

export interface UdemyAttributes {
  username: string;
  coursesCompleted: number;
  certificatesEarned: number;
  coursesEnrolled: number;
  accountAgeDays: number;
}

export class UdemyAdapter extends BaseProviderAdapter {
  id: ProviderId = 'udemy';
  hostPatterns = ['udemy.com', '*.udemy.com'];
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
        // Check for Udemy session cookies
        const hasSessionCookie = document.cookie.split(';').some(c => 
          c.trim().startsWith('access_token=') || 
          c.trim().startsWith('ud_user_jwt=') ||
          c.trim().startsWith('client_id=')
        );
        
        // Check for user menu/avatar
        const hasUserMenu = document.querySelector('[data-purpose="user-dropdown"]') !== null ||
                           document.querySelector('.user-profile-dropdown') !== null ||
                           document.querySelector('button[data-purpose="user-avatar"]') !== null;
        
        const hasProfileLink = document.querySelector('a[href*="/user/"]') !== null ||
                              document.querySelector('a[href="/home/my-courses/"]') !== null;
        
        console.log('[Udemy Adapter] Login check:', { hasSessionCookie, hasUserMenu, hasProfileLink });
        
        return hasSessionCookie || hasUserMenu || hasProfileLink;
      });
    } catch (error) {
      console.error('[Udemy Adapter] Error checking login status:', error);
      return false;
    }
  }

  async fetchAttributes(tab: chrome.tabs.Tab): Promise<UdemyAttributes> {
    if (!tab.id) {
      throw new Error('No tab ID');
    }

    const attributes = await this.executeScript<UdemyAttributes>(tab.id, () => {
      // Get username from profile or user menu
      const usernameEl = document.querySelector('[data-purpose="user-dropdown"] span') ||
                        document.querySelector('.user-profile-dropdown__name') ||
                        document.querySelector('meta[name="user-display-name"]');
      const username = usernameEl?.textContent?.trim() || 
                      (usernameEl as HTMLMetaElement)?.content || '';

      // Count enrolled courses (from My Learning page)
      const enrolledElements = document.querySelectorAll('[data-purpose="enrolled-course-card"]') ||
                              document.querySelectorAll('.my-courses__course-card');
      const coursesEnrolled = enrolledElements.length;

      // Count completed courses (courses with 100% progress or completion badge)
      const completedElements = document.querySelectorAll('[data-purpose="progress-bar"][aria-valuenow="100"]') ||
                               document.querySelectorAll('.course-card--completed');
      const coursesCompleted = completedElements.length;

      // Count certificates (from certificates page)
      const certificateElements = document.querySelectorAll('[data-purpose="certificate-card"]') ||
                                 document.querySelectorAll('.certificate-item');
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

  normalizeAttributes(raw: any): UdemyAttributes {
    return {
      username: String(raw.username || ''),
      coursesCompleted: Number(raw.coursesCompleted || 0),
      certificatesEarned: Number(raw.certificatesEarned || 0),
      coursesEnrolled: Number(raw.coursesEnrolled || 0),
      accountAgeDays: Number(raw.accountAgeDays || 0)
    };
  }

  getTLSNotaryEndpoint(): string {
    return '/api-2.0/users/me'; // Udemy API endpoint
  }
}
