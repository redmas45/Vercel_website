from __future__ import annotations

from pathlib import Path

from catalog_validation import validate_catalog, validate_review_aggregates

BACKEND_DIR = Path(__file__).resolve().parent
SEED_PATHS = (BACKEND_DIR / "products.seed.json",)
STATIC_DIR = BACKEND_DIR / "static"
REVIEWS_PATH = BACKEND_DIR / "reviews.seed.json"


def main() -> int:
    errors = validate_catalog(SEED_PATHS, STATIC_DIR)
    # A summary rating that its own review rows cannot reproduce is a lie the
    # storefront, the API, and Maya would each repeat differently.
    errors.extend(validate_review_aggregates(SEED_PATHS, REVIEWS_PATH))
    if errors:
        print(f"Catalog validation failed with {len(errors)} error(s):")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Catalog validation passed: product data, references, pricing, inventory, and media are consistent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
