# zkTLS Extension - Comprehensive Audit & TODO List

## Critical Issues Found

### 1. ❌ **CRITICAL: Backend API Endpoint Missing**
**Issue**: Extension calls `POST /api/v1/tls-snapshots` but backend route doesn't exist
- **Location**: `packages/zktls-extension/src/api/backend.ts:58`
- **Error**: `HTTP 404: {"success":false,"error":"Not found","message":"The requested ZK Proof endpoint does not exist"}`
- **Root Cause**: Backend `zkproofApi` function doesn't have TLS snapshots routes
- **Impact**: ALL snapshot creation fails with 404 error
- **Fix Required**: 
  - Create backend route in `zkproofApi` function: `POST /api/v1/tls-snapshots`
  - Create route: `GET /api/v1/tls-snapshots?userAddress=...`
  - Create route: `GET /api/v1/tls-snapshots/:snapshotId`
  - Create route: `POST /api/v1/tls-snapshots/:snapshotId/revoke`

### 2. ❌ **Twitter Page Detection Too Broad**
**Issue**: `checkCorrectPage()` for Twitter matches ANY profile page, including other users' profiles
- **Location**: `packages/zktls-extension/src/content/overlay.ts:65-71`
- **Current Logic**: Checks if pathname includes '/' and is not '/', '/home', etc.
- **Problem**: Matches `/anylayerorg` (other user's profile) as valid
- **Fix Required**: 
  - Detect logged-in username from DOM/cookies
  - Verify current URL matches logged-in user's profile
  - Only allow snapshot creation on user's OWN profile page

### 3. ❌ **Overlay Disappears on Navigation**
**Issue**: When navigating (e.g., YouTube home → profile), overlay disappears
- **Location**: `packages/zktls-extension/src/content/content.ts:112-160`
- **Current Implementation**: Has `checkPersistedOverlay()` but may not work correctly
- **Problem**: 
  - Overlay state saved but restoration may fail
  - Navigation listeners may not trigger correctly
  - Overlay removed when content script reloads
- **Fix Required**:
  - Verify overlay persistence actually works
  - Test navigation scenarios (SPA navigation, full page reload)
  - Ensure overlay restores after navigation completes
  - Add better error handling for restoration failures

### 4. ❌ **Login Detection Inconsistency Between Overlay and Popup**
**Issue**: Overlay and popup show different login status for same provider
- **Root Cause**: 
  - Overlay uses `checkLoginStatus()` - runs in page context, checks DOM directly
  - Popup uses `adapter.isLoggedIn(tab)` - executes script in tab, may have timing issues
- **Specific Issues**:
  - **GitHub**: Overlay says "need login", popup says "logged in"
    - Overlay checks: DOM elements directly
    - Adapter checks: cookies + DOM elements
    - Fix: Align detection methods
  - **Fiverr**: Overlay says "logged in", popup says "not logged in"
    - Overlay checks: Multiple DOM elements + cookies
    - Adapter checks: Only cookies (`fiverr_session=`)
    - Fix: Add DOM element checks to FiverrAdapter
  - **LinkedIn**: Overlay works, popup shows "not connected"
    - Overlay checks: Multiple DOM elements + cookies
    - Adapter: Need to verify LinkedInAdapter.isLoggedIn() works correctly
- **Fix Required**:
  - Standardize login detection across overlay and adapters
  - Ensure adapters use same detection logic as overlay
  - Add comprehensive checks (DOM + cookies) to all adapters
  - Add retry logic for timing issues

### 5. ❌ **Popup Create Snapshot Still Has Issues**
**Issue**: Removed `prompt()` but flow may still be broken
- **Location**: `packages/zktls-extension/src/popup/popup.tsx:142-157`
- **Current State**: Signature set to `undefined`, uses fallback encryption
- **Potential Issues**:
  - Error handling may not be clear
  - No user feedback during snapshot creation
  - May fail silently
- **Fix Required**:
  - Add loading states and progress indicators
  - Improve error messages
  - Verify fallback encryption works correctly
  - Test end-to-end flow

### 6. ❌ **UAE PASS Provider Missing**
**Issue**: Added to manifest but no provider adapter exists
- **Location**: 
  - `packages/zktls-extension/manifest.json` - Added host permissions
  - `packages/zktls-extension/src/content/content.ts:30` - Added to supported hosts
- **Missing**: 
  - No `UAE PASSAdapter` class
  - Not registered in `packages/zktls-extension/src/providers/index.ts`
  - No overlay config in `provider-overlay-config.ts`
- **Fix Required**:
  - Create `packages/zktls-extension/src/providers/uaepass.ts`
  - Implement login detection
  - Implement attribute fetching
  - Add to provider registry
  - Add overlay configuration

### 7. ⚠️ **Page Requirement Checks May Be Too Lenient**
**Issue**: Some providers require specific pages but checks may pass incorrectly
- **Location**: `packages/zktls-extension/src/content/overlay.ts:56-107`
- **Examples**:
  - YouTube: Should require `/channel/` or `/@username` but check may be too broad
  - Fiverr: Should require seller profile but check may match buyer profile
  - GitHub: Should require user's own profile, not any profile
- **Fix Required**:
  - Review all `checkCorrectPage()` implementations
  - Add stricter checks for each provider
  - Verify checks match actual requirements

### 8. ⚠️ **Error Handling and Logging Insufficient**
**Issue**: API errors show generic messages, hard to debug
- **Location**: `packages/zktls-extension/src/api/backend.ts`
- **Current State**: Basic error handling, limited logging
- **Fix Required**:
  - Add detailed logging for all API calls
  - Log request payloads (sanitized)
  - Log response status and errors
  - Add user-friendly error messages
  - Add error reporting mechanism

### 9. ⚠️ **Overlay Status Updates May Show False Positives**
**Issue**: Overlay shows all requirements met but snapshot creation fails
- **Location**: `packages/zktls-extension/src/content/overlay.ts:831-942`
- **Problem**: Status checks may pass but actual snapshot creation fails
- **Fix Required**:
  - Verify all checks before allowing snapshot creation
  - Add pre-flight validation before sending to background
  - Show accurate status based on actual conditions

## TODO List - Priority Order

### P0 - Critical (Blocks All Functionality)
1. ✅ **Create backend TLS snapshots API routes**
   - [ ] Create `POST /api/v1/tls-snapshots` endpoint
   - [ ] Create `GET /api/v1/tls-snapshots?userAddress=...` endpoint  
   - [ ] Create `GET /api/v1/tls-snapshots/:snapshotId` endpoint
   - [ ] Create `POST /api/v1/tls-snapshots/:snapshotId/revoke` endpoint
   - [ ] Deploy to Firebase Functions
   - [ ] Test endpoints work correctly

### P1 - High Priority (Major UX Issues)
2. ✅ **Fix Twitter page detection**
   - [ ] Detect logged-in username from Twitter/X
   - [ ] Verify URL matches user's own profile
   - [ ] Reject snapshot creation on other users' profiles
   - [ ] Update `checkCorrectPage()` for Twitter

3. ✅ **Fix overlay persistence on navigation**
   - [ ] Test overlay restoration after navigation
   - [ ] Fix any issues with `checkPersistedOverlay()`
   - [ ] Ensure overlay state persists correctly
   - [ ] Handle SPA navigation properly
   - [ ] Handle full page reloads

4. ✅ **Fix login detection inconsistencies**
   - [ ] Align GitHub login detection (overlay vs adapter)
   - [ ] Fix Fiverr adapter to check DOM elements (not just cookies)
   - [ ] Verify LinkedIn adapter login detection
   - [ ] Standardize detection methods across all providers
   - [ ] Add retry logic for timing issues

### P2 - Medium Priority (Feature Completeness)
5. ✅ **Create UAE PASS provider adapter**
   - [ ] Create `uaepass.ts` adapter file
   - [ ] Implement login detection
   - [ ] Implement attribute fetching
   - [ ] Add to provider registry
   - [ ] Add overlay configuration
   - [ ] Test on UAE PASS website

6. ✅ **Improve error handling and logging**
   - [ ] Add detailed logging for API calls
   - [ ] Log request/response details (sanitized)
   - [ ] Improve error messages for users
   - [ ] Add error reporting

7. ✅ **Fix page requirement checks**
   - [ ] Review all `checkCorrectPage()` implementations
   - [ ] Make checks stricter where needed
   - [ ] Test each provider's page requirements
   - [ ] Ensure checks match actual requirements

### P3 - Low Priority (Polish)
8. ✅ **Improve popup snapshot creation UX**
   - [ ] Add loading states
   - [ ] Add progress indicators
   - [ ] Improve error messages
   - [ ] Test end-to-end flow

9. ✅ **Fix overlay status accuracy**
   - [ ] Verify status checks are accurate
   - [ ] Add pre-flight validation
   - [ ] Ensure status matches actual conditions

## Testing Checklist

After fixes, test:
- [ ] Twitter: Create snapshot on own profile (should work)
- [ ] Twitter: Try on other user's profile (should fail with clear error)
- [ ] YouTube: Navigate from home to profile (overlay should persist)
- [ ] GitHub: Verify login detection matches between overlay and popup
- [ ] Fiverr: Verify login detection matches between overlay and popup
- [ ] LinkedIn: Verify login detection matches between overlay and popup
- [ ] UAE PASS: Verify provider is detected and overlay appears
- [ ] All providers: Verify snapshot creation works end-to-end
- [ ] Error handling: Verify clear error messages for all failure cases

## Notes

- The 404 error is the most critical issue - without backend routes, nothing works
- Login detection inconsistencies are causing user confusion
- Overlay persistence is important for good UX but may have implementation issues
- UAE PASS support is incomplete - needs full adapter implementation


