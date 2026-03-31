#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log("🚀 Initializing hyper-guard-kd Enterprise Protection & Sync...\n");

/**
 * Establishes a unique cryptographic perimeter bounds per project installation 
 * leveraging high-entropy entropy generation locking the runtime components to
 * a specific integration instance immediately.
 */
const generatedSecretKey = crypto.randomBytes(32).toString('hex');
console.log(`🔑 Generated Unique Secret Key: ${generatedSecretKey.substring(0, 10)}...\n`);

const currentDir = process.cwd();

function fileExists(filePath) {
    return fs.existsSync(path.join(currentDir, filePath));
}

/**
 * Intercepts template deployment specifically for validation layers 
 * mutating raw placeholder constants directly with our installation-bound 
 * entropy isolating key storage logic away from developer interaction points entirely.
 */
function getTemplateContent(fileName) {
    try {
        const templatePath = path.join(__dirname, 'templates', fileName);
        const content = fs.readFileSync(templatePath, 'utf-8');
        
        if (fileName.includes('validator')) {
            /**
             * Intentionally utilizing .replace() over .replaceAll() to specifically target 
             * only the first variable assignment. This brilliantly preserves the literal 
             * placeholder string inside the Poison Pill guard condition for runtime validation.
             */
            return content.replace("REPLACE_WITH_CLI_GENERATED_KEY", generatedSecretKey);
        }
        return content;
    } catch (error) {
        console.error(`❌ Error reading template ${fileName}. Please check package installation.`, error.message);
        process.exit(1);
    }
}

console.log("🔍 Scanning Backend Environment...");

if (fileExists('wp-config.php')) {
    console.log("✅ WordPress detected!");
    const muPluginsDir = path.join(currentDir, 'wp-content', 'mu-plugins');
    
    if (!fs.existsSync(muPluginsDir)) {
        fs.mkdirSync(muPluginsDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(muPluginsDir, 'kd-validator.php'), 
        getTemplateContent('kd-validator.php')
    );
    console.log("🛡️  Dropped PHP Validator in mu-plugins/ (Zero-config protection active).");

} else if (fileExists('package.json')) {
    console.log("✅ Node.js environment detected!");
    const sysDir = path.join(currentDir, 'kd-system');
    
    if (!fs.existsSync(sysDir)) fs.mkdirSync(sysDir);
    
    fs.writeFileSync(
        path.join(sysDir, 'kd-validator.js'), 
        getTemplateContent('kd-validator.js')
    );
    console.log("🛡️  Generated Node.js Middleware in kd-system/kd-validator.js");
    console.log("👉 ACTION REQUIRED: Import and use this middleware in your Express/Next route.");
} else {
    console.log("⚠️  Backend environment not strictly identified. Skipping backend auto-injection.");
}

console.log("\n🔍 Scanning Frontend Environment...");

/**
 * Dynamically resolves execution contexts targeting conventional structural endpoints
 * scaling compatibilities across arbitrary modern architectural ecosystems flawlessly.
 */
let publicDir = currentDir;
if (fileExists('public')) publicDir = path.join(currentDir, 'public');
else if (fileExists('dist')) publicDir = path.join(currentDir, 'dist');

const swCorePath = path.join(publicDir, 'kd-sw-core.js');
fs.writeFileSync(swCorePath, getTemplateContent('kd-sw-core.js'));
console.log("⚙️  Dropped kd-sw-core.js in public directory.");

const swarmPath = path.join(publicDir, 'kd-swarm.js');
fs.writeFileSync(swarmPath, getTemplateContent('kd-swarm.js'));
console.log("🐝  Dropped kd-swarm.js (P2P Engine) in public directory.");

const possibleSwNames = [
    'sw.js', 
    'service-worker.js', 
    'next-pwa-sw.js', 
    'firebase-messaging-sw.js',
    'worker.js'
];

let customSwPath = null;
for (const name of possibleSwNames) {
    const checkPath = path.join(publicDir, name);
    if (fs.existsSync(checkPath)) {
        customSwPath = checkPath;
        break;
    }
}

if (customSwPath) {
    console.log(`⚠️  Existing Service Worker found at: ${path.basename(customSwPath)}`);
    let swContent = fs.readFileSync(customSwPath, 'utf-8');
    
    if (!swContent.includes('kd-sw-core.js')) {
        /**
         * Safely injects internal capabilities via overarching script importation standards
         * into preceding service workers bypassing dangerous destructive core file overwrites.
         */
        const importStatement = `importScripts('/kd-sw-core.js'); /* hyper-guard-kd Injection */\n`;
        fs.writeFileSync(customSwPath, importStatement + swContent);
        console.log(`🤝 Successfully merged hyper-guard-kd into ${path.basename(customSwPath)} using importScripts.`);
    }
} else {
    console.log("✅ No existing Service Worker. Standalone mode ready.");
    console.log("👉 ACTION REQUIRED: Register '/kd-sw-core.js' in your main index.html or app.js.");
}

console.log("\n🎉 hyper-guard-kd installation complete!");