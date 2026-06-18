# AI-KART Deployment Runbook

Use this for the current no-DNS server setup.

```text
AI-KART public:      http://143.198.5.97/
AI-KART backend:     http://127.0.0.1:8000
AI-KART frontend:    http://127.0.0.1:5175
AI Hub public:       http://143.198.5.97/aihub/
AI Hub local:        http://127.0.0.1:5176
Client Panel public: http://143.198.5.97/client-panel/ai_kart
Client Panel local:  http://127.0.0.1:5177
Project:             /var/www/Vercel_website
Venv:                /Data/www/aikartvenv
```

AI-KART owns public `/` and the shared system Nginx routing:

```text
/                         -> AI-KART frontend on 127.0.0.1:5175
/api/                     -> AI-KART backend on 127.0.0.1:8000
/aihub/                   -> AI Hub app on 127.0.0.1:5176
/client-panel/<client_id> -> Client Panel on 127.0.0.1:5177
```

Deploy order:

1. Deploy AI Hub from `/var/www/AI_salesman_plugin/aihub.md`.
2. Deploy AI-KART with this file only if storefront/backend code changed, or if shared Nginx routing must be applied.
3. Deploy Client Panel from `/var/www/client_panel/clientpanel.md`.

For Hub CRM or Client Panel UI-only changes, AI-KART source does not need a rebuild. Only reload this guide's Nginx config if public `/aihub/` or `/client-panel/` routing is broken.

## 1. Preflight

```bash
set -e

cd /var/www/Vercel_website

command -v git
command -v curl
command -v sudo
command -v nginx || true
command -v python3

pwd
git status --short
```

Expected:

```text
/var/www/Vercel_website
```

If `git status --short` shows local changes on the server, stop and inspect them before pulling.

## 2. Pull Code

```bash
cd /var/www/Vercel_website
git pull
```

## 3. Fix Permissions

```bash
sudo chown -R $(whoami):$(whoami) /var/www/Vercel_website
sudo mkdir -p /Data/www
sudo chown -R $(whoami):$(whoami) /Data/www
```

## 4. Ensure Node For This Project

This keeps Node local to the project and avoids depending on system Node.

```bash
cd /var/www/Vercel_website

ARCH="$(uname -m)"
if [ "$ARCH" = "x86_64" ]; then
  NODE_ARCH="x64"
elif [ "$ARCH" = "aarch64" ]; then
  NODE_ARCH="arm64"
else
  echo "Unsupported arch: $ARCH"
  exit 1
fi

mkdir -p /var/www/Vercel_website/.node
cd /var/www/Vercel_website/.node

NODE_FILE="$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt | grep "linux-${NODE_ARCH}.tar.xz" | awk '{print $2}' | head -n 1)"

if [ ! -f "$NODE_FILE" ]; then
  curl -fsSLO "https://nodejs.org/dist/latest-v22.x/${NODE_FILE}"
fi

tar -xf "$NODE_FILE"
ln -sfn "${NODE_FILE%.tar.xz}" current

export PATH="/var/www/Vercel_website/.node/current/bin:$PATH"
node -v
npm -v
```

## 5. Ensure PM2

```bash
if ! command -v pm2 >/dev/null 2>&1; then
  sudo /var/www/Vercel_website/.node/current/bin/npm install -g pm2
fi

command -v pm2
pm2 -v
```

## 6. Create Backend Venv

Use `python3` on the host. Do not rely on host-side `python`.

```bash
cd /var/www/Vercel_website

if [ ! -x /Data/www/aikartvenv/bin/python ]; then
  python3 -m venv /Data/www/aikartvenv
fi

/Data/www/aikartvenv/bin/python -m pip install --upgrade pip
```

## 7. Create Environment Files

```bash
cat > /var/www/Vercel_website/backend/.env <<'EOF'
DATABASE_URL=sqlite+aiosqlite:///./aikart.db
CORS_ORIGINS=http://143.198.5.97,http://aikart.ergobite.com,http://127.0.0.1:5175,http://localhost:5175
LAB_ALLOWED_SCRIPT_ORIGINS=http://143.198.5.97/aihub
AUTH_SECRET_KEY=change_this_long_random_value
DEFAULT_ADMIN_EMAIL=admin@aikart.local
DEFAULT_ADMIN_PASSWORD=change_this_admin_password
UPLOAD_DIR=static/uploads
EOF

cat > /var/www/Vercel_website/frontend/.env.local <<'EOF'
VITE_API_BASE_URL=
EOF

nano /var/www/Vercel_website/backend/.env
```

Replace:

```text
change_this_long_random_value
change_this_admin_password
```

AI Hub connection is not configured through frontend env vars. The one-line Hub script lives in `frontend/index.html` only when this site is connected:

```html
<script defer src="http://143.198.5.97/aihub/shopbot.js?site=ai_kart" data-site-id="ai_kart"></script>
```

If this script already exists and storefront code did not change, do not edit AI-KART just to deploy Hub CRM or Client Panel changes.

## 8. Build AI-KART

```bash
cd /var/www/Vercel_website/backend
/Data/www/aikartvenv/bin/python -m pip install -r requirements.txt

cd /var/www/Vercel_website/frontend
export PATH="/var/www/Vercel_website/.node/current/bin:$PATH"
npm install
npm run build
```

## 9. Start With PM2

This recreates the PM2 processes so the server uses the current commands and project-local Node path.

```bash
cd /var/www/Vercel_website/backend
pm2 delete ai-kart-backend || true
pm2 start /Data/www/aikartvenv/bin/python \
  --name ai-kart-backend \
  --cwd /var/www/Vercel_website/backend \
  -- -m uvicorn app.main:app --host 127.0.0.1 --port 8000

cd /var/www/Vercel_website/frontend
pm2 delete ai-kart-frontend || true
pm2 start /var/www/Vercel_website/.node/current/bin/npm \
  --name ai-kart-frontend \
  --cwd /var/www/Vercel_website/frontend \
  -- run preview -- --port 5175 --host 127.0.0.1

pm2 save
pm2 list
```

## 10. Test Local AI-KART

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5175/
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/products
```

Expected:

```text
200
200
200
```

If these fail, do not reload public Nginx yet. Check:

```bash
pm2 logs ai-kart-backend --lines 80
pm2 logs ai-kart-frontend --lines 80
```

## 11. Apply Shared Nginx Edge Config

Run this after AI Hub is listening on `127.0.0.1:5176`. Client Panel can be deployed before or after this; the route is still valid either way.

```bash
sudo tee /etc/nginx/sites-available/aikart-standalone >/dev/null <<'EOF'
map $http_upgrade $connection_upgrade_aihub {
    default upgrade;
    "" close;
}

server {
    listen 80;
    server_name aikart.ergobite.com 143.198.5.97 _;

    client_max_body_size 25m;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
    }

    location = /aihub {
        return 301 /aihub/;
    }

    location = /aihub/ {
        return 302 /aihub/crm/;
    }

    location /aihub/ {
        proxy_pass http://127.0.0.1:5176/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
        proxy_set_header X-Forwarded-Prefix /aihub;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade_aihub;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location = /client-panel {
        return 301 /client-panel/;
    }

    location /client-panel/ {
        proxy_pass http://127.0.0.1:5177;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
        proxy_set_header X-Forwarded-Prefix /client-panel;
    }

    location / {
        proxy_pass http://127.0.0.1:5175/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
    }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/aikart
sudo rm -f /etc/nginx/sites-enabled/aikart-aihub-paths
sudo rm -f /etc/nginx/sites-enabled/client-panel
sudo ln -sfn /etc/nginx/sites-available/aikart-standalone /etc/nginx/sites-enabled/aikart-standalone
sudo nginx -t
sudo systemctl reload nginx
```

## 12. Test Public Routes

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://143.198.5.97/
curl -s -o /dev/null -w "%{http_code}\n" http://143.198.5.97/api/products
curl -s -o /dev/null -w "%{http_code}\n" http://143.198.5.97/aihub/health
curl -s -o /dev/null -w "%{http_code}\n" http://143.198.5.97/aihub/crm/
curl -s http://143.198.5.97/aihub/crm/ | grep -E 'assets/index-.*\.js'
```

Expected:

```text
200
200
200
200
AI Hub CRM bundle path
```

After Client Panel is deployed, also run:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://143.198.5.97/client-panel/ai_kart
curl -s http://143.198.5.97/client-panel/ai_kart | grep -E 'assets/index-.*\.js'
```

Expected:

```text
200
Client Panel bundle path
```

## 13. Common Failure Map

```text
AI-KART local works but public / is down
  -> Nginx route or system Nginx state is wrong. Reapply step 11.

/aihub/health fails publicly but 127.0.0.1:5176/health works
  -> Reapply step 11.

/client-panel/ai_kart fails publicly but 127.0.0.1:5177/client-panel/ai_kart works
  -> Reapply step 11.

Python command missing
  -> This guide uses host-side python3 and /Data/www/aikartvenv/bin/python directly.
```
