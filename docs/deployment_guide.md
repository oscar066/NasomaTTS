# NasomaTTS v1 — Production Deployment Guide

Deploys NasomaTTS on the same Contabo server (`84.247.161.30`) as Kiduka.

## Architecture

```
Internet
   │
   ├── kiduka-labs.co.ke  ──────────────────────────────────┐
   │                                                        │
   └── YOUR_NASOMA_DOMAIN ──────────────────────────────────┤
                                                            ▼
                                              nginx (system service, ports 80/443)
                                              routes by domain name to localhost
                                                 │                   │
                                    127.0.0.1:3000/8000    127.0.0.1:3001/8001
                                         │                        │
                                  [Kiduka compose]        [NasomaTTS compose]
                                  client  api  db         client  api  mongo  minio
```

**Key decisions:**
- nginx runs as a host system service — not inside any Docker compose
- Each app's ports are bound to `127.0.0.1` only (not publicly accessible)
- Apps are completely independent — deploying one never touches the other
- Adding a new app = add a new server block to nginx, start a new compose

**Port map:**

| App | Service | Host port |
|---|---|---|
| Kiduka | Next.js client | `127.0.0.1:3000` |
| Kiduka | FastAPI | `127.0.0.1:8000` |
| NasomaTTS | Next.js client | `127.0.0.1:3001` |
| NasomaTTS | FastAPI | `127.0.0.1:8001` |

---

## Part 1 — One-time Server Setup

### 1.1 SSH into the server

```bash
ssh root@84.247.161.30
```

### 1.2 Install nginx on the host

```bash
apt update && apt install -y nginx
systemctl enable nginx
```

### 1.3 Install the nginx config for both apps

The config file lives at [`nginx/server-nginx.conf`](../nginx/server-nginx.conf) in this repo.
Copy it to the server:

```bash
# On your LOCAL machine:
scp nginx/server-nginx.conf root@84.247.161.30:/etc/nginx/sites-available/apps.conf
```

Then on the server, replace `YOUR_NASOMA_DOMAIN` with your real domain:

```bash
nano /etc/nginx/sites-available/apps.conf
# Replace all occurrences of YOUR_NASOMA_DOMAIN (4 places)
```

Enable the config:

```bash
ln -s /etc/nginx/sites-available/apps.conf /etc/nginx/sites-enabled/apps.conf
# Remove the default site if present
rm -f /etc/nginx/sites-enabled/default
```

> Don't test or reload nginx yet — SSL certs need to be in place first.

### 1.4 Open firewall ports

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

---

## Part 2 — SSL Certificates

nginx needs Cloudflare Origin Certificates for both domains.
All certs go in `/etc/nginx/ssl/` on the server.

```bash
mkdir -p /etc/nginx/ssl
chmod 700 /etc/nginx/ssl
```

### Kiduka cert (if not already in place)

1. Cloudflare → `kiduka-labs.co.ke` → **SSL/TLS** → **Origin Server** → **Create Certificate**
2. Save as `kiduka-origin.crt` and `kiduka-origin.key` locally
3. Upload:
```bash
scp kiduka-origin.crt root@84.247.161.30:/etc/nginx/ssl/
scp kiduka-origin.key root@84.247.161.30:/etc/nginx/ssl/
```

### NasomaTTS cert

1. Cloudflare → your NasomaTTS domain → **SSL/TLS** → **Origin Server** → **Create Certificate**
2. Add `YOUR_NASOMA_DOMAIN` and `*.YOUR_NASOMA_DOMAIN` as hostnames, RSA 2048, 15 years
3. Save as `nasoma-origin.crt` and `nasoma-origin.key` locally
4. Upload:
```bash
scp nasoma-origin.crt root@84.247.161.30:/etc/nginx/ssl/
scp nasoma-origin.key root@84.247.161.30:/etc/nginx/ssl/
chmod 600 /etc/nginx/ssl/*.key
```

### Test and start nginx

```bash
nginx -t
systemctl reload nginx
```

---

## Part 3 — Deploy Kiduka (update existing deployment)

Kiduka's compose no longer has an nginx service. Redeploy it with the updated compose:

```bash
cd ~/Kiduka
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Part 4 — Deploy NasomaTTS

### 4.1 Clone the repository

```bash
cd ~
git clone <YOUR_NASOMA_GITHUB_REPO_URL> NasomaTTS
cd NasomaTTS
```

### 4.2 Create the environment file

```bash
cp .env.example .env
nano .env
```

| Variable | Value |
|---|---|
| `MONGODB_DB` | `nasoma` |
| `MINIO_ACCESS_KEY` | any username |
| `MINIO_SECRET_KEY` | strong password |
| `MINIO_BUCKET` | `documents` |
| `JWT_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://YOUR_NASOMA_DOMAIN` |

### 4.3 Run the deploy script

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 4.4 Verify

```bash
docker compose ps
# All four services should show Up
```

---

## Part 5 — Cloudflare DNS

For each domain:

1. Cloudflare → domain → **DNS** → **Records**
2. Add **A record**: `@` → `84.247.161.30`, **Proxied** (orange cloud ON)
3. Add **A record**: `www` → `84.247.161.30`, **Proxied**
4. **SSL/TLS** → **Overview** → set mode to **Full (Strict)**

---

## Part 6 — GitHub Actions (auto-deploy on push)

The workflow at [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) SSHs into the server and runs `scripts/deploy.sh` on every push to `main`.

Add these secrets to your GitHub repo (**Settings → Secrets → Actions**):

| Secret | Value |
|---|---|
| `SERVER_IP` | `84.247.161.30` |
| `SERVER_USER` | `root` |
| `SSH_PRIVATE_KEY` | your private key (the one whose public key is in `~/.ssh/authorized_keys` on the server) |
| `SSH_PORT` | `22` (optional) |

> NasomaTTS and Kiduka share the same server secrets — you can reuse the same SSH key and IP across both repos.

---

## Routine Operations

### Redeploy after code changes (manual)
```bash
cd ~/NasomaTTS && ./scripts/deploy.sh
```

### View logs
```bash
cd ~/NasomaTTS
docker compose logs -f client
docker compose logs -f api
```

### Restart a single service
```bash
docker compose restart client
```

### Stop everything
```bash
docker compose down
```

### Add a new app to the server

1. Add two new `server {}` blocks to `/etc/nginx/sites-available/apps.conf`
2. Upload SSL cert for the new domain to `/etc/nginx/ssl/`
3. Run `nginx -t && systemctl reload nginx`
4. Clone repo, create `.env`, run `docker compose up -d --build`
5. Done — no other app is touched

---

## Troubleshooting

| Problem | Check |
|---|---|
| 502 Bad Gateway | `docker compose ps` — is the container running? Check `docker compose logs` |
| Can't reach backend from client | Check port binding: `ss -tlnp \| grep 800` |
| nginx config error | `nginx -t` shows the exact line |
| SSL error in browser | Verify cert files exist: `ls /etc/nginx/ssl/` |
| NextAuth redirect loop | `NEXTAUTH_URL` in `.env` must match the actual public domain |
| Auto-deploy not triggering | Check GitHub Actions tab for errors; verify SSH secrets are set |
