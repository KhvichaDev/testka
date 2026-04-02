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

> ⚠️ **Architectural Scope & Limitations**
> Hyper-Guard is purpose-built for modern API architectures (Node.js, Laravel APIs, React, Vue, SPA, Mobile REST, Fetch, Axios, JSON).
> **It is NOT designed for and DOES NOT support traditional "page-reloading" HTML forms (Browser `navigate` mode).** Due to modern browser security sandboxes, Service Workers cannot securely inject cryptographic headers into traditional navigation requests. Please ensure your core data flows rely on Fetch/XHR APIs before implementing.

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
| **Offline Handshake Fallback** | If cryptographic signing fails due to initial offline status, raw requests are securely vaulted and seamlessly re-certified with fresh RSA keys upon network restoration. |
| **Zero-Config Auto-Sync** | Universally standardized network restoration trigger. Bypasses unreliable Background Sync APIs to process queues identically across all browsers with strict Concurrency Locks avoiding duplication. |
| **Session Storage Emulation 🛡️** | Automatically purges the IndexedDB offline queue on 'beforeunload', ensuring stale interrupted payloads never blindly persist across fresh user browser sessions. |

### 🐝 Layer 3 — P2P Swarm Failover Protocol

| Feature | Description |
|---|---|
| **WebRTC DataChannel Mesh** | When the server is overwhelmed, browsers automatically form a peer-to-peer network via WebRTC |
| **Leader Election** | The signaling server elects the most stable peer as the Swarm Leader, who aggregates payloads from all peers |
| **Blind Relay E2EE 🚀** | The Leader acts strictly as a "Blind Relay". It routes payloads but mathematically cannot decrypt the AES-GCM + RSA envelopes. Only your backend can! |
| **Batch Aggregation** | The Swarm Leader collapses dozens of concurrent requests into a single HTTP batch delivery, completely bypassing standard 429 API limits |
| **Leader Death Resiliency 🚀**| If the Swarm Leader crashes or disconnects mid-batch, encrypted payloads are securely buffered via Memory Maps and automatically flushed to the newly elected leader. Zero data loss. |
| **Authorized Command Validation** | Only the cryptographically designated leader can issue BATCH_SUCCESS commands — rogue peers are rejected |
| **Automatic Peer Cleanup** | Disconnected, failed, or closed WebRTC connections are automatically purged, preventing memory leaks in long sessions |
| **Graceful Degradation** | If WebRTC is unavailable (older browsers), the system silently falls back to the IndexedDB offline queue |

### ⚡ Layer 4 — Adaptive Load Shedding & Smart Pressure Sensor

| Feature | Description |
|---|---|
| **Node.js Event Loop Monitor** | A 500ms heartbeat detects event loop lag — when latency exceeds the configured threshold, all write requests receive instant 429 responses |
| **PHP CPU Load Detection** | Uses `sys_getloadavg()` to shed load before the server becomes unresponsive |
| **PHP Fallback Rate Limiter** | On shared hosting without `sys_getloadavg()`, a file-locked counter caps throughput with cryptographically unique lock files |
| **Smart Sleeper Pressure Sensor 🚀** | A proactive, **cloud-agnostic** state machine monitoring request throughput per second. Traditional load-shedding (CPU/Event Loop) is invisible on auto-scaling platforms like Firebase, Vercel, and AWS because they scale before stress is detectable. The Smart Sleeper solves this by monitoring **request volume** directly — it triggers P2P swarm activation based on traffic patterns, not server health. Uses a **majority-vote evaluation** over a configurable observation window (default 10s) to statistically distinguish genuine surges from transient spikes. Near-zero overhead during idle states |
| **APCu Zero-I/O Counting (PHP) 🚀** | PHP request counting uses atomic APCu shared memory operations (~0.1μs per request) instead of file I/O, with automatic fallback to `sys_getloadavg()` or file-based rate limiting |
| **3-Tier PHP Detection** | Cascading detection strategy: **Tier 1** APCu Smart Sleeper → **Tier 2** `sys_getloadavg()` CPU monitoring → **Tier 3** File-based rate limiter. The system always finds a way to protect your server |
| **Client-Side Circuit Breaker** | 429/5xx responses trigger automatic offline queuing — the user sees instant "saved" feedback, not an error |
| **Swarm Batch Bypass** | The `/__kd_swarm_batch` endpoint is explicitly excluded from all load-shedding mechanisms, preventing deadlocks where the swarm leader's batch deliveries would be blocked during the exact moments they are needed most |

#### 💤 Smart Sleeper State Machine Lifecycle

The pressure sensor is designed as a **resource-conscious state machine** that stays completely dormant during normal traffic and only activates its evaluation engine when a potential surge is detected:

```
                    ┌──────────────────────────────────────────┐
      Normal        │  💤 SLEEPING                             │
      Traffic       │                                          │
  ─────────────────▶│  Cost: 1 integer comparison / second     │
                    │  The counter quietly tracks req/s.       │
                    │  If count < threshold → stays asleep.    │
                    └──────────────┬───────────────────────────┘
                                   │
                         count >= threshold
                        (first breach detected!)
                                   │
                    ┌──────────────▼───────────────────────────┐
      Evaluating    │  🔍 EVALUATING (10-second window)        │
      Window        │                                          │
  ─────────────────▶│  Each second is classified:              │
                    │    above threshold  → aboveCount++       │
                    │    below threshold  → belowCount++       │
                    │                                          │
                    │  After 10 seconds:                       │
                    │    above > below → PRESSURE CONFIRMED    │
                    │    below >= above → false alarm, sleep   │
                    └──────────────┬───────────────────────────┘
                                   │
                         majority voted "above"
                                   │
                    ┌──────────────▼───────────────────────────┐
      Pressure      │  🔴 PRESSURED                            │
      Active        │                                          │
  ─────────────────▶│  All POST/PUT/PATCH/DELETE → 429         │
                    │  GET requests pass through normally.     │
                    │  Client SW catches 429 → P2P Swarm ON   │
                    │                                          │
                    │  System re-evaluates every 10 seconds.   │
                    │  Traffic drops → back to 💤 SLEEPING     │
                    └──────────────────────────────────────────┘
```

> **Why this matters:** During normal operation (95%+ of the time), the Smart Sleeper consumes virtually **zero CPU** — it performs a single integer comparison once per second. No timers, no polling, no background threads. It only "wakes up" and begins its 10-second evaluation when the first threshold breach is detected, making it **orders of magnitude cheaper** than continuous monitoring solutions.

---

## 🚀 Quick Start

### Step 1: Run the CLI

```bash
npx hyper-guard-kd init
```

The CLI automatically detects your environment:
- **Node.js** → Generates `kd-system/kd-validator.js` middleware
- **PHP** → Generates `kd-system/kd-validator.php` for Laravel/API integration

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

**PHP (Laravel / Custom API):**
Include or require `kd-validator.php` in your API middleware or routing entry point (e.g. `routes/api.php` or `public/index.php`) to intercept and protect incoming API requests cleanly.

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

## ⚙️ Centralized Configuration (kd-config.json)

All system parameters are managed through a single `kd-system/kd-config.json` file generated during `npx hyper-guard-kd init`. Edit this file to tune the system for your specific workload — **no source code modifications required.**

> 💡 **Your custom settings are safe.** Re-running `npx hyper-guard-kd init` will **never** overwrite an existing `kd-config.json`.

### Default Configuration

```json
{
    "security": {
        "maxAgeSeconds": 60
    },
    "pressure": {
        "threshold": 100,
        "window": 10
    },
    "loadShedding": {
        "eventLoopLagMs": 70,
        "cpuLoadThreshold": 2.5,
        "fallbackRateLimit": 200
    },
    "offlineQueue": {
        "bufferMs": 300,
        "antiSpamMs": 1500,
        "batchSize": 50,
        "replayIntervalMs": 1000,
        "maxJitterMs": 500
    },
    "swarm": {
        "batchDelayMs": 500,
        "maxPeers": 50,
        "signalingPort": 8080
    }
}
```

### Parameter Reference

| Section | Parameter | Default | Description |
|---|---|---|---|
| `security` | `maxAgeSeconds` | `60` | Replay attack prevention window. Requests older than this many seconds are rejected |
| `pressure` | `threshold` | `100` | Requests per second before the Smart Sleeper begins evaluating traffic pressure |
| `pressure` | `window` | `10` | Number of seconds the majority-vote evaluation runs before confirming sustained pressure |
| `loadShedding` | `eventLoopLagMs` | `70` | Node.js event loop lag threshold in milliseconds. Write requests are shed above this value |
| `loadShedding` | `cpuLoadThreshold` | `2.5` | PHP `sys_getloadavg()` threshold. Requests are shed when 1-minute CPU load exceeds this |
| `loadShedding` | `fallbackRateLimit` | `200` | PHP file-based rate limiter cap (requests/second) for shared hosting without APCu or `sys_getloadavg` |
| `offlineQueue` | `bufferMs` | `300` | Smart URL Buffer debounce window. Duplicate requests to the same URL within this period are collapsed |
| `offlineQueue` | `antiSpamMs` | `1500` | SHA-256 body hash deduplication window. Identical payloads within this period are rejected |
| `offlineQueue` | `batchSize` | `50` | Number of queued requests replayed per batch cycle during offline queue recovery |
| `offlineQueue` | `replayIntervalMs` | `1000` | Delay between consecutive batch replay cycles, preventing event loop blocking |
| `offlineQueue` | `maxJitterMs` | `500` | Maximum random delay added to outgoing requests, spreading reconnection storms |
| `swarm` | `batchDelayMs` | `500` | Time the Swarm Leader waits to aggregate peers before delivering a batch |
| `swarm` | `maxPeers` | `50` | Maximum concurrent WebRTC peer connections accepted by the swarm |
| `swarm` | `signalingPort` | `8080` | WebSocket port for the zero-dependency P2P signaling server |

### Configuration Priority Chain

The system resolves each parameter using a 3-tier priority:

```
Environment Variable  →  kd-config.json  →  Factory Default
      (highest)             (medium)           (lowest)
```

For example, setting `KD_PRESSURE_THRESHOLD=50` as an environment variable will override the `kd-config.json` value of `100` without touching the file.

### Multi-Tier Caching Architecture

Configuration reading is heavily optimized across all environments:

| Environment | Caching Strategy | Config Overhead Per Request |
|---|---|---|
| **Node.js** | Module-level `require()` — config loaded once at startup, held in V8 memory permanently | **0ms** |
| **PHP (with APCu)** | Parsed config array cached in shared memory with 60-second TTL. File reads reduced from hundreds/second to 1/minute | **~0.001ms** |
| **PHP (without APCu)** | Direct `file_get_contents()` — the 400-byte config file is served from OS filesystem cache | **~0.015ms** |
| **Service Worker** | Cache API with stale-while-revalidate pattern. Serves instantly from browser cache, refreshes silently in the background | **0ms** |
| **Swarm Engine** | Single fetch on page load, config held in-memory JavaScript object for the entire session | **0ms** |

> The `/__kd_config` endpoint serves **only** the client-safe configuration subset (`offlineQueue` + `swarm`). Server-side security thresholds (`pressure`, `loadShedding`, `security`) are **never exposed** to the browser, preventing attackers from probing system limits.

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

### 🔵 PHP (Laravel / Custom API)

```php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// In your routes/api.php or dedicated Swarm Controller
Route::post('/__kd_swarm_batch', function (Request $request) {
    $endpoint = $request->input('endpoint');
    $batch = $request->input('batch');

    /**
     * Route each classified batch to the correct database table.
     * Every item in the batch is guaranteed to be the same resource type.
     */
    if ($endpoint === '/api/comments') {
        $insertData = [];

        foreach ($batch as $item) {
            $body = json_decode($item['body'], true);
            
            // 🛡️ Blind Relay: Unpack Enterprise-Grade E2EE Envelopes
            if (isset($body['_kd_e2ee'])) {
                // Requires openssl_private_decrypt (RSA-OAEP) & openssl_decrypt (AES-256-GCM)
                // See documentation for full PHP kd_decrypt_swarm_payload() implementation
                // $body = kd_decrypt_swarm_payload($body);
            }

            $insertData[] = [
                'user_id' => $body['userId'],
                'post_id' => $body['postId'],
                'text'    => $body['text']
            ];
        }

        DB::table('comments')->insert($insertData);
    }

    return response()->json(['success' => true, 'message' => 'Swarm batch saved.']);
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

**Q: Does this work with serverless / cloud auto-scaling (Vercel, Firebase, AWS)?**
The client-side components (Service Worker, Swarm, Offline Queue) work everywhere. The server validator requires a persistent process (Node.js/Express or PHP). For serverless, implement the HMAC validation logic in your edge function.

**Q: How does hyper-guard-kd detect traffic surges on auto-scaling cloud platforms?**
Traditional load-shedding (CPU monitoring, event loop lag) is invisible on platforms like Firebase and AWS because they auto-scale before stress is detectable — your server never returns 429 or crashes, but your cloud bill skyrockets. The **Smart Sleeper Pressure Sensor** solves this by monitoring **request volume** (req/s) directly through your middleware, not server health metrics. Since every frontend request passes through our validator, we can accurately detect surges regardless of how many cloud instances are running. When sustained pressure is confirmed via majority-vote analysis, P2P swarm batching activates proactively — reducing your server load and cloud costs before they spiral out of control.

**Q: Is the private key exposed to JavaScript?**
No. The RSA private key is generated with `extractable: false` via the Web Crypto API. It exists only inside the browser's cryptographic module and cannot be read, copied, or exported by any JavaScript code — including your own.

---

## 📐 Technical Specifications

| Specification | Value |
|---|---|
| **Asymmetric Algorithm** | RSASSA-PKCS1-v1_5 (RSA-2048) |
| **Hash Function** | SHA-256 |
| **Certificate Binding** | HMAC-SHA256 (PublicKey \| IP \| UserAgent) |
| **Replay Window** | 60 seconds (configurable via `security.maxAgeSeconds`) |
| **Smart API Buffer** | URL+Method based, 300ms override window (configurable via `offlineQueue.bufferMs`) |
| **Hard Anti-Spam Lock** | SHA-256 Cryptographic Body Hash, 1.5s strict lock (configurable via `offlineQueue.antiSpamMs`) |
| **Queue Batch Size** | 50 items per cycle (configurable via `offlineQueue.batchSize`) |
| **Queue Replay Interval** | 1 second between batches (configurable via `offlineQueue.replayIntervalMs`) |
| **Load Shedding Threshold (Node.js)** | 70ms event loop lag (configurable via `loadShedding.eventLoopLagMs`) |
| **Load Shedding Threshold (PHP)** | 2.5 CPU load average or 200 req/sec (configurable via `loadShedding`) |
| **Pressure Sensor Threshold** | 100 req/sec with 10s majority-vote window (configurable via `pressure`) |
| **Swarm Batch Window** | 500ms aggregation delay (configurable via `swarm.batchDelayMs`) |
| **Max Swarm Peers** | 50 concurrent WebRTC connections (configurable via `swarm.maxPeers`) |
| **Signaling Server Port** | 8080 (configurable via `swarm.signalingPort`) |
| **Config Caching (PHP)** | APCu shared memory, 60-second TTL |
| **Config Caching (Browser)** | Cache API, stale-while-revalidate |
| **Configuration File** | `kd-system/kd-config.json` (14 parameters, 5 sections) |
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
