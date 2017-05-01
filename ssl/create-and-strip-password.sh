openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

openssl rsa -in key.pem -out key-wo.pem -passin pass:<pass>