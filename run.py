import os
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

    os.environ.setdefault("SHOPBOT_BACKEND_ORIGIN", hub_origin)
    os.environ.setdefault(
        "LAB_INJECTION_HTML",
        (
            f'<script defer src="{hub_origin}/shopbot.js?site={site_id}" '
            f'data-site-id="{site_id}" data-brand="{brand}"></script>'
        ),
    )
    append_allowed_origin(hub_origin)
    return True


def main() -> None:
    host = os.getenv("STOREFRONT_HOST", "127.0.0.1")
    port = int(os.getenv("STOREFRONT_PORT", "8584"))
    ai_enabled = configure_ai_injection()

    print(f"[STORE] storefront=http://{host}:{port}")
    print(f"[STORE] admin=http://{host}:{port}/admin")
    print(f"[STORE] ai_widget={'enabled' if ai_enabled else 'disabled'}")

    uvicorn.run("api.index:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
