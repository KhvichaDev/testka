# hyper-guard-kd 🛡️⚡

[![npm version](https://img.shields.io/npm/v/hyper-guard-kd.svg)](https://www.npmjs.com/package/hyper-guard-kd)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-blue.svg)](https://www.npmjs.com/package/hyper-guard-kd)

**A zero-dependency, framework-agnostic CLI that injects Zero-Trust API Security, Offline-First Data Sync, and P2P Swarm Failover into any web project with a single command.**

Your users lose data when the network drops. Your API is vulnerable to replay attacks. Your server crashes under traffic spikes. **hyper-guard-kd solves all three problems automatically — zero config, zero dependencies, one command.**

```bash
npx hyper-guard-kd init
```

---

## 🧠 Why This Exists

Every modern web application faces the same trio of invisible threats:

| Problem | What Happens | How Developers Usually "Fix" It |
|---|---|---|
| **Network drops mid-submission** | User's form data vanishes forever | "Just add a retry button" |
| **API token gets stolen** | Attacker replays requests at will | Bolt on JWT + rate limiting |
| **Traffic spike hits** | Server crashes, everyone loses data | Pray and scale vertically |

**hyper-guard-kd** eliminates all three at the infrastructure level — transparently, without touching your application code.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                             │
│                                                                     │
│  ┌──────────────┐      ┌─────────────────────────────────────────┐  │
│  │  Your App    │      │  Service Worker (kd-sw-core.js)         │  │
│  │  (Untouched) │─────▶│                                         │  │
│  └──────────────┘      │  ✦ RSA-2048 Key Generation              │  │
│                        │  ✦ Request Signing (RSASSA-PKCS1-v1_5)  │  │
│                        │  ✦ SHA-256 Request Deduplication         │  │
│                        │  ✦ Offline Queue (IndexedDB)            │  │
│                        │  ✦ Paginated Background Sync            │  │
│                        └───────────┬─────────────────────────────┘  │
│                                    │                                │
│                        ┌───────────▼─────────────────────────────┐  │
│                        │  P2P Swarm Engine (kd-swarm.js)         │  │
│                        │                                         │  │
│                        │  ✦ WebRTC DataChannel Mesh              │  │
│                        │  ✦ Leader Election Protocol             │  │
│                        │  ✦ Batch Aggregation & Delivery         │  │
│                        │  ✦ Automatic Peer Lifecycle Cleanup     │  │
│                        └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                              HTTPS (Signed)
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                        SERVER (Backend)                              │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Validator Middleware (kd-validator.js / kd-validator.php)    │  │
│  │                                                               │  │
│  │  ✦ RSA Signature Verification                                │  │
│  │  ✦ HMAC-SHA256 Certificate Binding (IP + UserAgent)          │  │
│  │  ✦ Replay Attack Prevention (60s timestamp window)           │  │
│  │  ✦ Timing-Safe Comparison (anti-timing attack)               │  │
│  │  ✦ Adaptive Load Shedding (Event Loop / CPU monitoring)      │  │
│  │  ✦ Poison Pill Guard (uninitialized key = fatal halt)        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                    │                                │
│                            ┌───────▼───────┐                       │
│                            │  Your Routes  │                       │
│                            │  (Untouched)  │                       │
│                            └───────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Complete Feature Breakdown

### 🔐 Layer 1 — Zero-Trust Cryptographic Security

| Feature | Description |
|---|---|
| **RSA-2048 Key Generation** | Each browser session generates a unique asymmetric keypair using Web Crypto API with `extractable: false` — the private key is physically impossible to extract from memory |
| **Digital Request Signing** | Every mutating request (POST/PUT/PATCH/DELETE) is signed with RSASSA-PKCS1-v1_5, creating a tamper-proof cryptographic envelope |
| **HMAC-SHA256 Certificate** | Server binds the client's public key to their IP and User-Agent using delimited HMAC, preventing certificate transplant attacks |
| **Replay Attack Prevention** | 60-second timestamp window with clock-skew tolerance rejects any replayed or captured request |
| **Timing-Safe Comparison** | All server-side cryptographic comparisons use constant-time algorithms, eliminating timing side-channel attacks |
| **Poison Pill Guard** | If the CLI-generated secret key is missing, the server immediately halts — preventing accidental deployment of insecure templates |

### 📡 Layer 2 — Offline-First Data Resilience

| Feature | Description |
|---|---|
| **Service Worker Interceptor** | Transparently intercepts all mutating fetch requests without modifying your application code |
| **IndexedDB Offline Queue** | Failed or offline requests are preserved with full headers, body, and method in a local database |
| **Paginated Queue Replay** | Queued requests are replayed in batches of 50, preventing memory exhaustion on massive queues (10,000+ items) |
| **Thundering Herd Prevention** | If the server returns 429/5xx during replay, the queue immediately halts instead of hammering a recovering backend |
| **Randomized Jitter** | Each request gets 0–500ms of random delay, spreading simultaneous reconnection storms across time |
| **SHA-256 Deduplication** | Exact cryptographic body hashing prevents double-click duplicate submissions within a 300ms window |
| **Smart Re-signing** | Replayed requests receive fresh timestamps and signatures, ensuring they pass server validation even after hours in the queue |

### 🐝 Layer 3 — P2P Swarm Failover Protocol

| Feature | Description |
|---|---|
| **WebRTC DataChannel Mesh** | When the server is overwhelmed, browsers automatically form a peer-to-peer network via WebRTC |
| **Leader Election** | The signaling server elects the most stable peer as the Swarm Leader, who aggregates payloads from all peers |
| **Batch Aggregation** | The leader collapses potentially thousands of individual requests into a single HTTP batch delivery |
| **Authorized Command Validation** | Only the cryptographically designated leader can issue BATCH_SUCCESS commands — rogue peers are rejected |
| **Automatic Peer Cleanup** | Disconnected, failed, or closed WebRTC connections are automatically purged, preventing memory leaks in long sessions |
| **Graceful Degradation** | If WebRTC is unavailable (older browsers), the system silently falls back to the IndexedDB offline queue |

### ⚡ Layer 4 — Adaptive Load Shedding

| Feature | Description |
|---|---|
| **Node.js Event Loop Monitor** | A 500ms heartbeat detects event loop lag — when latency exceeds 70ms, all write requests receive instant 429 responses |
| **PHP CPU Load Detection** | Uses `sys_getloadavg()` with a 2.5 threshold to shed load before the server becomes unresponsive |
| **PHP Fallback Rate Limiter** | On shared hosting without `sys_getloadavg()`, a file-locked counter caps at 200 req/sec with cryptographically unique lock files |
| **Client-Side Circuit Breaker** | 429/5xx responses trigger automatic offline queuing — the user sees instant "saved" feedback, not an error |

---

## 🚀 Quick Start

### Step 1: Run the CLI

```bash
npx hyper-guard-kd init
```

The CLI automatically detects your environment:
- **WordPress** → Drops `kd-validator.php` into `wp-content/mu-plugins/` (zero-config)
- **Node.js** → Generates `kd-system/kd-validator.js` middleware

### Step 2: Wire the Backend

**Node.js (Express):**
```javascript
const validateKhvichaSignature = require('./kd-system/kd-validator');

app.use(validateKhvichaSignature);
```

**WordPress:** No action needed — `mu-plugins` auto-loads.

### Step 3: Register the Service Worker

Add this to your main HTML or JavaScript entry point:

```html
<script>
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/kd-sw-core.js');
    }
</script>
<script src="/kd-swarm.js"></script>
```

**That's it.** Your application now has enterprise-grade security, offline resilience, and P2P failover.

---

## 🐝 Swarm Batch Endpoint Templates

When the P2P Swarm Engine delivers aggregated payloads, your server receives them on the `/__kd_swarm_batch` endpoint. Copy the template for your stack:

### 🟢 Node.js (Express + MySQL / PostgreSQL)

```javascript
app.post('/__kd_swarm_batch', async (req, res) => {
    const swarmBatch = req.body.batch;

    /** Customize these two constants for your database schema. */
    const TABLE_NAME = "users";
    const COLUMN_NAME = "email";
    
    const values = swarmBatch.map(item => {
        const originalBody = JSON.parse(item.body);
        return [originalBody.email]; 
    });

    await db.query(`INSERT INTO ${TABLE_NAME} (${COLUMN_NAME}) VALUES ?`, [values]);

    res.status(200).json({ success: true, message: "Swarm batch saved." });
});
```

### 🔵 PHP (WordPress)

```php
add_action('init', function() {
    if ($_SERVER['REQUEST_URI'] === '/__kd_swarm_batch' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        global $wpdb;
        $json = json_decode(file_get_contents('php://input'), true);
        $batch = $json['batch'];

        /** Customize the table name and column for your schema. */
        $tableName = $wpdb->prefix . "my_custom_table";
        $placeholders = [];
        $flat_values = [];

        foreach ($batch as $item) {
            $body = json_decode($item['body'], true);
            $placeholders[] = "(%s)";
            $flat_values[] = $body['email']; 
        }

        $query = $wpdb->prepare(
            "INSERT INTO $tableName (email) VALUES " . implode(',', $placeholders),
            ...$flat_values
        );
        $wpdb->query($query);

        header('Content-Type: application/json');
        die(json_encode(['success' => true, 'message' => 'Swarm batch saved.']));
    }
});
```

---

## ❓ FAQ

**Q: Does this modify my existing code?**
No. The Service Worker runs as a transparent proxy. Your fetch calls, routes, and components remain completely untouched.

**Q: What if I already have a Service Worker?**
The CLI detects existing workers (`sw.js`, `service-worker.js`, `firebase-messaging-sw.js`, etc.) and safely merges via `importScripts()` — your existing logic is preserved.

**Q: What happens if the Swarm signaling server is down?**
The system gracefully degrades. Requests stay safely in the IndexedDB offline queue and replay automatically when the network stabilizes.

**Q: Does this work with serverless (Vercel, Netlify)?**
The client-side components (Service Worker, Swarm, Offline Queue) work everywhere. The server validator requires a persistent process (Node.js/Express or PHP). For serverless, implement the HMAC validation logic in your edge function.

**Q: Is the private key exposed to JavaScript?**
No. The RSA private key is generated with `extractable: false` via the Web Crypto API. It exists only inside the browser's cryptographic module and cannot be read, copied, or exported by any JavaScript code — including your own.

---

## 📐 Technical Specifications

| Specification | Value |
|---|---|
| **Asymmetric Algorithm** | RSASSA-PKCS1-v1_5 (RSA-2048) |
| **Hash Function** | SHA-256 |
| **Certificate Binding** | HMAC-SHA256 (PublicKey \| IP \| UserAgent) |
| **Replay Window** | 60 seconds (±5s clock skew tolerance) |
| **Deduplication** | SHA-256 body hash, 300ms window |
| **Queue Batch Size** | 50 items per replay cycle |
| **Queue Replay Interval** | 1 second between batches |
| **Load Shedding Threshold (Node.js)** | 70ms event loop lag |
| **Load Shedding Threshold (PHP)** | 2.5 CPU load average or 200 req/sec |
| **Swarm Batch Window** | 500ms aggregation delay |
| **Max Swarm Peers** | 50 concurrent WebRTC connections |
| **Dependencies** | 0 |
| **Minimum Node.js** | v16.0.0 |

---

## 📝 License

MIT License — Created by [KhvichaDev](https://github.com/KhvichaDev)