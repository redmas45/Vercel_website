from __future__ import annotations

import json
import re
from collections.abc import Iterable, Mapping
from pathlib import Path

ProductRecord = Mapping[str, object]
EXPECTED_CURRENCY = "INR"
REQUIRED_TEXT_FIELDS = ("id", "handle", "name", "title", "category", "currency", "image_url")
REFERENCE_FIELDS = ("related_ids", "frequently_bought_with")
UNIQUE_FIELDS = ("id", "handle", "sku", "name")

# Generated marketing adjectives that carry no product meaning. Excludes words that
# also appear in genuine product names (e.g. "Pro", "Smart", "Air") to avoid false
# positives against curated catalog entries.
GENERATED_NAME_ADJECTIVES = (
    "flex", "classic", "active", "elite", "signature", "luxe",
    "urban", "daily", "prime", "essential", "standard", "basic",
)

# Electronics product-type nouns. A non-electronics product whose searchable text
# claims one of these indicates taxonomy contamination (e.g. a dry-fruit pack that
# surfaces for a "smartwatch" search).
ELECTRONICS_TYPE_NOUNS = (
    "smartwatch", "laptop", "tablet", "iphone", "ipad", "headphone",
    "earbud", "smartphone", "dslr", "monitor",
)


def load_catalog(seed_paths: Iterable[Path]) -> list[ProductRecord]:
    products: list[ProductRecord] = []
    for seed_path in seed_paths:
        payload = json.loads(seed_path.read_text(encoding="utf-8"))
        records = payload.get("products")
        if not isinstance(records, list):
            raise ValueError(f"{seed_path.name}: products must be a list")
        products.extend(records)
    return products


def validate_catalog(seed_paths: Iterable[Path], static_dir: Path) -> list[str]:
    products = load_catalog(seed_paths)
    errors: list[str] = []
    errors.extend(_validate_unique_fields(products))
    errors.extend(_validate_references(products))
    errors.extend(_validate_media(products, static_dir))
    for product in products:
        errors.extend(_validate_product(product))
    return errors


def _validate_product(product: ProductRecord) -> list[str]:
    product_id = _text(product.get("id")) or "<missing-id>"
    errors = [
        f"{product_id}: {field} is required"
        for field in REQUIRED_TEXT_FIELDS
        if not _text(product.get(field))
    ]
    errors.extend(_validate_price(product_id, product))
    errors.extend(_validate_inventory(product_id, product))
    errors.extend(_validate_rating(product_id, product))
    errors.extend(_validate_product_paths(product_id, product))
    errors.extend(_validate_search_taxonomy(product_id, product))
    errors.extend(_validate_name_quality(product_id, product))
    errors.extend(_validate_cross_category_types(product_id, product))
    return errors


def _searchable_text(product: ProductRecord) -> str:
    return " ".join(
        [
            _text(product.get("name")),
            _text(product.get("title")),
            _text(product.get("description")),
            _text(product.get("subcategory")),
            *_string_list(product.get("tags")),
        ]
    ).casefold()


def _validate_name_quality(product_id: str, product: ProductRecord) -> list[str]:
    words = set(re.findall(r"[a-z0-9]+", _text(product.get("name")).casefold()))
    generated = [adjective for adjective in GENERATED_NAME_ADJECTIVES if adjective in words]
    if generated:
        return [f"{product_id}: name uses generated marketing adjective '{generated[0]}'"]
    return []


def _validate_cross_category_types(product_id: str, product: ProductRecord) -> list[str]:
    if _text(product.get("category")).casefold() == "electronics":
        return []
    tokens = set(re.findall(r"[a-z0-9]+", _searchable_text(product)))
    contaminating = [noun for noun in ELECTRONICS_TYPE_NOUNS if noun in tokens]
    if contaminating:
        return [f"{product_id}: non-electronics product claims electronics type '{contaminating[0]}'"]
    return []


def _validate_price(product_id: str, product: ProductRecord) -> list[str]:
    errors: list[str] = []
    price = _number(product.get("price"))
    original_price = _number(product.get("original_price"))
    discount = _integer(product.get("discount_percent"))
    if price is None or price <= 0:
        errors.append(f"{product_id}: price must be positive")
    if product.get("currency") != EXPECTED_CURRENCY:
        errors.append(f"{product_id}: currency must be {EXPECTED_CURRENCY}")
    if original_price is None and discount is not None:
        errors.append(f"{product_id}: discount requires original_price")
    if original_price is not None and price is not None:
        if original_price <= price:
            errors.append(f"{product_id}: original_price must exceed price")
        elif discount != round((1 - price / original_price) * 100):
            errors.append(f"{product_id}: discount_percent does not match prices")
    return errors


def _validate_inventory(product_id: str, product: ProductRecord) -> list[str]:
    stock = _integer(product.get("stock"))
    if stock is None or stock < 0:
        return [f"{product_id}: stock must be a non-negative integer"]
    if product.get("in_stock") is not (stock > 0):
        return [f"{product_id}: in_stock must match stock quantity"]
    return []


def _validate_rating(product_id: str, product: ProductRecord) -> list[str]:
    rating = _number(product.get("rating"))
    review_count = _integer(product.get("review_count"))
    errors: list[str] = []
    if rating is not None and not 0 <= rating <= 5:
        errors.append(f"{product_id}: rating must be between 0 and 5")
    if review_count is not None and review_count < 0:
        errors.append(f"{product_id}: review_count cannot be negative")
    return errors


def _validate_product_paths(product_id: str, product: ProductRecord) -> list[str]:
    handle = _text(product.get("handle"))
    expected_url = f"/product/{handle}/"
    errors: list[str] = []
    if product.get("url") != expected_url:
        errors.append(f"{product_id}: url must be {expected_url}")
    image_url = _text(product.get("image_url"))
    images = _string_list(product.get("images"))
    if image_url and image_url not in images:
        errors.append(f"{product_id}: primary image must be present in images")
    return errors


def _validate_search_taxonomy(product_id: str, product: ProductRecord) -> list[str]:
    if _text(product.get("brand")).casefold() == "apple":
        return []
    return (
        [f"{product_id}: non-Apple searchable data cannot claim iPhone"]
        if "iphone" in _searchable_text(product)
        else []
    )


def _validate_unique_fields(products: list[ProductRecord]) -> list[str]:
    errors: list[str] = []
    for field in UNIQUE_FIELDS:
        seen: dict[str, str] = {}
        for product in products:
            value = _text(product.get(field)).casefold()
            if not value:
                continue
            product_id = _text(product.get("id")) or "<missing-id>"
            if value in seen:
                errors.append(f"{product_id}: duplicate {field} also used by {seen[value]}")
            else:
                seen[value] = product_id
    return errors


def _validate_references(products: list[ProductRecord]) -> list[str]:
    product_ids = {_text(product.get("id")) for product in products}
    errors: list[str] = []
    for product in products:
        product_id = _text(product.get("id")) or "<missing-id>"
        for field in REFERENCE_FIELDS:
            references = _string_list(product.get(field))
            if len(references) != len(set(references)):
                errors.append(f"{product_id}: {field} contains duplicates")
            for reference in references:
                if reference == product_id:
                    errors.append(f"{product_id}: {field} cannot reference itself")
                elif reference not in product_ids:
                    errors.append(f"{product_id}: {field} references missing product {reference}")
    return errors


def _validate_media(products: list[ProductRecord], static_dir: Path) -> list[str]:
    available = {
        path.relative_to(static_dir).as_posix(): path
        for path in static_dir.rglob("*")
        if path.is_file()
    }
    casefolded = {relative.casefold(): relative for relative in available}
    errors: list[str] = []
    for product in products:
        product_id = _text(product.get("id")) or "<missing-id>"
        for image_url in dict.fromkeys([_text(product.get("image_url")), *_string_list(product.get("images"))]):
            if not image_url:
                continue
            if not image_url.startswith("/static/"):
                errors.append(f"{product_id}: image must use /static/ path: {image_url}")
                continue
            relative = image_url.removeprefix("/static/")
            actual = casefolded.get(relative.casefold())
            if actual is None:
                errors.append(f"{product_id}: image file is missing: {image_url}")
            elif actual != relative:
                errors.append(f"{product_id}: image path case mismatch: {image_url} != /static/{actual}")
    return errors


def _text(value: object) -> str:
    return str(value).strip() if value is not None else ""


def _number(value: object) -> float | None:
    return float(value) if isinstance(value, int | float) and not isinstance(value, bool) else None


def _integer(value: object) -> int | None:
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if isinstance(item, str) and item]
