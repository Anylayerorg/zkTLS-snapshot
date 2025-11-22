/**
 * Local Human Scoring Service
 * Computes scores locally in extension to avoid sending raw metrics to backend
 * Uses same logic as backend HumanScoringService but runs client-side
 */

import { ProviderId } from '../types';

export interface ProviderAttributes {
  // Twitter
  followers?: number;
  hasBlueCheck?: boolean;
  accountAgeDays?: number;
  
  // Exchange (Binance, Coinbase, OKX, KuCoin)
  kycLevel?: number;
  
  // LinkedIn
  connections?: number;
  
  // YouTube/TikTok/Twitch
  subsOrFollowers?: number;
  totalViewsBucket?: number;
  partnerStatus?: boolean;
}

export interface LocalScoreResult {
  scoreDelta: number;
  pointsDelta: number;
}

/**
 * Compute human score locally using default rules
 * This matches the backend logic but runs client-side for privacy
 */
export function computeHumanScoreLocal(
  providerId: ProviderId,
  attributes: ProviderAttributes
): LocalScoreResult {
  let scoreDelta = 0;
  let pointsDelta = 0;

  switch (providerId) {
    case 'twitter':
      // Twitter account age: 20 score per year (if has blue check and >= 100 followers)
      if (attributes.hasBlueCheck && attributes.followers && attributes.followers >= 100 && attributes.accountAgeDays) {
        const ageYears = attributes.accountAgeDays / 365;
        scoreDelta += Math.floor(ageYears) * 20;
      }
      // Twitter followers: 1 point per follower (if has blue check and >= 100 followers)
      if (attributes.hasBlueCheck && attributes.followers && attributes.followers >= 100) {
        pointsDelta += Math.min(attributes.followers, 100000); // Cap at 100k
      }
      break;

    case 'binance':
    case 'coinbase':
    case 'okx':
    case 'kucoin':
      // Exchange KYC Level scoring
      if (attributes.kycLevel) {
        const level = attributes.kycLevel;
        if (level === 1) {
          scoreDelta += 100;
          pointsDelta += 100;
        } else if (level === 2) {
          scoreDelta += 200;
          pointsDelta += 200;
        } else if (level === 3) {
          scoreDelta += 300;
          pointsDelta += 300;
        }
      }
      break;

    case 'linkedin':
      // LinkedIn account age: 100 score per year
      if (attributes.accountAgeDays) {
        const ageYears = attributes.accountAgeDays / 365;
        scoreDelta += Math.floor(ageYears) * 100;
      }
      // LinkedIn connections: 10 points per connection
      if (attributes.connections) {
        pointsDelta += Math.min(attributes.connections * 10, 100000); // Cap at 100k points
      }
      break;

    case 'youtube':
    case 'tiktok':
    case 'twitch':
      // Creator account age: 100 score per year
      if (attributes.accountAgeDays) {
        const ageYears = attributes.accountAgeDays / 365;
        scoreDelta += Math.floor(ageYears) * 100;
      }
      // Creator subscribers: 10 points per subscriber
      if (attributes.subsOrFollowers) {
        pointsDelta += Math.min(attributes.subsOrFollowers * 10, 1000000); // Cap at 1M points
      }
      break;

    default:
      // Unknown provider - no scoring
      break;
  }

  return { scoreDelta, pointsDelta };
}


