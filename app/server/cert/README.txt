SSL CERTIFICATES SETUP
======================

These SSL certificates are required for HTTPS/WSS signaling.

OPTION 1: Using OpenSSL (Recommended for Development)
------------------------------------------------------
1. Install OpenSSL for Windows from: https://slproweb.com/products/Win32OpenSSL.html
2. Run the generate-cert.bat script in this directory
   OR
3. Run this command manually:
   openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.crt -days 365 -nodes -subj "/C=US/ST=State/L=City/O=PrivateCall/CN=localhost"

OPTION 2: Using Git Bash (If Git is installed)
----------------------------------------------
1. Open Git Bash
2. Navigate to this directory
3. Run:
   openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.crt -days 365 -nodes -subj "/C=US/ST=State/L=City/O=PrivateCall/CN=localhost"

OPTION 3: Use HTTP instead of HTTPS (Not Recommended)
-----------------------------------------------------
The server will automatically fall back to HTTP if certificates are not found.
However, this is not recommended for production use.

For Production:
---------------
Use valid SSL certificates from Let's Encrypt or another Certificate Authority.
