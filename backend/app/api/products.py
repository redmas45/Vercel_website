from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Product
from app.db.session import get_db
from app.repositories.product_repository import ProductRepository
from app.schemas.product import (
    ProductDetailResponse,
    ProductFilters,
    ProductListResponse,
    ProductSchema,
)

router = APIRouter(prefix="/api/products", tags=["products"])


def _serialize(p: Product) -> ProductSchema:
    return ProductSchema(
        id=p.id,
        handle=p.handle,
        title=p.title,
        name=p.name,
        description=p.description or "",
        category=p.category,
        categories=[p.category] if p.category else [],
        brand=p.brand,
        vendor=p.vendor,
        price=p.price,
        original_price=p.original_price,
        currency=p.currency,
        stock=p.stock,
        in_stock=p.in_stock,
        image_url=p.image_url,
        url=p.url,
    )


@router.get("", response_model=ProductListResponse)
async def list_products(
    category: str | None = Query(None),
    min_price: float | None = Query(None),
    max_price: float | None = Query(None),
    in_stock: bool | None = Query(None),
    q: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> ProductListResponse:
    repo = ProductRepository(db)
    filters = ProductFilters(
        category=category,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
        q=q,
    )
    products = await repo.list_products(filters)
    return ProductListResponse(data=[_serialize(p) for p in products])


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
) -> ProductDetailResponse:
    repo = ProductRepository(db)
    product = await repo.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductDetailResponse(data=_serialize(product))
