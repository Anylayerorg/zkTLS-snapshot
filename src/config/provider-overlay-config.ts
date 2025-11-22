/**
 * Provider-specific overlay configuration
 * Defines guides and conditions for each provider
 */

import type { ProviderId } from '../types';

export interface ProviderOverlayConfig {
  guide: string;
  conditions: Array<{
    text: string;
    link?: string; // Optional clickable link
  }>;
  providerName: string;
  requiredPage?: string; // URL or page description user should be on
  dataVerified: string[]; // What data we'll verify (not collect!)
}

/**
 * Provider overlay configurations
 */
export const PROVIDER_OVERLAY_CONFIGS: Record<ProviderId, ProviderOverlayConfig> = {
  twitter: {
    providerName: 'Twitter/X',
    requiredPage: 'Navigate to your profile page (x.com/your_username)',
    guide: 'Your browser will create an encrypted proof of your profile data. Nothing is sent to our servers.',
    dataVerified: [
      'Follower count',
      'Account creation date',
      'Verification badge status',
      'Following @AnyLayerOrg status'
    ],
    conditions: [
      { text: 'Logged in to Twitter/X' },
      { text: 'On your profile page' },
      { text: 'Follow @AnyLayerOrg', link: 'https://x.com/anylayerorg' },
      { text: 'Wallet connected' }
    ]
  },
  binance: {
    providerName: 'Binance',
    requiredPage: 'Navigate to Account > Identification',
    guide: 'We will capture your KYC verification level from your account identification page.',
    dataVerified: [
      'KYC verification level',
      'Account status',
      'Verification timestamp'
    ],
    conditions: [
      { text: 'Logged in to Binance' },
      { text: 'On Identification page' },
      { text: 'Completed at least Basic KYC' },
      { text: 'Wallet connected' }
    ]
  },
  okx: {
    providerName: 'OKX',
    requiredPage: 'Navigate to Profile > Verification',
    guide: 'We will capture your KYC verification level from your verification page.',
    dataVerified: [
      'KYC verification level',
      'Account status'
    ],
    conditions: [
      { text: 'Logged in to OKX' },
      { text: 'On Verification page' },
      { text: 'Completed at least Basic KYC' },
      { text: 'Wallet connected' }
    ]
  },
  kucoin: {
    providerName: 'KuCoin',
    requiredPage: 'Navigate to Account > KYC Verification',
    guide: 'We will capture your KYC verification level from your KYC verification page.',
    dataVerified: [
      'KYC verification level',
      'Account status'
    ],
    conditions: [
      { text: 'Logged in to KuCoin' },
      { text: 'On KYC Verification page' },
      { text: 'Completed at least Basic KYC' },
      { text: 'Wallet connected' }
    ]
  },
  coinbase: {
    providerName: 'Coinbase',
    requiredPage: 'Navigate to Settings > Security',
    guide: 'We will capture your identity verification status from your security settings.',
    dataVerified: [
      'Identity verification level',
      'Account status'
    ],
    conditions: [
      { text: 'Logged in to Coinbase' },
      { text: 'On Security settings' },
      { text: 'Completed identity verification' },
      { text: 'Wallet connected' }
    ]
  },
  linkedin: {
    providerName: 'LinkedIn',
    requiredPage: 'Navigate to your profile page',
    guide: 'We will capture your professional profile data including connections and experience from your profile page.',
    dataVerified: [
      'Connection count',
      'Profile headline',
      'Experience summary'
    ],
    conditions: [
      { text: 'Logged in to LinkedIn' },
      { text: 'On your profile page' },
      { text: 'At least 10 connections' },
      { text: 'Wallet connected' }
    ]
  },
  fiverr: {
    providerName: 'Fiverr',
    requiredPage: 'Navigate to your seller profile',
    guide: 'We will capture your freelancer stats including completed jobs and ratings from your profile.',
    dataVerified: [
      'Completed jobs count',
      'Seller rating',
      'Account level'
    ],
    conditions: [
      { text: 'Logged in to Fiverr' },
      { text: 'On your seller profile' },
      { text: 'Completed at least 1 job' },
      { text: 'Wallet connected' }
    ]
  },
  upwork: {
    providerName: 'Upwork',
    requiredPage: 'Navigate to your freelancer profile',
    guide: 'We will capture your work history and stats from your freelancer profile page.',
    dataVerified: [
      'Jobs completed',
      'Success rate',
      'Total earnings tier'
    ],
    conditions: [
      { text: 'Logged in to Upwork' },
      { text: 'On your profile page' },
      { text: 'Completed at least 1 job' },
      { text: 'Wallet connected' }
    ]
  },
  youtube: {
    providerName: 'YouTube',
    requiredPage: 'Navigate to your channel page or YouTube Studio',
    guide: 'We will capture your channel statistics including subscribers and total views from your channel page.',
    dataVerified: [
      'Subscriber count',
      'Total video views',
      'Channel creation date',
      'Partnership status'
    ],
    conditions: [
      { text: 'Logged in to YouTube' },
      { text: 'On your channel page' },
      { text: 'At least 100 subscribers' },
      { text: 'Wallet connected' }
    ]
  },
  tiktok: {
    providerName: 'TikTok',
    requiredPage: 'Navigate to your profile page',
    guide: 'We will capture your creator stats including followers and total views from your profile page.',
    dataVerified: [
      'Follower count',
      'Total video views',
      'Account creation date'
    ],
    conditions: [
      { text: 'Logged in to TikTok' },
      { text: 'On your profile page' },
      { text: 'At least 100 followers' },
      { text: 'Wallet connected' }
    ]
  },
  twitch: {
    providerName: 'Twitch',
    requiredPage: 'Navigate to your channel page',
    guide: 'We will capture your streamer stats including followers and view count from your channel page.',
    dataVerified: [
      'Follower count',
      'Total views',
      'Partner status'
    ],
    conditions: [
      { text: 'Logged in to Twitch' },
      { text: 'On your channel page' },
      { text: 'At least 50 followers' },
      { text: 'Wallet connected' }
    ]
  }
};

/**
 * Get overlay configuration for a provider
 */
export function getProviderOverlayConfig(providerId: ProviderId): ProviderOverlayConfig {
  return PROVIDER_OVERLAY_CONFIGS[providerId] || {
    providerName: providerId,
    guide: 'Please navigate to the appropriate page and click "Start" to begin verification.',
    dataVerified: ['Profile information'],
    conditions: [
      { text: `${providerId} account is logged in` },
      { text: 'Wallet connected' }
    ]
  };
}

