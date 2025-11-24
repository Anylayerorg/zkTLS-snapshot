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
  // Privacy-preserving: Only send computed scores, not raw metrics
  computedScore?: number;
  computedPoints?: number;
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

    const url = `${API_BASE_URL}/api/v1/tls-snapshots`;
    console.log('[Backend API] Creating snapshot:', {
      url,
      provider: request.provider,
      snapshotType: request.snapshotType,
      userAddress: request.userAddress,
      hasSignature: !!signature,
      commitmentPrefix: request.commitment.substring(0, 20) + '...'
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      });
    } catch (networkError) {
      console.error('[Backend API] Network error creating snapshot:', {
        error: networkError,
        url,
        provider: request.provider
      });
      return {
        success: false,
        error: `Network error: ${networkError instanceof Error ? networkError.message : 'Failed to connect to backend. Please check your internet connection.'}`
      };
    }

    if (!response.ok) {
      let errorText = '';
      let errorDetails: any = null;
      try {
        errorText = await response.text();
        console.error('[Backend API] Error response:', {
          status: response.status,
          statusText: response.statusText,
          url,
          errorText: errorText.substring(0, 500), // Limit log size
          provider: request.provider
        });
        
        // Try to parse as JSON for better error messages
        try {
          errorDetails = JSON.parse(errorText);
          if (errorDetails.message) {
            errorText = errorDetails.message;
          } else if (errorDetails.error) {
            errorText = errorDetails.error;
          }
        } catch {
          // Not JSON, use text as-is
        }
      } catch (readError) {
        console.error('[Backend API] Error reading error response:', readError);
        errorText = `HTTP ${response.status} error`;
      }
      
      // Provide user-friendly error messages
      if (response.status === 404) {
        return {
          success: false,
          error: `Backend endpoint not found (404). The TLS snapshots API may not be deployed. Error: ${errorText}`
        };
      } else if (response.status === 500) {
        return {
          success: false,
          error: `Backend server error (500). Please try again later. Error: ${errorText}`
        };
      } else if (response.status === 400) {
        return {
          success: false,
          error: `Invalid request (400). ${errorText || 'Please check your input and try again.'}`
        };
      }
      
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText || response.statusText}`
      };
    }

    const data = await response.json();
    console.log('[Backend API] Snapshot created successfully:', {
      snapshotId: data.snapshotId,
      provider: request.provider
    });
    return {
      success: true,
      snapshotId: data.snapshotId
    };
  } catch (error) {
    console.error('[Backend API] Unexpected error creating snapshot:', {
      error,
      provider: request.provider,
      userAddress: request.userAddress
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while creating snapshot'
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
      let errorText = '';
      try {
        errorText = await response.text();
        // Try to parse as JSON for better error messages
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorText = errorJson.message;
          } else if (errorJson.error) {
            errorText = errorJson.error;
          }
        } catch {
          // Not JSON, use text as-is
        }
      } catch {
        errorText = `HTTP ${response.status} error`;
      }
      
      // Provide user-friendly error messages
      if (response.status === 404) {
        return {
          success: false,
          error: `Backend endpoint not found. Please ensure the TLS snapshots API is deployed. (${errorText})`
        };
      }
      
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`
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
      let errorText = '';
      try {
        errorText = await response.text();
        // Try to parse as JSON for better error messages
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorText = errorJson.message;
          } else if (errorJson.error) {
            errorText = errorJson.error;
          }
        } catch {
          // Not JSON, use text as-is
        }
      } catch {
        errorText = `HTTP ${response.status} error`;
      }
      
      // Provide user-friendly error messages
      if (response.status === 404) {
        return {
          success: false,
          error: `Backend endpoint not found. Please ensure the TLS snapshots API is deployed. (${errorText})`
        };
      }
      
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`
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

