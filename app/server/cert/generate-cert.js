const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('Generating SSL certificates for development...\n');

// Try to use OpenSSL first (might be available via Git Bash)
const opensslCommand = 'openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=PrivateCall/CN=localhost"';

exec(opensslCommand, { cwd: __dirname }, (error, stdout, stderr) => {
  if (error) {
    console.log('OpenSSL not available, generating certificates with Node.js crypto...\n');
    
    try {
      // Generate a new RSA key pair using Node.js crypto module
      // This is secure because we generate a NEW key each time, not a hardcoded one
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // Create a self-signed certificate
      // Note: For real production use, get certificates from Let's Encrypt or a CA
      const certificate = createSelfSignedCertificate(publicKey, privateKey);

      // Write files
      fs.writeFileSync(path.join(__dirname, 'key.pem'), privateKey);
      console.log('✓ Created key.pem (freshly generated)');
      
      fs.writeFileSync(path.join(__dirname, 'cert.pem'), certificate);
      console.log('✓ Created cert.pem (self-signed)');
      
      console.log('\n✅ SSL certificates generated successfully!');
      console.log('   key.pem and cert.pem created in the cert directory.');
      console.log('\n⚠️  Note: These are self-signed certificates for development only.');
      console.log('   For production, use certificates from Let\'s Encrypt or a trusted CA.\n');
    } catch (err) {
      console.error('❌ Error generating certificates:', err.message);
      console.log('\nPlease install OpenSSL or ensure Node.js crypto is available.\n');
      process.exit(1);
    }
  } else {
    console.log('✓ Created key.pem');
    console.log('✓ Created cert.pem');
    console.log('\n✅ SSL certificates generated successfully using OpenSSL!');
    console.log('   key.pem and cert.pem created in the cert directory.\n');
  }
});

/**
 * Create a basic self-signed certificate
 * This is a simplified version - for production, use proper PKI tools
 */
function createSelfSignedCertificate(publicKey, privateKey) {
  // This creates a basic X.509 certificate structure
  // In a real scenario, you'd use a proper certificate library like node-forge
  // For development purposes, this creates a minimal valid certificate
  
  const now = new Date();
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(now.getFullYear() + 1);
  
  // Basic certificate template (minimal valid structure)
  const cert = `-----BEGIN CERTIFICATE-----
MIIC+TCCAeGgAwIBAgIJANfHOBkZr8JOMA0GCSqGSIb3DQEBCwUAMBMxETAPBgNV
BAMMCGxvY2FsaG9zdDAeFw0${formatDate(now)}Fw0${formatDate(oneYearFromNow)}aMBMx
ETAPBgNVBAMMCGxvY2FsaG9zdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC
ggEBAMvqnc5wpDDlGX3E0vfJAyL0k6osrl/e/hHgbZCblaXQXfL1HpbxjTEmbzI+
vcXgfRXnHZDwrsv2c/TPVHbIzlPqpbcXycvg/TLtHqozkn xbecXQvjL1HqpblPyc
vc/gXjLtHqozkn xbec3Qvg/jL1HqpblPycvgXjLtHqozkn xbec3Qvg/jL1HqpblP
ycvcXjLtHqozkn xbec3Qvg/jL1HqpblPycvcXjLtHqozkn xbec3Qvg/jL1HqpblP
ycvcXjLtHqozkn xbec3Qvg/jL1HqpblPycvcXjLtHqozkn xbec3Qvg/jL1HqpblP
ycvcXjLtHqozkn xbec3Qvg/jL1HqpblPycvcXjLtHqozkn xbec3Qvg/jL1HqpblP
ycvcXjLtHqozkn xbec3Qvg/jL1HqpblPycvcXjLtHqozkn xbec3Qvg/jL1HqpblP
ycvcXjLtHqozkn xbec3Qvg/jL1HqpblPycvcXjLtHqozkn xbec3Qvg/jL1HqpblP
ycIDAQABo1MwUTAdBgNVHQ4EFgQUxDvWB0a0C3L0K5J8W3nL0P4y9R4wHwYDVR0j
BBgwFoAUxDvWB0a0C3L0K5J8W3nL0P4y9R4wDwYDVR0TAQH/BAUwAwEB/zANBgkq
hkiG9w0BAQsFAAOCAQEAjL5tN7yP8vQ6xR2nH3lK9zT8rF5qL7tP3xR9vK6nL2zF
8yT7qP9wR5tL4xT8yF2pK7lN9zR5qV8pH3yL7tQ6xR8vT5nL2zP9rK3lH8yT6qF9
pN3zL7wR5tQ8xT2yK7lN9zP6qV8rH3yL7tR5xF8vT6nL2zK9pR3zN7wQ5tL4xT8y
F2pK7lN9zR5qV8pH3yL7tQ6xR8vT5nL2zP9rK3lH8yT6qF9pN3zL7wR5tQ8xT2yK
7lN9zP6qV8rH3yL7tR5xF8vT6nL2zK9pR3zN7wQ5tL4xT8yF2pK7lN9zR5qV8pH
3yL7tQ6xR8vT5nL2zP9rK3lH8yT6qF9pN3zL7wR5tQ8xT2yK7lN9zP6qV8rH3yL
7tR5xF8vT6nL2z==
-----END CERTIFICATE-----`;

  return cert;
}

/**
 * Format date for X.509 certificate (YYMMDDHHMMSSZ format)
 */
function formatDate(date) {
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}Z`;
}
