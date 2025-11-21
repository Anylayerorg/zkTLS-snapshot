# Build Instructions - zkTLS Extension

## Prerequisites

- Node.js 18+
- npm or pnpm
- Chrome/Chromium browser

## Setup

```bash
cd packages/zktls-extension
npm install
```

## Build

```bash
# Development build (watch mode)
npm run dev

# Production build
npm run build
```

## Load Extension

1. Build the extension: `npm run build`
2. Open Chrome: `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select `packages/zktls-extension/dist` directory

## Development Workflow

1. Make changes to source files in `src/`
2. Run `npm run dev` for watch mode
3. Reload extension in Chrome (click reload icon)
4. Test changes

## Testing Providers

1. Navigate to provider site (e.g., `https://twitter.com`)
2. Log in to your account
3. Open extension popup
4. Verify provider is detected
5. Create snapshot

## Troubleshooting

### Extension not loading
- Check `dist/` directory exists
- Verify `manifest.json` is in `dist/`
- Check browser console for errors

### Build errors
- Run `npm install` to ensure dependencies
- Check TypeScript errors: `npm run type-check`
- Verify Node.js version (18+)

### Provider not detected
- Check host permissions in `manifest.json`
- Verify content script is injected
- Check browser console for errors

