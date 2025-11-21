# TLSNotary Integration Guide

## Overview

This document describes the TLSNotary integration for the zkTLS extension. TLSNotary enables privacy-preserving proofs of data fetched over HTTPS/TLS connections.

## Architecture

### Components

1. **TLSNotaryService** (`src/services/tlsnotary.ts`)
   - Handles TLS session capture
   - Generates TLSNotary proofs
   - Verifies proofs
   - Extracts attributes from HTTP responses

2. **Provider Adapters** (`src/providers/`)
   - Extended with TLSNotary support
   - `getTLSNotaryEndpoint()` - Returns API endpoint to capture
   - `getTLSNotaryHeaders()` - Returns auth headers
   - `captureTLSProof()` - Captures TLS proof using TLSNotary

3. **zkTLS Circuit** (`src/circuits/zktls.ts`)
   - Generates zkTLS proofs from TLSNotary proofs
   - Verifies proofs using TLSNotary service

4. **Backend Verification** (`functions/src/services/zkTLSService.js`)
   - Verifies TLSNotary proofs using snarkjs
   - Validates certificate chains
   - Checks predicates on response data

## TLSNotary Protocol

### How It Works

1. **Prover** (Extension) initiates TLS connection with target server
2. **Notary** (Server) participates in MPC handshake
3. TLS session is established with shared secrets
4. HTTP request is made through TLS connection
5. Response is captured and authenticated
6. SNARK proof is generated proving:
   - Valid TLS connection to domain
   - Valid certificate chain
   - Response came from that TLS session
   - Response satisfies predicate (if specified)

### Proof Structure

```typescript
interface TLSNotaryProof {
  session: {
    domain: string;
    certificateChain: CertificateInfo[];
    handshakeHash: string;
    sessionId: string;
    cipherSuite: string;
    timestamp: number;
  };
  response: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    bodyHash: string;
  };
  snarkProof: {
    pi_a: [string, string];
    pi_b: [[string, string], [string, string]];
    pi_c: [string, string];
    protocol: string;
    curve: string;
  };
  publicInputs: string[];
  commitment: string;
}
```

## Integration Steps

### 1. Install TLSNotary Library

Currently, TLSNotary JavaScript bindings are being developed. For now, we use a service wrapper that can be replaced with the actual library when available.

**Future**: Install `@tlsnotary/tlsn-js` or use WASM bindings.

### 2. Configure Notary Server

The extension uses a public TLSNotary notary server by default:
- Default: `https://notary.pse.dev`
- Can be configured via `TLSNotaryConfig`

For production, you may want to run your own notary server:
- See: https://tlsnotary.org/docs/notary_server

### 3. Provider Integration

Each provider adapter implements:

```typescript
class TwitterAdapter extends BaseProviderAdapter {
  // Get API endpoint to capture
  getTLSNotaryEndpoint(): string {
    return '/2/users/me?user.fields=public_metrics,verified,created_at';
  }

  // Get auth headers
  async getTLSNotaryHeaders(tab: chrome.tabs.Tab): Promise<Record<string, string>> {
    // Extract auth token from browser cookies/storage
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
}
```

### 4. Snapshot Creation Flow

1. User clicks "Create Snapshot" on provider page
2. Extension checks if user is logged in
3. Extension calls `adapter.captureTLSProof(tab)`
4. TLSNotary service:
   - Connects to notary server
   - Establishes MPC TLS connection
   - Makes HTTP request
   - Captures response
   - Generates SNARK proof
5. Extension extracts attributes from response
6. Generates commitment
7. Stores snapshot locally (encrypted)
8. Sends commitment + proof hash to backend

### 5. Proof Generation Flow

1. User selects snapshot and policy
2. Extension retrieves encrypted snapshot from local storage
3. Decrypts snapshot
4. Generates policy proof using `zkPolicy_from_snapshot` circuit
5. Submits proof to backend
6. Backend verifies:
   - TLSNotary proof (if initial proof exists)
   - Policy proof
   - Commitment matches

## Verification

### Backend Verification

The backend verifies TLSNotary proofs in `zkTLSService.js`:

1. **Structure Validation**: Checks proof format
2. **TLS Session Verification**: Validates certificate chain, domain match
3. **SNARK Verification**: Uses snarkjs to verify Groth16 proof
4. **Predicate Verification**: Checks response satisfies predicate

### Verification Key

The verification key (vkey) for the TLSNotary circuit should be:
- Stored securely (e.g., Google Secret Manager)
- Loaded from CDN: `https://cdn.anylayer.com/vkeys/tlsnotary.vkey.json`
- Or configured via `TLSNOTARY_VKEY_URL` environment variable

## Current Status

### ✅ Completed

- TLSNotary service wrapper created
- Provider adapters extended with TLSNotary support
- zkTLS circuit updated to use TLSNotary proofs
- Backend verification service updated
- Twitter provider integrated

### 🚧 In Progress

- Actual TLSNotary library integration (waiting for stable JS/WASM bindings)
- Notary server configuration
- Verification key management

### 📋 TODO

- [ ] Install actual TLSNotary library (`@tlsnotary/tlsn-js` or WASM)
- [ ] Replace simulation with real TLSNotary calls
- [ ] Set up notary server (or use public one)
- [ ] Generate and store verification keys
- [ ] Test with all providers
- [ ] Add error handling for TLSNotary failures
- [ ] Add retry logic for notary connection
- [ ] Add progress indicators for proof generation

## Testing

### Test TLSNotary Integration

1. Load extension in Chrome
2. Navigate to Twitter and log in
3. Open extension popup
4. Click "Create Snapshot"
5. Verify TLSNotary proof is captured
6. Check backend receives proof hash

### Test Verification

1. Generate snapshot with TLSNotary
2. Generate policy proof from snapshot
3. Submit to backend
4. Verify backend accepts and verifies proof

## Troubleshooting

### TLSNotary Connection Failed

- Check notary server URL is accessible
- Verify network connectivity
- Check browser console for errors

### Proof Generation Failed

- Verify provider API endpoint is correct
- Check auth headers are valid
- Ensure user is logged in to provider

### Verification Failed

- Check verification key is loaded correctly
- Verify proof structure matches expected format
- Check public inputs are correct

## References

- TLSNotary Documentation: https://tlsnotary.org/docs
- TLSNotary GitHub: https://github.com/tlsnotary/tlsn
- TLSNotary JS: https://github.com/tlsnotary/tlsn-js

