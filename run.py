import os
from urllib.parse import urlparse
import uvicorn

def load_dotenv():
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.isfile(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip("'\""))

load_dotenv()

def truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def append_allowed_origin(origin: str) -> None:
    parsed = urlparse(origin)
    if not (parsed.scheme and parsed.netloc):
        return
    existing = os.getenv("LAB_ALLOWED_SCRIPT_ORIGINS", "")
    origins = [item for item in existing.split() if item]
    if origin not in origins:
        origins.append(origin)
    os.environ["LAB_ALLOWED_SCRIPT_ORIGINS"] = " ".join(origins)


def configure_ai_injection() -> bool:
    if not truthy(os.getenv("ENABLE_AI_WIDGET")):
        os.environ.pop("LAB_INJECTION_HTML", None)
        return False

    site_id = os.getenv("SHOPBOT_SITE_ID", "ai_kart_main").strip() or "ai_kart_main"
    brand = os.getenv("SHOPBOT_BRAND", "AI-KART").strip() or "AI-KART"
    hub_origin = os.getenv("SHOPBOT_HUB_ORIGIN", "http://127.0.0.1:8585").strip().rstrip("/")
    script_src = os.getenv("SHOPBOT_SCRIPT_SRC", f"/shopbot.js?site={site_id}").strip()

    os.environ.setdefault("SHOPBOT_BACKEND_ORIGIN", hub_origin)
    os.environ.setdefault(
        "LAB_INJECTION_HTML",
        (
            f'<script defer src="{script_src}" '
            f'data-site-id="{site_id}" data-brand="{brand}"></script>'
        ),
    )
    append_allowed_origin(hub_origin)
    append_allowed_origin(script_src)
    return True


def free_port(port: int) -> None:
    import subprocess
    import sys
    try:
        if sys.platform == "win32":
            output = subprocess.check_output("netstat -ano", shell=True).decode()
            for line in output.splitlines():
                if f":{port}" in line and "LISTENING" in line:
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        pid = parts[-1]
                        if int(pid) != os.getpid():
                            print(f"[STORE] Port {port} is blocked by PID {pid}. Terminating it...")
                            subprocess.run(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            output = subprocess.check_output(f"lsof -t -i:{port}", shell=True).decode().strip()
            if output:
                for pid in output.split():
                    if int(pid) != os.getpid():
                        print(f"[STORE] Port {port} is blocked by PID {pid}. Terminating it...")
                        subprocess.run(f"kill -9 {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"[STORE] Failed to automatically free port {port}: {e}")


def main() -> None:
    host = os.getenv("STOREFRONT_HOST", "127.0.0.1")
    port = int(os.getenv("STOREFRONT_PORT", "8584"))
    
    # Automatically clear the port if blocked
    free_port(port)
    
    ai_enabled = configure_ai_injection()

    print(f"[STORE] storefront=http://{host}:{port}")
    print(f"[STORE] admin=http://{host}:{port}/admin")
    print(f"[STORE] ai_widget={'enabled' if ai_enabled else 'disabled'}")

    uvicorn.run("api.index:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
