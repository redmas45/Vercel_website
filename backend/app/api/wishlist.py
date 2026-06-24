from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth import current_user
from app.db.models import User
from app.dependencies import get_account_repository, get_product_repository
from app.repositories.account_repository import AccountRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.account import (
    AddressCreateRequest,
    AddressListResponse,
    AddressSchema,
    OrdersResponse,
    WishlistCreateRequest,
    WishlistItemSchema,
    WishlistResponse,
)
from app.serializers.product_serializer import serialize_product

router = APIRouter(prefix="/api/users/me", tags=["account"])


@router.get("/orders", response_model=OrdersResponse)
async def orders(user: User = Depends(current_user)) -> OrdersResponse:
    return OrdersResponse(data=[])


@router.get("/wishlist", response_model=WishlistResponse)
async def wishlist(
    user: User = Depends(current_user),
    account_repository: AccountRepository = Depends(get_account_repository),
) -> WishlistResponse:
    rows = await account_repository.wishlist_items(user.id)
    return WishlistResponse(data=[WishlistItemSchema(id=item.id, product=serialize_product(product)) for item, product in rows])


@router.post("/wishlist", response_model=WishlistResponse, status_code=status.HTTP_201_CREATED)
async def add_wishlist(
    request: WishlistCreateRequest,
    user: User = Depends(current_user),
    account_repository: AccountRepository = Depends(get_account_repository),
    product_repository: ProductRepository = Depends(get_product_repository),
) -> WishlistResponse:
    product = await product_repository.get_product(request.product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    await account_repository.add_wishlist_item(user.id, product.id)
    return await wishlist(user, account_repository)


@router.delete("/wishlist/{product_id}")
async def remove_wishlist(
    product_id: str,
    user: User = Depends(current_user),
    account_repository: AccountRepository = Depends(get_account_repository),
) -> dict[str, str]:
    await account_repository.remove_wishlist_item(user.id, product_id)
    return {"data": {"status": "ok"}}


@router.get("/addresses", response_model=AddressListResponse)
async def addresses(
    user: User = Depends(current_user),
    account_repository: AccountRepository = Depends(get_account_repository),
) -> AddressListResponse:
    rows = await account_repository.addresses(user.id)
    return AddressListResponse(data=[AddressSchema.model_validate(row) for row in rows])


@router.post("/addresses", response_model=AddressSchema, status_code=status.HTTP_201_CREATED)
async def add_address(
    request: AddressCreateRequest,
    user: User = Depends(current_user),
    account_repository: AccountRepository = Depends(get_account_repository),
) -> AddressSchema:
    address = await account_repository.add_address(user.id, request)
    return AddressSchema.model_validate(address)
