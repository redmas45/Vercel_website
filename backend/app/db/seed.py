from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.db.models import Product, Review, User
from app.db.session import AsyncSessionLocal
from catalog_validation import validate_catalog

SEED_FILE = Path(__file__).resolve().parents[2] / "products.seed.json"
REVIEWS_SEED_FILE = Path(__file__).resolve().parents[2] / "reviews.seed.json"
STATIC_DIR = Path(__file__).resolve().parents[2] / "static"
DEFAULT_BRAND = "NOVA"
DEFAULT_CURRENCY = "INR"


async def seed_if_empty() -> None:
    await sync_product_seed()
    await sync_review_seed()


async def sync_product_seed() -> None:
    seed_files = [path for path in (SEED_FILE,) if path.is_file()]
    validation_errors = validate_catalog(seed_files, STATIC_DIR)
    if validation_errors:
        raise ValueError(f"Product seed validation failed: {'; '.join(validation_errors[:10])}")
    async with AsyncSessionLocal() as session:
        if not seed_files:
            print("[seed] Product seed files not found, skipping.")
            return

        synced = 0
        names = []
        for seed_file in seed_files:
            raw = json.loads(seed_file.read_text(encoding="utf-8"))
            products_data = raw.get("products", [])
            names.append(seed_file.name)
            for item in products_data:
                product_id = str(item.get("id") or item.get("handle") or "").strip()
                if not product_id:
                    continue
                product = await session.get(Product, product_id)
                if product is None:
                    product = Product(id=product_id)
                    session.add(product)
                _apply_product_seed(product, item, product_id)
                synced += 1

        await session.commit()
        print(f"[seed] Synced {synced} products from {', '.join(names)}.")


async def sync_review_seed() -> None:
    if not REVIEWS_SEED_FILE.is_file():
        return
    raw = json.loads(REVIEWS_SEED_FILE.read_text(encoding="utf-8"))
    reviews_data = raw.get("reviews", [])
    async with AsyncSessionLocal() as session:
        synced = 0
        for item in reviews_data:
            review_id = str(item.get("id") or "").strip()
            product_id = str(item.get("product_id") or "").strip()
            if not review_id or not product_id:
                continue
            existing = await session.get(Review, review_id)
            if existing is not None:
                continue
            review = Review(
                id=review_id,
                product_id=product_id,
                reviewer_name=str(item.get("reviewer_name") or "AI-KART shopper"),
                rating=int(item.get("rating") or 5),
                title=str(item.get("title") or "Good product"),
                body=str(item.get("body") or "The product matched expectations and arrived in good condition."),
                verified_purchase=bool(item.get("verified_purchase", True)),
                helpful_count=int(item.get("helpful_count") or 0),
                created_at=_parse_datetime(item.get("created_at")),
                variant_purchased=item.get("variant_purchased"),
                is_published=bool(item.get("is_published", True)),
            )
            session.add(review)
            synced += 1
        await session.commit()
        if synced:
            print(f"[seed] Synced {synced} reviews from reviews.seed.json.")


async def ensure_default_admin() -> None:
    async with AsyncSessionLocal() as session:
        count_result = await session.execute(select(func.count()).select_from(User).where(User.role == "admin"))
        count = count_result.scalar_one()
        if count > 0:
            return
        admin = User(
            email=settings.default_admin_email.strip().lower(),
            name="Store Admin",
            password_hash=hash_password(settings.default_admin_password),
            role="admin",
        )
        session.add(admin)
        await session.commit()
        print(f"[seed] Created default admin user {admin.email}.")


def _apply_product_seed(product: Product, item: dict, product_id: str) -> None:
    product.handle = str(item.get("handle") or product_id)
    product.title = str(item.get("title") or item.get("name") or "")
    product.name = str(item.get("name") or item.get("title") or "")
    product.description = str(item.get("description") or "")
    product.category = item.get("category")
    product.subcategory = item.get("subcategory")
    product.brand = str(item.get("brand") or item.get("vendor") or DEFAULT_BRAND)
    product.vendor = str(item.get("vendor") or item.get("brand") or DEFAULT_BRAND)
    product.sku = item.get("sku")
    product.price = float(item.get("price") or 0)
    product.original_price = item.get("original_price")
    product.discount_percent = item.get("discount_percent")
    product.currency = str(item.get("currency") or DEFAULT_CURRENCY)
    product.stock = item.get("stock")
    product.in_stock = bool(item.get("in_stock", True))
    product.image_url = str(item.get("image_url") or "")
    product.images = list(item.get("images") or ([product.image_url] if product.image_url else []))
    product.rating = item.get("rating")
    product.review_count = item.get("review_count")
    product.tags = list(item.get("tags") or [])
    product.specs = item.get("specs")
    product.variants = item.get("variants")
    product.related_ids = item.get("related_ids")
    product.frequently_bought_with = item.get("frequently_bought_with")
    product.highlights = item.get("highlights")
    product.is_featured = bool(item.get("is_featured", False))
    product.is_new_arrival = bool(item.get("is_new_arrival", False))
    product.is_bestseller = bool(item.get("is_bestseller", False))
    product.url = str(item.get("url") or f"/product/{product_id}/")
    created_at = item.get("created_at")
    if created_at:
        product.created_at = _parse_datetime(created_at)


def _parse_datetime(value: object) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return datetime.utcnow()
    return datetime.utcnow() - timedelta(days=7)
