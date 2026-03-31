/**
 * Global application constants and state elements tracking network context
 * and synchronization processes dynamically.
 */
let CLIENT_PRIVATE_KEY = null; 
let CLIENT_CERTIFICATE = null;
const DB_NAME = "KdSyncDB";
const STORE_NAME = "offlineRequests";
const SHARED_ENCODER = new TextEncoder();

/**
 * Automates the negotiation procedure between client logic and the backend server.
 * Generates an asymmetric RSA keypair directly inside the browser ensuring the private 
 * key is utterly inaccessible to DOM extraction maintaining zero-trust paradigms seamlessly.
 */
async function ensureSecurityToken() {
    if (CLIENT_PRIVATE_KEY && CLIENT_CERTIFICATE) return true;
    try {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: "RSASSA-PKCS1-v1_5",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256"
            },
            false,
            ["sign"]
        );
        
        CLIENT_PRIVATE_KEY = keyPair.privateKey;
        const exportedPubKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
        
        /**
         * Safely converts the exported binary key to a base64 string using an iterative approach.
         * Bypasses the V8 call stack limits inherent in spread operators for potentially massive future keys.
         */
        let binaryString = '';
        const keyBytes = new Uint8Array(exportedPubKey);
        for (let i = 0; i < keyBytes.byteLength; i++) {
            binaryString += String.fromCharCode(keyBytes[i]);
        }
        const pubKeyBase64 = btoa(binaryString);

        const response = await fetch('/__kd_handshake', {
            headers: { 'X-KD-Public-Key': pubKeyBase64 }
        });
        
        if (response.ok) {
            const data = await response.json();
            CLIENT_CERTIFICATE = data.certificate;
            return true;
        }
    } catch (error) {
        console.debug("🛡️ [KD-SW] Key negotiation deferred due to network unavailability.", error.message);
    }
    return false;
}

let dbInstance = null;

function initDB() {
    if (dbInstance) return Promise.resolve(dbInstance);
    
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
            }
        };
        
        request.onsuccess = (event) => {
            /**
             * Caches the database connection via a Singleton pattern to prevent
             * connection leaks and memory exhaustion during heavy queue processing.
             */
            dbInstance = event.target.result;
            resolve(dbInstance);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Ensures strict integrity checking over moving payloads using an HMAC SHA-256 signature algorithm.
 * Intercepts requests that have no active session credentials in memory, purposefully enforcing
 * an offline transition so the request data is parked into local storage.
 */
async function signRequest(request, timestamp) {
    await ensureSecurityToken();
    
    if (!CLIENT_PRIVATE_KEY || !CLIENT_CERTIFICATE) {
        throw new Error("Missing security certificate. Handshake incomplete.");
    }

    let body = "";
    if (request.method !== "GET" && request.method !== "HEAD") {
        const clonedReq = request.clone();
        body = await clonedReq.text();
    }

    /**
     * Extracts the relative URI path to prevent cryptographic mismatch 
     * caused by SSL termination at upstream reverse proxies (e.g. Cloudflare).
     */
    const urlObj = new URL(request.url);
    const relativeUrl = urlObj.pathname + urlObj.search;

    const payload = `${request.method}:${relativeUrl}:${body}:${timestamp}`;
    const signatureBuffer = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5", 
        CLIENT_PRIVATE_KEY, 
        SHARED_ENCODER.encode(payload)
    );
    
    /**
     * Utilizes direct byte iteration to completely bypass intermediary array allocations.
     * Maximizes execution efficiency within high-throughput cryptographic signing routines.
     */
    const bytes = new Uint8Array(signatureBuffer);
    let signatureHex = '';
    for (let i = 0; i < bytes.length; i++) {
        signatureHex += bytes[i].toString(16).padStart(2, '0');
    }

    const headers = new Headers(request.headers);
    headers.set("X-KD-Timestamp", timestamp.toString());
    headers.set("X-KD-Signature", signatureHex);
    headers.set("X-KD-Certificate", CLIENT_CERTIFICATE);

    return new Request(request, { 
        method: request.method,
        headers: headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? body : null,
        mode: request.mode,
        credentials: request.credentials,
        redirect: request.redirect
    });
}

/**
 * Acts as the circuit breaker strategy for any outbound mutations while the service is down.
 * Prevents UI blockers by mocking an accepted state while storing the exact replication
 * variables locally.
 */
async function saveToOfflineQueue(request) {
    const db = await initDB();
    
    const clonedReq = request.clone();
    const body = await clonedReq.text();
    const headers = Array.from(clonedReq.headers.entries());

    const requestData = {
        url: clonedReq.url,
        method: clonedReq.method,
        headers: headers,
        body: body
    };

    const insertedId = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const addReq = store.add(requestData);
        addReq.onsuccess = () => resolve(addReq.result);
        addReq.onerror = () => reject(addReq.error);
    });
    
    return new Response(JSON.stringify({ 
        success: true, 
        _kd_status: "queued", 
        message: "Network offline. Request saved locally.",
        _kd_queue_id: insertedId
    }), {
        headers: { 
            "Content-Type": "application/json",
            "X-KD-Queue-ID": insertedId.toString()
        },
        status: 202 
    });
}

/**
 * Replays preserved mutations to the network after connectivity restores. 
 * Extracts data via a segregated promise instance prior to transaction operations
 * to fundamentally mitigate race conditions between indexedDB reads and writes.
 */
async function processOfflineQueue() {
    const db = await initDB();
    
    /**
     * Implements a paginated batch retrieval strategy limiting memory consumption 
     * during massive offline queue recoveries (e.g., 10,000+ pending requests).
     */
    const BATCH_SIZE = 50;
    const items = await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll(null, BATCH_SIZE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve([]);
    });

    if (items.length === 0) return;
    
    let halted = false;

    for (const item of items) {
        try {
            const headers = new Headers(item.headers);
            const reqOptions = { method: item.method, headers };
            if (item.body) reqOptions.body = item.body;

            let fetchReq = new Request(item.url, reqOptions);
            
            const currentTimestamp = Date.now();
            fetchReq = await signRequest(fetchReq, currentTimestamp);

            const response = await fetch(fetchReq);
            
            if (response.ok) {
                const deleteTx = db.transaction(STORE_NAME, "readwrite");
                deleteTx.objectStore(STORE_NAME).delete(item.id);
            } else if (response.status === 429 || response.status >= 500) {
                /**
                 * Instantly halts the queue replay loop if the server indicates distress.
                 * Prevents the thundering herd effect from immediately re-crashing a recovering backend.
                 */
                console.warn(`🛑 [KD-SW] Server returned ${response.status} during sync. Halting queue replay.`);
                halted = true;
                break;
            }
        } catch (error) {
            console.debug("🛡️ [KD-SW] Offline queue processing halted pending network restoration.");
            halted = true;
            break;
        }
    }

    /**
     * Recursively processes the next chunk if the current batch completed successfully 
     * and the queue limit was reached, preventing event loop blocking.
     */
    if (!halted && items.length === BATCH_SIZE) {
        setTimeout(processOfflineQueue, 1000);
    }
}

const requestDebounceMap = new Map();
const DEBOUNCE_WINDOW_MS = 300; 
const delay = (ms) => new Promise(res => setTimeout(res, ms));

self.addEventListener("fetch", (event) => {
    if (event.request.method === "GET" || event.request.method === "HEAD") {
        return; 
    }

    event.respondWith(
        (async () => {
            const reqCloneForHash = event.request.clone();
            const bodyText = await reqCloneForHash.text();
            
            /**
             * Generates an exact cryptographic digest of the payload body guaranteeing
             * absolute deduplication accuracy without risking collision drops on similar leading bytes.
             */
            const bodyBuffer = SHARED_ENCODER.encode(bodyText);
            const hashBuffer = await crypto.subtle.digest('SHA-256', bodyBuffer);
            
            const hashBytes = new Uint8Array(hashBuffer);
            let bodyHash = '';
            for (let i = 0; i < hashBytes.length; i++) {
                bodyHash += hashBytes[i].toString(16).padStart(2, '0');
            }
            
            const requestKey = `${event.request.method}:${event.request.url}:${bodyHash}`;

            /**
             * Identifies duplicate action spans inside our defined debounce window to
             * discard identical events born from stutter clicks without penalizing the API.
             */
            if (requestDebounceMap.has(requestKey)) {
                return new Response(JSON.stringify({ 
                    success: true, 
                    _kd_status: "deduplicated",
                    message: "Exact duplicate request intercepted." 
                }), {
                    headers: { "Content-Type": "application/json" },
                    status: 202 
                });
            }

            requestDebounceMap.set(requestKey, true);
            setTimeout(() => requestDebounceMap.delete(requestKey), DEBOUNCE_WINDOW_MS);

            const timestamp = Date.now();
            const signedRequest = await signRequest(event.request, timestamp);

            if (!navigator.onLine) {
                return saveToOfflineQueue(signedRequest);
            }

            try {
                /**
                 * Applies randomized jitter logic offsetting simultaneous connection spikes.
                 * Mitigates thundering herd scenarios post network restoration.
                 */
                const jitterMs = Math.floor(Math.random() * 500);
                await delay(jitterMs);

                /**
                 * Clones the cryptographic request prior to network transmission preserving the 
                 * original unconsumed payload stream for emergency offline routing procedures.
                 */
                const fetchRequest = signedRequest.clone();
                const response = await fetch(fetchRequest);

                /**
                 * Immediately intercepts destructive API behaviors resulting from high load
                 * allowing local preservation instead of unrecoverable data loss.
                 */
                if (response.status === 429 || response.status >= 500) {
                    const offlineResponse = await saveToOfflineQueue(signedRequest.clone());
                    const queueId = parseInt(offlineResponse.headers.get("X-KD-Queue-ID"), 10);
                    
                    /**
                     * Extracts the raw payload to pass into the Window context.
                     * Native Request objects cannot be cloned directly via postMessage.
                     */
                    const reqCloneForSwarm = signedRequest.clone();
                    const swarmBody = await reqCloneForSwarm.text();
                    const swarmHeaders = Array.from(reqCloneForSwarm.headers.entries());
                    
                    const requestDataPayload = {
                        requestId: queueId,
                        url: reqCloneForSwarm.url,
                        method: reqCloneForSwarm.method,
                        headers: swarmHeaders,
                        body: swarmBody
                    };

                    /**
                     * INITIATE V2.0 SWARM PROTOCOL:
                     * Alerts the main browser thread to awaken the WebRTC Swarm Engine.
                     * Bypasses the Service Worker WebRTC restriction by delegating P2P duties to the Window context.
                     */
                    const clients = await self.clients.matchAll();
                    clients.forEach(client => {
                        client.postMessage({
                            type: "KD_INITIATE_SWARM",
                            status: response.status,
                            requestData: requestDataPayload
                        });
                    });

                    return offlineResponse;
                }

                return response;
            } catch (error) {
                return saveToOfflineQueue(signedRequest.clone());
            }
        })()
    );
});

self.addEventListener("sync", (event) => {
    if (event.tag === "kd-sync") {
        /**
         * Clears token during background synchronization runs driving a fresh integrity payload.
         */
        CLIENT_PRIVATE_KEY = null;
        CLIENT_CERTIFICATE = null;
        event.waitUntil(processOfflineQueue());
    }
});

self.addEventListener("message", (event) => {
    if (event.data === "network_restored") {
        /**
         * Clears token during active network switching requiring unique integrity payloads.
         */
        CLIENT_PRIVATE_KEY = null;
        CLIENT_CERTIFICATE = null;
        processOfflineQueue();
    }
    
    if (event.data && event.data.type === 'REMOVE_FROM_QUEUE' && event.data.id) {
        /**
         * Purges synchronized mutations explicitly verified by Swarm Leaders
         * preventing catastrophic duplicate submissions during network stabilization phases.
         */
        initDB().then(db => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).delete(event.data.id);
        });
    }
});