<?php
$SECRET_KEY = "REPLACE_WITH_CLI_GENERATED_KEY";

/**
 * Executes an immediate fatal halt if the system detects an uninitialized cryptographic key.
 * Prevents developers from accidentally deploying insecure template files directly to production.
 */
if ($SECRET_KEY === 'REPLACE_WITH_CLI_GENERATED_KEY') {
    header('HTTP/1.1 500 Internal Server Error');
    die("🚨 [hyper-guard-kd] CRITICAL ERROR: Secret Key not generated! You must run 'npx hyper-guard-kd init' to secure your app.");
}

$MAX_AGE_SECONDS = 60;

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$uri = $_SERVER['REQUEST_URI'] ?? '';

/**
 * Synthesizes isolated cryptographic channels using dynamic hardware signatures masking true global constants.
 * Prevents universal intercept vectors by tying individual clients precisely to proxy verified ip-agent mutations.
 */
$clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

$parsed_path = parse_url($uri, PHP_URL_PATH);

/**
 * Orchestrates stateless PKI issuance. Authenticates the public key bound
 * specifically to environmental variables generating an immutable certificate.
 */
if ($parsed_path === '/__kd_handshake') {
    $clientPubKey = $_SERVER['HTTP_X_KD_PUBLIC_KEY'] ?? '';
    if (!$clientPubKey) {
        header('HTTP/1.1 400 Bad Request');
        die(json_encode(['error' => 'Missing Public Key']));
    }
    /**
     * Employs strict delimitation within the HMAC payload isolating discrete identity vectors.
     * Eradicates concatenation collisions outright maintaining cryptographic rigidity.
     */
    $certHmac = hash_hmac('sha256', $clientPubKey . '|' . $clientIp . '|' . $userAgent, $SECRET_KEY);
    header('Content-Type: application/json');
    die(json_encode(['certificate' => $clientPubKey . '.' . $certHmac]));
}

if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH' || $method === 'DELETE') {
    
    $serverIsChoking = false;

    if (function_exists('sys_getloadavg')) {
        $load = sys_getloadavg();
        /**
         * Actuates a load shedding breaker protecting execution buffers during extreme hardware surges natively.
         * Shuns incoming mutators deliberately back to offline client pools upon breaching predefined operating strain thresholds.
         */
        if ($load !== false && $load[0] > 2.5) {
            $serverIsChoking = true;
        }
    } else {
        /**
         * Triggers an explicit concurrency restriction matrix substituting disabled metric retrieval channels reliably.
         * Maximizes environmental compatibility across strictly controlled or heavily sandboxed deployment domains dynamically.
         * Utilizes cryptographically unique lock files preventing cross-tenant symlink attacks on shared hosting environments.
         */
        $MAX_FALLBACK = 200;
        $rateLimitFile = sys_get_temp_dir() . '/kd_funnel_' . md5($SECRET_KEY) . '.json';
        
        /**
         * Replaces unsafe error suppression operators with strict existence and type 
         * validations preserving environment stability and diagnostic integrity.
         */
        if (file_exists(dirname($rateLimitFile)) && is_writable(dirname($rateLimitFile))) {
            $fp = fopen($rateLimitFile, 'c+');
            if ($fp && flock($fp, LOCK_EX)) {
                $rawJson = stream_get_contents($fp);
                $data = $rawJson ? json_decode($rawJson, true) : null;
                
                if (!is_array($data) || !isset($data['time'])) {
                    $data = ['time' => time(), 'count' => 0];
                }
                
                if ($data['time'] !== time()) {
                    $data = ['time' => time(), 'count' => 0];
                }
                
                $data['count']++;
                if ($data['count'] > $MAX_FALLBACK) $serverIsChoking = true;
                
                ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($data));
                flock($fp, LOCK_UN); fclose($fp);
            }
        }
    }

    if ($serverIsChoking) {
        header('HTTP/1.1 429 Too Many Requests');
        header('Content-Type: application/json');
        die(json_encode(['error' => 'Server breathing capacity reached. Request queued on client.']));
    }

    $clientTimestamp = $_SERVER['HTTP_X_KD_TIMESTAMP'] ?? null;
    $clientSignature = $_SERVER['HTTP_X_KD_SIGNATURE'] ?? null;
    $clientCertificate = $_SERVER['HTTP_X_KD_CERTIFICATE'] ?? null;

    if (!$clientTimestamp || !$clientSignature || !$clientCertificate) {
        header('HTTP/1.1 403 Forbidden');
        header('Content-Type: application/json');
        die(json_encode(['error' => 'Access Denied: Missing security headers.']));
    }

    $currentTimestamp = round(microtime(true) * 1000);
    $ageInSeconds = ($currentTimestamp - (int)$clientTimestamp) / 1000;

    if ($ageInSeconds > $MAX_AGE_SECONDS || $ageInSeconds < -5) {
        header('HTTP/1.1 403 Forbidden');
        header('Content-Type: application/json');
        die(json_encode(['error' => 'Access Denied: Request expired (Replay Attack prevention).']));
    }
    
    $certParts = explode('.', $clientCertificate);
    if (count($certParts) !== 2) {
        header('HTTP/1.1 403 Forbidden');
        die(json_encode(['error' => 'Access Denied: Invalid certificate structure.']));
    }
    
    $pubKeyBase64 = $certParts[0];
    $certHmac = $certParts[1];
    
    $expectedCertHmac = hash_hmac('sha256', $pubKeyBase64 . '|' . $clientIp . '|' . $userAgent, $SECRET_KEY);
    
    if (!hash_equals($expectedCertHmac, $certHmac)) {
        header('HTTP/1.1 403 Forbidden');
        die(json_encode(['error' => 'Access Denied: Untrusted or spoofed certificate.']));
    }

    /**
     * Reconstructs explicit client execution URIs validating precise target pathways actively avoiding
     * absolute protocol distortions artificially imposed by intermediate load balancer components.
     */
    $relativeUrl = $_SERVER['REQUEST_URI'] ?? '';
    $rawBody = file_get_contents('php://input');
    $payload = $method . ':' . $relativeUrl . ':' . $rawBody . ':' . $clientTimestamp;

    /**
     * Conducts final validation stages against the isolated client-specific cryptographic derivation natively.
     */
    $der = base64_decode($pubKeyBase64);
    $pem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----";
    $pubKeyId = openssl_pkey_get_public($pem);
    
    /**
     * Enforces strict hexadecimal string evaluation prior to binary conversion
     * preventing silent memory faults or type coercion vulnerabilities during verification.
     */
    $binarySignature = (ctype_xdigit($clientSignature) && strlen($clientSignature) % 2 === 0) 
        ? hex2bin($clientSignature) 
        : false;
    
    if (!$pubKeyId || !$binarySignature || openssl_verify($payload, $binarySignature, $pubKeyId, OPENSSL_ALGO_SHA256) !== 1) {
        header('HTTP/1.1 403 Forbidden');
        header('Content-Type: application/json');
        die(json_encode(['error' => 'Access Denied: Invalid cryptographic signature.']));
    }
}
?>