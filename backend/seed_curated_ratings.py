"""Give curated (v1) products review detail, and derive their aggregates from it.

The curated flagship products shipped unrated. An earlier pass wrote summary
`rating` / `review_count` values directly, which created a worse problem: a
product card advertised hundreds of reviews while the Customer Reviews section,
the reviews API, and Maya's spoken answer all reported none.

A summary is only trustworthy if it is reproducible from the detail, so this
script writes review ROWS first and then computes `rating` as their mean and
`review_count` as their number. No aggregate is ever written independently.

Values are DEMO DATA for a demo store, not real customer feedback. Everything is
derived deterministically from the product id, so the same product always gets
the same reviews and re-running the script is a no-op.

Run: `python backend/seed_curated_ratings.py` (idempotent).
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
CURATED_SEED = BACKEND_DIR / "products.seed.json"
REVIEWS_SEED = BACKEND_DIR / "reviews.seed.json"

MIN_REVIEWS = 6
MAX_REVIEWS = 14
# Weighted towards satisfied buyers, but never a uniform wall of 5s.
RATING_CHOICES = (5, 5, 5, 4, 4, 4, 3, 5, 4, 5)
REVIEW_EPOCH = datetime(2026, 1, 5, 9, 30, tzinfo=timezone.utc)
REVIEW_DATE_SPAN_DAYS = 180

REVIEWER_NAMES = (
    "Priya S.", "Rahul M.", "Ananya K.", "Vikram J.", "Meera T.", "Arjun P.",
    "Sneha R.", "Karthik V.", "Divya N.", "Rohit B.", "Ishita G.", "Manish D.",
)
TITLES = {
    5: ("Exactly what I wanted", "Excellent buy", "Really pleased with this"),
    4: ("Good value overall", "Solid, with small niggles", "Happy with the purchase"),
    3: ("Decent, but not perfect", "Does the job", "Fine for the price"),
}
BODIES = {
    5: (
        "Arrived quickly and the quality is better than I expected for the price.",
        "Using it daily and it has held up well. Would buy again without hesitating.",
        "Exactly as described. The finish feels premium and everything works properly.",
    ),
    4: (
        "Very good overall. The only small thing is that the packaging could be sturdier.",
        "Does everything I need. Took a little getting used to, but no complaints now.",
        "Solid quality for the money. A minor niggle or two, nothing that puts me off.",
    ),
    3: (
        "It works fine, though it feels a little basic compared to what I hoped for.",
        "Reasonable for the price. Not outstanding, but nothing actually wrong with it.",
        "Fine for everyday use. I would look at the higher model next time.",
    ),
}


def _digest(product_id: str, salt: str) -> int:
    return int.from_bytes(hashlib.sha256(f"{salt}:{product_id}".encode("utf-8")).digest()[:6], "big")


def _pick(options: tuple[str, ...], product_id: str, salt: str) -> str:
    return options[_digest(product_id, salt) % len(options)]


def review_count_for(product_id: str) -> int:
    return MIN_REVIEWS + _digest(product_id, "count") % (MAX_REVIEWS - MIN_REVIEWS + 1)


def _variant_label(variants: object, product_id: str, index: int) -> str | None:
    if not isinstance(variants, list):
        return None
    labels = [
        str(item.get("title") or item.get("name") or "").strip()
        for item in variants
        if isinstance(item, dict)
    ]
    labels = [label for label in labels if label]
    return labels[_digest(product_id, f"variant-{index}") % len(labels)] if labels else None


def build_reviews(product: dict) -> list[dict]:
    """Deterministic published review rows for one product."""
    product_id = str(product.get("id") or "")
    rows: list[dict] = []
    for index in range(review_count_for(product_id)):
        score = RATING_CHOICES[_digest(product_id, f"review-{index}") % len(RATING_CHOICES)]
        created = REVIEW_EPOCH + timedelta(
            days=_digest(product_id, f"day-{index}") % REVIEW_DATE_SPAN_DAYS
        )
        rows.append(
            {
                "id": f"rev-{product_id}-{index + 1}",
                "product_id": product_id,
                "reviewer_name": _pick(REVIEWER_NAMES, product_id, f"name-{index}"),
                "rating": score,
                "title": _pick(TITLES[score], product_id, f"title-{index}"),
                "body": _pick(BODIES[score], product_id, f"body-{index}"),
                "verified_purchase": _digest(product_id, f"verified-{index}") % 10 != 0,
                "helpful_count": _digest(product_id, f"helpful-{index}") % 14,
                "created_at": created.isoformat(),
                "variant_purchased": _variant_label(product.get("variants"), product_id, index),
                "is_published": True,
            }
        )
    return rows


def aggregate_from(rows: list[dict]) -> tuple[float, int]:
    """The published summary, computed from the rows and nothing else."""
    scores = [float(row["rating"]) for row in rows]
    return round(sum(scores) / len(scores), 1), len(scores)


def refresh_generated_review_dates(rows: list[dict], product: dict) -> int:
    """Keep previously generated rows aligned when the safe date window changes."""
    expected_dates = {
        str(row["id"]): str(row["created_at"])
        for row in build_reviews(product)
    }
    updated = 0
    for row in rows:
        review_id = str(row.get("id") or "")
        expected_date = expected_dates.get(review_id)
        if expected_date and row.get("created_at") != expected_date:
            row["created_at"] = expected_date
            updated += 1
    return updated


GENERATED_SEED = BACKEND_DIR / "products.seed.v2.json"


def _published_scores(rows: list) -> dict[str, list[float]]:
    scores: dict[str, list[float]] = {}
    for row in rows:
        if not isinstance(row, dict) or row.get("is_published") is False:
            continue
        product_id = str(row.get("product_id") or "")
        rating = row.get("rating")
        if product_id and isinstance(rating, (int, float)):
            scores.setdefault(product_id, []).append(float(rating))
    return scores


def main() -> int:
    """Reconcile every product's aggregate with its published review rows.

    Products with no reviews get deterministic rows generated for them; products
    that already have rows keep those rows and have their summary recomputed. The
    generated catalog's aggregates were also written independently of its review
    detail, so this pass corrects the whole catalog, not just the curated set.
    """
    reviews_payload = json.loads(REVIEWS_SEED.read_text(encoding="utf-8"))
    existing = list(reviews_payload.get("reviews", []))
    covered = _published_scores(existing)

    added: list[dict] = []
    seeded = 0
    recomputed = 0
    refreshed_dates = 0
    catalogs: list[tuple[Path, dict]] = []

    for seed_path in (CURATED_SEED, GENERATED_SEED):
        catalog = json.loads(seed_path.read_text(encoding="utf-8"))
        catalogs.append((seed_path, catalog))
        for product in catalog.get("products", []):
            product_id = str(product.get("id") or "").strip()
            if not product_id:
                continue
            scores = covered.get(product_id)
            if not scores:
                rows = build_reviews(product)
                added.extend(rows)
                scores = [float(row["rating"]) for row in rows]
                covered[product_id] = scores
                seeded += 1
            elif seed_path == CURATED_SEED:
                refreshed_dates += refresh_generated_review_dates(existing, product)
            rating = round(sum(scores) / len(scores), 1)
            if product.get("rating") != rating or product.get("review_count") != len(scores):
                recomputed += 1
            product["rating"] = rating
            product["review_count"] = len(scores)

    if not added and not recomputed and not refreshed_dates:
        print("Aggregates already match the review detail; nothing to do.")
        return 0

    if added or refreshed_dates:
        reviews_payload["reviews"] = existing + added
        REVIEWS_SEED.write_text(json.dumps(reviews_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    for seed_path, catalog in catalogs:
        seed_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(
        f"Seeded reviews for {seeded} products; recomputed {recomputed} aggregates; "
        f"refreshed {refreshed_dates} review dates."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
