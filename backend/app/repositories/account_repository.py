from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Address, Product, Wishlist
from app.schemas.account import AddressCreateRequest


class AccountRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def wishlist_items(self, user_id: int) -> list[tuple[Wishlist, Product]]:
        result = await self._session.execute(
            select(Wishlist, Product)
            .join(Product, Product.id == Wishlist.product_id)
            .where(Wishlist.user_id == user_id)
            .order_by(Wishlist.created_at.desc())
        )
        return list(result.all())

    async def add_wishlist_item(self, user_id: int, product_id: str) -> Wishlist:
        existing = await self._session.execute(
            select(Wishlist).where(Wishlist.user_id == user_id).where(Wishlist.product_id == product_id)
        )
        item = existing.scalar_one_or_none()
        if item is not None:
            return item
        item = Wishlist(user_id=user_id, product_id=product_id)
        self._session.add(item)
        await self._session.commit()
        await self._session.refresh(item)
        return item

    async def remove_wishlist_item(self, user_id: int, product_id: str) -> bool:
        result = await self._session.execute(
            select(Wishlist).where(Wishlist.user_id == user_id).where(Wishlist.product_id == product_id)
        )
        item = result.scalar_one_or_none()
        if item is None:
            return False
        await self._session.delete(item)
        await self._session.commit()
        return True

    async def addresses(self, user_id: int) -> list[Address]:
        result = await self._session.execute(
            select(Address).where(Address.user_id == user_id).order_by(Address.is_default.desc(), Address.id.desc())
        )
        return list(result.scalars().all())

    async def add_address(self, user_id: int, request: AddressCreateRequest) -> Address:
        address = Address(user_id=user_id, **request.model_dump())
        self._session.add(address)
        await self._session.commit()
        await self._session.refresh(address)
        return address
