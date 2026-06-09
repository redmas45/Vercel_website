from pathlib import Path
from urllib.parse import unquote

from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse, Response


app = FastAPI()
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "out"


@app.get("/{requested_path:path}")
def serve_static_clone(requested_path: str = ""):
    requested_path = unquote(requested_path).strip("/")

    candidates = []
    if requested_path:
        candidates.append(OUT_DIR / requested_path)
        candidates.append(OUT_DIR / requested_path / "index.html")
        if not Path(requested_path).suffix:
            candidates.append(OUT_DIR / f"{requested_path}.html")
    else:
        candidates.append(OUT_DIR / "index.html")

    for candidate in candidates:
        resolved = candidate.resolve()
        if not str(resolved).startswith(str(OUT_DIR.resolve())):
            continue
        if resolved.is_file():
            return FileResponse(resolved)

    fallback = OUT_DIR / "index.html"
    if fallback.is_file():
        return FileResponse(fallback)

    return HTMLResponse("<h1>Static clone output not found.</h1>", status_code=404)
