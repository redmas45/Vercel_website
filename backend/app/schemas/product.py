from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ProductSchema(BaseModel):
    id: str
    handle: str
    title: str
    name: str
    description: str = ""
    category: str | None = None
    subcategory: str | None = None
    categories: list[str] = Field(default_factory=list)
    brand: str = "NOVA"
    vendor: str = "NOVA"
    sku: str | None = None
    price: float
    original_price: float | None = None
    discount_percent: int | None = None
    currency: str = "USD"
    stock: int | None = None
    in_stock: bool = True
    image_url: str = ""
    images: list[str] = Field(default_factory=list)
    rating: float | None = None
    review_count: int | None = None
    tags: list[str] = Field(default_factory=list)
    specs: dict[str, Any] | None = None
    variants: list[dict[str, Any]] | None = None
    related_ids: list[str] | None = None
    frequently_bought_with: list[str] | None = None
    highlights: list[str] | None = None
    is_featured: bool = False
    is_new_arrival: bool = False
    is_bestseller: bool = False
    url: str = ""
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class FacetRow(BaseModel):
    name: str
    count: int


class PriceRange(BaseModel):
    min: float
    max: float


class ProductFacets(BaseModel):
    brands: list[FacetRow] = Field(default_factory=list)
    price_range: PriceRange = Field(default_factory=lambda: PriceRange(min=0, max=0))
    categories: list[FacetRow] = Field(default_factory=list)


class ProductListMeta(BaseModel):
    total: int
    page: int
    per_page: int
    total_pages: int
    facets: ProductFacets


class ProductListResponse(BaseModel):
    data: list[ProductSchema]
    meta: ProductListMeta | None = None


class ProductDetailResponse(BaseModel):
    data: ProductSchema


class ProductRelatedResponse(BaseModel):
    data: dict[str, list[ProductSchema]]


class ProductFilters(BaseModel):
    category: str | None = None
    subcategory: str | None = None
    brands: list[str] = Field(default_factory=list)
    min_price: float | None = None
    max_price: float | None = None
    rating_min: float | None = None
    discount_min: int | None = None
    in_stock: bool | None = None
    featured: bool | None = None
    new_arrival: bool | None = None
    bestseller: bool | None = None
    q: str | None = None
    sort: Literal["relevance", "price_asc", "price_desc", "rating_desc", "newest", "popularity"] = "relevance"
    page: int = 1
    per_page: int = 24
