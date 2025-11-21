/**
 * Backend API client for tlsSnapshots endpoints
 */

import { TLSSnapshotDoc } from '../types';

const API_BASE_URL = 'https://us-central1-zksscore.cloudfunctions.net/zkproofApi';

export interface CreateSnapshotRequest {
  userAddress: string;
  provider: string;
  snapshotType: string;
  commitment: string;
  commitmentScheme: string;
  snapshotVersion: number;
  snapshotAt: number;
  expiresAt: number;
  verificationMethod: string;
  initialProofHash?: string;
  summary?: {
    scoreBucket?: string;
    sourceCount?: number;
    lastPolicyLabel?: string;
  };
}

export interface CreateSnapshotResponse {
  success: boolean;
  snapshotId?: string;
  error?: string;
}

export interface ListSnapshotsResponse {
  success: boolean;
  snapshots?: TLSSnapshotDoc[];
  error?: string;
}

/**
 * Create or update snapshot in backend
 */
export async function createSnapshot(
  request: CreateSnapshotRequest,
  signature?: string
): Promise<CreateSnapshotResponse> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (signature) {
      headers['Authorization'] = `Bearer ${signature}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/tls-snapshots`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${error}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      snapshotId: data.snapshotId
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * List user's snapshots
 */
export async function listSnapshots(
  userAddress: string,
  signature?: string
): Promise<ListSnapshotsResponse> {
  try {
    const headers: HeadersInit = {};

    if (signature) {
      headers['Authorization'] = `Bearer ${signature}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/tls-snapshots?userAddress=${encodeURIComponent(userAddress)}`,
      {
        method: 'GET',
        headers
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${error}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      snapshots: data.snapshots || []
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Revoke snapshot
 */
export async function revokeSnapshot(
  snapshotId: string,
  userAddress: string,
  reason: string,
  signature?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (signature) {
      headers['Authorization'] = `Bearer ${signature}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/tls-snapshots/${snapshotId}/revoke`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userAddress,
          reason
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${error}`
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

