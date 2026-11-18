# Temporary HTTPS testing link

The project includes `scripts/https-preview.mjs` for a Cloudflare Quick Tunnel.
It serves the built frontend and API through the same HTTPS origin on loopback port
4102, using the dedicated live database and a separate private authentication secret.
It enables production secure cookies and security headers. It does not expose Vite.
The existing local installation remains available separately.

The active URL is stored privately in `.local/https-url.txt`. The current process
runs as the transient user service `student-dash-https-preview.service`.

Stop the public testing link:

```sh
systemctl --user stop student-dash-https-preview.service
```

To start a fresh link after stopping it:

```sh
cd /home/keesee/Projects/student-management-dash
systemd-run --user --collect --unit=student-dash-https-preview \
  --property=WorkingDirectory="$PWD" --property=UMask=0077 \
  --property=Requires=student-dash-postgres.service \
  --property=After=student-dash-postgres.service \
  /home/keesee/.local/share/mise/installs/node/26.8.2/bin/node \
  --import tsx scripts/https-preview.mjs
```

Wait for `.local/https-url.txt`, then use its HTTPS address instead of the LAN HTTP
address. The service is not enabled at boot. The computer and Internet connection
must remain on. The URL changes on tunnel recreation. Anyone can reach the login
and signup pages; dashboard data still requires an approved account. Do not share
teacher credentials. New students remain pending until School Official approves.
Rate limits currently group requests behind the tunnel; this is a small-test setup.

Cloudflare documents Quick Tunnels as testing/development only, without an uptime
guarantee: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/
This is not permanent production hosting and does not resolve the other release
items in SECURITY-REVIEW.md. Use fictional student data for testing.
