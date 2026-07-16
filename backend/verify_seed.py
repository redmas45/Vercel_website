from __future__ import annotations

from pathlib import Path

from catalog_validation import validate_catalog

BACKEND_DIR = Path(__file__).resolve().parent
SEED_PATHS = (BACKEND_DIR / "products.seed.json", BACKEND_DIR / "products.seed.v2.json")
STATIC_DIR = BACKEND_DIR / "static"


def main() -> int:
    errors = validate_catalog(SEED_PATHS, STATIC_DIR)
    if errors:
        print(f"Catalog validation failed with {len(errors)} error(s):")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Catalog validation passed: product data, references, pricing, inventory, and media are consistent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
