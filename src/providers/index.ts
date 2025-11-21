/**
 * Provider registry initialization
 */

import { providerRegistry } from './base';
import { TwitterAdapter } from './twitter';
import { BinanceAdapter } from './binance';
import { OKXAdapter } from './okx';
import { KuCoinAdapter } from './kucoin';
import { CoinbaseAdapter } from './coinbase';
import { LinkedInAdapter } from './linkedin';
import { FiverrAdapter } from './fiverr';
import { UpworkAdapter } from './upwork';
import { YouTubeAdapter } from './youtube';
import { TikTokAdapter } from './tiktok';
import { TwitchAdapter } from './twitch';

// Register all providers
export function initializeProviders(): void {
  providerRegistry.register(new TwitterAdapter());
  providerRegistry.register(new BinanceAdapter());
  providerRegistry.register(new OKXAdapter());
  providerRegistry.register(new KuCoinAdapter());
  providerRegistry.register(new CoinbaseAdapter());
  providerRegistry.register(new LinkedInAdapter());
  providerRegistry.register(new FiverrAdapter());
  providerRegistry.register(new UpworkAdapter());
  providerRegistry.register(new YouTubeAdapter());
  providerRegistry.register(new TikTokAdapter());
  providerRegistry.register(new TwitchAdapter());
}

