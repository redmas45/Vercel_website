from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Product
from app.db.session import AsyncSessionLocal

SEED_FILE = Path(__file__).resolve().parents[2] / "products.seed.json"


async def seed_if_empty() -> None:
    """Load products from products.seed.json into SQLite if the table is empty.
    Idempotent: does nothing on subsequent runs if products already exist."""
    async with AsyncSessionLocal() as session:
        count_result = await session.execute(select(func.count()).select_from(Product))
        count = count_result.scalar_one()
        if count > 0:
            return

        if not SEED_FILE.is_file():
            print(f"[seed] Seed file not found at {SEED_FILE}, skipping.")
            return

        raw = json.loads(SEED_FILE.read_text(encoding="utf-8"))
        products_data = raw.get("products", [])

        for item in products_data:
            product_id = str(item.get("id") or item.get("handle") or "").strip()
            if not product_id:
                continue

            product = Product(
                id=product_id,
                handle=str(item.get("handle") or product_id),
                title=str(item.get("title") or item.get("name") or ""),
                name=str(item.get("name") or item.get("title") or ""),
                description=str(item.get("description") or ""),
                category=item.get("category"),
                brand=str(item.get("brand") or item.get("vendor") or "NOVA"),
                vendor=str(item.get("vendor") or item.get("brand") or "NOVA"),
                price=float(item.get("price") or 0),
                original_price=item.get("original_price"),
                currency=str(item.get("currency") or "USD"),
                stock=item.get("stock"),
                in_stock=bool(item.get("in_stock", True)),
                image_url=str(item.get("image_url") or ""),
                url=str(item.get("url") or f"/product/{product_id}/"),
            )
            session.add(product)

        await session.commit()
        print(f"[seed] Seeded {len(products_data)} products into the database.")
