# AnyLayer zkTLS Snapshot Extension

A Chrome extension for generating privacy-preserving zkTLS snapshots from Web2 providers. This extension enables users to create verifiable proofs of their Web2 identity attributes without revealing the underlying data.

## 🚀 Features

- **🔒 Strictest Privacy Model**: Raw attributes and randomness stored only locally, encrypted with wallet-derived keys
- **🌐 Multiple Provider Support**: Twitter/X, LinkedIn, YouTube, Binance, OKX, KuCoin, Coinbase, Fiverr, Upwork, TikTok, Twitch, GitHub, Telegram, Coursera, Udemy, edX
- **🔐 Commitment-Based Architecture**: Only cryptographic commitments sent to backend, never raw data
- **⚡ Zero-Knowledge Proofs**: Generate ZK proofs from snapshots without re-running TLS sessions
- **🎯 Provider Overlay UI**: Clean, minimal overlay interface for snapshot creation directly on provider pages
- **💾 Local-First Storage**: All sensitive data encrypted and stored locally in the extension
- **🔗 Dashboard Integration**: Seamless integration with AnyLayer dashboard for identity management

## 📋 Prerequisites

- Node.js 18+ 
- npm or pnpm
- Chrome/Chromium browser
- MetaMask or compatible Web3 wallet

## 🛠️ Installation & Setup

### 1. Clone and Install

```bash
git clone https://github.com/Anylayerorg/zkTLS-snapshot.git
cd zkTLS-snapshot
npm install
```

### 2. Build Extension

```bash
# Development build (watch mode)
npm run dev

# Production build
npm run build
```

### 3. Load Extension in Chrome

1. Build the extension: `npm run build`
2. Open Chrome: `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `dist` directory from this repository

## 📖 Usage

### Creating a Snapshot

1. Navigate to a supported provider website (e.g., `https://twitter.com`)
2. Log in to your account on the provider site
3. The extension overlay will automatically appear on supported pages
4. Click "Take Snapshot" in the overlay
5. Connect your wallet and sign the message (if prompted)
6. The snapshot is created and stored locally (encrypted) and a commitment is sent to the backend

### Viewing Snapshots

- Open the extension popup to see all your snapshots
- Each snapshot shows:
  - Provider name
  - Creation date
  - Expiry date
  - Status (active/expired)

### Generating Proofs

1. Open the AnyLayer dashboard at `https://app.anylayer.org`
2. Navigate to the "ZK Proofs" page
3. Select a snapshot
4. Choose the proof type and parameters
5. Generate the proof (done locally in the extension)
6. Submit the proof to the backend

## 🏗️ Architecture

### Core Components

- **Background Service Worker** (`src/background/background.ts`): Orchestrates snapshot creation, proof generation, and communication with backend
- **Content Scripts** (`src/content/`): Extract attributes from provider pages and inject overlay UI
- **Provider Adapters** (`src/providers/`): Pluggable system for each Web2 provider with standardized interface
- **Crypto Module** (`src/crypto/`): Encryption, commitment generation, and local storage management
- **ZK Circuits** (`src/circuits/`): Zero-knowledge proof generation (zkTLS_snapshot and zkPolicy_from_snapshot)
- **TLSNotary Integration** (`src/services/tlsnotary.ts`): TLS session capture and proof generation

### File Structure

```
packages/zktls-extension/
├── manifest.json              # Chrome Manifest V3 configuration
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── webpack.config.js          # Webpack build configuration
├── src/
│   ├── background/            # Background service worker
│   ├── content/               # Content scripts and overlay
│   ├── popup/                  # Extension popup UI (React)
│   ├── options/               # Options page UI (React)
│   ├── providers/             # Provider adapters (Twitter, LinkedIn, etc.)
│   ├── crypto/                # Encryption and storage
│   ├── circuits/              # ZK proof circuits
│   ├── services/              # TLSNotary and local scoring services
│   ├── api/                   # Backend API client
│   ├── config/                # Configuration files
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets (icons)
└── dist/                      # Built extension (generated)
```

## 🔒 Privacy Model

### Data Storage

- **Local Storage**: All raw attributes + randomness encrypted with AES-GCM and stored only in `chrome.storage.local`
- **Backend**: Only receives cryptographic commitments + metadata (no raw data)
- **Encryption Key**: Derived from wallet signature using PBKDF2 (100k iterations), never persisted

### Privacy Guarantees

- ✅ Raw attributes never sent to backend
- ✅ Only commitments stored on server
- ✅ Encryption key never persisted
- ✅ All proofs generated locally
- ✅ User controls all data
- ✅ Data stored locally on device - platform has no access

## 🔌 Supported Providers

### Social Media
- **Twitter/X**: Follower count, verified status, account age
- **LinkedIn**: Profile completeness, connections, experience
- **YouTube**: Subscriber count, channel age, video count
- **TikTok**: Follower count, likes, account verification
- **Twitch**: Follower count, subscriber count, partner status

### Professional & Freelance
- **LinkedIn**: Professional profile data
- **Fiverr**: Seller level, reviews, earnings
- **Upwork**: Job success score, earnings, hours worked

### Education
- **Coursera**: Course completions, certificates
- **Udemy**: Course completions, certificates
- **edX**: Course completions, certificates

### Crypto Exchanges (KYC)
- **Binance**: KYC status, account level
- **OKX**: KYC status, account level
- **KuCoin**: KYC status, account level
- **Coinbase**: KYC status, account level

### Developer
- **GitHub**: Repository count, stars, contributions
- **Telegram**: Account verification, channel ownership

## 🧪 Development

### Scripts

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Type checking
npm run type-check
```

### Development Workflow

1. Make changes to source files in `src/`
2. Run `npm run dev` for watch mode (auto-rebuilds on changes)
3. Reload extension in Chrome (click reload icon on extension card)
4. Test changes on provider websites

### Testing Providers

1. Navigate to provider site (e.g., `https://twitter.com`)
2. Log in to your account
3. Verify the overlay appears and shows correct login status
4. Create a snapshot and verify it appears in popup
5. Check browser console for any errors

## 🔧 Configuration

### Environment Variables

The extension supports configuration via environment variables (see `src/config/notary.ts`):

- `NOTARY_SERVER_URL`: TLSNotary server URL (defaults to public server)
- `NOTARY_SERVER_API_KEY`: API key for notary server (if required)
- `BACKEND_API_URL`: Backend API endpoint (defaults to production)

### Notary Server Setup

For self-hosted notary servers, see:
- `NOTARY_SERVER_SETUP.md` - Setup instructions
- `NOTARY_SERVER_CONFIGURATION.md` - Configuration details
- `MIGRATE_TO_SELF_HOSTED_NOTARY.md` - Migration guide

## 📚 Documentation

- [Build Instructions](./BUILD_INSTRUCTIONS.md) - Detailed build and setup guide
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Architecture and implementation details
- [Security Review](./SECURITY_REVIEW.md) - Security analysis and recommendations
- [TLSNotary Integration](./TLSNOTARY_INTEGRATION.md) - TLSNotary protocol details
- [Notary Server Setup](./NOTARY_SERVER_SETUP.md) - Self-hosted notary setup
- [Verification Keys Guide](./VERIFICATION_KEYS_GUIDE.md) - ZK proof verification keys

## 🐛 Troubleshooting

### Extension Not Loading
- Check `dist/` directory exists after build
- Verify `manifest.json` is in `dist/`
- Check browser console for errors
- Ensure all required permissions are granted

### Build Errors
- Run `npm install` to ensure dependencies are installed
- Check TypeScript errors: `npm run type-check`
- Verify Node.js version (18+)
- Clear `node_modules` and reinstall if needed

### Provider Not Detected
- Check host permissions in `manifest.json`
- Verify content script is injected (check browser console)
- Ensure you're logged in to the provider
- Check if provider URL matches manifest patterns

### Snapshot Creation Fails
- Verify wallet is connected
- Check network connectivity
- Review browser console for errors
- Ensure backend API is accessible

## 🤝 Contributing

Contributions are welcome! Please ensure:

1. Code follows TypeScript best practices
2. All tests pass
3. Privacy model is maintained
4. Documentation is updated

## 📄 License

See LICENSE file for details.

## 🔗 Links

- **Dashboard**: https://app.anylayer.org
- **Documentation**: See `/docs` directory
- **Issues**: GitHub Issues

## 📝 Version History

- **v1.2.0**: Enhanced login detection, drawer system integration, improved UI
- **v1.0.7**: Improved login detection, cleaner UI, correct terminology
- **v1.0.3**: Major UX improvements
- **v1.0.2**: Wallet connection fixes, dashboard bridge integration

## ⚠️ Important Notes

- This extension requires a Web3 wallet (MetaMask recommended)
- Snapshots are stored locally and encrypted - losing access to your wallet means losing access to snapshots
- The extension uses TLSNotary for privacy-preserving TLS proofs
- All data processing happens locally - the platform never has access to your raw data

## 🆘 Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Built with ❤️ by the AnyLayer team**
