from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.product import ProductSchema


class WishlistCreateRequest(BaseModel):
    product_id: str = Field(..., min_length=1)


class WishlistItemSchema(BaseModel):
    id: int
    product: ProductSchema


class WishlistResponse(BaseModel):
    data: list[WishlistItemSchema]


class AddressSchema(BaseModel):
    id: int
    name: str
    phone: str
    line1: str
    line2: str = ""
    city: str
    state: str
    pincode: str
    is_default: bool = False

    model_config = {"from_attributes": True}


class AddressCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., min_length=7, max_length=40)
    line1: str = Field(..., min_length=4, max_length=512)
    line2: str = Field(default="", max_length=512)
    city: str = Field(..., min_length=2, max_length=120)
    state: str = Field(..., min_length=2, max_length=120)
    pincode: str = Field(..., min_length=4, max_length=20)
    is_default: bool = False


class AddressListResponse(BaseModel):
    data: list[AddressSchema]


class OrdersResponse(BaseModel):
    data: list[dict]


class PincodeResponse(BaseModel):
    data: dict[str, str | bool]
