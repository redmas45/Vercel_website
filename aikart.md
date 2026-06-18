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
Backend venv:        /Data/www/aikartvenv
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
- The Git step stashes tracked server edits before pulling. It does not stash ignored runtime files.
- Do not run `git stash pop` as part of deployment.

## Deploy Order

Run these sections in order. Each block is intentionally small so you can see where a failure happens.

## 1. Safe Git Pull

This backs up the runtime SQLite DB, stashes any tracked server-local edits, pulls only if fast-forward is possible, and restores the DB if an old tracked copy was removed during pull.

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

git status --short
```

Expected result: no pull conflict. Ignored runtime files like `backend/aikart.db`, `backend/.env`, `.node`, and `node_modules` may exist locally and are fine.

## 2. Fast Permissions

This avoids `chown -R` on the whole project. Full recursive project ownership can be slow because it walks `node_modules`, `.node`, build output, uploads, and cache folders.

```bash
set -e
cd /var/www/Vercel_website

sudo mkdir -p /Data/www
mkdir -p .deploy-backups/aikart-db backend/static/uploads

sudo chown "$(whoami):$(whoami)" /var/www/Vercel_website /Data/www
sudo chown -R "$(whoami):$(whoami)" .deploy-backups backend/static/uploads

for path in backend/.env backend/aikart.db frontend/.env.local; do
  if [ -e "$path" ]; then
    sudo chown "$(whoami):$(whoami)" "$path"
  fi
done

fix_tree_if_top_owner_is_wrong() {
  path="$1"
  if [ -e "$path" ] && [ "$(stat -c '%u' "$path")" != "$(id -u)" ]; then
    sudo chown -R "$(whoami):$(whoami)" "$path"
  fi
}

fix_tree_if_top_owner_is_wrong .node
fix_tree_if_top_owner_is_wrong frontend/node_modules
fix_tree_if_top_owner_is_wrong frontend/dist
fix_tree_if_top_owner_is_wrong /Data/www/aikartvenv
```

## 3. Ensure Project-Local Node

This installs Node under the project at `.node/current`, so deployment does not depend on system Node.

```bash
set -e
cd /var/www/Vercel_website

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
```

## 4. Ensure PM2

```bash
set -e
export PATH="/var/www/Vercel_website/.node/current/bin:$PATH"

if ! command -v pm2 >/dev/null 2>&1; then
  sudo /var/www/Vercel_website/.node/current/bin/npm install -g pm2
fi

pm2 -v
```

## 5. Ensure And Enter Python Venv

Use host `python3` only to create the AI-KART backend venv. After activation, `python` and `pip` should point inside `/Data/www/aikartvenv`.

```bash
set -e
cd /var/www/Vercel_website

if [ ! -x /Data/www/aikartvenv/bin/python ]; then
  python3 -m venv /Data/www/aikartvenv
fi

. /Data/www/aikartvenv/bin/activate
which python
python -m pip install --upgrade pip
```

## 6. Ensure Env Files

This creates missing env files and replaces only placeholder secret values. Existing real secrets are not overwritten.

```bash
set -e
cd /var/www/Vercel_website

make_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    python3 -c 'import secrets; print(secrets.token_hex(32))'
  fi
}

if [ ! -f backend/.env ]; then
  cat > backend/.env <<'EOF'
DATABASE_URL=sqlite+aiosqlite:///./aikart.db
CORS_ORIGINS=http://143.198.5.97,http://aikart.ergobite.com,http://127.0.0.1:5175,http://localhost:5175
LAB_ALLOWED_SCRIPT_ORIGINS=http://143.198.5.97
AUTH_SECRET_KEY=__GENERATE_AUTH_SECRET__
DEFAULT_ADMIN_EMAIL=admin@aikart.local
DEFAULT_ADMIN_PASSWORD=__GENERATE_ADMIN_PASSWORD__
UPLOAD_DIR=static/uploads
EOF
fi

if [ ! -f frontend/.env.local ]; then
  cat > frontend/.env.local <<'EOF'
VITE_API_BASE_URL=
EOF
fi

if grep -qE '^AUTH_SECRET_KEY=(change_this_long_random_value|__GENERATE_AUTH_SECRET__)$' backend/.env; then
  AUTH_SECRET="$(make_secret)"
  sed -i "s|^AUTH_SECRET_KEY=.*|AUTH_SECRET_KEY=${AUTH_SECRET}|" backend/.env
fi

if grep -qE '^DEFAULT_ADMIN_PASSWORD=(change_this_admin_password|__GENERATE_ADMIN_PASSWORD__)$' backend/.env; then
  ADMIN_PASSWORD="$(make_secret)"
  sed -i "s|^DEFAULT_ADMIN_PASSWORD=.*|DEFAULT_ADMIN_PASSWORD=${ADMIN_PASSWORD}|" backend/.env
  mkdir -p .deploy-backups
  ADMIN_PASSWORD_FILE=".deploy-backups/aikart-admin-password.$(date +%Y%m%d-%H%M%S).txt"
  {
    echo "AI-KART generated admin password"
    echo "DEFAULT_ADMIN_EMAIL=admin@aikart.local"
    echo "DEFAULT_ADMIN_PASSWORD=${ADMIN_PASSWORD}"
  } > "$ADMIN_PASSWORD_FILE"
  chmod 600 "$ADMIN_PASSWORD_FILE"
  echo "Generated DEFAULT_ADMIN_PASSWORD and saved it to: /var/www/Vercel_website/${ADMIN_PASSWORD_FILE}"
fi

grep -E '^(DATABASE_URL|CORS_ORIGINS|LAB_ALLOWED_SCRIPT_ORIGINS|DEFAULT_ADMIN_EMAIL|UPLOAD_DIR)=' backend/.env
grep -q '^AUTH_SECRET_KEY=.' backend/.env && echo "AUTH_SECRET_KEY=set"
grep -q '^DEFAULT_ADMIN_PASSWORD=.' backend/.env && echo "DEFAULT_ADMIN_PASSWORD=set"
echo "Env files OK."
```

## 7. Build Backend And Frontend

```bash
set -e
cd /var/www/Vercel_website/backend
. /Data/www/aikartvenv/bin/activate
which python
python -m pip install -r requirements.txt

cd /var/www/Vercel_website/frontend
export PATH="/var/www/Vercel_website/.node/current/bin:$PATH"
npm install
npm run build
```

## 8. Restart AI-KART With PM2

PM2 starts the backend with `/Data/www/aikartvenv/bin/python` directly, so the running app uses the backend venv even if your shell prompt does not show it.

```bash
set -e
export PATH="/var/www/Vercel_website/.node/current/bin:$PATH"

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

## 9. Local Smoke

Run this before touching public Nginx.

```bash
set -e
curl -fsS http://127.0.0.1:5175/ >/dev/null
curl -fsS http://127.0.0.1:8000/health >/dev/null
curl -fsS http://127.0.0.1:8000/api/products >/dev/null
echo "AI-KART local deploy OK."
```

## 10. Reset AI-KART Admin Login

Use this if `/admin` says `Invalid email or password` even though `backend/.env` has the expected `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD`.

The `.env` values seed the first admin only. If an admin already exists in `backend/aikart.db`, changing `.env` does not change that stored password. This command updates or creates the admin row to match `backend/.env`.

```bash
set -e
cd /var/www/Vercel_website/backend
. /Data/www/aikartvenv/bin/activate

python - <<'PY'
import asyncio

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.models import User
from app.db.session import AsyncSessionLocal


async def main() -> None:
    email = settings.default_admin_email.strip().lower()
    password = settings.default_admin_password
    if not email or "@" not in email:
        raise SystemExit("DEFAULT_ADMIN_EMAIL is invalid.")
    if not password or len(password) < 6:
        raise SystemExit("DEFAULT_ADMIN_PASSWORD must be at least 6 characters.")

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(email=email, name="Store Admin", password_hash=hash_password(password), role="admin")
            session.add(user)
            action = "created"
        else:
            user.password_hash = hash_password(password)
            user.role = "admin"
            action = "updated"
        await session.commit()
        print(f"Admin {action}: {email}")


asyncio.run(main())
PY
```

Restart backend after resetting:

```bash
pm2 restart ai-kart-backend
```

## 11. Apply Shared Nginx

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

## 12. Public Smoke

```bash
set -e
curl -fsS http://143.198.5.97/ >/dev/null
curl -fsS http://143.198.5.97/api/products >/dev/null
curl -fsS http://143.198.5.97/aihub/health >/dev/null
curl -fsS http://143.198.5.97/aihub/crm/ | grep -E 'assets/index-.*\.js' >/dev/null
echo "AI-KART and AI Hub public routes OK."
```

After Client Panel is deployed:

```bash
set -e
curl -fsS http://143.198.5.97/client-panel/ai_kart | grep -E 'assets/index-.*\.js' >/dev/null
echo "Client Panel public route OK."
```

## Git Recovery

The Git step handles the old `backend/aikart.db` pull blocker by backing up the DB, stashing tracked edits, pulling, and restoring the DB if the pull removed it.

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
  -> Rerun step 11, "Apply Shared Nginx".

/aihub/health fails publicly but 127.0.0.1:5176 works
  -> Rerun step 11, "Apply Shared Nginx".

/client-panel/ai_kart fails publicly but 127.0.0.1:5177 works
  -> Rerun step 11, "Apply Shared Nginx".

Admin login says "Invalid email or password"
  -> Run step 10, "Reset AI-KART Admin Login".

Mic is missing
  -> Confirm frontend/index.html includes the tracked /aihub/shopbot.js script and the Hub client is enabled.

Mic UI loads but recording fails on public HTTP
  -> Browser microphone access needs HTTPS. Use DNS plus HTTPS for production.
```
