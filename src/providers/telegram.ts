/**
 * Telegram provider adapter
 */

import { BaseProviderAdapter } from './base';
import { ProviderId, SnapshotType } from '../types';
import { TLSNotaryService } from '../services/tlsnotary';

export interface TelegramAttributes {
  username: string;
  accountAgeDays: number;
  groupMemberships: number;
  channelSubscriptions: number;
}

export class TelegramAdapter extends BaseProviderAdapter {
  id: ProviderId = 'telegram';
  hostPatterns = ['web.telegram.org', '*.web.telegram.org', 'telegram.org', '*.telegram.org'];
  snapshotType: SnapshotType = 'social';
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
        // Check for Telegram Web logged-in indicators
        const hasUserPanel = document.querySelector('.UserPanel') !== null ||
                            document.querySelector('.user-panel') !== null ||
                            document.querySelector('.profile-info') !== null;
        
        const hasChatList = document.querySelector('.chat-list') !== null ||
                           document.querySelector('.ChatList') !== null ||
                           document.querySelector('#column-left') !== null;
        
        const hasMessages = document.querySelector('.messages-container') !== null ||
                           document.querySelector('.MessagesList') !== null;
        
        console.log('[Telegram Adapter] Login check:', { hasUserPanel, hasChatList, hasMessages });
        
        return hasUserPanel || (hasChatList && hasMessages);
      });
    } catch (error) {
      console.error('[Telegram Adapter] Error checking login status:', error);
      return false;
    }
  }

  async fetchAttributes(tab: chrome.tabs.Tab): Promise<TelegramAttributes> {
    if (!tab.id) {
      throw new Error('No tab ID');
    }

    const attributes = await this.executeScript<TelegramAttributes>(tab.id, () => {
      // Get username from profile (if visible)
      const usernameEl = document.querySelector('.user-title .username') ||
                        document.querySelector('.profile-username') ||
                        document.querySelector('[data-peer-id]');
      const username = usernameEl?.textContent?.trim().replace('@', '') || '';

      // Count group memberships (chats with group icon)
      const groupElements = document.querySelectorAll('.chat-item[data-type="group"]') ||
                           document.querySelectorAll('.chat-list-item.group');
      const groupMemberships = groupElements.length;

      // Count channel subscriptions
      const channelElements = document.querySelectorAll('.chat-item[data-type="channel"]') ||
                             document.querySelectorAll('.chat-list-item.channel');
      const channelSubscriptions = channelElements.length;

      // Account age is hard to get from Telegram Web, set to 0 for now
      // Could be enhanced by checking join dates of oldest messages
      const accountAgeDays = 0;

      return {
        username,
        accountAgeDays,
        groupMemberships,
        channelSubscriptions
      };
    });

    return this.normalizeAttributes(attributes);
  }

  normalizeAttributes(raw: any): TelegramAttributes {
    return {
      username: String(raw.username || ''),
      accountAgeDays: Number(raw.accountAgeDays || 0),
      groupMemberships: Number(raw.groupMemberships || 0),
      channelSubscriptions: Number(raw.channelSubscriptions || 0)
    };
  }

  getTLSNotaryEndpoint(): string {
    return '/'; // Telegram Web doesn't have a simple API endpoint
  }
}
