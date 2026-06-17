from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ProductSchema(BaseModel):
    id: str
    handle: str
    title: str
    name: str
    description: str = ""
    category: str | None = None
    categories: list[str] = Field(default_factory=list)
    brand: str = "NOVA"
    vendor: str = "NOVA"
    price: float
    original_price: float | None = None
    currency: str = "USD"
    stock: int | None = None
    in_stock: bool = True
    image_url: str = ""
    url: str = ""

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    data: list[ProductSchema]


class ProductDetailResponse(BaseModel):
    data: ProductSchema


class ProductFilters(BaseModel):
    category: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    in_stock: bool | None = None
    q: str | None = None
