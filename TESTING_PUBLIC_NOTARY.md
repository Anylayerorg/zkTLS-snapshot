# Testing Guide: Public TLSNotary Notary

This guide walks through testing the extension with the public TLSNotary notary server.

## Prerequisites

1. Extension built and loaded in Chrome
2. Twitter account (for testing)
3. Wallet connected (MetaMask or similar)

## Test 1: Extension Build and Load

### Steps

1. **Build extension**:
   ```bash
   cd packages/zktls-extension
   npm run build
   ```

2. **Verify notary URL in build**:
   - Check console output for: `[Webpack] Building with notary URL: https://notary.pse.dev`
   - If different, check `TLSNOTARY_NOTARY_URL` env var

3. **Load extension in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `packages/zktls-extension/dist` directory

4. **Verify extension loads**:
   - Check for extension icon in toolbar
   - No errors in extension background page console

### Expected Results

- Extension loads without errors
- Background service worker is active
- Popup opens when clicking extension icon

## Test 2: Snapshot Creation with Public Notary

### Steps

1. **Navigate to Twitter**:
   - Open `https://twitter.com` or `https://x.com`
   - Log in to your account

2. **Open extension popup**:
   - Click extension icon
   - Connect wallet (if not already connected)
   - Verify provider detection: Should show "Twitter" and "✅ Logged in"

3. **Create snapshot**:
   - Click "Create Snapshot" button
   - Sign message with wallet (if prompted)
   - Wait for snapshot creation

4. **Check browser console**:
   - Open DevTools → Console
   - Look for logs:
     - `[TLSNotary] Capturing TLS proof for https://api.twitter.com/... via notary: https://notary.pse.dev`
     - `[TLSNotary] Using simulated proof (not mainnet-ready)` (if simulation fallback)
     - `[Background] Snapshot created successfully`

5. **Verify snapshot in popup**:
   - Check "Your Snapshots" section
   - Should show new snapshot with provider name
   - Check verification label:
     - `✓ TLS-verified` (if real TLSNotary worked)
     - `⚠️ Simulated` (if simulation fallback used)

### Expected Results

- Snapshot created successfully
- Console shows notary URL: `https://notary.pse.dev`
- Snapshot appears in popup list
- Verification label indicates TLS-verified or simulated

## Test 3: Dashboard Snapshot Display

### Steps

1. **Open dashboard**:
   - Navigate to zk-proofs page
   - Click "Snapshots" tab

2. **Verify snapshot appears**:
   - Should see snapshot created in extension
   - Check verification badge:
     - Blue "✓ TLS-verified" badge (if TLS-verified)
     - Yellow "⚠️ Simulated" badge (if simulated)

3. **Check snapshot details**:
   - Provider name
   - Creation date
   - Expiration date
   - Commitment hash
   - Proof hash (if TLS-verified)

### Expected Results

- Snapshot appears in dashboard
- Verification badge matches extension popup
- All snapshot details visible

## Test 4: Error Handling - Notary Unavailable

### Steps

1. **Simulate notary failure**:
   - Temporarily set invalid notary URL in extension options
   - Or block notary domain in browser (DevTools → Network → Block request)

2. **Attempt snapshot creation**:
   - Try to create snapshot
   - Observe error handling

3. **Check error message**:
   - Should show helpful error message
   - In dev mode, should fall back to simulation
   - In production mode, should fail with clear error

### Expected Results

- Graceful error handling
- Clear error message to user
- Dev mode: Falls back to simulation with warning
- Production mode: Fails with actionable error

## Test 5: Proof Generation from Snapshot

### Steps

1. **Create snapshot** (if not already done):
   - Follow Test 2 steps

2. **Generate proof from snapshot**:
   - In dashboard, click "Generate Proof" on snapshot
   - Select policy (e.g., "Followers > 1000")
   - Submit proof generation

3. **Verify proof creation**:
   - Check backend logs for proof submission
   - Verify proof includes snapshot reference
   - Check proof status in dashboard

### Expected Results

- Proof generated successfully
- Proof references snapshot ID
- Proof status updates correctly

## Test 6: Multiple Snapshots

### Steps

1. **Create multiple snapshots**:
   - Twitter snapshot
   - Binance snapshot (if available)
   - LinkedIn snapshot (if available)

2. **Verify all appear**:
   - Check extension popup
   - Check dashboard snapshots tab
   - Verify each has correct verification label

### Expected Results

- All snapshots visible
- Each snapshot correctly labeled
- No conflicts or errors

## Troubleshooting

### Snapshot creation fails immediately

- **Check**: Browser console for errors
- **Fix**: Verify extension permissions in manifest.json
- **Fix**: Check wallet connection

### Notary connection timeout

- **Check**: Network connectivity
- **Check**: Notary URL accessibility: `curl https://notary.pse.dev`
- **Fix**: Verify `TLSNOTARY_NOTARY_URL` is set correctly

### Simulation fallback not working

- **Check**: `NODE_ENV` environment variable
- **Check**: Error handling logic in `TLSNotaryService.captureTLSProof()`
- **Fix**: Ensure dev mode detection is working

### Dashboard doesn't show snapshots

- **Check**: Backend API endpoint: `/api/v1/snapshots/user/:address`
- **Check**: Firestore `tlsSnapshots` collection
- **Fix**: Verify snapshot was saved to backend

## Success Criteria

All tests pass when:
- ✅ Extension builds with correct notary URL
- ✅ Snapshots create successfully
- ✅ Verification labels display correctly
- ✅ Error handling works gracefully
- ✅ Dashboard displays snapshots
- ✅ Proof generation works from snapshots

## Next Steps

After successful testing with public notary:
1. Document any issues found
2. Prepare for self-hosted notary migration
3. Update production build configuration

