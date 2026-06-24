from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_product_repository
from app.repositories.product_repository import ProductRepository
from app.schemas.product import (
    ProductDetailResponse,
    ProductFilters,
    ProductListResponse,
    ProductRelatedResponse,
)
from app.serializers.product_serializer import serialize_product

router = APIRouter(prefix="/api/products", tags=["products"])
SORT_OPTIONS = {"relevance", "price_asc", "price_desc", "rating_desc", "newest", "popularity"}


@router.get("", response_model=ProductListResponse)
async def list_products(
    category: str | None = Query(None),
    subcategory: str | None = Query(None),
    brand: str | None = Query(None),
    price_min: float | None = Query(None),
    price_max: float | None = Query(None),
    min_price: float | None = Query(None),
    max_price: float | None = Query(None),
    rating_min: float | None = Query(None),
    discount_min: int | None = Query(None),
    in_stock: bool | None = Query(None),
    featured: bool | None = Query(None),
    new_arrival: bool | None = Query(None),
    bestseller: bool | None = Query(None),
    sort: str = Query("relevance"),
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=96),
    q: str | None = Query(None),
    repo: ProductRepository = Depends(get_product_repository),
) -> ProductListResponse:
    filters = ProductFilters(
        category=category,
        subcategory=subcategory,
        brands=_split_csv(brand),
        min_price=price_min if price_min is not None else min_price,
        max_price=price_max if price_max is not None else max_price,
        rating_min=rating_min,
        discount_min=discount_min,
        in_stock=in_stock,
        featured=featured,
        new_arrival=new_arrival,
        bestseller=bestseller,
        q=q,
        sort=sort if sort in SORT_OPTIONS else "relevance",
        page=page,
        per_page=per_page,
    )
    product_page = await repo.list_product_page(filters)
    return ProductListResponse(
        data=[serialize_product(p) for p in product_page.products],
        meta=product_page.meta,
    )


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product(
    product_id: str,
    repo: ProductRepository = Depends(get_product_repository),
) -> ProductDetailResponse:
    product = await repo.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductDetailResponse(data=serialize_product(product))


@router.get("/{product_id}/related", response_model=ProductRelatedResponse)
async def related_products(
    product_id: str,
    repo: ProductRepository = Depends(get_product_repository),
) -> ProductRelatedResponse:
    product = await repo.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    cross_sell = await repo.related_products(product, limit=8)
    frequently_bought = await repo.frequently_bought_products(product, limit=3)
    return ProductRelatedResponse(
        data={
            "cross_sell": [serialize_product(item) for item in cross_sell],
            "frequently_bought_with": [serialize_product(item) for item in frequently_bought],
        }
    )


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]
