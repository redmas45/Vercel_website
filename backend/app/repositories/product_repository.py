from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Product
from app.schemas.product import ProductFilters


class ProductRepository:
    """All product data access goes through this class.
    Routes call the repository; the repository calls SQLAlchemy.
    Nothing in /api imports SQLAlchemy directly."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_products(self, filters: ProductFilters | None = None) -> list[Product]:
        stmt = select(Product)

        if filters:
            if filters.category is not None:
                stmt = stmt.where(Product.category == filters.category)
            if filters.min_price is not None:
                stmt = stmt.where(Product.price >= filters.min_price)
            if filters.max_price is not None:
                stmt = stmt.where(Product.price <= filters.max_price)
            if filters.in_stock is not None:
                stmt = stmt.where(Product.in_stock == filters.in_stock)
            if filters.q:
                q = f"%{filters.q.lower()}%"
                stmt = stmt.where(
                    Product.name.ilike(q)
                    | Product.title.ilike(q)
                    | Product.description.ilike(q)
                    | Product.category.ilike(q)
                )

        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_product(self, product_id: str) -> Product | None:
        result = await self._session.execute(
            select(Product).where(Product.id == product_id)
        )
        product = result.scalar_one_or_none()
        if product is None:
            # Try by handle as well
            result = await self._session.execute(
                select(Product).where(Product.handle == product_id)
            )
            product = result.scalar_one_or_none()
        return product

    async def search_products(self, query: str) -> list[Product]:
        return await self.list_products(ProductFilters(q=query))
