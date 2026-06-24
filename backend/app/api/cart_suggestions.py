from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_product_repository
from app.repositories.product_repository import ProductRepository
from app.serializers.product_serializer import serialize_product

router = APIRouter(prefix="/api/cart", tags=["cart"])


@router.get("/suggestions")
async def cart_suggestions(
    product_ids: str = Query(""),
    product_repository: ProductRepository = Depends(get_product_repository),
) -> dict:
    ids = [part.strip() for part in product_ids.split(",") if part.strip()]
    products = await product_repository.products_by_ids(ids)
    suggestions = await product_repository.affinity_suggestions(products, set(ids), limit=4)
    return {"data": [serialize_product(product) for product in suggestions]}
