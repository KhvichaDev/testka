const crypto = require('crypto');

const SECRET_KEY = "REPLACE_WITH_CLI_GENERATED_KEY"; 

/**
 * Executes an immediate fatal halt if the system detects an uninitialized cryptographic key.
 * Prevents developers from accidentally deploying insecure template files directly to production.
 */
if (SECRET_KEY === "REPLACE_WITH_CLI_GENERATED_KEY") {
    console.error("🚨 [hyper-guard-kd] CRITICAL ERROR: Secret Key not generated! You must run 'npx hyper-guard-kd init' to secure your app.");
    process.exit(1);
}

const MAX_AGE_SECONDS = 60; 

let currentLag = 0;
let lastCheck = Date.now();

/**
 * Operates an internal heartbeat diagnostic intercepting the Node JS event loop latency anomalies.
 * Continual execution deviations inform adaptive load shedding downstream entirely preventing total thread exhaustion.
 * Purposefully utilizing unref to gracefully decouple interval blocking during node termination cycles.
 */
setInterval(() => {
    const now = Date.now();
    currentLag = now - lastCheck - 500;
    lastCheck = now;
}, 500).unref();

function validateKhvichaSignature(req, res, next) {
    let clientIp = req.socket.remoteAddress || 'unknown';
    if (req.headers['x-forwarded-for']) {
        clientIp = req.headers['x-forwarded-for'].split(',')[0].trim();
    }
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const requestPath = (req.originalUrl || req.url).split('?')[0];
    
    /**
     * Orchestrates stateless PKI issuance. Authenticates the public key bound
     * specifically to environmental variables generating an immutable certificate.
     */
    if (requestPath === '/__kd_handshake') {
        const clientPubKey = req.headers['x-kd-public-key'];
        if (!clientPubKey) return res.status(400).json({ error: "Missing Public Key" });
        
        /**
         * Employs strict delimitation within the HMAC payload isolating discrete identity vectors.
         * Eradicates concatenation collisions outright maintaining cryptographic rigidity.
         */
        const certHmac = crypto.createHmac('sha256', SECRET_KEY).update(clientPubKey + '|' + clientIp + '|' + userAgent).digest('hex');
        const certificate = `${clientPubKey}.${certHmac}`;
        return res.status(200).json({ certificate });
    }

    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        return next();
    }

    /**
     * Executes extreme triage behaviors intercepting all writes during severe CPU anomalies.
     * Safely forces mutations into client side offline pipelines preserving structural integrity under 90%+ strains.
     */
    if (currentLag > 70) {
        return res.status(429).json({ error: "Server breathing capacity reached. Request queued on client." });
    }

    const clientTimestamp = req.headers['x-kd-timestamp'];
    const clientSignature = req.headers['x-kd-signature'];
    const clientCertificate = req.headers['x-kd-certificate'];

    if (!clientTimestamp || !clientSignature || !clientCertificate) {
        return res.status(403).json({ error: "Access Denied: Missing security headers." });
    }

    const currentTimestamp = Date.now();
    const ageInSeconds = (currentTimestamp - parseInt(clientTimestamp, 10)) / 1000;

    if (ageInSeconds > MAX_AGE_SECONDS || ageInSeconds < -5) {
        return res.status(403).json({ error: "Access Denied: Request expired (Replay Attack prevention)." });
    }

    const certParts = clientCertificate.split('.');
    if (certParts.length !== 2) return res.status(403).json({ error: "Access Denied: Invalid certificate structure." });
    
    const pubKeyBase64 = certParts[0];
    const certHmac = certParts[1];
    
    const expectedCertHmac = crypto.createHmac('sha256', SECRET_KEY).update(pubKeyBase64 + '|' + clientIp + '|' + userAgent).digest('hex');
    
    let isCertValid = false;
    try {
        isCertValid = crypto.timingSafeEqual(Buffer.from(expectedCertHmac, 'hex'), Buffer.from(certHmac, 'hex'));
    } catch(e) {}

    if (!isCertValid) {
        return res.status(403).json({ error: "Access Denied: Untrusted or spoofed certificate." });
    }

    /**
     * Reconstructs explicit client execution URIs validating precise target pathways actively avoiding
     * absolute protocol distortions artificially imposed by intermediate load balancer components.
     */
    const relativeUrl = req.originalUrl || req.url;
    
    let rawBody = "";
    if (req.rawBody) {
        rawBody = req.rawBody.toString();
    } else if (req.body && Object.keys(req.body).length > 0) {
        rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const payload = `${req.method}:${relativeUrl}:${rawBody}:${clientTimestamp}`;

    /**
     * Conducts final validation stages against the isolated client-specific cryptographic derivation natively.
     */
    let isSignatureValid = false;
    try {
        const publicKeyObject = crypto.createPublicKey({
            key: Buffer.from(pubKeyBase64, 'base64'),
            format: 'der',
            type: 'spki'
        });
        isSignatureValid = crypto.verify(
            'sha256',
            Buffer.from(payload),
            publicKeyObject,
            Buffer.from(clientSignature, 'hex')
        );
    } catch (e) {}

    if (!isSignatureValid) {
        return res.status(403).json({ error: "Access Denied: Invalid cryptographic signature." });
    }

    next();
}

module.exports = validateKhvichaSignature;