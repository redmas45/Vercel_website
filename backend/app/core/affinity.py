from __future__ import annotations

AFFINITY_MAP: dict[str, list[str]] = {
    "shirts": ["trousers", "formal-shoes", "belts", "ties"],
    "t-shirts": ["jeans", "sneakers", "caps"],
    "jeans": ["t-shirts", "casual-shoes", "belts", "jackets"],
    "formal-shoes": ["formal-trousers", "socks", "shoe-care"],
    "sarees": ["blouses", "petticoats", "heels", "clutches"],
    "kurtis": ["leggings", "dupatta", "juttis"],
    "smartphones": ["phone-cases", "screen-protectors", "earbuds", "chargers"],
    "laptops": ["laptop-bags", "wireless-mouse", "keyboard", "monitor"],
    "dslr-cameras": ["sd-cards", "camera-bags", "tripods", "lenses"],
    "gym-equipment": ["protein-supplements", "gym-gloves", "sportswear"],
    "pressure-cookers": ["ladles", "cookware-cleaner", "trivets"],
    "air-fryers": ["parchment-liners", "recipe-books", "silicone-tongs"],
    "skincare-serum": ["moisturiser", "sunscreen", "face-wash"],
    "shampoo": ["conditioner", "hair-mask", "hair-oil"],
}


def slug_text(value: str | None) -> str:
    return str(value or "").strip().lower().replace(" & ", "-").replace(" ", "-")


def affinity_keys(category: str | None, subcategory: str | None) -> list[str]:
    candidates = [subcategory, category]
    keys: list[str] = []
    for candidate in candidates:
        if not candidate:
            continue
        parts = [part.strip() for part in candidate.split(">") if part.strip()]
        keys.extend(slug_text(part) for part in parts)
        keys.append(slug_text(candidate))
    return [key for key in dict.fromkeys(keys) if key]
