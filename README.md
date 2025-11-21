# AnyLayer zkTLS Extension

Chrome extension for generating privacy-preserving zkTLS snapshots from Web2 providers.

## Features

- **Strictest Privacy**: Raw attributes and randomness stored only locally, encrypted
- **Multiple Providers**: Twitter, Binance, OKX, KuCoin, Coinbase, LinkedIn, Fiverr, Upwork, YouTube, TikTok, Twitch
- **Commitment-Based**: Only cryptographic commitments sent to backend
- **Policy Proofs**: Generate ZK proofs from snapshots without re-running TLS

## Development

```bash
cd packages/zktls-extension
npm install
npm run build
```

## Loading Extension

1. Build: `npm run build`
2. Open Chrome: `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `packages/zktls-extension/dist`

## Architecture

- **Background Service Worker**: Orchestrates snapshot creation and proof generation
- **Content Scripts**: Extract attributes from provider pages
- **Crypto Module**: Encryption, commitment generation, local storage
- **Provider Adapters**: Pluggable system for each Web2 provider
- **Circuits**: ZK proof generation (zkTLS_snapshot and zkPolicy_from_snapshot)

## Privacy Model

- **Local Storage**: All raw attributes + randomness encrypted and stored only in extension
- **Backend**: Only receives commitment + metadata (no raw data)
- **Proof Generation**: Done locally, only proofs sent to backend

## TODO

- [ ] Implement full zkTLS circuit integration
- [ ] Add WASM compilation for circuits
- [ ] Integrate with dashboard for proof generation UI
- [ ] Add export/import backup functionality
- [ ] Security review

