# AI-KART Deployment Runbook

Use this for the current public-IP server setup.

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

AI-KART owns the shared public Nginx edge:

```text
/                         -> AI-KART frontend on 127.0.0.1:5175
/api/                     -> AI-KART backend on 127.0.0.1:8000
/aihub/                   -> AI Hub app on 127.0.0.1:5176
/client-panel/<client_id> -> Client Panel on 127.0.0.1:5177
```

## Rules

- AI-KART must work without AI Hub.
- The Hub widget connection is the tracked script tag in `frontend/index.html`.
- `backend/aikart.db` is runtime data. It is ignored and backed up before every pull.
- `.env`, `.env.local`, `.node`, `node_modules`, `dist`, uploads, and `.deploy-backups` are ignored runtime files.
- The deploy command below stashes tracked server edits before pulling. It does not stash ignored runtime files.
- Do not run `git stash pop` as part of deployment.

## Deploy

Paste this on the server. It is safe to rerun.

```bash
set -e
cd /var/www/Vercel_website

echo "== backup runtime DB =="
mkdir -p .deploy-backups/aikart-db
if [ -f backend/aikart.db ]; then
  cp -p backend/aikart.db ".deploy-backups/aikart-db/aikart.$(date +%Y%m%d-%H%M%S).db"
fi

echo "== safe git pull =="
git fetch origin
if ! git diff --quiet || ! git diff --cached --quiet; then
  git stash push -m "pre-aikart-deploy-$(date +%Y%m%d-%H%M%S)"
fi
git pull --ff-only

LATEST_AIKART_DB="$(ls -t .deploy-backups/aikart-db/aikart.*.db 2>/dev/null | head -n 1 || true)"
if [ ! -f backend/aikart.db ] && [ -n "$LATEST_AIKART_DB" ]; then
  cp -p "$LATEST_AIKART_DB" backend/aikart.db
fi

echo "== permissions =="
sudo chown -R "$(whoami):$(whoami)" /var/www/Vercel_website
sudo mkdir -p /Data/www
sudo chown -R "$(whoami):$(whoami)" /Data/www

echo "== project-local Node =="
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) NODE_ARCH="x64" ;;
  aarch64) NODE_ARCH="arm64" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

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

echo "== PM2 =="
if ! command -v pm2 >/dev/null 2>&1; then
  sudo /var/www/Vercel_website/.node/current/bin/npm install -g pm2
fi
pm2 -v

echo "== Python venv =="
cd /var/www/Vercel_website
if [ ! -x /Data/www/aikartvenv/bin/python ]; then
  python3 -m venv /Data/www/aikartvenv
fi
/Data/www/aikartvenv/bin/python -m pip install --upgrade pip

echo "== env files =="
CREATED_ENV=0
if [ ! -f backend/.env ]; then
  cat > backend/.env <<'EOF'
DATABASE_URL=sqlite+aiosqlite:///./aikart.db
CORS_ORIGINS=http://143.198.5.97,http://aikart.ergobite.com,http://127.0.0.1:5175,http://localhost:5175
LAB_ALLOWED_SCRIPT_ORIGINS=http://143.198.5.97
AUTH_SECRET_KEY=change_this_long_random_value
DEFAULT_ADMIN_EMAIL=admin@aikart.local
DEFAULT_ADMIN_PASSWORD=change_this_admin_password
UPLOAD_DIR=static/uploads
EOF
  CREATED_ENV=1
fi

if [ ! -f frontend/.env.local ]; then
  cat > frontend/.env.local <<'EOF'
VITE_API_BASE_URL=
EOF
fi

if [ "$CREATED_ENV" = "1" ]; then
  echo "Created backend/.env. Replace AUTH_SECRET_KEY and DEFAULT_ADMIN_PASSWORD, then rerun this deploy block."
  exit 1
fi

if grep -q 'change_this_' backend/.env; then
  echo "ERROR: backend/.env still contains placeholder secrets."
  exit 1
fi

echo "== build backend and frontend =="
cd /var/www/Vercel_website/backend
/Data/www/aikartvenv/bin/python -m pip install -r requirements.txt

cd /var/www/Vercel_website/frontend
export PATH="/var/www/Vercel_website/.node/current/bin:$PATH"
npm install
npm run build

echo "== restart PM2 apps =="
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

echo "== local smoke =="
curl -fsS http://127.0.0.1:5175/ >/dev/null
curl -fsS http://127.0.0.1:8000/health >/dev/null
curl -fsS http://127.0.0.1:8000/api/products >/dev/null
echo "AI-KART local deploy OK."
```

## Apply Shared Nginx

Run this after AI Hub is listening on `127.0.0.1:5176`. It is safe to rerun.

```bash
set -e

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
echo "Shared Nginx route OK."
```

## Public Smoke

```bash
curl -fsS http://143.198.5.97/ >/dev/null
curl -fsS http://143.198.5.97/api/products >/dev/null
curl -fsS http://143.198.5.97/aihub/health >/dev/null
curl -fsS http://143.198.5.97/aihub/crm/ | grep -E 'assets/index-.*\.js' >/dev/null
echo "AI-KART and AI Hub public routes OK."
```

After Client Panel is deployed:

```bash
curl -fsS http://143.198.5.97/client-panel/ai_kart | grep -E 'assets/index-.*\.js' >/dev/null
echo "Client Panel public route OK."
```

## Git Recovery

The deploy command handles the old `backend/aikart.db` pull blocker by backing up the DB, stashing tracked edits, pulling, and restoring the DB if the pull removed it.

Useful inspection commands:

```bash
cd /var/www/Vercel_website
git status --short
git stash list --grep=pre-aikart-deploy
ls -lh .deploy-backups/aikart-db
```

If `git pull --ff-only` says the branch has diverged, the server has local commits. Do not force reset from a deploy paste. Inspect with:

```bash
git log --oneline --left-right HEAD...@{u}
```

## Failure Map

```text
Local AI-KART works but public / fails
  -> Rerun "Apply Shared Nginx".

/aihub/health fails publicly but 127.0.0.1:5176 works
  -> Rerun "Apply Shared Nginx".

/client-panel/ai_kart fails publicly but 127.0.0.1:5177 works
  -> Rerun "Apply Shared Nginx".

Mic is missing
  -> Confirm frontend/index.html includes the tracked /aihub/shopbot.js script and the Hub client is enabled.

Mic UI loads but recording fails on public HTTP
  -> Browser microphone access needs HTTPS. Use DNS plus HTTPS for production.
```
