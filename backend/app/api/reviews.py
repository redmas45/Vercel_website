from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import get_product_repository, get_review_repository
from app.repositories.product_repository import ProductRepository
from app.repositories.review_repository import ReviewRepository
from app.schemas.review import ReviewCreateRequest, ReviewListResponse, ReviewSchema

router = APIRouter(prefix="/api/products/{product_id}/reviews", tags=["reviews"])


@router.get("", response_model=ReviewListResponse)
async def list_reviews(
    product_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(5, ge=1, le=24),
    sort: str = Query("helpful"),
    review_repository: ReviewRepository = Depends(get_review_repository),
) -> ReviewListResponse:
    reviews, meta = await review_repository.list_reviews(product_id, page, per_page, sort)
    return ReviewListResponse(data=[ReviewSchema.model_validate(review) for review in reviews], meta=meta)


@router.post("", response_model=ReviewSchema, status_code=status.HTTP_201_CREATED)
async def create_review(
    product_id: str,
    request: ReviewCreateRequest,
    product_repository: ProductRepository = Depends(get_product_repository),
    review_repository: ReviewRepository = Depends(get_review_repository),
) -> ReviewSchema:
    product = await product_repository.get_product(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    review = await review_repository.create_review(product.id, request)
    return ReviewSchema.model_validate(review)
