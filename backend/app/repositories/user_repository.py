from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_users(self) -> list[User]:
        result = await self._session.execute(select(User).order_by(User.created_at.desc()))
        return list(result.scalars().all())

    async def get_by_id(self, user_id: int) -> User | None:
        return await self._session.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create_user(self, email: str, name: str, password_hash: str, role: str) -> User:
        user = User(email=email, name=name, password_hash=password_hash, role=role)
        self._session.add(user)
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def delete_user(self, user: User) -> None:
        await self._session.delete(user)
        await self._session.commit()
