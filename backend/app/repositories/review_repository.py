from __future__ import annotations

from math import ceil
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Review
from app.schemas.review import ReviewCreateRequest, ReviewListMeta


class ReviewRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_reviews(self, product_id: str, page: int, per_page: int, sort: str) -> tuple[list[Review], ReviewListMeta]:
        clean_page = max(page, 1)
        clean_per_page = min(max(per_page, 1), 24)
        base = select(Review).where(Review.product_id == product_id).where(Review.is_published == True)
        total_result = await self._session.execute(
            select(func.count()).where(Review.product_id == product_id).where(Review.is_published == True)
        )
        total = int(total_result.scalar_one() or 0)
        stmt = self._sort(base, sort).offset((clean_page - 1) * clean_per_page).limit(clean_per_page)
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), await self._meta(product_id, total, clean_page, clean_per_page)

    async def create_review(self, product_id: str, request: ReviewCreateRequest) -> Review:
        review = Review(
            id=f"rev-{uuid4().hex[:16]}",
            product_id=product_id,
            reviewer_name=request.reviewer_name.strip() or "AI-KART shopper",
            rating=request.rating,
            title=request.title.strip(),
            body=request.body.strip(),
            verified_purchase=True,
            helpful_count=0,
            variant_purchased=request.variant_purchased,
            is_published=True,
        )
        self._session.add(review)
        await self._session.commit()
        await self._session.refresh(review)
        return review

    async def list_all_reviews(self) -> list[Review]:
        result = await self._session.execute(select(Review).order_by(Review.created_at.desc()))
        return list(result.scalars().all())

    async def set_published(self, review_id: str, is_published: bool) -> Review | None:
        review = await self._session.get(Review, review_id)
        if review is None:
            return None
        review.is_published = is_published
        await self._session.commit()
        await self._session.refresh(review)
        return review

    async def delete_review(self, review_id: str) -> bool:
        review = await self._session.get(Review, review_id)
        if review is None:
            return False
        await self._session.delete(review)
        await self._session.commit()
        return True

    def _sort(self, stmt, sort: str):
        if sort == "recent":
            return stmt.order_by(Review.created_at.desc())
        if sort == "rating_high":
            return stmt.order_by(Review.rating.desc(), Review.helpful_count.desc())
        if sort == "rating_low":
            return stmt.order_by(Review.rating.asc(), Review.helpful_count.desc())
        return stmt.order_by(Review.helpful_count.desc(), Review.created_at.desc())

    async def _meta(self, product_id: str, total: int, page: int, per_page: int) -> ReviewListMeta:
        rows = await self._session.execute(
            select(Review.rating, func.count())
            .where(Review.product_id == product_id)
            .where(Review.is_published == True)
            .group_by(Review.rating)
        )
        breakdown = {str(star): 0 for star in range(1, 6)}
        rating_sum = 0
        for rating, count in rows.all():
            breakdown[str(rating)] = int(count)
            rating_sum += int(rating) * int(count)
        average = round(rating_sum / total, 1) if total else 0
        return ReviewListMeta(
            total=total,
            page=page,
            per_page=per_page,
            total_pages=max(1, ceil(total / per_page)) if total else 0,
            average_rating=average,
            rating_breakdown=breakdown,
        )
