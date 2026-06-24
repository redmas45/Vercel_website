from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.account_repository import AccountRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.user_repository import UserRepository
from app.services.admin_service import AdminService


def get_product_repository(db: AsyncSession = Depends(get_db)) -> ProductRepository:
    return ProductRepository(db)


def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_review_repository(db: AsyncSession = Depends(get_db)) -> ReviewRepository:
    return ReviewRepository(db)


def get_account_repository(db: AsyncSession = Depends(get_db)) -> AccountRepository:
    return AccountRepository(db)


def get_admin_service(
    product_repository: ProductRepository = Depends(get_product_repository),
    user_repository: UserRepository = Depends(get_user_repository),
) -> AdminService:
    return AdminService(product_repository=product_repository, user_repository=user_repository)
