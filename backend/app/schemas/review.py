from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ReviewSchema(BaseModel):
    id: str
    product_id: str
    reviewer_name: str
    rating: int
    title: str
    body: str
    verified_purchase: bool = True
    helpful_count: int = 0
    created_at: datetime | None = None
    variant_purchased: str | None = None
    is_published: bool = True

    model_config = {"from_attributes": True}


class ReviewCreateRequest(BaseModel):
    reviewer_name: str = Field(default="AI-KART shopper", max_length=255)
    rating: int = Field(..., ge=1, le=5)
    title: str = Field(..., min_length=3, max_length=512)
    body: str = Field(..., min_length=10)
    variant_purchased: str | None = Field(default=None, max_length=255)


class ReviewListMeta(BaseModel):
    total: int
    page: int
    per_page: int
    total_pages: int
    average_rating: float
    rating_breakdown: dict[str, int]


class ReviewListResponse(BaseModel):
    data: list[ReviewSchema]
    meta: ReviewListMeta
