from __future__ import annotations

import re
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import current_admin
from app.core.config import settings
from app.core.security import hash_password
from app.db.models import Product, User
from app.db.session import get_db
from app.schemas.auth import CreateUserRequest, UserSchema
from app.schemas.product import ProductListResponse, ProductSchema

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(current_admin)])

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
DEFAULT_CURRENCY = "USD"


@router.get("/users", response_model=list[UserSchema])
async def list_users(db: AsyncSession = Depends(get_db)) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


@router.post("/users", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(req: CreateUserRequest, db: AsyncSession = Depends(get_db)) -> User:
    email = _clean_email(req.email)
    existing = await _user_by_email(db, email)
    if existing:
        raise HTTPException(status_code=409, detail="Email is already registered.")
    user = User(email=email, name=req.name.strip(), password_hash=hash_password(req.password), role=req.role)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    await db.delete(user)
    await db.commit()
    return {"status": "ok"}


@router.get("/products", response_model=ProductListResponse)
async def admin_products(db: AsyncSession = Depends(get_db)) -> ProductListResponse:
    result = await db.execute(select(Product).order_by(Product.name.asc()))
    products = list(result.scalars().all())
    return ProductListResponse(data=[_serialize(product) for product in products])


@router.post("/products", response_model=ProductSchema, status_code=status.HTTP_201_CREATED)
async def create_product(
    name: str = Form(...),
    price: float = Form(...),
    description: str = Form(""),
    category: str = Form(""),
    brand: str = Form("NOVA"),
    stock: int | None = Form(None),
    in_stock: bool = Form(True),
    image_url: str = Form(""),
    image: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
) -> ProductSchema:
    clean_name = _required_text(name, "Product name is required.")
    handle = await _unique_handle(db, clean_name)
    stored_image_url = await _store_image(image) if image and image.filename else image_url.strip()
    product = Product(
        id=handle,
        handle=handle,
        title=clean_name,
        name=clean_name,
        description=description.strip(),
        category=category.strip() or None,
        brand=brand.strip() or "NOVA",
        vendor=brand.strip() or "NOVA",
        price=max(float(price), 0.0),
        original_price=None,
        currency=DEFAULT_CURRENCY,
        stock=stock,
        in_stock=bool(in_stock),
        image_url=stored_image_url,
        url=f"/product/{handle}/",
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return _serialize(product)


@router.delete("/products/{product_id}")
async def delete_product(product_id: str, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    await db.delete(product)
    await db.commit()
    return {"status": "ok"}


async def _store_image(image: UploadFile) -> str:
    suffix = Path(image.filename or "").suffix.lower()
    if suffix not in IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Product image must be jpg, png, webp, or gif.")
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_name = f"{secrets.token_hex(10)}{suffix}"
    file_path = upload_dir / file_name
    file_path.write_bytes(await image.read())
    public_dir = settings.upload_dir.strip("/").replace("\\", "/")
    return f"/{public_dir}/{file_name}"


async def _unique_handle(db: AsyncSession, name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "product"
    handle = base[:80]
    index = 2
    while await db.get(Product, handle):
        handle = f"{base[:72]}-{index}"
        index += 1
    return handle


async def _user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


def _serialize(product: Product) -> ProductSchema:
    return ProductSchema(
        id=product.id,
        handle=product.handle,
        title=product.title,
        name=product.name,
        description=product.description or "",
        category=product.category,
        categories=[product.category] if product.category else [],
        brand=product.brand,
        vendor=product.vendor,
        price=product.price,
        original_price=product.original_price,
        currency=product.currency,
        stock=product.stock,
        in_stock=product.in_stock,
        image_url=product.image_url,
        url=product.url,
    )


def _clean_email(email: str) -> str:
    clean = str(email or "").strip().lower()
    if "@" not in clean or "." not in clean.split("@")[-1]:
        raise HTTPException(status_code=422, detail="Valid email is required.")
    return clean


def _required_text(value: str, message: str) -> str:
    clean = str(value or "").strip()
    if not clean:
        raise HTTPException(status_code=422, detail=message)
    return clean
