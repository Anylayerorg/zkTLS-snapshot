# TLSNotary Migration Checklist

Use this checklist to track your migration from simulation to production TLSNotary.

## Phase 1: Library Integration

### Preparation
- [ ] Research latest `tlsn-js` version and breaking changes
- [ ] Review TLSNotary documentation for latest API
- [ ] Set up test environment
- [ ] Create feature branch: `feature/tlsnotary-integration`

### Installation
- [ ] Install `tlsn-js`: `npm install tlsn-js`
- [ ] Verify package installation: `npm list tlsn-js`
- [ ] Check for TypeScript types: `npm install --save-dev @types/tlsn-js` (if available)

### Code Updates
- [ ] Update `src/services/tlsnotary.ts`:
  - [ ] Import `tlsn-js` library
  - [ ] Add WASM loading function
  - [ ] Replace `simulateTLSProof()` with real implementation
  - [ ] Update `captureTLSProof()` to use real TLSNotary
  - [ ] Add error handling for TLSNotary-specific errors
  - [ ] Add progress callbacks for proof generation

- [ ] Update `webpack.config.js`:
  - [ ] Add `experiments.asyncWebAssembly: true`
  - [ ] Configure WASM loaders if needed
  - [ ] Test build succeeds

- [ ] Update `src/background/background.ts`:
  - [ ] Add WASM initialization on extension startup
  - [ ] Handle TLSNotary errors gracefully
  - [ ] Add fallback logic if TLSNotary fails

### Testing
- [ ] Test WASM loading in extension
- [ ] Test TLSNotary connection to notary server
- [ ] Test proof generation with Twitter provider
- [ ] Verify proof structure matches expected format
- [ ] Test error handling (network failures, notary unavailable, etc.)
- [ ] Test with multiple providers

### Documentation
- [ ] Update `TLSNOTARY_INTEGRATION.md` with real API examples
- [ ] Document any breaking changes from simulation
- [ ] Add troubleshooting guide for common issues

---

## Phase 2: Notary Server Setup

### Decision: Public vs Self-Hosted
- [ ] **Development:** Use public notary (`https://notary.pse.dev`)
- [ ] **Staging:** Set up self-hosted notary server
- [ ] **Production:** Set up self-hosted notary server with HA

### Self-Hosted Setup (If Chosen)

#### Infrastructure
- [ ] Provision server (Ubuntu 20.04+)
- [ ] Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- [ ] Install dependencies: `libclang-dev`, `pkg-config`, `build-essential`, `libssl-dev`
- [ ] Clone TLSNotary repository: `git clone https://github.com/tlsnotary/tlsn.git`

#### Key Generation
- [ ] Generate notary signing key: `openssl genpkey -algorithm EC ...`
- [ ] Generate TLS certificate: `openssl req -x509 ...`
- [ ] Store keys securely (AWS Secrets Manager, Google Secret Manager, etc.)
- [ ] Document key locations and access methods

#### Configuration
- [ ] Create `notary_config.toml`:
  - [ ] Set host and port
  - [ ] Configure TLS certificate paths
  - [ ] Configure signing key path
  - [ ] Set logging level
- [ ] Test configuration: `cargo run --bin notary-server -- --config notary_config.toml`

#### Deployment
- [ ] Choose deployment method:
  - [ ] Docker container
  - [ ] Systemd service
  - [ ] Kubernetes deployment
- [ ] Set up process manager (systemd, supervisor, etc.)
- [ ] Configure auto-restart on failure
- [ ] Set up log rotation

#### Security
- [ ] Configure firewall rules (allow port 7047)
- [ ] Set up HTTPS/TLS for notary server
- [ ] Implement rate limiting
- [ ] Set up monitoring and alerting
- [ ] Configure access controls

#### High Availability (Production)
- [ ] Set up multiple notary instances
- [ ] Configure load balancer
- [ ] Set up health checks
- [ ] Configure failover
- [ ] Test failover scenarios

#### Testing
- [ ] Test notary server startup
- [ ] Test connection from extension
- [ ] Test proof generation end-to-end
- [ ] Test under load
- [ ] Test failover scenarios

#### Monitoring
- [ ] Set up uptime monitoring
- [ ] Configure error alerting
- [ ] Set up performance metrics
- [ ] Create dashboard for notary health

---

## Phase 3: Verification Keys

### Key Acquisition
- [ ] Download verification key from TLSNotary releases
- [ ] Or extract from `tlsn-js` package
- [ ] Verify key format (JSON)
- [ ] Test key with sample proof

### Storage Setup

#### CDN (Recommended)
- [ ] Choose CDN provider (Cloudflare, AWS CloudFront, etc.)
- [ ] Upload `tlsnotary.vkey.json` to CDN
- [ ] Set appropriate cache headers (`max-age=31536000`)
- [ ] Test CDN URL accessibility
- [ ] Set up CDN monitoring

#### Google Secret Manager (Backend Alternative)
- [ ] Create secret: `gcloud secrets create tlsnotary-vkey`
- [ ] Upload key: `gcloud secrets versions add tlsnotary-vkey --data-file=tlsnotary.vkey.json`
- [ ] Grant access to Cloud Functions service account
- [ ] Test key retrieval from Secret Manager

#### Firebase Storage (Alternative)
- [ ] Create storage bucket
- [ ] Upload key to `vkeys/tlsnotary.vkey.json`
- [ ] Configure Firebase Storage rules
- [ ] Test key retrieval

### Code Updates

#### Extension
- [ ] Update `src/services/tlsnotary.ts`:
  - [ ] Add `loadVerificationKey()` function
  - [ ] Load from CDN with fallback
  - [ ] Cache key in memory
  - [ ] Handle key loading errors

#### Backend
- [ ] Update `functions/src/services/zkTLSService.js`:
  - [ ] Add `loadVerificationKey()` function
  - [ ] Load from CDN or Secret Manager
  - [ ] Cache key in memory
  - [ ] Update `verifySNARKProof()` to use loaded key

### Testing
- [ ] Test key loading from CDN
- [ ] Test key loading fallback
- [ ] Test proof verification with loaded key
- [ ] Test key caching
- [ ] Test key refresh on error

### Key Rotation (Future)
- [ ] Design versioning scheme
- [ ] Plan migration strategy
- [ ] Document rotation process
- [ ] Test rotation procedure

---

## Phase 4: Integration Testing

### End-to-End Tests
- [ ] Test snapshot creation with real TLSNotary
- [ ] Test proof generation from snapshot
- [ ] Test backend verification
- [ ] Test with all 11 providers
- [ ] Test error scenarios

### Performance Testing
- [ ] Measure proof generation time
- [ ] Measure verification time
- [ ] Test under load
- [ ] Optimize if needed

### Security Testing
- [ ] Verify proofs cannot be forged
- [ ] Test certificate validation
- [ ] Test domain verification
- [ ] Review security implications

---

## Phase 5: Deployment

### Pre-Deployment
- [ ] Review all code changes
- [ ] Run full test suite
- [ ] Update documentation
- [ ] Create deployment plan
- [ ] Set up rollback plan

### Staging Deployment
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Monitor for errors
- [ ] Test with real providers

### Production Deployment
- [ ] Deploy during low-traffic window
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Have rollback plan ready
- [ ] Communicate changes to team

### Post-Deployment
- [ ] Monitor for 24-48 hours
- [ ] Collect user feedback
- [ ] Review error logs
- [ ] Optimize based on metrics
- [ ] Document lessons learned

---

## Rollback Plan

If issues arise:

1. **Immediate Rollback:**
   - [ ] Revert to simulation mode
   - [ ] Update notary config to use public server
   - [ ] Clear cached verification keys

2. **Partial Rollback:**
   - [ ] Keep library integration
   - [ ] Fall back to public notary
   - [ ] Use CDN for verification keys

3. **Full Rollback:**
   - [ ] Revert all TLSNotary changes
   - [ ] Use DOM scraping only
   - [ ] Remove TLSNotary dependencies

---

## Success Criteria

- [ ] Proof generation works with real TLSNotary
- [ ] Backend verification succeeds
- [ ] All providers tested and working
- [ ] Performance meets requirements
- [ ] Error handling robust
- [ ] Documentation complete
- [ ] Team trained on new system

---

## Notes

- Keep simulation code as fallback during transition
- Monitor notary server health closely
- Have support contacts for TLSNotary team
- Document any custom configurations
- Keep verification keys backed up securely

