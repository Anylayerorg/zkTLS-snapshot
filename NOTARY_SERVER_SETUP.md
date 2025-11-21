# TLSNotary Notary Server Setup Guide

This guide covers both using the public TLSNotary notary server and setting up your own self-hosted notary server.

## Option 1: Using Public Notary Server (Current Implementation)

### Public Notary URL
- **URL**: `https://notary.pse.dev`
- **Provider**: TLSNotary team (PSE)
- **Status**: Public, free to use for development/testing
- **Limitations**: Not for production use, no SLA, shared infrastructure

### Configuration

The extension is **already configured** to use the public notary by default:

```typescript
// src/config/notary.ts
export const defaultNotaryConfig: NotaryConfig = {
  url: 'https://notary.pse.dev', // Default
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
};
```

### No Setup Required

- ✅ Extension works out of the box
- ✅ No server setup needed
- ✅ Perfect for development and testing
- ✅ Zero infrastructure costs

### When to Use Public Notary

- ✅ Local development
- ✅ Testing and QA
- ✅ Hackathons and demos
- ✅ Early user testing
- ❌ Production deployments
- ❌ High-volume usage
- ❌ SLA requirements

---

## Option 2: Self-Hosted Notary Server (Production)

### Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Rust installed (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- Docker (optional, for containerized deployment)
- Domain name with DNS access (for production)
- SSL certificate (Let's Encrypt recommended)

### Step 1: Install Dependencies

```bash
sudo apt-get update
sudo apt-get install -y \
  libclang-dev \
  pkg-config \
  build-essential \
  libssl-dev \
  ca-certificates \
  curl \
  git
```

### Step 2: Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
rustc --version  # Verify installation
```

### Step 3: Clone TLSNotary Repository

```bash
git clone https://github.com/tlsnotary/tlsn.git
cd tlsn
git checkout <latest-stable-tag>  # Use latest stable release
```

### Step 4: Generate Notary Signing Key

The notary signing key is used to sign session headers and attest to TLS sessions.

```bash
# Generate EC private key for signing (secp256k1 curve)
openssl genpkey \
  -algorithm EC \
  -out notary_signing_key.pem \
  -pkeyopt ec_paramgen_curve:secp256k1 \
  -pkeyopt ec_param_enc:named_curve

# Generate corresponding public key
openssl ec -in notary_signing_key.pem -pubout -out notary_signing_key.pub.pem

# Set secure permissions
chmod 600 notary_signing_key.pem
chmod 644 notary_signing_key.pub.pem

# Store securely (consider using AWS Secrets Manager, Google Secret Manager, etc.)
```

**Security Note**: Protect this key! It's used to sign attestations. Store in:
- AWS Secrets Manager
- Google Secret Manager
- HashiCorp Vault
- Encrypted volume

### Step 5: Generate TLS Certificate

For HTTPS access to the notary server:

```bash
# Option A: Self-signed (development only)
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout notary_tls_key.pem \
  -out notary_tls_cert.pem \
  -days 365 \
  -subj "/CN=notary-staging.anylayer.com"

# Option B: Let's Encrypt (production)
sudo apt-get install certbot
sudo certbot certonly --standalone -d notary-staging.anylayer.com
# Certificates will be in /etc/letsencrypt/live/notary-staging.anylayer.com/
```

### Step 6: Create Notary Configuration

Create `notary_config.toml`:

```toml
[server]
# Listen on all interfaces (or specific IP)
host = "0.0.0.0"
port = 7047

[tls]
# Path to TLS certificate and key
cert_path = "/path/to/notary_tls_cert.pem"
key_path = "/path/to/notary_tls_key.pem"

[signing]
# Path to notary signing key
key_path = "/path/to/notary_signing_key.pem"

[logging]
level = "info"  # Options: trace, debug, info, warn, error

[metrics]
# Optional: Enable metrics endpoint
enabled = true
port = 9090
```

### Step 7: Build Notary Server

```bash
cd tlsn

# Build release version (optimized)
cargo build --release --bin notary-server

# Binary will be at: target/release/notary-server
```

### Step 8: Run Notary Server

#### Option A: Direct Execution

```bash
./target/release/notary-server --config notary_config.toml
```

#### Option B: Systemd Service (Recommended for Production)

Create `/etc/systemd/system/tlsnotary-notary.service`:

```ini
[Unit]
Description=TLSNotary Notary Server
After=network.target

[Service]
Type=simple
User=tlsnotary
WorkingDirectory=/opt/tlsnotary
ExecStart=/opt/tlsnotary/notary-server --config /opt/tlsnotary/notary_config.toml
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/tlsnotary

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable tlsnotary-notary
sudo systemctl start tlsnotary-notary
sudo systemctl status tlsnotary-notary
```

#### Option C: Docker (Alternative)

Create `Dockerfile`:

```dockerfile
FROM rust:1.75 as builder

WORKDIR /app
COPY . .
RUN cargo build --release --bin notary-server

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/notary-server /usr/local/bin/notary-server
COPY notary_config.toml /etc/tlsnotary/notary_config.toml

EXPOSE 7047

CMD ["notary-server", "--config", "/etc/tlsnotary/notary_config.toml"]
```

Build and run:

```bash
docker build -t tlsnotary/notary-server:latest .
docker run -d \
  --name tlsnotary-notary \
  -p 7047:7047 \
  -v $(pwd)/notary_signing_key.pem:/etc/tlsnotary/notary_signing_key.pem:ro \
  -v $(pwd)/notary_tls_cert.pem:/etc/tlsnotary/notary_tls_cert.pem:ro \
  -v $(pwd)/notary_tls_key.pem:/etc/tlsnotary/notary_tls_key.pem:ro \
  tlsnotary/notary-server:latest
```

### Step 9: Configure Firewall

```bash
# Allow notary port
sudo ufw allow 7047/tcp

# Allow metrics port (if enabled)
sudo ufw allow 9090/tcp

# Reload firewall
sudo ufw reload
```

### Step 10: Set Up Reverse Proxy (Optional but Recommended)

Using Nginx:

```nginx
# /etc/nginx/sites-available/tlsnotary-notary
server {
    listen 443 ssl http2;
    server_name notary-staging.anylayer.com;

    ssl_certificate /etc/letsencrypt/live/notary-staging.anylayer.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/notary-staging.anylayer.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:7047;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running TLS sessions
        proxy_read_timeout 300s;
        proxy_connect_timeout 60s;
    }
}

server {
    listen 80;
    server_name notary-staging.anylayer.com;
    return 301 https://$server_name$request_uri;
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/tlsnotary-notary /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 11: Health Check

Test notary server:

```bash
# Check if server is running
curl https://notary-staging.anylayer.com/health

# Expected response: HTTP 200 with health status
```

### Step 12: Update Extension Configuration

Once notary server is running:

```bash
# Build extension with new notary URL
cd packages/zktls-extension
TLSNOTARY_NOTARY_URL=https://notary-staging.anylayer.com npm run build
```

---

## High Availability Setup (Production)

### Multiple Notary Instances

For production, run multiple notary instances behind a load balancer:

```
                    ┌─────────────┐
                    │ Load Balancer│
                    │  (Nginx/HAProxy) │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │ Notary 1│       │ Notary 2│       │ Notary 3│
   │ :7047   │       │ :7047   │       │ :7047   │
   └─────────┘       └─────────┘       └─────────┘
```

### Load Balancer Configuration

Nginx example:

```nginx
upstream tlsnotary_backend {
    least_conn;  # Use least connections algorithm
    server 127.0.0.1:7047;
    server 127.0.0.1:7048;
    server 127.0.0.1:7049;
}

server {
    listen 443 ssl http2;
    server_name notary.anylayer.com;
    
    # ... SSL config ...
    
    location / {
        proxy_pass http://tlsnotary_backend;
        # ... proxy settings ...
    }
}
```

### Health Checks

Monitor notary server health:

```bash
# Simple health check script
#!/bin/bash
while true; do
    if ! curl -f https://notary.anylayer.com/health > /dev/null 2>&1; then
        echo "Notary server unhealthy! Alerting..."
        # Send alert (email, Slack, PagerDuty, etc.)
    fi
    sleep 30
done
```

Or use monitoring tools:
- Prometheus + Grafana
- Datadog
- New Relic
- CloudWatch (if on AWS)

---

## Security Considerations

### Key Management

1. **Store signing keys securely**:
   - Use cloud KMS (AWS KMS, Google Cloud KMS)
   - Encrypt at rest
   - Rotate keys periodically
   - Use separate keys for dev/staging/prod

2. **Access control**:
   - Restrict notary server access (firewall rules)
   - Use VPN or private network
   - Implement rate limiting
   - Monitor access logs

3. **TLS certificates**:
   - Use Let's Encrypt (free, auto-renewal)
   - Or use cloud-managed certificates
   - Keep certificates updated

### Network Security

- Use private network/VPC for notary servers
- Implement DDoS protection (Cloudflare, AWS Shield)
- Set up WAF rules if needed
- Monitor for suspicious activity

---

## Monitoring and Logging

### Metrics to Monitor

- Request rate (requests/second)
- Response times (p50, p95, p99)
- Error rates
- Active TLS sessions
- Server resource usage (CPU, memory, disk)

### Logging

Configure log rotation:

```bash
# /etc/logrotate.d/tlsnotary-notary
/var/log/tlsnotary-notary/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 tlsnotary tlsnotary
}
```

### Alerting

Set up alerts for:
- Server down
- High error rate (> 1%)
- High latency (> 5s p95)
- Resource exhaustion (CPU > 80%, memory > 90%)

---

## Troubleshooting

### Notary Server Won't Start

```bash
# Check logs
sudo journalctl -u tlsnotary-notary -n 50

# Common issues:
# - Port already in use: Change port in config
# - Missing key file: Verify key path
# - Permission denied: Check file permissions
# - Invalid config: Validate TOML syntax
```

### Connection Refused

```bash
# Check if server is running
sudo systemctl status tlsnotary-notary

# Check if port is listening
sudo netstat -tlnp | grep 7047

# Check firewall
sudo ufw status
```

### High Latency

- Check server resources (CPU, memory)
- Review network latency
- Consider scaling horizontally
- Optimize TLS session handling

---

## Cost Estimation

### Self-Hosted Notary Server

**Development/Staging**:
- Small VM (2 vCPU, 4GB RAM): ~$20-40/month
- Domain + SSL: ~$15/year
- **Total**: ~$25-45/month

**Production**:
- Medium VM (4 vCPU, 8GB RAM): ~$80-150/month
- Load balancer: ~$20-50/month
- Monitoring: ~$10-30/month
- **Total**: ~$110-230/month

**Cloud Managed** (if available):
- AWS/GCP managed service: ~$100-300/month
- Includes scaling, monitoring, backups

---

## Comparison: Public vs Self-Hosted

| Aspect | Public Notary | Self-Hosted |
|--------|--------------|-------------|
| **Setup Time** | 0 minutes | 2-4 hours |
| **Cost** | Free | $25-230/month |
| **Reliability** | No SLA | Full control |
| **Performance** | Shared | Dedicated |
| **Security** | Shared keys | Your keys |
| **Compliance** | Limited | Full control |
| **Scaling** | Limited | Full control |
| **Use Case** | Dev/Test | Production |

---

## Recommendation

**Now (Development)**:
- ✅ Use public notary (`https://notary.pse.dev`)
- ✅ Zero setup, free, perfect for testing

**Before Production Launch**:
- ✅ Set up self-hosted notary for staging
- ✅ Test thoroughly
- ✅ Set up monitoring and alerts
- ✅ Migrate production to self-hosted

**Production**:
- ✅ Self-hosted notary with HA setup
- ✅ Monitoring and alerting
- ✅ Regular backups
- ✅ Key rotation schedule

---

## Quick Start: Public Notary (Current)

**No setup needed!** The extension is already configured:

```bash
# Just build and use
cd packages/zktls-extension
npm run build
# Extension uses https://notary.pse.dev automatically
```

## Quick Start: Self-Hosted Notary

```bash
# 1. Install dependencies
sudo apt-get install -y libclang-dev pkg-config build-essential libssl-dev

# 2. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 3. Clone and build
git clone https://github.com/tlsnotary/tlsn.git
cd tlsn
cargo build --release --bin notary-server

# 4. Generate keys
openssl genpkey -algorithm EC -out notary_signing_key.pem \
  -pkeyopt ec_paramgen_curve:secp256k1

# 5. Configure and run
# (See Step 6-8 above for details)
```

---

## References

- TLSNotary Documentation: https://tlsnotary.org/docs/notary_server
- TLSNotary GitHub: https://github.com/tlsnotary/tlsn
- Notary Server Guide: https://tlsnotary.org/docs/notary_server

