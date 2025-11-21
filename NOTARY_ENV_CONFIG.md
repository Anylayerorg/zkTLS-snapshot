# TLSNotary Notary Server Environment Configuration

This document describes how to configure the TLSNotary notary server URL for different environments.

## Environment Variable: `TLSNOTARY_NOTARY_URL`

The extension uses `TLSNOTARY_NOTARY_URL` environment variable to determine which notary server to connect to.

### Default Values by Environment

| Environment | Notary URL | Purpose |
|------------|------------|---------|
| **Development** | `https://notary.pse.dev` | Public TLSNotary notary (dev/test only) |
| **Staging** | `https://notary-staging.anylayer.com` | Self-hosted notary for staging |
| **Production** | `https://notary.anylayer.com` | Self-hosted notary for production |

### How It Works

1. **Build-time injection**: The notary URL is injected at build time via Webpack's `DefinePlugin`
2. **Runtime override**: Users can override via extension options page (stored in `chrome.storage.sync`)
3. **Priority order**:
   - User override (chrome.storage.sync) - highest priority
   - Environment variable (`TLSNOTARY_NOTARY_URL`) - build-time
   - Default (`https://notary.pse.dev`) - fallback

## Building for Different Environments

### Development (Default)

```bash
cd packages/zktls-extension
npm run build
# Uses: https://notary.pse.dev (public notary)
```

### Staging

```bash
cd packages/zktls-extension
TLSNOTARY_NOTARY_URL=https://notary-staging.anylayer.com npm run build
```

### Production

```bash
cd packages/zktls-extension
TLSNOTARY_NOTARY_URL=https://notary.anylayer.com npm run build
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/build-extension.yml
name: Build Extension

on:
  push:
    branches: [main, staging]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for staging
        if: github.ref == 'refs/heads/staging'
        env:
          TLSNOTARY_NOTARY_URL: https://notary-staging.anylayer.com
        run: |
          cd packages/zktls-extension
          npm run build
      
      - name: Build for production
        if: github.ref == 'refs/heads/main'
        env:
          TLSNOTARY_NOTARY_URL: https://notary.anylayer.com
        run: |
          cd packages/zktls-extension
          npm run build
```

### Vercel/Netlify Environment Variables

For frontend builds, set environment variables in your deployment platform:

**Vercel:**
```bash
vercel env add TLSNOTARY_NOTARY_URL production
# Enter: https://notary.anylayer.com
```

**Netlify:**
```bash
netlify env:set TLSNOTARY_NOTARY_URL https://notary.anylayer.com --context production
```

## User Override (Extension Options)

Users can override the notary URL via the extension options page:

1. Open extension options: `chrome://extensions` → Find extension → Options
2. Set custom notary URL (for testing with local notary, etc.)
3. Value is stored in `chrome.storage.sync` and takes precedence over build-time config

## Verification

To verify which notary URL is being used:

1. Open extension popup
2. Check browser console for log: `[TLSNotary] Capturing TLS proof for ... via notary: <URL>`
3. Or check extension options page (if implemented)

## Migration from Public to Self-Hosted

When migrating from public notary to self-hosted:

1. **Staging**: Update `TLSNOTARY_NOTARY_URL` in staging build config
2. **Test**: Verify staging extension connects to new notary
3. **Production**: Update `TLSNOTARY_NOTARY_URL` in production build config
4. **Deploy**: Rebuild and deploy extension

No code changes required - only configuration!

## Troubleshooting

### Extension uses wrong notary URL

1. Check build logs for `[Webpack] Building with notary URL: ...`
2. Check `chrome.storage.sync` for user override
3. Verify environment variable is set correctly

### Notary connection fails

1. Verify notary URL is accessible: `curl https://notary.anylayer.com/health`
2. Check browser console for connection errors
3. Verify CORS settings on notary server (if applicable)

### User override not working

1. Check `chrome.storage.sync` permissions in manifest.json
2. Verify options page saves to correct storage key
3. Check browser console for storage errors

