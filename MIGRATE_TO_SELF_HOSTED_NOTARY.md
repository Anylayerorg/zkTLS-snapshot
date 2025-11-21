# Migration Guide: Public Notary → Self-Hosted Notary

This guide provides step-by-step instructions for migrating from the public TLSNotary notary (`https://notary.pse.dev`) to a self-hosted notary server.

## Overview

**Migration Complexity**: Low (configuration-only, no code changes)

**Estimated Time**: 1-2 hours (excluding notary server setup)

**Risk Level**: Low (can rollback by changing config)

## Prerequisites

1. Self-hosted notary server running and accessible
2. Notary URL: `https://notary-staging.anylayer.com` (staging) or `https://notary.anylayer.com` (production)
3. Notary server health check passing
4. Extension codebase ready for rebuild

## Migration Steps

### Phase 1: Staging Migration

#### Step 1: Verify Self-Hosted Notary

```bash
# Test notary accessibility
curl https://notary-staging.anylayer.com/health

# Expected: HTTP 200 with health status
```

#### Step 2: Update Staging Build Configuration

**Option A: Environment Variable (Recommended)**

```bash
cd packages/zktls-extension
TLSNOTARY_NOTARY_URL=https://notary-staging.anylayer.com npm run build
```

**Option B: CI/CD Configuration**

Update your CI/CD pipeline (GitHub Actions, GitLab CI, etc.):

```yaml
# .github/workflows/build-staging.yml
env:
  TLSNOTARY_NOTARY_URL: https://notary-staging.anylayer.com
```

#### Step 3: Build and Deploy Staging Extension

```bash
# Build with staging notary URL
TLSNOTARY_NOTARY_URL=https://notary-staging.anylayer.com npm run build

# Verify build output
grep -r "notary-staging.anylayer.com" dist/

# Deploy to staging environment
# (Your deployment process here)
```

#### Step 4: Test Staging Extension

1. **Load staging extension** in Chrome
2. **Create test snapshot** (Twitter recommended)
3. **Verify notary URL** in console logs:
   ```
   [TLSNotary] Capturing TLS proof for ... via notary: https://notary-staging.anylayer.com
   ```
4. **Check snapshot verification**:
   - Should show `✓ TLS-verified` (not simulated)
   - Proof hash should be present

#### Step 5: Monitor Staging

- Monitor notary server logs for connection attempts
- Check extension error rates
- Verify snapshot creation success rate
- Test proof generation from snapshots

**Success Criteria**:
- ✅ All snapshots create successfully
- ✅ No increase in error rates
- ✅ Verification labels show "TLS-verified"
- ✅ Proof generation works correctly

### Phase 2: Production Migration

#### Step 1: Final Verification

Before migrating production, verify:
- [ ] Staging has been stable for at least 1 week
- [ ] No critical issues found in staging
- [ ] Production notary server is ready
- [ ] Rollback plan is documented

#### Step 2: Update Production Build Configuration

**Option A: Environment Variable**

```bash
cd packages/zktls-extension
TLSNOTARY_NOTARY_URL=https://notary.anylayer.com npm run build
```

**Option B: CI/CD Configuration**

```yaml
# .github/workflows/build-production.yml
env:
  TLSNOTARY_NOTARY_URL: https://notary.anylayer.com
```

#### Step 3: Build Production Extension

```bash
# Build with production notary URL
TLSNOTARY_NOTARY_URL=https://notary.anylayer.com npm run build

# Verify build
grep -r "notary.anylayer.com" dist/

# Create production release
# (Tag, version bump, etc.)
```

#### Step 4: Gradual Rollout (Recommended)

**Day 1: 10% of users**
- Deploy to 10% of user base
- Monitor error rates and notary load
- Verify snapshot creation success

**Day 2-3: 50% of users**
- If Day 1 successful, increase to 50%
- Continue monitoring

**Day 4-5: 100% of users**
- Full rollout if previous phases successful
- Monitor for 48 hours

#### Step 5: Post-Migration Monitoring

Monitor for 1 week:
- Notary server uptime
- Extension error rates
- Snapshot creation success rate
- User-reported issues

## Rollback Plan

If issues occur, rollback is simple:

### Immediate Rollback

1. **Revert build configuration**:
   ```bash
   # Remove or change TLSNOTARY_NOTARY_URL
   TLSNOTARY_NOTARY_URL=https://notary.pse.dev npm run build
   ```

2. **Rebuild and redeploy**:
   ```bash
   npm run build
   # Deploy new build
   ```

3. **Notify users** (if needed):
   - Extension will auto-update
   - Users may need to reload extension

### Partial Rollback

If only some users affected:
- Keep new build deployed
- Update `TLSNOTARY_NOTARY_URL` to point back to public notary
- Rebuild and hotfix deploy

## Verification Checklist

After migration, verify:

- [ ] Extension connects to new notary URL
- [ ] Snapshots create successfully
- [ ] Verification labels show "TLS-verified"
- [ ] Proof generation works
- [ ] No increase in error rates
- [ ] Notary server handles load
- [ ] Monitoring and alerts working

## Configuration Reference

### Environment Variables

| Variable | Staging | Production | Default |
|----------|---------|------------|---------|
| `TLSNOTARY_NOTARY_URL` | `https://notary-staging.anylayer.com` | `https://notary.anylayer.com` | `https://notary.pse.dev` |

### Build Commands

```bash
# Development (public notary)
npm run build

# Staging (self-hosted)
TLSNOTARY_NOTARY_URL=https://notary-staging.anylayer.com npm run build

# Production (self-hosted)
TLSNOTARY_NOTARY_URL=https://notary.anylayer.com npm run build
```

## Troubleshooting

### Extension still uses public notary

**Cause**: Build didn't pick up environment variable

**Fix**:
1. Verify `TLSNOTARY_NOTARY_URL` is set before build
2. Check webpack build logs for notary URL
3. Clear build cache: `rm -rf dist/ node_modules/.cache/`
4. Rebuild

### Notary connection fails

**Cause**: Notary server unreachable or misconfigured

**Fix**:
1. Verify notary URL is correct
2. Check notary server health: `curl https://notary.anylayer.com/health`
3. Verify network connectivity
4. Check notary server logs

### Snapshots show "Simulated" after migration

**Cause**: Notary connection failing, falling back to simulation

**Fix**:
1. Check browser console for notary errors
2. Verify notary URL is correct
3. Check notary server is running
4. Verify CORS settings (if applicable)

## Post-Migration Tasks

1. **Update documentation**:
   - Update `NOTARY_ENV_CONFIG.md` with production URLs
   - Update deployment guides

2. **Monitor metrics**:
   - Snapshot creation rate
   - Error rates
   - Notary server performance

3. **User communication**:
   - Update changelog
   - Notify users of improved reliability (if applicable)

## Success Metrics

Migration is successful when:
- ✅ 100% of snapshots use self-hosted notary
- ✅ Error rate < 1%
- ✅ Snapshot creation success rate > 99%
- ✅ No user-reported issues
- ✅ Notary server stable for 1 week

## Support

If issues arise:
1. Check this guide's troubleshooting section
2. Review notary server logs
3. Check extension console logs
4. Contact infrastructure team

## Notes

- **No code changes required**: Migration is configuration-only
- **Backward compatible**: Old snapshots continue to work
- **User transparent**: Users don't need to do anything
- **Rollback safe**: Can revert to public notary anytime

