from __future__ import annotations

from dataclasses import dataclass
from math import ceil

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Product
from app.schemas.product import FacetRow, PriceRange, ProductFacets, ProductFilters, ProductListMeta


@dataclass(frozen=True)
class ProductPage:
    products: list[Product]
    meta: ProductListMeta


class ProductRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_products(self, filters: ProductFilters | None = None) -> list[Product]:
        stmt = self._filtered_statement(filters)
        stmt = self._sorted_statement(stmt, filters)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_product_page(self, filters: ProductFilters) -> ProductPage:
        page = max(filters.page, 1)
        per_page = min(max(filters.per_page, 1), 96)
        filtered = self._filtered_statement(filters)
        total = await self._count_products(filtered)
        stmt = self._sorted_statement(filtered, filters).offset((page - 1) * per_page).limit(per_page)
        result = await self._session.execute(stmt)
        facets = await self.facets()
        return ProductPage(
            products=list(result.scalars().all()),
            meta=ProductListMeta(
                total=total,
                page=page,
                per_page=per_page,
                total_pages=max(1, ceil(total / per_page)) if total else 0,
                facets=facets,
            ),
        )

    async def facets(self) -> ProductFacets:
        brand_rows = await self._facet_rows(Product.brand)
        category_rows = await self._facet_rows(Product.category)
        price_result = await self._session.execute(select(func.min(Product.price), func.max(Product.price)))
        min_price, max_price = price_result.one()
        return ProductFacets(
            brands=brand_rows,
            categories=category_rows,
            price_range=PriceRange(min=float(min_price or 0), max=float(max_price or 0)),
        )

    async def list_all_products(self) -> list[Product]:
        result = await self._session.execute(select(Product).order_by(Product.name.asc()))
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

    async def product_suggestions(self, query: str, limit: int) -> list[Product]:
        stmt = self._filtered_statement(ProductFilters(q=query)).limit(max(1, min(limit, 12)))
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def products_by_ids(self, product_ids: list[str]) -> list[Product]:
        clean_ids = [product_id for product_id in product_ids if product_id]
        if not clean_ids:
            return []
        result = await self._session.execute(select(Product).where(Product.id.in_(clean_ids)))
        products = list(result.scalars().all())
        index = {product.id: product for product in products}
        return [index[product_id] for product_id in clean_ids if product_id in index]

    async def related_products(self, product: Product, limit: int = 8) -> list[Product]:
        explicit = await self.products_by_ids(product.related_ids or [])
        if len(explicit) >= limit:
            return explicit[:limit]
        stmt = (
            select(Product)
            .where(Product.id != product.id)
            .where(Product.category == product.category)
            .order_by(Product.rating.desc().nullslast(), Product.review_count.desc().nullslast())
            .limit(limit - len(explicit))
        )
        result = await self._session.execute(stmt)
        return (explicit + list(result.scalars().all()))[:limit]

    async def frequently_bought_products(self, product: Product, limit: int = 3) -> list[Product]:
        explicit = await self.products_by_ids(product.frequently_bought_with or [])
        return explicit[:limit]

    async def affinity_suggestions(self, source_products: list[Product], excluded_ids: set[str], limit: int = 4) -> list[Product]:
        subcategories = [product.subcategory or product.category for product in source_products]
        terms = [term for term in subcategories if term]
        if not terms:
            return []
        conditions = []
        for term in terms:
            leaf = str(term).split(">")[-1].strip()
            like = f"%{leaf}%"
            conditions.extend([Product.subcategory.ilike(like), cast(Product.tags, String).ilike(like)])
        stmt = (
            select(Product)
            .where(Product.id.not_in(excluded_ids))
            .where(or_(*conditions))
            .order_by(Product.rating.desc().nullslast(), Product.review_count.desc().nullslast())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def create_product(self, product: Product) -> Product:
        self._session.add(product)
        await self._session.commit()
        await self._session.refresh(product)
        return product

    async def delete_product(self, product: Product) -> None:
        await self._session.delete(product)
        await self._session.commit()

    def _filtered_statement(self, filters: ProductFilters | None):
        stmt = select(Product)
        if not filters:
            return stmt
        if filters.category:
            stmt = stmt.where(Product.category.ilike(filters.category))
        if filters.subcategory:
            stmt = stmt.where(Product.subcategory.ilike(f"%{filters.subcategory}%"))
        if filters.brands:
            stmt = stmt.where(Product.brand.in_(filters.brands))
        if filters.min_price is not None:
            stmt = stmt.where(Product.price >= filters.min_price)
        if filters.max_price is not None:
            stmt = stmt.where(Product.price <= filters.max_price)
        if filters.rating_min is not None:
            stmt = stmt.where(Product.rating >= filters.rating_min)
        if filters.discount_min is not None:
            stmt = stmt.where(Product.discount_percent >= filters.discount_min)
        if filters.in_stock is not None:
            stmt = stmt.where(Product.in_stock == filters.in_stock)
        if filters.featured is not None:
            stmt = stmt.where(Product.is_featured == filters.featured)
        if filters.new_arrival is not None:
            stmt = stmt.where(Product.is_new_arrival == filters.new_arrival)
        if filters.bestseller is not None:
            stmt = stmt.where(Product.is_bestseller == filters.bestseller)
        if filters.q:
            stmt = stmt.where(self._search_predicate(filters.q))
        return stmt

    # A search term must line up with the start of a word. Matching it anywhere
    # inside one made "ipod" return camera lenses, because the subcategory
    # "Lenses & Tripods" contains "ipod" - and "ens" returned every "Lens".
    _WORD_START_PREFIXES = ("", " ", "-", "_", ",", "/", "&", "(", "[", '"', "'", ">")
    _LIKE_ESCAPE = "\\"

    def _escape_like(self, value: str) -> str:
        """Neutralise LIKE wildcards so a term matches itself literally.

        `_` matches any single character in SQL LIKE, so an unescaped separator or
        user term silently turns into a wildcard - which is how "ipod" matched
        "tr-ipod" again even after word-start anchoring was added.
        """
        for special in (self._LIKE_ESCAPE, "%", "_"):
            value = value.replace(special, f"{self._LIKE_ESCAPE}{special}")
        return value

    def _search_predicate(self, raw_term: str):
        term = self._escape_like(raw_term.strip().lower())
        fields = (
            Product.name,
            Product.title,
            Product.description,
            Product.category,
            Product.subcategory,
            Product.brand,
            cast(Product.tags, String),
        )
        patterns = [
            f"{term}%" if prefix == "" else f"%{self._escape_like(prefix)}{term}%"
            for prefix in self._WORD_START_PREFIXES
        ]
        predicate = None
        for field in fields:
            for pattern in patterns:
                match = field.ilike(pattern, escape=self._LIKE_ESCAPE)
                predicate = match if predicate is None else predicate | match
        return predicate

    def _sorted_statement(self, stmt, filters: ProductFilters | None):
        sort = filters.sort if filters else "relevance"
        if sort == "price_asc":
            return stmt.order_by(Product.price.asc())
        if sort == "price_desc":
            return stmt.order_by(Product.price.desc())
        if sort == "rating_desc":
            return stmt.order_by(Product.rating.desc().nullslast(), Product.review_count.desc().nullslast())
        if sort == "newest":
            return stmt.order_by(Product.created_at.desc().nullslast())
        if sort == "popularity":
            return stmt.order_by(Product.review_count.desc().nullslast(), Product.rating.desc().nullslast())
        return stmt.order_by(Product.is_bestseller.desc(), Product.rating.desc().nullslast(), Product.name.asc())

    async def _count_products(self, stmt) -> int:
        subquery = stmt.subquery()
        result = await self._session.execute(select(func.count()).select_from(subquery))
        return int(result.scalar_one() or 0)

    async def _facet_rows(self, column) -> list[FacetRow]:
        result = await self._session.execute(
            select(column, func.count()).where(column.is_not(None)).group_by(column).order_by(func.count().desc())
        )
        return [FacetRow(name=str(name), count=int(count)) for name, count in result.all() if name]
