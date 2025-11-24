/**
 * Core types for zkTLS Extension
 */

export type ProviderId = 
  | 'twitter'
  | 'binance'
  | 'okx'
  | 'kucoin'
  | 'coinbase'
  | 'linkedin'
  | 'fiverr'
  | 'upwork'
  | 'youtube'
  | 'tiktok'
  | 'twitch'
  | 'github'
  | 'telegram'
  | 'coursera'
  | 'udemy'
  | 'edx'
  | 'uaepass'
  | 'instagram';

export type SnapshotType = 
  | 'social'
  | 'kyc'
  | 'employment'
  | 'freelance'
  | 'video'
  | 'streaming'
  | 'education';

export type SnapshotStatus = 'active' | 'revoked' | 'expired';

export type CommitmentScheme = 'poseidon' | 'pedersen';

export type ScoreBucket = 'bronze' | 'silver' | 'gold' | 'platinum';

export type VerificationMethod = 'extension_chrome' | 'extension_edge';

/**
 * Provider-specific attributes
 */
export interface TwitterAttributes {
  followers: bigint;
  hasBlueCheck: boolean;
  followsAnyLayer: boolean;
  accountAgeDays: bigint;
}

export interface ExchangeAttributes {
  kycLevel: bigint;
  countryCode: bigint;
  isCorporate: boolean;
  accountAgeDays: bigint;
}

export interface LinkedInAttributes {
  connections: bigint;
  headlineHash: bigint;
  hasVerifiedEmail: boolean;
  accountAgeDays: bigint;
}

export interface FreelanceAttributes {
  completedJobs: bigint;
  ratingTimes10: bigint;
  earningsBucket: bigint;
}

export interface CreatorAttributes {
  subsOrFollowers: bigint;
  totalViewsBucket: bigint;
  partnerStatus: boolean;
  accountAgeDays: bigint;
}

export interface GitHubAttributes {
  username: string;
  contributions: number;
  publicRepos: number;
  followers: number;
  following: number;
  orgMemberships: number;
  accountAgeDays: number;
}

export interface TelegramAttributes {
  username: string;
  accountAgeDays: number;
  groupMemberships: number;
  channelSubscriptions: number;
}

export interface EducationAttributes {
  username: string;
  coursesCompleted: number;
  certificatesEarned: number;
  coursesEnrolled: number;
  accountAgeDays: number;
}

export interface UAEPassAttributes {
  verified: boolean;
  accountLevel: string;
  accountAgeDays: number;
}

export type ProviderAttributes = 
  | TwitterAttributes
  | ExchangeAttributes
  | LinkedInAttributes
  | FreelanceAttributes
  | CreatorAttributes
  | GitHubAttributes
  | TelegramAttributes
  | EducationAttributes
  | UAEPassAttributes;

/**
 * Local secret snapshot (encrypted, stored only in extension)
 */
export interface TLSSnapshotSecret {
  snapshotId: string;
  userAddress: string;
  provider: ProviderId;
  attrs: ProviderAttributes;
  randomness: bigint;
  createdAt: number;
  expiresAt: number;
  snapshotVersion: number;
}

/**
 * Firestore snapshot document (public metadata only)
 */
export interface TLSSnapshotDoc {
  snapshotId: string;
  userAddress: string;
  provider: ProviderId;
  snapshotType: SnapshotType;
  commitment: string;
  commitmentScheme: CommitmentScheme;
  snapshotVersion: number;
  snapshotAt: {
    seconds: number;
    nanoseconds: number;
  };
  expiresAt: {
    seconds: number;
    nanoseconds: number;
  };
  status: SnapshotStatus;
  summary?: {
    scoreBucket?: ScoreBucket;
    sourceCount?: number;
    lastPolicyLabel?: string;
  };
  initialProofHash?: string;
  verificationMethod: VerificationMethod;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  updatedAt: {
    seconds: number;
    nanoseconds: number;
  } | null;
  revokedAt?: {
    seconds: number;
    nanoseconds: number;
  };
  revocationReason?: string;
}

/**
 * Provider adapter interface
 */
export interface ProviderAdapter {
  id: ProviderId;
  hostPatterns: string[];
  isLoggedIn(tab: chrome.tabs.Tab): Promise<boolean>;
  fetchAttributes(tab: chrome.tabs.Tab): Promise<ProviderAttributes>;
  normalizeAttributes(raw: any): ProviderAttributes;
  getSnapshotType(): SnapshotType;
  getDefaultExpiry(): number;
  getTLSNotaryEndpoint(): string;
  getTLSNotaryMethod?(): string;
  getTLSNotaryHeaders?(tab: chrome.tabs.Tab): Promise<Record<string, string>>;
}

/**
 * Policy types for zkPolicy_from_snapshot
 */
export type PolicyId = 
  | 'TWITTER_FOLLOWERS_MIN'
  | 'TWITTER_BLUE_CHECK'
  | 'TWITTER_FOLLOWS_ANYLAYER'
  | 'BINANCE_KYC_LEVEL'
  | 'OKX_KYC_LEVEL'
  | 'KUCOIN_KYC_LEVEL'
  | 'COINBASE_KYC_LEVEL'
  | 'LINKEDIN_CONNECTIONS_MIN'
  | 'FIVERR_JOBS_MIN'
  | 'UPWORK_JOBS_MIN'
  | 'YOUTUBE_SUBS_MIN'
  | 'TIKTOK_FOLLOWERS_MIN'
  | 'TWITCH_FOLLOWERS_MIN';

export interface PolicyParams {
  minFollowers?: bigint;
  requiredKycLevel?: bigint;
  minConnections?: bigint;
  minJobs?: bigint;
  minSubs?: bigint;
  [key: string]: bigint | undefined;
}

/**
 * ZK Proof structure
 */
export interface ZKProof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
  protocol: string;
  curve: string;
}

export interface PolicyProof {
  proof: ZKProof;
  publicInputs: string[];
  commitment: string;
  policyId: PolicyId;
  policyParams: PolicyParams;
  userAddress: string;
  snapshotIdHash: string;
  nonce?: string;
}

