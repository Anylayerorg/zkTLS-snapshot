# Notary Server Configuration Guide

Complete guide for configuring and using TLSNotary notary servers.

## Current Status: Public Notary (Ready to Use)

✅ **Extension is already configured** to use the public TLSNotary notary server.

- **URL**: `https://notary.pse.dev`
- **Status**: Active, no setup required
- **Use Case**: Development, testing, early user testing
- **Cost**: Free

**No action needed** - extension works out of the box!

---

## Configuration Options

### Option 1: Public Notary (Current - Recommended for Now)

**Status**: ✅ Already configured and ready to use

**Configuration**:
```typescript
// src/config/notary.ts
defaultNotaryConfig = {
  url: 'https://notary.pse.dev', // ← Public notary (default)
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
}
```

**Pros**:
- ✅ Zero setup time
- ✅ Free to use
- ✅ Perfect for development/testing
- ✅ Always up-to-date with TLSNotary protocol

**Cons**:
- ⚠️ Not for production use
- ⚠️ No SLA guarantees
- ⚠️ Shared infrastructure
- ⚠️ May have rate limits

**When to Use**:
- ✅ Local development
- ✅ Testing and QA
- ✅ Hackathons/demos
- ✅ Early user testing
- ❌ Production deployments

---

### Option 2: Self-Hosted Notary (Future - Production)

**Status**: ⏱️ Set up when moving to production

**Configuration**:
```bash
# Build extension with self-hosted notary URL
TLSNOTARY_NOTARY_URL=https://notary-staging.anylayer.com npm run build
```

**Setup Required**:
- See `NOTARY_SERVER_SETUP.md` for complete setup guide
- Estimated time: 2-4 hours
- Estimated cost: $25-230/month

**Pros**:
- ✅ Full control and reliability
- ✅ Production-ready
- ✅ Custom security policies
- ✅ No rate limits
- ✅ SLA guarantees possible

**Cons**:
- ⏱️ Setup time required
- 💰 Infrastructure costs
- 🔧 Maintenance overhead

**When to Use**:
- ✅ Production deployments
- ✅ High-volume usage
- ✅ Compliance requirements
- ✅ Custom security needs

---

## How Configuration Works

### Priority Order

The extension loads notary configuration in this order:

1. **User Override** (chrome.storage.sync) - Highest priority
   - Set via extension options page
   - Persists across sessions
   - Useful for testing with local notary

2. **Environment Variable** (TLSNOTARY_NOTARY_URL) - Build-time
   - Set during build: `TLSNOTARY_NOTARY_URL=... npm run build`
   - Baked into extension at build time
   - Used for per-environment builds

3. **Default** (https://notary.pse.dev) - Fallback
   - Public notary server
   - Used if nothing else is configured
   - Perfect for development

### Configuration Flow

```
Extension Startup
    │
    ├─→ Check chrome.storage.sync (user override)
    │   └─→ Found? Use it ✓
    │
    ├─→ Check process.env.TLSNOTARY_NOTARY_URL (build-time)
    │   └─→ Found? Use it ✓
    │
    └─→ Use default: https://notary.pse.dev ✓
```

---

## Using Public Notary (Current Setup)

### No Configuration Needed

The extension is **already configured** to use the public notary:

```bash
# Just build and use
cd packages/zktls-extension
npm run build

# Extension automatically uses: https://notary.pse.dev
```

### Verify Configuration

Check browser console when creating a snapshot:
```
[TLSNotary] Capturing TLS proof for https://api.twitter.com/... via notary: https://notary.pse.dev
```

### Testing

1. Build extension: `npm run build`
2. Load in Chrome
3. Navigate to Twitter
4. Create snapshot
5. Check console logs for notary URL

---

## Setting Up Self-Hosted Notary (When Ready)

### Quick Overview

1. **Install dependencies** (Rust, build tools)
2. **Clone TLSNotary repo**
3. **Generate signing keys**
4. **Create config file**
5. **Build and run notary server**
6. **Update extension build** with new URL

### Detailed Steps

See `NOTARY_SERVER_SETUP.md` for complete step-by-step guide including:
- Server installation
- Key generation
- Configuration
- Deployment options (systemd, Docker, Kubernetes)
- Security hardening
- Monitoring setup

### Migration Path

1. **Set up staging notary**: `https://notary-staging.anylayer.com`
2. **Test thoroughly**: Verify extension works with staging notary
3. **Set up production notary**: `https://notary.anylayer.com`
4. **Update builds**: Change `TLSNOTARY_NOTARY_URL` env var
5. **Deploy**: Rebuild and deploy extension

**No code changes needed** - only configuration!

---

## Environment-Specific Configuration

### Development

```bash
# Uses public notary (default)
npm run build
# Notary URL: https://notary.pse.dev
```

### Staging

```bash
# Uses self-hosted staging notary
TLSNOTARY_NOTARY_URL=https://notary-staging.anylayer.com npm run build
# Notary URL: https://notary-staging.anylayer.com
```

### Production

```bash
# Uses self-hosted production notary
TLSNOTARY_NOTARY_URL=https://notary.anylayer.com npm run build
# Notary URL: https://notary.anylayer.com
```

---

## User Override (Extension Options)

Users can override notary URL via extension options page:

```typescript
// In options page
import { setNotaryConfig } from '../config/notary';

await setNotaryConfig({
  url: 'https://custom-notary.example.com',
  timeout: 30000,
});
```

**Use Cases**:
- Testing with local notary server
- Custom notary for specific use cases
- Temporary override for troubleshooting

---

## Health Checks

### Public Notary

```bash
# Check if public notary is available
curl https://notary.pse.dev/health

# Expected: HTTP 200 with health status
```

### Self-Hosted Notary

```bash
# Check staging notary
curl https://notary-staging.anylayer.com/health

# Check production notary
curl https://notary.anylayer.com/health
```

### Monitoring

Set up health checks to monitor notary availability:
- HTTP endpoint monitoring (UptimeRobot, Pingdom, etc.)
- Alert on failures
- Track uptime metrics

---

## Troubleshooting

### Extension Can't Connect to Notary

**Symptoms**:
- Snapshot creation fails
- Console shows connection errors
- Falls back to simulation

**Solutions**:
1. Check notary URL is correct (check console logs)
2. Verify notary server is accessible: `curl <notary-url>/health`
3. Check network connectivity
4. Verify firewall rules (if self-hosted)
5. Check notary server logs

### Wrong Notary URL Being Used

**Check Priority**:
1. Check `chrome.storage.sync` for user override
2. Check build logs for `TLSNOTARY_NOTARY_URL`
3. Check default config in `src/config/notary.ts`

**Fix**:
- Clear user override: `chrome.storage.sync.remove('tlsnotary_notary_config')`
- Rebuild with correct env var
- Or update default in config file

---

## Security Considerations

### Public Notary

- ✅ No keys to manage
- ✅ No infrastructure to secure
- ⚠️ Shared with other users
- ⚠️ No control over security policies

### Self-Hosted Notary

- ✅ Full control over security
- ✅ Your own signing keys
- ✅ Private infrastructure
- ⚠️ You're responsible for security
- ⚠️ Key management required

**Recommendations**:
- Use public notary for dev/test
- Use self-hosted for production
- Store signing keys securely (KMS, Secret Manager)
- Implement proper access controls
- Monitor for security issues

---

## Cost Comparison

| Aspect | Public Notary | Self-Hosted |
|--------|--------------|-------------|
| **Setup Cost** | $0 | $0 (time investment) |
| **Monthly Cost** | $0 | $25-230/month |
| **Maintenance** | $0 | ~2-4 hours/month |
| **Total First Year** | $0 | ~$300-2,760 |

**Recommendation**: Start with public notary, migrate to self-hosted before production launch.

---

## Decision Matrix

**Use Public Notary When**:
- ✅ Developing/testing
- ✅ Budget is limited
- ✅ Quick prototyping needed
- ✅ Low-volume usage

**Use Self-Hosted When**:
- ✅ Production deployment
- ✅ High-volume usage expected
- ✅ Compliance requirements
- ✅ Need SLA guarantees
- ✅ Custom security policies needed

---

## Next Steps

### Immediate (Now)
- ✅ **Use public notary** - Already configured, ready to use
- ✅ **Test extension** - Create snapshots, verify functionality
- ✅ **Monitor usage** - Track snapshot creation success rate

### Before Production (Future)
- ⏱️ **Set up staging notary** - Self-hosted notary for staging environment
- ⏱️ **Test migration** - Verify extension works with self-hosted notary
- ⏱️ **Set up production notary** - Self-hosted notary for production
- ⏱️ **Update builds** - Change `TLSNOTARY_NOTARY_URL` for production
- ⏱️ **Deploy** - Rebuild and deploy extension

---

## Summary

**Current Status**: ✅ Using public notary (`https://notary.pse.dev`)

**No Action Required**: Extension is ready to use with public notary

**Future Migration**: When ready for production, follow `NOTARY_SERVER_SETUP.md` to set up self-hosted notary. Migration is configuration-only - no code changes needed.

**Documentation**:
- `NOTARY_SERVER_SETUP.md` - Complete self-hosted setup guide
- `NOTARY_ENV_CONFIG.md` - Environment variable configuration
- `MIGRATE_TO_SELF_HOSTED_NOTARY.md` - Migration steps
- `NOTARY_SERVER_QUICK_REFERENCE.md` - Quick reference

