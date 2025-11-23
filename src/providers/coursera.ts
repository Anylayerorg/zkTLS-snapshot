/**
 * Coursera provider adapter
 */

import { BaseProviderAdapter } from './base';
import { ProviderId, SnapshotType } from '../types';
import { TLSNotaryService } from '../services/tlsnotary';

export interface CourseraAttributes {
  username: string;
  coursesCompleted: number;
  certificatesEarned: number;
  coursesEnrolled: number;
  accountAgeDays: number;
}

export class CourseraAdapter extends BaseProviderAdapter {
  id: ProviderId = 'coursera';
  hostPatterns = ['coursera.org', '*.coursera.org'];
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
        // Check for Coursera session cookies
        const hasSessionCookie = document.cookie.split(';').some(c => 
          c.trim().startsWith('CAUTH=') || c.trim().startsWith('session')
        );
        
        // Check for user profile elements
        const hasUserMenu = document.querySelector('[data-testid="user-menu"]') !== null ||
                           document.querySelector('.rc-ProfileNavMenu') !== null ||
                           document.querySelector('button[aria-label*="account"]') !== null;
        
        const hasProfileLink = document.querySelector('a[href*="/account/profile"]') !== null ||
                              document.querySelector('a[href*="/user/"]') !== null;
        
        console.log('[Coursera Adapter] Login check:', { hasSessionCookie, hasUserMenu, hasProfileLink });
        
        return hasSessionCookie || hasUserMenu || hasProfileLink;
      });
    } catch (error) {
      console.error('[Coursera Adapter] Error checking login status:', error);
      return false;
    }
  }

  async fetchAttributes(tab: chrome.tabs.Tab): Promise<CourseraAttributes> {
    if (!tab.id) {
      throw new Error('No tab ID');
    }

    const attributes = await this.executeScript<CourseraAttributes>(tab.id, () => {
      // Get username from profile page or meta tags
      const usernameEl = document.querySelector('.profile-name') ||
                        document.querySelector('[data-test="profile-name"]') ||
                        document.querySelector('meta[property="profile:username"]');
      const username = usernameEl?.textContent?.trim() || 
                      (usernameEl as HTMLMetaElement)?.content || '';

      // Count completed courses (from accomplishments page)
      const completedElements = document.querySelectorAll('.rc-AccomplishmentCard') ||
                               document.querySelectorAll('[data-test="course-card"][data-status="completed"]');
      const coursesCompleted = completedElements.length;

      // Count certificates
      const certificateElements = document.querySelectorAll('.rc-CertificateCard') ||
                                 document.querySelectorAll('[data-test="certificate"]');
      const certificatesEarned = certificateElements.length;

      // Count enrolled courses
      const enrolledElements = document.querySelectorAll('.rc-EnrolledCourseCard') ||
                              document.querySelectorAll('[data-test="enrolled-course"]');
      const coursesEnrolled = enrolledElements.length;

      // Account age (hard to determine from UI)
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

  normalizeAttributes(raw: any): CourseraAttributes {
    return {
      username: String(raw.username || ''),
      coursesCompleted: Number(raw.coursesCompleted || 0),
      certificatesEarned: Number(raw.certificatesEarned || 0),
      coursesEnrolled: Number(raw.coursesEnrolled || 0),
      accountAgeDays: Number(raw.accountAgeDays || 0)
    };
  }

  getTLSNotaryEndpoint(): string {
    return '/api/user/profile'; // Coursera API endpoint
  }
}
