# hyper-guard-kd 🛡️⚡

[![npm version](https://img.shields.io/npm/v/hyper-guard-kd.svg)](https://www.npmjs.com/package/hyper-guard-kd)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-blue.svg)](https://www.npmjs.com/package/hyper-guard-kd)

**A zero-dependency, framework-agnostic CLI that injects Zero-Trust API Security, Offline-First Data Sync, and an Autonomous P2P Swarm Failover into any web project with a single command.**

Your users lose data when the network drops. Your API is vulnerable to replay attacks. Your server crashes under traffic spikes. **hyper-guard-kd solves all three problems automatically — zero config, zero dependencies, one command.** Engineered with an elite **"Blind Relay" E2EE Architecture**, ensuring intermediate P2P Swarm Leaders can *never* intercept user data.

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
| **Enterprise-Grade Hybrid E2EE (NEW 🚀)** | P2P Swarm payloads are transparently encrypted Client-Side using AES-256-GCM and enveloped via Server RSA-OAEP Public Keys rendering the intermediate Swarm Leaders completely blind |

### 📡 Layer 2 — Offline-First Data Resilience

| Feature | Description |
|---|---|
| **Service Worker Interceptor** | Transparently intercepts all mutating fetch requests without modifying your application code |
| **IndexedDB Offline Queue** | Failed or offline requests are preserved with full headers, body, and method in a local database |
| **Paginated Queue Replay** | Queued requests are replayed in batches of 50, preventing memory exhaustion on massive queues (10,000+ items) |
| **Thundering Herd Prevention** | If the server returns 429/5xx during replay, the queue immediately halts instead of hammering a recovering backend |
| **Randomized Jitter** | Each request gets 0–500ms of random delay, spreading simultaneous reconnection storms across time |
| **Dual-Layer UI Debouncing 🚀** | Zero-config protection against UI overlapping (e.g. Single vs Double Clicks). Buffers requests by URL for 300ms to eliminate redundant actions, saving massive server IO. |
| **Cryptographic Anti-Spam 🚀** | Hardcore 1.5s payload deduplicator. Generates an exact SHA-256 digest of the request body to instantly burn rapid stutter-clicks or identical bot spam at the network edge. |
| **Smart Re-signing** | Replayed requests receive fresh timestamps and signatures, ensuring they pass server validation even after hours in the queue |

### 🐝 Layer 3 — P2P Swarm Failover Protocol

| Feature | Description |
|---|---|
| **WebRTC DataChannel Mesh** | When the server is overwhelmed, browsers automatically form a peer-to-peer network via WebRTC |
| **Leader Election** | The signaling server elects the most stable peer as the Swarm Leader, who aggregates payloads from all peers |
| **Blind Relay E2EE 🚀** | The Leader acts strictly as a "Blind Relay". It routes payloads but mathematically cannot decrypt the AES-GCM + RSA envelopes. Only your backend can! |
| **Batch Aggregation** | The Swarm Leader collapses dozens of concurrent requests into a single HTTP batch delivery, completely bypassing standard 429 API limits |
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
// 1. Activate Layer 4 API Security, E2EE, and Rate Limiting
const validateKhvichaSignature = require('./kd-system/kd-validator');
app.use(validateKhvichaSignature);

// 2. Activate Zero-Dependency P2P WebRTC Signaling Server (Runs silently on port 8080)
require('./kd-system/kd-signaling');
```

> **💡 Zero-Config P2P Swarm:** The client-side `kd-swarm.js` engine automatically detects your production domain to enforce secure `wss://` WebSockets dynamically. You never need to edit or configure the URLs manually!

**WordPress:** No action needed — `mu-plugins` auto-loads.

### Step 3: Register the Service Worker

Add this to your main HTML or JavaScript entry point:

```html
<script>
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/kd-sw-core.js');
    }
</script>
<!-- Autonomous WebRTC P2P Engine (Required for Server Failover) -->
<script src="/kd-swarm.js"></script>
```

**That's it.** Your application now has enterprise-grade security, offline resilience, and P2P failover.

---

## 🐝 Swarm Batch Endpoint Templates

The P2P Swarm Engine automatically classifies requests by their target API endpoint. Your server receives **homogeneous batches** — all items in a single delivery belong to the same resource type, enabling true single-query bulk inserts.

**Payload format your server receives:**
```json
{
    "endpoint": "/api/comments",
    "swarmSize": 100,
    "batch": [
        { "url": "...", "method": "POST", "body": "{\"userId\":1,\"postId\":5,\"text\":\"great\"}" },
        { "url": "...", "method": "POST", "body": "{\"userId\":2,\"postId\":12,\"text\":\"nice\"}" }
    ]
}
```

### 🟢 Node.js (Express + MySQL / PostgreSQL)

```javascript
const validateKhvichaSignature = require('./kd-system/kd-validator');

app.post('/__kd_swarm_batch', async (req, res) => {
    const { endpoint, batch } = req.body;

    /**
     * Route each classified batch to the correct database table.
     * Transparently decrypts Enterprise-Grade Hybrid E2EE payloads 
     * ensuring intermediate Swarm Leaders cannot intercept data.
     */
    if (endpoint === '/api/comments') {
        const values = batch.map(item => {
            let data = JSON.parse(item.body);
            
            // Unpack E2EE Envelopes gracefully if present
            if (data._kd_e2ee) {
                const decryptedData = validateKhvichaSignature.decryptSwarmPayload(data);
                if (decryptedData) data = decryptedData;
            }
            
            return [data.userId, data.postId, data.text];
        });
        await db.query('INSERT INTO comments (user_id, post_id, text) VALUES ?', [values]);
    }

    if (endpoint === '/api/register') {
        const values = batch.map(item => {
            let data = JSON.parse(item.body);
            if (data._kd_e2ee) {
                const decryptedData = validateKhvichaSignature.decryptSwarmPayload(data);
                if (decryptedData) data = decryptedData;
            }
            return [data.email, data.username];
        });
        await db.query('INSERT INTO users (email, username) VALUES ?', [values]);
    }

    res.status(200).json({ success: true, message: "Swarm batch saved." });
});
```

### 🔵 PHP (WordPress)

```php
add_action('init', function() {
    if ($_SERVER['REQUEST_URI'] === '/__kd_swarm_batch' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        global $wpdb;
        $json = json_decode(file_get_contents('php://input'), true);
        $endpoint = $json['endpoint'];
        $batch = $json['batch'];

        /**
         * Route each classified batch to the correct database table.
         * Every item in the batch is guaranteed to be the same resource type.
         */
        if ($endpoint === '/api/comments') {
            $placeholders = [];
            $flat_values = [];

            foreach ($batch as $item) {
                $body = json_decode($item['body'], true);
                
                // 🛡️ Blind Relay: Unpack Enterprise-Grade E2EE Envelopes
                if (isset($body['_kd_e2ee'])) {
                    // Requires openssl_private_decrypt (RSA-OAEP) & openssl_decrypt (AES-256-GCM)
                    // See documentation for full PHP kd_decrypt_swarm_payload() implementation
                    // $body = kd_decrypt_swarm_payload($body);
                }

                $placeholders[] = "(%d, %d, %s)";
                $flat_values[] = $body['userId'];
                $flat_values[] = $body['postId'];
                $flat_values[] = $body['text'];
            }

            $tableName = $wpdb->prefix . "comments";
            $query = $wpdb->prepare(
                "INSERT INTO $tableName (user_id, post_id, text) VALUES " . implode(',', $placeholders),
                ...$flat_values
            );
            $wpdb->query($query);
        }

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
| **Smart API Buffer** | URL+Method based, 300ms override window (Zero-config UI debouncer) |
| **Hard Anti-Spam Lock** | SHA-256 Cryptographic Body Hash, 1.5s strict lock window |
| **Queue Batch Size** | 50 items per replay cycle |
| **Queue Replay Interval** | 1 second between batches |
| **Load Shedding Threshold (Node.js)** | 70ms event loop lag |
| **Load Shedding Threshold (PHP)** | 2.5 CPU load average or 200 req/sec |
| **Swarm Batch Window** | 500ms aggregation delay |
| **Max Swarm Peers** | 50 concurrent WebRTC connections (= natural batch size cap) |
| **Dependencies** | 0 |
| **Minimum Node.js** | v16.0.0 |

---

## 🌐 Browser Compatibility

The client-side engine requires modern browser APIs. The server-side validator works independently and protects your backend **regardless of the user's browser**.

| Browser | Minimum Version | Year | Full Support |
|---|---|---|---|
| Chrome | 40+ | 2015 | ✅ |
| Firefox | 44+ | 2016 | ✅ |
| Safari | 11.1+ | 2018 | ✅ |
| Edge | 17+ | 2018 | ✅ |
| Internet Explorer | — | — | ❌ |

### What happens on unsupported browsers?

| Layer | Modern Browser | Legacy Browser |
|---|---|---|
| **Request Signing (RSA)** | ✅ Automatic | ❌ Skipped |
| **Offline Queue (IndexedDB)** | ✅ Active | ❌ Unavailable |
| **P2P Swarm (WebRTC)** | ✅ Active | ❌ Unavailable |
| **Server Load Shedding** | ✅ Active | ✅ **Active** |
| **Server crash prevention** | ✅ Protected | ✅ **Protected** |

Legacy browsers lose the client-side resilience features (offline queue, swarm failover), but the server-side load shedding and rate limiting remain fully operational. Your backend will never crash regardless of the client's browser version.

## 📝 License

MIT License — Created by [KhvichaDev](https://github.com/KhvichaDev)
