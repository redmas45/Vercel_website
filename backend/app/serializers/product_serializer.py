from __future__ import annotations

from app.db.models import Product
from app.schemas.product import ProductSchema


def serialize_product(product: Product) -> ProductSchema:
    return ProductSchema(
        id=product.id,
        handle=product.handle,
        title=product.title,
        name=product.name,
        description=product.description or "",
        category=product.category,
        subcategory=product.subcategory,
        categories=[product.category] if product.category else [],
        brand=product.brand,
        vendor=product.vendor,
        sku=product.sku,
        price=product.price,
        original_price=product.original_price,
        discount_percent=product.discount_percent,
        currency=product.currency,
        stock=product.stock,
        in_stock=product.in_stock,
        image_url=product.image_url,
        images=product.images or ([product.image_url] if product.image_url else []),
        rating=product.rating,
        review_count=product.review_count,
        tags=product.tags or [],
        specs=product.specs,
        variants=product.variants,
        related_ids=product.related_ids,
        frequently_bought_with=product.frequently_bought_with,
        highlights=product.highlights,
        is_featured=product.is_featured,
        is_new_arrival=product.is_new_arrival,
        is_bestseller=product.is_bestseller,
        url=product.url,
        created_at=product.created_at,
    )
