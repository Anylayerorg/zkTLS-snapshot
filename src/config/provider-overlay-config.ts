/**
 * Provider-specific overlay configuration
 * Defines guides and conditions for each provider
 */

import type { ProviderId } from '../types';

export interface ProviderOverlayConfig {
  guide: string;
  conditions: string[];
  providerName: string;
}

/**
 * Provider overlay configurations
 */
export const PROVIDER_OVERLAY_CONFIGS: Record<ProviderId, ProviderOverlayConfig> = {
  twitter: {
    providerName: 'Twitter/X',
    guide: 'When you successfully log in to Twitter/X, please click the "Start" button below to initiate the verification process. This will capture your Twitter profile data using zero-knowledge TLS proofs.',
    conditions: [
      'Twitter/X account is logged in',
      'Wallet is connected',
      'Account has been active for at least 30 days'
    ]
  },
  binance: {
    providerName: 'Binance',
    guide: 'When you successfully log in to Binance, please click the "Start" button below to initiate the verification process. This will capture your KYC level and account information using zero-knowledge TLS proofs.',
    conditions: [
      'Binance account is logged in',
      'Wallet is connected',
      'Account has completed at least basic KYC verification'
    ]
  },
  okx: {
    providerName: 'OKX',
    guide: 'When you successfully log in to OKX, please click the "Start" button below to initiate the verification process. This will capture your KYC level and account information using zero-knowledge TLS proofs.',
    conditions: [
      'OKX account is logged in',
      'Wallet is connected',
      'Account has completed at least basic KYC verification'
    ]
  },
  kucoin: {
    providerName: 'KuCoin',
    guide: 'When you successfully log in to KuCoin, please click the "Start" button below to initiate the verification process. This will capture your KYC level and account information using zero-knowledge TLS proofs.',
    conditions: [
      'KuCoin account is logged in',
      'Wallet is connected',
      'Account has completed at least basic KYC verification'
    ]
  },
  coinbase: {
    providerName: 'Coinbase',
    guide: 'When you successfully log in to Coinbase, please click the "Start" button below to initiate the verification process. This will capture your KYC level and account information using zero-knowledge TLS proofs.',
    conditions: [
      'Coinbase account is logged in',
      'Wallet is connected',
      'Account has completed at least basic KYC verification'
    ]
  },
  linkedin: {
    providerName: 'LinkedIn',
    guide: 'When you successfully log in to LinkedIn, please click the "Start" button below to initiate the verification process. This will capture your professional profile and connections using zero-knowledge TLS proofs.',
    conditions: [
      'LinkedIn account is logged in',
      'Wallet is connected',
      'Profile has at least 10 connections'
    ]
  },
  fiverr: {
    providerName: 'Fiverr',
    guide: 'When you successfully log in to Fiverr, please click the "Start" button below to initiate the verification process. This will capture your freelancer profile and work history using zero-knowledge TLS proofs.',
    conditions: [
      'Fiverr account is logged in',
      'Wallet is connected',
      'Account has completed at least 1 job'
    ]
  },
  upwork: {
    providerName: 'Upwork',
    guide: 'When you successfully log in to Upwork, please click the "Start" button below to initiate the verification process. This will capture your freelancer profile and work history using zero-knowledge TLS proofs.',
    conditions: [
      'Upwork account is logged in',
      'Wallet is connected',
      'Account has completed at least 1 job'
    ]
  },
  youtube: {
    providerName: 'YouTube',
    guide: 'When you successfully log in to YouTube, please click the "Start" button below to initiate the verification process. This will capture your channel statistics and subscriber count using zero-knowledge TLS proofs.',
    conditions: [
      'YouTube account is logged in',
      'Wallet is connected',
      'Channel has at least 100 subscribers'
    ]
  },
  tiktok: {
    providerName: 'TikTok',
    guide: 'When you successfully log in to TikTok, please click the "Start" button below to initiate the verification process. This will capture your creator profile and follower count using zero-knowledge TLS proofs.',
    conditions: [
      'TikTok account is logged in',
      'Wallet is connected',
      'Account has at least 100 followers'
    ]
  },
  twitch: {
    providerName: 'Twitch',
    guide: 'When you successfully log in to Twitch, please click the "Start" button below to initiate the verification process. This will capture your streamer profile and follower count using zero-knowledge TLS proofs.',
    conditions: [
      'Twitch account is logged in',
      'Wallet is connected',
      'Account has at least 50 followers'
    ]
  }
};

/**
 * Get overlay configuration for a provider
 */
export function getProviderOverlayConfig(providerId: ProviderId): ProviderOverlayConfig {
  return PROVIDER_OVERLAY_CONFIGS[providerId] || {
    providerName: providerId,
    guide: 'Please click the "Start" button below to initiate the verification process.',
    conditions: [
      `${providerId} account is logged in`,
      'Wallet is connected'
    ]
  };
}

