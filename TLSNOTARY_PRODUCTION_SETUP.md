# TLSNotary Production Setup Guide

This guide covers the three critical aspects of moving from simulation to production TLSNotary integration:

1. **Library Integration** - Replacing simulation with real TLSNotary JS/WASM bindings
2. **Notary Server** - Configuring or using a public TLSNotary notary server
3. **Verification Keys** - Generating and storing TLSNotary circuit verification keys

---

## 1. Library Integration: TLSNotary JS/WASM Bindings

### Current Status

**Available Libraries:**
- `tlsn-js` - High-level JavaScript API (recommended)
- `tlsn-wasm` - Low-level WebAssembly bindings (for advanced use)

**Important Notes:**
- ✅ Browser-compatible (Chrome extension works)
- ❌ **NOT compatible with Node.js** (backend must use Rust or other methods)
- ✅ Active development and maintenance
- ✅ TypeScript support available

### Installation

```bash
cd packages/zktls-extension
npm install tlsn-js
```

### Integration Steps

#### Step 1: Update Package Dependencies

```json
{
  "dependencies": {
    "tlsn-js": "^0.1.0"  // Check latest version
  }
}
```

#### Step 2: Replace Simulation with Real TLSNotary

Update `src/services/tlsnotary.ts`:

```typescript
import { Prover, Notary } from 'tlsn-js';

// Replace simulateTLSProof() method
private async captureTLSProofReal(
  domain: string,
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string
): Promise<TLSNotaryProof> {
  // Initialize Prover
  const prover = new Prover();
  
  // Connect to notary server
  const notaryUrl = this.notaryUrl;
  const notary = await Notary.connect(notaryUrl);
  
  // Start TLS session with notary
  const session = await prover.newSession({
    serverName: domain,
    notary: notary,
  });
  
  // Make HTTP request through TLSNotary
  const response = await session.request({
    method: method,
    path: new URL(url).pathname + new URL(url).search,
    headers: headers,
    body: body,
  });
  
  // Generate proof
  const proof = await prover.prove({
    session: session,
    response: response,
  });
  
  // Extract proof data
  const snarkProof = proof.snarkProof;
  const publicInputs = proof.publicInputs;
  
  // Build TLSNotaryProof structure
  return {
    session: {
      domain: domain,
      certificateChain: proof.certificateChain,
      handshakeHash: proof.handshakeHash,
      sessionId: proof.sessionId,
      cipherSuite: proof.cipherSuite,
      timestamp: Date.now(),
    },
    response: {
      statusCode: response.status,
      headers: response.headers,
      body: response.body,
      bodyHash: proof.responseHash,
    },
    snarkProof: {
      pi_a: snarkProof.pi_a,
      pi_b: snarkProof.pi_b,
      pi_c: snarkProof.pi_c,
      protocol: 'groth16',
      curve: 'bn128',
    },
    publicInputs: publicInputs,
    commitment: proof.commitment,
  };
}
```

#### Step 3: Update captureTLSProof() Method

```typescript
async captureTLSProof(
  providerId: ProviderId,
  endpoint: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  body?: string
): Promise<TLSNotaryProof> {
  const domain = this.getProviderDomain(providerId);
  if (!domain) {
    throw new Error(`Unknown provider domain for ${providerId}`);
  }

  const fullUrl = `https://${domain}${endpoint}`;
  
  console.log(`[TLSNotary] Capturing TLS proof for ${fullUrl}`);
  
  // Use real TLSNotary instead of simulation
  try {
    return await this.captureTLSProofReal(domain, fullUrl, method, headers, body);
  } catch (error) {
    console.error('[TLSNotary] Real capture failed, falling back to simulation:', error);
    // Fallback to simulation for development/testing
    return await this.simulateTLSProof(domain, fullUrl, method, headers, body);
  }
}
```

#### Step 4: Handle WASM Loading

TLSNotary uses WebAssembly, which needs to be loaded:

```typescript
// In tlsnotary.ts initialization
let tlsnWasmLoaded = false;

async function loadTLSNotaryWASM() {
  if (tlsnWasmLoaded) return;
  
  // Load WASM module
  const wasmModule = await import('tlsn-js/wasm');
  await wasmModule.default();
  tlsnWasmLoaded = true;
}

// Call before using TLSNotary
await loadTLSNotaryWASM();
```

#### Step 5: Update Webpack Configuration

Add WASM support to `webpack.config.js`:

```javascript
module.exports = {
  // ... existing config
  experiments: {
    asyncWebAssembly: true,
  },
  resolve: {
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer/"),
      "fs": false,  // Not available in browser
      "path": false, // Not available in browser
    }
  },
};
```

### Migration Checklist

- [ ] Install `tlsn-js` package
- [ ] Update `captureTLSProof()` to use real TLSNotary
- [ ] Add WASM loading logic
- [ ] Update webpack config for WASM support
- [ ] Test with Twitter provider
- [ ] Remove simulation fallback (or keep for development)
- [ ] Update error handling for TLSNotary-specific errors
- [ ] Add progress indicators for proof generation

### Error Handling

```typescript
try {
  const proof = await this.captureTLSProofReal(...);
} catch (error) {
  if (error instanceof TLSNotaryError) {
    // Handle TLSNotary-specific errors
    switch (error.code) {
      case 'NOTARY_CONNECTION_FAILED':
        // Retry with different notary server
        break;
      case 'TLS_HANDSHAKE_FAILED':
        // Provider may be blocking TLSNotary
        break;
      case 'PROOF_GENERATION_FAILED':
        // Circuit or computation error
        break;
    }
  }
  throw error;
}
```

---

## 2. Notary Server Configuration

### Options

#### Option A: Use Public Notary Server (Development/Testing)

**Public Server:** `https://notary.pse.dev`

**Pros:**
- ✅ No setup required
- ✅ Free to use
- ✅ Good for development/testing

**Cons:**
- ❌ Not for production use
- ❌ No SLA or uptime guarantees
- ❌ May have rate limits
- ❌ Shared with other users

**Configuration:**

```typescript
// src/config/notary.ts
export const defaultNotaryConfig: NotaryConfig = {
  url: 'https://notary.pse.dev',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
};
```

#### Option B: Self-Hosted Notary Server (Production)

**Recommended for:** Production environments

**Prerequisites:**
- Ubuntu 20.04+ or similar Linux distribution
- Rust installed (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- Docker (optional, for containerized deployment)

**Setup Steps:**

1. **Install Dependencies:**

```bash
sudo apt-get update
sudo apt-get install -y \
  libclang-dev \
  pkg-config \
  build-essential \
  libssl-dev \
  ca-certificates
```

2. **Clone TLSNotary Repository:**

```bash
git clone https://github.com/tlsnotary/tlsn.git
cd tlsn
```

3. **Generate Notary Signing Key:**

```bash
# Generate EC private key for signing
openssl genpkey \
  -algorithm EC \
  -out notary_signing_key.pem \
  -pkeyopt ec_paramgen_curve:secp256k1 \
  -pkeyopt ec_param_enc:named_curve

# Generate corresponding public key
openssl ec -in notary_signing_key.pem -pubout -out notary_signing_key.pub.pem
```

4. **Generate TLS Certificate (for HTTPS):**

```bash
# Generate self-signed certificate (or use Let's Encrypt for production)
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout notary_tls_key.pem \
  -out notary_tls_cert.pem \
  -days 365 \
  -subj "/CN=notary.yourdomain.com"
```

5. **Configure Notary Server:**

Create `notary_config.toml`:

```toml
[server]
host = "0.0.0.0"
port = 7047

[tls]
cert_path = "./notary_tls_cert.pem"
key_path = "./notary_tls_key.pem"

[signing]
key_path = "./notary_signing_key.pem"

[logging]
level = "info"
```

6. **Run Notary Server:**

**Option 1: Using Cargo (Development):**

```bash
cargo run --release --bin notary-server -- --config notary_config.toml
```

**Option 2: Using Docker (Production):**

```bash
# Build Docker image
docker build -t tlsnotary/notary-server:latest .

# Run container
docker run -d \
  --name tlsnotary-notary \
  -p 7047:7047 \
  -v $(pwd)/notary_signing_key.pem:/app/notary_signing_key.pem:ro \
  -v $(pwd)/notary_tls_cert.pem:/app/notary_tls_cert.pem:ro \
  -v $(pwd)/notary_tls_key.pem:/app/notary_tls_key.pem:ro \
  tlsnotary/notary-server:latest
```

**Option 3: Using Systemd (Production):**

Create `/etc/systemd/system/tlsnotary-notary.service`:

```ini
[Unit]
Description=TLSNotary Notary Server
After=network.target

[Service]
Type=simple
User=tlsnotary
WorkingDirectory=/opt/tlsnotary
ExecStart=/usr/local/bin/notary-server --config /opt/tlsnotary/notary_config.toml
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable tlsnotary-notary
sudo systemctl start tlsnotary-notary
```

7. **Update Extension Configuration:**

```typescript
// src/config/notary.ts
export const defaultNotaryConfig: NotaryConfig = {
  url: process.env.TLSNOTARY_NOTARY_URL || 'https://notary.yourdomain.com',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
};
```

**Or allow users to configure:**

```typescript
// Load from chrome.storage.sync
export async function getNotaryConfig(): Promise<NotaryConfig> {
  const stored = await chrome.storage.sync.get('notaryConfig');
  if (stored.notaryConfig) {
    return stored.notaryConfig;
  }
  return defaultNotaryConfig;
}
```

### Notary Server Security Considerations

1. **Network Security:**
   - Use HTTPS/TLS for notary server
   - Restrict access with firewall rules
   - Consider VPN or private network

2. **Key Management:**
   - Store signing keys securely (HSM, AWS KMS, etc.)
   - Rotate keys periodically
   - Use separate keys for dev/staging/prod

3. **Monitoring:**
   - Monitor notary server uptime
   - Log all requests
   - Set up alerts for failures

4. **Rate Limiting:**
   - Implement rate limits per client
   - Prevent abuse
   - Monitor usage patterns

### Recommended Approach

**Development:**
- Use public notary server (`https://notary.pse.dev`)

**Staging:**
- Self-hosted notary server on test infrastructure

**Production:**
- Self-hosted notary server with:
  - High availability (multiple instances)
  - Load balancing
  - Monitoring and alerting
  - Secure key management

---

## 3. Verification Keys: Generation and Storage

### What Are Verification Keys?

Verification keys (vkeys) are public parameters used to verify SNARK proofs generated by TLSNotary. They are specific to the TLSNotary circuit and must match between proof generation and verification.

### Key Generation

#### Method 1: Using TLSNotary Tools (Recommended)

The verification keys are typically generated as part of the TLSNotary circuit compilation. They come with the TLSNotary library or can be downloaded from the TLSNotary repository.

**Download from TLSNotary:**

```bash
# Download verification key for TLSNotary circuit
curl -o tlsnotary.vkey.json \
  https://github.com/tlsnotary/tlsn/releases/download/v0.1.0/tlsnotary.vkey.json
```

**Or extract from tlsn-js package:**

```bash
# After installing tlsn-js
cp node_modules/tlsn-js/dist/tlsnotary.vkey.json ./public/vkeys/
```

#### Method 2: Generate from Circuit (Advanced)

If you're using a custom circuit:

```bash
# Compile circuit (requires circom)
circom tlsnotary.circom --r1cs --wasm

# Generate verification key
snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First contribution" -v
# ... (more contributions)
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v
snarkjs groth16 setup tlsnotary.r1cs pot14_final.ptau tlsnotary_0000.zkey
snarkjs zkey contribute tlsnotary_0000.zkey tlsnotary_0001.zkey --name="1st Contributor" -v
snarkjs zkey export verificationkey tlsnotary_0001.zkey tlsnotary.vkey.json
```

### Key Storage Options

#### Option 1: CDN Storage (Recommended for Public Keys)

**Pros:**
- ✅ Fast global distribution
- ✅ No server load
- ✅ Easy to update
- ✅ Public keys are safe to expose

**Implementation:**

1. **Upload to CDN:**

```bash
# Upload to your CDN (e.g., Cloudflare, AWS CloudFront)
aws s3 cp tlsnotary.vkey.json s3://cdn.anylayer.com/vkeys/tlsnotary.vkey.json \
  --content-type application/json \
  --cache-control "public, max-age=31536000"
```

2. **Load in Extension:**

```typescript
// src/services/tlsnotary.ts
async function loadVerificationKey(): Promise<any> {
  const vkeyUrl = 'https://cdn.anylayer.com/vkeys/tlsnotary.vkey.json';
  const response = await fetch(vkeyUrl);
  return await response.json();
}
```

3. **Load in Backend:**

```javascript
// functions/src/services/zkTLSService.js
async loadVerificationKey() {
  const vkeyUrl = process.env.TLSNOTARY_VKEY_URL || 
    'https://cdn.anylayer.com/vkeys/tlsnotary.vkey.json';
  const response = await fetch(vkeyUrl);
  return await response.json();
}
```

#### Option 2: Google Secret Manager (Backend Only)

**Pros:**
- ✅ Secure storage
- ✅ Access control
- ✅ Versioning
- ✅ Audit logging

**Implementation:**

```javascript
// functions/src/services/zkTLSService.js
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

async loadVerificationKey() {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: 'projects/your-project/secrets/tlsnotary-vkey/versions/latest',
  });
  return JSON.parse(version.payload.data.toString());
}
```

**Setup:**

```bash
# Create secret
gcloud secrets create tlsnotary-vkey --data-file=tlsnotary.vkey.json

# Grant access to Cloud Functions
gcloud secrets add-iam-policy-binding tlsnotary-vkey \
  --member="serviceAccount:your-function@project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### Option 3: Firebase Storage

**Pros:**
- ✅ Integrated with Firebase
- ✅ Easy to update
- ✅ Access control via Firebase rules

**Implementation:**

```typescript
// Upload to Firebase Storage
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storage = getStorage();
const vkeyRef = ref(storage, 'vkeys/tlsnotary.vkey.json');
await uploadBytes(vkeyRef, JSON.stringify(vkey));
const url = await getDownloadURL(vkeyRef);
```

#### Option 4: Bundle with Extension (Not Recommended)

**Pros:**
- ✅ No network request
- ✅ Works offline

**Cons:**
- ❌ Increases extension size
- ❌ Harder to update
- ❌ Version mismatches possible

**Only use if:**
- Extension must work offline
- CDN is not available
- Key rarely changes

### Recommended Approach

**For Extension:**
1. **Primary:** Load from CDN (fast, always up-to-date)
2. **Fallback:** Bundle with extension (offline support)

**For Backend:**
1. **Primary:** Load from CDN (simple, fast)
2. **Alternative:** Google Secret Manager (if security is critical)
3. **Cache:** Store in memory after first load

### Implementation Example

```typescript
// src/services/tlsnotary.ts
let cachedVkey: any = null;

async function getVerificationKey(): Promise<any> {
  if (cachedVkey) return cachedVkey;
  
  // Try CDN first
  try {
    const vkeyUrl = 'https://cdn.anylayer.com/vkeys/tlsnotary.vkey.json';
    const response = await fetch(vkeyUrl);
    cachedVkey = await response.json();
    return cachedVkey;
  } catch (error) {
    console.warn('[TLSNotary] Failed to load vkey from CDN, using bundled version');
  }
  
  // Fallback to bundled version
  const bundledVkey = await import('../assets/tlsnotary.vkey.json');
  cachedVkey = bundledVkey.default;
  return cachedVkey;
}
```

```javascript
// functions/src/services/zkTLSService.js
let cachedVkey = null;

async loadVerificationKey() {
  if (cachedVkey) return cachedVkey;
  
  // Try CDN
  try {
    const vkeyUrl = process.env.TLSNOTARY_VKEY_URL || 
      'https://cdn.anylayer.com/vkeys/tlsnotary.vkey.json';
    const response = await fetch(vkeyUrl);
    cachedVkey = await response.json();
    return cachedVkey;
  } catch (error) {
    console.error('[zkTLSService] Failed to load vkey:', error);
    throw new Error('Verification key not available');
  }
}
```

### Key Rotation

If verification keys need to be rotated:

1. **Version Keys:**
   - Store multiple versions: `tlsnotary.v1.vkey.json`, `tlsnotary.v2.vkey.json`
   - Include version in proof metadata
   - Load appropriate version based on proof version

2. **Migration:**
   - Support both old and new keys during transition
   - Gradually phase out old keys
   - Update all clients before removing old keys

---

## Summary: Recommended Production Setup

### Development
- ✅ Use `tlsn-js` library
- ✅ Use public notary server (`https://notary.pse.dev`)
- ✅ Load vkey from CDN

### Production
- ✅ Use `tlsn-js` library
- ✅ Self-hosted notary server (high availability)
- ✅ Load vkey from CDN (with bundled fallback)
- ✅ Monitor notary server health
- ✅ Implement rate limiting
- ✅ Secure key management

### Migration Timeline

1. **Week 1:** Install `tlsn-js`, test with public notary
2. **Week 2:** Set up self-hosted notary server (staging)
3. **Week 3:** Deploy vkey to CDN, update code
4. **Week 4:** Test end-to-end with real TLSNotary
5. **Week 5:** Deploy to production

---

## References

- TLSNotary Documentation: https://tlsnotary.org/docs
- tlsn-js GitHub: https://github.com/tlsnotary/tlsn-js
- Notary Server Guide: https://tlsnotary.org/docs/notary_server
- Quick Start: https://tlsnotary.org/docs/quick_start/tlsn-js

