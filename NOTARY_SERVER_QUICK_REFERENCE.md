# Notary Server Quick Reference

## Current Status: Using Public Notary ✅

**No setup required!** The extension is configured to use the public TLSNotary notary server by default.

- **URL**: `https://notary.pse.dev`
- **Status**: Active and ready to use
- **Setup Time**: 0 minutes
- **Cost**: Free

## When to Switch to Self-Hosted

Switch to self-hosted notary when:
- ✅ Moving to production
- ✅ Need SLA/uptime guarantees
- ✅ High-volume usage expected
- ✅ Compliance requirements
- ✅ Custom security policies needed

## Quick Comparison

| Feature | Public Notary | Self-Hosted |
|---------|--------------|-------------|
| **Setup** | ✅ Already done | ⏱️ 2-4 hours |
| **Cost** | ✅ Free | 💰 $25-230/month |
| **Reliability** | ⚠️ No SLA | ✅ Full control |
| **Use Now** | ✅ Yes | ⏱️ After setup |

## Current Configuration

The extension uses public notary by default. No changes needed!

```typescript
// src/config/notary.ts
defaultNotaryConfig = {
  url: 'https://notary.pse.dev', // ← Public notary (ready to use)
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
}
```

## Switching to Self-Hosted (When Ready)

1. **Set up notary server** (see `NOTARY_SERVER_SETUP.md`)
2. **Update build command**:
   ```bash
   TLSNOTARY_NOTARY_URL=https://notary-staging.anylayer.com npm run build
   ```
3. **Deploy extension**

That's it! No code changes needed.

## Documentation

- **`NOTARY_SERVER_SETUP.md`** - Complete setup guide for self-hosted notary
- **`NOTARY_ENV_CONFIG.md`** - Environment variable configuration
- **`MIGRATE_TO_SELF_HOSTED_NOTARY.md`** - Migration steps

## Support

- Public notary issues: Check TLSNotary team documentation
- Self-hosted setup: Follow `NOTARY_SERVER_SETUP.md`
- Extension issues: Check extension logs and error messages

