from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine


PRODUCT_COLUMNS: dict[str, str] = {
    "subcategory": "VARCHAR(255)",
    "sku": "VARCHAR(255)",
    "discount_percent": "INTEGER",
    "images": "JSON DEFAULT '[]'",
    "rating": "FLOAT",
    "review_count": "INTEGER",
    "tags": "JSON DEFAULT '[]'",
    "specs": "JSON",
    "variants": "JSON",
    "related_ids": "JSON",
    "frequently_bought_with": "JSON",
    "highlights": "JSON",
    "is_featured": "BOOLEAN DEFAULT 0",
    "is_new_arrival": "BOOLEAN DEFAULT 0",
    "is_bestseller": "BOOLEAN DEFAULT 0",
    "created_at": "DATETIME",
}


async def migrate_existing_schema(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        rows = await conn.exec_driver_sql("PRAGMA table_info(products)")
        existing = {str(row[1]) for row in rows}
        for column, sql_type in PRODUCT_COLUMNS.items():
            if column in existing:
                continue
            await conn.exec_driver_sql(f"ALTER TABLE products ADD COLUMN {column} {sql_type}")
