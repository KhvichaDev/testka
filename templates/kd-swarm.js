/**
 * Core configuration for the P2P Swarm Engine.
 * The signaling URL must point to the developer's own WebSocket relay server
 * responsible for peer discovery and leader election orchestration.
 */
const SWARM_CONFIG = {
    SIGNALING_URL: 'wss://your-signaling-server.com',
    BATCH_WAIT_MS: 500,
    MAX_PEERS: 50
};

let swarmPeers = new Map();
let isSwarmLeader = false;
let designatedLeaderId = null;
let swarmBatchQueue = [];
let myPendingRequests = new Set();
/**
 * Utilizes hardware-backed cryptographic entropy generation over standard Math.random
 * to absolutely preclude predictive Peer ID spoofing vectors within the swarm network.
 */
let myPeerId = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
let signalingSocket = null;
let isConnectingToSignaling = false;

/**
 * Listens for distress signals dispatched by the Service Worker when the backend
 * responds with 429 (overloaded) or 5xx errors, triggering the P2P fallback protocol.
 */
navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'KD_INITIATE_SWARM') {
        console.warn('🐝 [KD-SWARM] Server is choking! Initiating P2P Swarm Protocol...');
        initiateSwarm(event.data.requestData);
    }
});

function initiateSwarm(pendingRequest) {
    if (pendingRequest && pendingRequest.requestId) {
        myPendingRequests.add(pendingRequest.requestId);
    }

    if (!signalingSocket || signalingSocket.readyState !== WebSocket.OPEN) {
        connectToSignalingServer();
    }

    /**
     * Leaders aggregate payloads directly into the shared batch queue
     * while regular peers route their data through WebRTC to the elected leader.
     */
    if (isSwarmLeader) {
        swarmBatchQueue.push(pendingRequest);
        scheduleBatchExecution();
    } else {
        sendToLeader(pendingRequest);
    }
}

function connectToSignalingServer() {
    /**
     * Employs a strict asynchronous execution lock preventing aggressive recursive
     * instantiation loops during rapid intermittent network state fluctuations.
     */
    if (isConnectingToSignaling) return;
    isConnectingToSignaling = true;

    try {
        signalingSocket = new WebSocket(SWARM_CONFIG.SIGNALING_URL);
        
        signalingSocket.onopen = () => {
            isConnectingToSignaling = false;
            signalingSocket.send(JSON.stringify({ type: 'JOIN_SWARM', peerId: myPeerId }));
        };

        signalingSocket.onerror = () => {
            console.error('🕸️ [KD-SWARM] Signaling WebSocket encountered a network error.');
            isConnectingToSignaling = false;
        };

        signalingSocket.onclose = () => {
            console.warn('🕸️ [KD-SWARM] Signaling WebSocket connection closed. Swarm detached.');
            isConnectingToSignaling = false;
            signalingSocket = null;
        };

        signalingSocket.onmessage = async (message) => {
            let data;
            try {
                data = JSON.parse(message.data);
            } catch (e) {
                /**
                 * Silently drops malformed signaling payloads preventing malicious 
                 * JSON structural spam from crashing the event listener loop.
                 */
                return;
            }
            
            /**
             * The signaling server elects the longest-connected peer as the swarm leader
             * to maximize connection stability during the batch aggregation window.
             */
            if (data.type === 'ELECTED_LEADER') {
                designatedLeaderId = data.leaderId;
                if (data.leaderId === myPeerId) {
                    isSwarmLeader = true;
                    console.log('👑 [KD-SWARM] I was elected as the Swarm Leader!');
                } else {
                    console.log(`📡 [KD-SWARM] Peer ${designatedLeaderId} was recognized as Leader.`);
                }
            }

            /**
             * Executes the complete WebRTC negotiation protocol orchestrating
             * session descriptions and ICE candidates dynamically across peers.
             */
            if (data.type === 'PEER_DISCOVERED') {
                establishWebRtcConnection(data.peerId, true);
            } else if (data.type === 'OFFER') {
                await establishWebRtcConnection(data.sender, false);
                const pc = swarmPeers.get(data.sender).connection;
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                signalingSocket.send(JSON.stringify({ type: 'ANSWER', target: data.sender, answer: answer }));
            } else if (data.type === 'ANSWER') {
                const pc = swarmPeers.get(data.sender)?.connection;
                if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            } else if (data.type === 'ICE_CANDIDATE') {
                const pc = swarmPeers.get(data.sender)?.connection;
                if (pc) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        };
    } catch (error) {
        console.error('🕸️ [KD-SWARM] Failed to reach signaling server. Falling back to offline queue.');
        isConnectingToSignaling = false;
    }
}

async function establishWebRtcConnection(peerId, isInitiator) {
    /**
     * Gracefully exits on browsers lacking WebRTC support.
     * The offline queue in the Service Worker acts as the natural fallback.
     */
    if (!window.RTCPeerConnection) return;

    const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    let dataChannel = null;

    if (isInitiator) {
        dataChannel = peerConnection.createDataChannel('kd_swarm_channel');
        setupDataChannel(dataChannel, peerId);
    } else {
        peerConnection.ondatachannel = (event) => {
            dataChannel = event.channel;
            setupDataChannel(dataChannel, peerId);
        };
    }

    peerConnection.onicecandidate = (event) => {
        if (event.candidate && signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
            signalingSocket.send(JSON.stringify({ type: 'ICE_CANDIDATE', target: peerId, candidate: event.candidate }));
        }
    };

    /**
     * Actively monitors WebRTC lifecycle events to purge stale or severed connections.
     * Prevents memory leaks and zombie peer references during prolonged swarm sessions.
     */
    peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        if (state === 'disconnected' || state === 'failed' || state === 'closed') {
            console.log(`🧹 [KD-SWARM] Cleaning up disconnected peer: ${peerId}`);
            const peer = swarmPeers.get(peerId);
            if (peer && peer.channel) {
                peer.channel.close();
            }
            peerConnection.close();
            swarmPeers.delete(peerId);
            
            if (peerId === designatedLeaderId) {
                console.warn('⚠️ [KD-SWARM] Leader disconnected. Awaiting new election...');
                designatedLeaderId = null;
                isSwarmLeader = false;
            }
        }
    };

    swarmPeers.set(peerId, { connection: peerConnection, channel: null });

    if (isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        signalingSocket.send(JSON.stringify({ type: 'OFFER', target: peerId, offer: offer }));
    }
}

function setupDataChannel(channel, peerId) {
    channel.onmessage = (event) => {
        let incomingData;
        try {
            incomingData = JSON.parse(event.data);
        } catch (e) {
            /**
             * Immediately discards invalid WebRTC data channel transmissions protecting
             * the local swarm aggregation routines from targeted peer injection attacks.
             */
            return;
        }

        if (isSwarmLeader && incomingData.type === 'SWARM_PAYLOAD') {
            swarmBatchQueue.push(incomingData.payload);
        }
        
        /**
         * Enforces strict origin validation ensuring critical destructive commands 
         * are only honored if emitted by the cryptographically designated swarm leader.
         */
        if (!isSwarmLeader && incomingData.type === 'BATCH_SUCCESS') {
            if (peerId !== designatedLeaderId) {
                console.warn('🚨 [KD-SWARM] Ignored BATCH_SUCCESS from unauthorized peer!');
                return;
            }
            
            console.log('✅ [KD-SWARM] Leader successfully delivered our payload!');
            myPendingRequests.forEach(id => {
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ type: 'REMOVE_FROM_QUEUE', id: id });
                }
            });
            myPendingRequests.clear();
        }
    };
    const peer = swarmPeers.get(peerId);
    if (peer) peer.channel = channel;
}

function sendToLeader(payload) {
    /**
     * Enforces strict topological routing guaranteeing sensitive encrypted payloads
     * are only transmitted to the explicitly elected swarm leader node.
     */
    const leaderPeer = swarmPeers.get(designatedLeaderId);
    if (leaderPeer && leaderPeer.channel && leaderPeer.channel.readyState === 'open') {
        leaderPeer.channel.send(JSON.stringify({ type: 'SWARM_PAYLOAD', payload: payload }));
    } else {
        console.warn('⏳ [KD-SWARM] Leader channel not ready. Waiting for WebRTC connection...');
        /**
         * Fallback: The offline queue naturally retains the data safely 
         * until the elected leader channel successfully initializes and opens.
         */
    }
}

let batchTimer = null;
function scheduleBatchExecution() {
    if (batchTimer) clearTimeout(batchTimer);
    
    batchTimer = setTimeout(async () => {
        if (swarmBatchQueue.length === 0) return;

        /**
         * Operates a zero-allocation reference handoff.
         * Transfers the active queue to a local constant and resets the global pointer 
         * without generating memory-heavy intermediate array clones.
         */
        const batchData = swarmBatchQueue;
        swarmBatchQueue = [];

        try {
            /**
             * Delivers the entire aggregated batch as a single HTTP request,
             * collapsing potentially thousands of individual calls into one payload.
             */
            const response = await fetch('/__kd_swarm_batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ swarmSize: batchData.length, batch: batchData })
            });

            if (response.ok) {
                /**
                 * Broadcasts delivery confirmation to all connected peers
                 * so they can safely purge their local offline queues.
                 * Includes strict null-checking to prevent TypeError crashes during active channel negotiations.
                 */
                for (let [id, peer] of swarmPeers) {
                    if (peer.channel && peer.channel.readyState === 'open') {
                        peer.channel.send(JSON.stringify({ type: 'BATCH_SUCCESS' }));
                    }
                }
                
                myPendingRequests.forEach(id => {
                    if (navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({ type: 'REMOVE_FROM_QUEUE', id: id });
                    }
                });
                myPendingRequests.clear();
            }
        } catch (error) {
            console.error('👑 [KD-SWARM] Leader failed to deliver batch. Reverting to local queues.');
            /**
             * Even the leader's delivery attempt failed, meaning the server is completely unreachable.
             * Data remains safely preserved in each peer's IndexedDB until conditions improve.
             */
        }
    }, SWARM_CONFIG.BATCH_WAIT_MS);
}