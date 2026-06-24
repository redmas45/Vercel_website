from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_product_repository
from app.repositories.product_repository import ProductRepository
from app.serializers.product_serializer import serialize_product

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/suggest")
async def suggest_products(
    q: str = Query("", min_length=0),
    limit: int = Query(5, ge=1, le=12),
    product_repository: ProductRepository = Depends(get_product_repository),
) -> dict:
    if not q.strip():
        return {"data": []}
    products = await product_repository.product_suggestions(q.strip(), limit)
    return {"data": [serialize_product(product) for product in products]}
