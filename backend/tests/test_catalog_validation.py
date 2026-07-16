from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from catalog_validation import validate_catalog


class CatalogValidationTests(unittest.TestCase):
    def test_repository_catalog_is_valid(self) -> None:
        errors = validate_catalog(
            (BACKEND_DIR / "products.seed.json", BACKEND_DIR / "products.seed.v2.json"),
            BACKEND_DIR / "static",
        )

        self.assertEqual([], errors)

    def test_non_apple_iphone_taxonomy_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            static_dir = root / "static"
            media = static_dir / "catalog" / "phone.jpg"
            media.parent.mkdir(parents=True)
            media.write_bytes(b"fixture")
            seed_path = root / "products.json"
            seed_path.write_text(
                json.dumps({"products": [_valid_product("Samsung iPhone Alternative")]}),
                encoding="utf-8",
            )

            errors = validate_catalog((seed_path,), static_dir)

        self.assertTrue(any("non-Apple searchable data" in error for error in errors))


def _valid_product(name: str) -> dict[str, object]:
    return {
        "id": "phone-1",
        "handle": "phone-1",
        "name": name,
        "title": name,
        "description": "A test phone",
        "category": "electronics",
        "brand": "Samsung",
        "price": 10000,
        "original_price": None,
        "discount_percent": None,
        "currency": "INR",
        "stock": 1,
        "in_stock": True,
        "image_url": "/static/catalog/phone.jpg",
        "images": ["/static/catalog/phone.jpg"],
        "url": "/product/phone-1/",
    }


if __name__ == "__main__":
    unittest.main()
