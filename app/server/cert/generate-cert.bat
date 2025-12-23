@echo off
echo Generating SSL certificates for development...
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=PrivateCall/CN=localhost"
echo.
echo SSL certificates generated successfully!
echo key.pem and cert.pem created in the cert directory.
pause
