from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from catalog_validation import validate_catalog
from rename_catalog import apply_transform


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

    def test_generated_marketing_adjective_is_rejected(self) -> None:
        product = _valid_product("NOVA Flex Smartwatch")
        errors = _validate_single(product)
        self.assertTrue(any("generated marketing adjective" in error for error in errors))

    def test_cross_category_electronics_contamination_is_rejected(self) -> None:
        product = _valid_product("NOVA Trail Mix")
        product["category"] = "food-grocery"
        product["tags"] = ["smartwatch", "snack"]
        errors = _validate_single(product)
        self.assertTrue(any("electronics type" in error for error in errors))

    def test_clean_name_and_taxonomy_pass(self) -> None:
        product = _valid_product("NOVA Trail Mix")
        product["category"] = "food-grocery"
        product["tags"] = ["snack", "healthy"]
        self.assertEqual([], _validate_single(product))

    def test_catalog_rename_is_idempotent_and_preserves_product_identity(self) -> None:
        product = _valid_product("Apple Flex Chargers 1")
        product["brand"] = "Apple"
        product["subcategory"] = "Electronics > Chargers, Cables & Adapters"
        product["tags"] = ["flex", "charger", "apple"]
        immutable_before = {
            key: copy.deepcopy(product.get(key))
            for key in ("id", "handle", "url", "price", "stock", "image_url", "images", "brand", "category", "subcategory")
        }
        products = [product]

        self.assertEqual(1, apply_transform(products, set()))
        first_result = copy.deepcopy(products)
        self.assertEqual(0, apply_transform(products, set()))
        self.assertEqual(first_result, products)
        self.assertEqual("Apple Fast Charger", products[0]["name"])
        self.assertNotIn("variants", products[0]["description"].lower())
        self.assertEqual(
            immutable_before,
            {key: products[0].get(key) for key in immutable_before},
        )


def _validate_single(product: dict[str, object]) -> list[str]:
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        static_dir = root / "static"
        media = static_dir / "catalog" / "phone.jpg"
        media.parent.mkdir(parents=True)
        media.write_bytes(b"fixture")
        seed_path = root / "products.json"
        seed_path.write_text(json.dumps({"products": [product]}), encoding="utf-8")
        return validate_catalog((seed_path,), static_dir)


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
