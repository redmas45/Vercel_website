from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from catalog_validation import validate_catalog, validate_review_aggregates
from rename_catalog import apply_transform


class CatalogValidationTests(unittest.TestCase):
    def test_repository_catalog_is_valid(self) -> None:
        errors = validate_catalog(
            (BACKEND_DIR / "products.seed.json",),
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

    def test_rating_without_review_count_is_rejected(self) -> None:
        product = _valid_product("NOVA Trail Mix")
        product["rating"] = 4.5
        product["review_count"] = None
        errors = _validate_single(product)
        self.assertTrue(any("rating" in error and "review_count" in error for error in errors))

    def test_review_count_without_rating_is_rejected(self) -> None:
        product = _valid_product("NOVA Trail Mix")
        product["rating"] = None
        product["review_count"] = 120
        errors = _validate_single(product)
        self.assertTrue(any("rating" in error and "review_count" in error for error in errors))

    def test_zero_rating_is_rejected_in_favour_of_null(self) -> None:
        """An unrated product must be null, never a real 0/5 score."""
        product = _valid_product("NOVA Trail Mix")
        product["rating"] = 0
        product["review_count"] = 0
        errors = _validate_single(product)
        self.assertTrue(any("rating" in error for error in errors))

    def test_genuinely_unrated_product_is_allowed(self) -> None:
        product = _valid_product("NOVA Trail Mix")
        product["rating"] = None
        product["review_count"] = None
        self.assertEqual([], _validate_single(product))

    def test_coherent_rating_pair_is_allowed(self) -> None:
        product = _valid_product("NOVA Trail Mix")
        product["rating"] = 4.3
        product["review_count"] = 87
        self.assertEqual([], _validate_single(product))

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

class ReviewAggregateCoherenceTests(unittest.TestCase):
    """A product's summary rating must match its actual review rows.

    Curated products were given aggregate ratings with no matching rows in
    reviews.seed.json, so a card could advertise hundreds of reviews while the
    Customer Reviews section showed none.
    """

    def test_repository_aggregates_match_the_review_detail(self) -> None:
        errors = validate_review_aggregates(
            (BACKEND_DIR / "products.seed.json",),
            BACKEND_DIR / "reviews.seed.json",
        )
        self.assertEqual([], errors)

    def test_rating_without_any_review_rows_is_rejected(self) -> None:
        errors = _aggregate_errors(
            products=[{"id": "p1", "rating": 4.6, "review_count": 180}],
            reviews=[],
        )
        self.assertTrue(any("no published reviews" in error for error in errors), errors)

    def test_review_count_must_match_the_number_of_rows(self) -> None:
        errors = _aggregate_errors(
            products=[{"id": "p1", "rating": 5.0, "review_count": 99}],
            reviews=[_review("p1", 5)],
        )
        self.assertTrue(any("review_count" in error for error in errors), errors)

    def test_rating_must_match_the_mean_of_the_rows(self) -> None:
        errors = _aggregate_errors(
            products=[{"id": "p1", "rating": 2.0, "review_count": 2}],
            reviews=[
                _review("p1", 5),
                _review("p1", 5),
            ],
        )
        self.assertTrue(any("does not match" in error for error in errors), errors)

    def test_future_dated_review_is_rejected(self) -> None:
        errors = _aggregate_errors(
            products=[{"id": "p1", "rating": 5.0, "review_count": 1}],
            reviews=[_review("p1", 5, created_at="2026-09-01T09:30:00+00:00")],
            current_time=datetime(2026, 8, 3, tzinfo=timezone.utc),
        )
        self.assertTrue(any("future-dated" in error for error in errors), errors)

    def test_legacy_naive_review_timestamp_is_treated_as_utc(self) -> None:
        errors = _aggregate_errors(
            products=[{"id": "p1", "rating": 5.0, "review_count": 1}],
            reviews=[_review("p1", 5, created_at="2026-07-01T09:30:00")],
        )
        self.assertEqual(errors, [])

    def test_unrated_product_with_no_reviews_is_accepted(self) -> None:
        errors = _aggregate_errors(
            products=[{"id": "p1", "rating": None, "review_count": None}],
            reviews=[],
        )
        self.assertEqual([], errors)


def _aggregate_errors(
    products: list[dict],
    reviews: list[dict],
    *,
    current_time: datetime | None = None,
) -> list[str]:
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        seed = root / "products.json"
        seed.write_text(json.dumps({"products": products}), encoding="utf-8")
        review_file = root / "reviews.json"
        review_file.write_text(json.dumps({"reviews": reviews}), encoding="utf-8")
        return validate_review_aggregates((seed,), review_file, current_time=current_time)


def _review(product_id: str, rating: int, *, created_at: str = "2026-07-01T09:30:00+00:00") -> dict:
    return {
        "product_id": product_id,
        "rating": rating,
        "is_published": True,
        "created_at": created_at,
    }


if __name__ == "__main__":
    unittest.main()
