# Security & Privacy Review - zkTLS Extension

## Overview

This document reviews the security and privacy aspects of the zkTLS Chrome extension implementation.

## Privacy Model (Strictest Option)

### Data Storage

**Local Storage (Extension)**
- ✅ Raw attributes (`attrs`) encrypted with AES-GCM
- ✅ Randomness (`r`) encrypted with AES-GCM
- ✅ Encryption key derived from wallet signature (PBKDF2, 100k iterations)
- ✅ Key stored only in memory, never persisted
- ✅ Snapshots stored in `chrome.storage.local` (encrypted)

**Backend Storage (Firestore)**
- ✅ Only commitment `C = H(attrs, r)` stored
- ✅ Coarse metadata only (provider, snapshotType, dates, status)
- ✅ No raw attributes ever sent to backend
- ✅ Optional summary buckets (bronze/silver/gold) - low granularity

### Data Flow

1. **Snapshot Creation**
   - User navigates to provider site and logs in
   - Extension extracts attributes via content script
   - Attributes + randomness → commitment generated locally
   - Only commitment + metadata sent to backend
   - Raw data encrypted and stored locally only

2. **Proof Generation**
   - User requests proof from existing snapshot
   - Extension decrypts local snapshot
   - ZK proof generated locally
   - Only proof + public inputs sent to backend
   - Raw attributes never leave extension

## Security Considerations

### Extension Permissions

**Current Permissions:**
- `storage` - Required for local snapshot storage ✅
- `tabs` - Required to check current tab for provider detection ✅
- `scripting` - Required to inject content scripts ✅
- `activeTab` - Required to access current tab data ✅

**Host Permissions:**
- Only specific provider domains (twitter.com, binance.com, etc.) ✅
- No `<all_urls>` permission ✅

**Recommendations:**
- ✅ Minimal permissions requested
- ✅ Host permissions scoped to specific providers
- ⚠️ Consider requesting `tabs` permission only when needed (on-demand)

### Encryption

**Key Derivation:**
- ✅ Uses PBKDF2 with 100k iterations
- ✅ Salt included in derivation
- ✅ Key derived from wallet signature (user-controlled)

**Encryption Algorithm:**
- ✅ AES-GCM (authenticated encryption)
- ✅ 256-bit keys
- ✅ Random IV for each encryption

**Key Storage:**
- ✅ Key stored only in memory
- ✅ Cleared when extension closes
- ⚠️ Consider using Chrome's OS-level keystore for additional security

### Content Script Security

**Current Implementation:**
- Content scripts extract data from DOM/API
- No validation of TLS layer (MVP limitation)

**Risks:**
- ⚠️ DOM scraping can be spoofed
- ⚠️ No guarantee data came from actual provider API
- ⚠️ Man-in-the-middle attacks possible

**Mitigations (Phase 5):**
- Full zkTLS integration will validate TLS layer
- Certificate chain verification
- HTTP response authentication via TLS session keys

### Backend API Security

**Authentication:**
- ⚠️ Currently uses optional signature header
- ⚠️ No enforced authentication

**Recommendations:**
- Add wallet signature verification for all snapshot operations
- Implement rate limiting per user address
- Add request signing requirement

### Circuit Security

**Current Status:**
- Placeholder implementations for circuits
- Policy validation done in JavaScript (not in-circuit)

**Risks:**
- ⚠️ Policy validation can be bypassed
- ⚠️ Commitment verification not enforced in-circuit

**Mitigations:**
- Implement full Groth16 circuits
- Move all validation into ZK circuits
- Use WASM for circuit execution

## Threat Model

### Threat 1: Extension Compromise

**Scenario:** Malicious code injected into extension

**Impact:**
- Could steal encrypted snapshots
- Could decrypt if encryption key is compromised

**Mitigations:**
- ✅ Code review process
- ✅ Extension signing
- ✅ Minimal permissions
- ⚠️ Consider code obfuscation for production

### Threat 2: Backend Compromise

**Scenario:** Firestore database compromised

**Impact:**
- Attacker gets commitments and metadata
- Cannot decrypt raw attributes (not stored)
- Cannot generate proofs without local snapshots

**Mitigations:**
- ✅ No raw data stored
- ✅ Commitments are one-way hashes
- ✅ Proofs require local snapshot data

### Threat 3: Man-in-the-Middle

**Scenario:** Attacker intercepts TLS connection

**Impact:**
- Could provide fake data to extension
- Extension would create snapshot with fake data

**Mitigations:**
- ⚠️ Current MVP vulnerable (DOM scraping)
- ✅ Phase 5: Full zkTLS will prevent this
- ✅ Certificate validation in-circuit

### Threat 4: Snapshot Theft

**Scenario:** User's device compromised, encrypted snapshots stolen

**Impact:**
- Attacker has encrypted snapshots
- Cannot decrypt without wallet signature

**Mitigations:**
- ✅ Encryption key derived from wallet signature
- ✅ Key never stored on disk
- ⚠️ Consider additional passphrase protection

## Recommendations

### High Priority

1. **Add Wallet Signature Verification**
   - Require signature for all snapshot operations
   - Verify signature matches userAddress

2. **Implement Full ZK Circuits**
   - Move policy validation into circuits
   - Use WASM for circuit execution

3. **Add Rate Limiting**
   - Limit snapshot creation per user
   - Prevent abuse

### Medium Priority

1. **OS-Level Key Storage**
   - Use Chrome's OS keystore for encryption key
   - Additional security layer

2. **Backup Encryption**
   - Add passphrase option for backup files
   - Two-factor encryption

3. **Audit Logging**
   - Log snapshot creation/revocation
   - Detect suspicious activity

### Low Priority

1. **Code Obfuscation**
   - Obfuscate extension code for production
   - Prevent reverse engineering

2. **Content Security Policy**
   - Strict CSP for extension pages
   - Prevent XSS attacks

## Compliance

### GDPR

- ✅ No personal data stored on servers
- ✅ User controls all data locally
- ✅ Right to deletion (revoke snapshot)

### Privacy by Design

- ✅ Data minimization (only commitments stored)
- ✅ Encryption by default
- ✅ Local-first architecture

## Conclusion

The extension implements strictest privacy model with:
- ✅ Raw data never leaves user's device
- ✅ Only cryptographic commitments stored on backend
- ✅ Encryption with wallet-derived keys
- ⚠️ MVP limitations: DOM scraping (not full zkTLS)
- ⚠️ Phase 5 will add full TLS validation

**Overall Security Rating: Good (MVP), Excellent (with Phase 5 zkTLS)**

