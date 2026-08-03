"""Deterministic, idempotent catalog naming transform for products.seed.v2.json.

The v2 seed shipped with synthetic names of the form
``<Brand> <GenericAdjective> <SubcategoryLeaf> <N>`` (e.g. "Apple Flex Smartwatches
& Fitness Bands 3"). The adjective is meaningless, the trailing number reads as
auto-generated, and the raw plural subcategory is not a product name.

This transform rebuilds each name as ``<Brand> <ConciseProductType>`` where the
product type is derived from the taxonomy (the authoritative, category-consistent
signal). Products within a ``(brand, type)`` group are genuinely identical in the
source data (same generic specs, no variants, no colour), so there is no truthful
attribute to distinguish them; the 2nd+ duplicate keeps a minimal numeric variant.
No specifications are invented. IDs, handles, SKUs, URLs, prices, images, specs and
related_ids are preserved unchanged. Description and tags are re-aligned to the new
name and taxonomy.

Run: ``python backend/rename_catalog.py`` (idempotent — safe to run repeatedly).
"""

from __future__ import annotations

import json
from pathlib import Path

SEED_FILE = Path(__file__).resolve().parent / "products.seed.v2.json"
SEED_V1_FILE = Path(__file__).resolve().parent / "products.seed.json"

# Marketing adjectives the generator injected; stripped from names and tags.
GENERIC_ADJECTIVES = frozenset(
    {
        "flex", "classic", "active", "pro", "prime", "elite", "signature", "luxe",
        "urban", "smart", "daily", "premium", "budget", "essential", "standard", "basic",
    }
)

# Full-subcategory -> concise, singular, truthful product type. Keyed by the exact
# breadcrumb so tier/style leaves ("Android Budget", "Gaming") resolve correctly.
SUBCATEGORY_TO_TYPE = {
    "Beauty & Personal Care > Haircare > Hair Oils": "Hair Oil",
    "Beauty & Personal Care > Haircare > Shampoo": "Shampoo",
    "Beauty & Personal Care > Haircare > Styling": "Hair Styling Gel",
    "Beauty & Personal Care > Makeup > Eye Products": "Eye Makeup",
    "Beauty & Personal Care > Makeup > Foundation": "Foundation",
    "Beauty & Personal Care > Makeup > Lipstick": "Lipstick",
    "Beauty & Personal Care > Men's Grooming > Beard Care": "Beard Care Kit",
    "Beauty & Personal Care > Men's Grooming > Deodorants": "Deodorant",
    "Beauty & Personal Care > Men's Grooming > Face Wash": "Face Wash",
    "Beauty & Personal Care > Skincare > Moisturisers": "Moisturiser",
    "Beauty & Personal Care > Skincare > Serums": "Face Serum",
    "Beauty & Personal Care > Skincare > Sunscreen": "Sunscreen",
    "Books & Stationery > Fiction": "Fiction Novel",
    "Books & Stationery > Self-Help & Business": "Self-Help Book",
    "Books & Stationery > Stationery & Art Supplies": "Stationery Set",
    "Electronics > Audio > Bluetooth Speakers": "Bluetooth Speaker",
    "Electronics > Audio > Over-ear Headphones": "Over-Ear Headphones",
    "Electronics > Audio > TWS Earbuds": "Wireless Earbuds",
    "Electronics > Cameras & Accessories > Action Cameras": "Action Camera",
    "Electronics > Cameras & Accessories > Lenses & Tripods": "Camera Lens",
    "Electronics > Cameras & Accessories > Mirrorless / DSLR": "Mirrorless Camera",
    "Electronics > Chargers, Cables & Adapters": "Fast Charger",
    "Electronics > Laptops > Business / Productivity": "Business Laptop",
    "Electronics > Laptops > Gaming": "Gaming Laptop",
    "Electronics > Laptops > Student / Budget": "Everyday Laptop",
    "Electronics > PC Peripherals > Keyboards & Mice": "Wireless Keyboard",
    "Electronics > PC Peripherals > Monitors": "Monitor",
    "Electronics > Smartphones > Android Budget": "Smartphone",
    "Electronics > Smartphones > Android Mid-range": "Smartphone",
    "Electronics > Smartphones > Flagship": "Flagship Smartphone",
    "Electronics > Smartwatches & Fitness Bands": "Smartwatch",
    "Electronics > Tablets & iPads": "Tablet",
    "Fashion - Men > Accessories > Belts": "Belt",
    "Fashion - Men > Accessories > Caps": "Cap",
    "Fashion - Men > Accessories > Wallets": "Wallet",
    "Fashion - Men > Ethnic Wear > Kurtas": "Kurta",
    "Fashion - Men > Ethnic Wear > Sherwanis": "Sherwani",
    "Fashion - Men > Footwear > Formal Shoes": "Formal Shoes",
    "Fashion - Men > Footwear > Sandals": "Sandals",
    "Fashion - Men > Footwear > Sneakers": "Sneakers",
    "Fashion - Men > Jeans & Trousers > Cargo": "Cargo Trousers",
    "Fashion - Men > Jeans & Trousers > Chinos": "Chinos",
    "Fashion - Men > Jeans & Trousers > Slim Fit Jeans": "Slim Fit Jeans",
    "Fashion - Men > Shirts > Casual": "Casual Shirt",
    "Fashion - Men > Shirts > Formal": "Formal Shirt",
    "Fashion - Men > Shirts > Polo": "Polo Shirt",
    "Fashion - Men > T-Shirts > Graphic": "Graphic T-Shirt",
    "Fashion - Men > T-Shirts > Oversized": "Oversized T-Shirt",
    "Fashion - Men > T-Shirts > Plain": "Cotton T-Shirt",
    "Fashion - Women > Bags & Accessories": "Handbag",
    "Fashion - Women > Dresses & Jumpsuits": "Dress",
    "Fashion - Women > Ethnic Wear > Kurtis": "Kurti",
    "Fashion - Women > Ethnic Wear > Lehengas": "Lehenga",
    "Fashion - Women > Ethnic Wear > Sarees": "Saree",
    "Fashion - Women > Footwear > Flats": "Flats",
    "Fashion - Women > Footwear > Heels": "Heels",
    "Fashion - Women > Footwear > Sneakers": "Sneakers",
    "Fashion - Women > Jeans & Bottoms": "Jeans",
    "Fashion - Women > Tops & Blouses": "Top",
    "Food & Grocery > Beverages": "Beverage",
    "Food & Grocery > Dry Fruits & Nuts": "Dry Fruits Pack",
    "Food & Grocery > Healthy Snacks": "Healthy Snack",
    "Home & Kitchen > Bedding & Bath > Bed Sheets": "Bed Sheet",
    "Home & Kitchen > Bedding & Bath > Pillows": "Pillow",
    "Home & Kitchen > Bedding & Bath > Towels": "Towel",
    "Home & Kitchen > Cookware > Kadais": "Kadai",
    "Home & Kitchen > Cookware > Non-stick Pans": "Non-Stick Pan",
    "Home & Kitchen > Cookware > Pressure Cookers": "Pressure Cooker",
    "Home & Kitchen > Decor > Lamps": "Table Lamp",
    "Home & Kitchen > Decor > Planters": "Planter",
    "Home & Kitchen > Decor > Wall Art": "Wall Art",
    "Home & Kitchen > Small Appliances > Air Fryer": "Air Fryer",
    "Home & Kitchen > Small Appliances > Induction Cooktop": "Induction Cooktop",
    "Home & Kitchen > Small Appliances > Mixer-Grinder": "Mixer Grinder",
    "Home & Kitchen > Small Appliances > Toaster": "Toaster",
    "Home & Kitchen > Storage & Organisation": "Storage Box",
    "Sports & Fitness > Gym Equipment > Dumbbells": "Dumbbell Set",
    "Sports & Fitness > Gym Equipment > Mats": "Yoga Mat",
    "Sports & Fitness > Gym Equipment > Resistance Bands": "Resistance Band",
    "Sports & Fitness > Outdoor & Adventure > Cricket": "Cricket Bat",
    "Sports & Fitness > Outdoor & Adventure > Cycles": "Bicycle",
    "Sports & Fitness > Outdoor & Adventure > Trek Gear": "Trekking Backpack",
    "Sports & Fitness > Sportswear > Men": "Men's Sportswear",
    "Sports & Fitness > Sportswear > Women": "Women's Sportswear",
}

_MISSING_TYPES: set[str] = set()


def product_type_for(product: dict) -> str:
    subcategory = str(product.get("subcategory") or "").strip()
    product_type = SUBCATEGORY_TO_TYPE.get(subcategory)
    if not product_type:
        _MISSING_TYPES.add(subcategory)
        # Fall back to the (title-cased) leaf so the run never invents a wrong type.
        leaf = subcategory.split(">")[-1].strip() or str(product.get("category") or "Product")
        product_type = leaf
    return product_type


def category_display(product: dict) -> str:
    subcategory = str(product.get("subcategory") or "")
    return subcategory.split(">")[0].strip() or str(product.get("category") or "").replace("-", " ").title()


def rebuild_tags(product: dict, product_type: str) -> list[str]:
    tokens: list[str] = []
    seen: set[str] = set()

    def add(token: str) -> None:
        token = token.strip().lower()
        if len(token) < 2 or token in seen or token in GENERIC_ADJECTIVES or token.isdigit():
            return
        seen.add(token)
        tokens.append(token)

    # Keep each type word (e.g. "t-shirt") and its de-hyphenated parts ("shirt").
    for word in product_type.split():
        add(word)
        for part in word.split("-"):
            add(part)
    add(str(product.get("brand") or ""))
    for word in str(product.get("category") or "").replace("-", " ").split():
        add(word)
    for tag in product.get("tags") or []:
        add(str(tag))
    return tokens


def rebuild_description(product: dict, product_type: str) -> str:
    brand = str(product.get("brand") or "").strip()
    category = category_display(product)
    return (
        f"<p>The {brand} {product_type} is a practical option in AI-KART's {category} range.</p>"
        f"<p>Compare its price, rating, product details, and availability with similar "
        f"{product_type.lower()} options before adding it to your cart.</p>"
    )


def apply_transform(products: list[dict], reserved_names: set[str]) -> int:
    # Assign the first free "<Brand> <Type> [n]" name in stable id order. Names are
    # reserved globally (including the v1 seed) so no collision is possible. The
    # index is a minimal variant only for genuinely identical duplicate SKUs.
    ordered = range(len(products))
    used_names = set(reserved_names)
    changed = 0
    for index in ordered:
        product = products[index]
        brand = str(product.get("brand") or "").strip()
        product_type = product_type_for(product)
        base_name = f"{brand} {product_type}".strip()

        name = base_name
        suffix = 1
        while name in used_names:
            suffix += 1
            name = f"{base_name} {suffix}"
        used_names.add(name)

        if product.get("name") != name:
            changed += 1
        product["name"] = name
        product["title"] = name
        product["description"] = rebuild_description(product, product_type)
        product["tags"] = rebuild_tags(product, product_type)
    return changed


def _reserved_v1_names() -> set[str]:
    if not SEED_V1_FILE.exists():
        return set()
    payload = json.loads(SEED_V1_FILE.read_text(encoding="utf-8"))
    return {str(p.get("name") or "").strip() for p in payload.get("products", []) if p.get("name")}


def main() -> int:
    payload = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    products = payload.get("products")
    if not isinstance(products, list):
        raise ValueError("products.seed.v2.json: 'products' must be a list")

    changed = apply_transform(products, _reserved_v1_names())

    names = [str(p.get("name") or "") for p in products]
    duplicates = {name for name in names if names.count(name) > 1}
    if duplicates:
        raise ValueError(f"Name collision after transform: {sorted(duplicates)[:5]}")
    if _MISSING_TYPES:
        print(f"WARNING: no explicit type mapping for: {sorted(_MISSING_TYPES)}")

    SEED_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Renamed {changed} products; {len(products)} total; {len(set(names))} unique names.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
