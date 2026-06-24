from __future__ import annotations

import re
import secrets
import json
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.core.config import settings
from app.core.security import hash_password
from app.core.validation import clean_email, required_text
from app.db.models import Product, User
from app.repositories.product_repository import ProductRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import CreateUserRequest

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
DEFAULT_CURRENCY = "USD"
DEFAULT_BRAND = "NOVA"
MAX_HANDLE_LENGTH = 80
HANDLE_SUFFIX_BASE_LENGTH = 72


class AdminService:
    def __init__(self, product_repository: ProductRepository, user_repository: UserRepository) -> None:
        self._product_repository = product_repository
        self._user_repository = user_repository

    async def list_users(self) -> list[User]:
        return await self._user_repository.list_users()

    async def create_user(self, req: CreateUserRequest) -> User:
        email = clean_email(req.email)
        existing = await self._user_repository.get_by_email(email)
        if existing:
            raise HTTPException(status_code=409, detail="Email is already registered.")
        return await self._user_repository.create_user(
            email=email,
            name=req.name.strip(),
            password_hash=hash_password(req.password),
            role=req.role,
        )

    async def delete_user(self, user_id: int) -> None:
        user = await self._user_repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        await self._user_repository.delete_user(user)

    async def list_products(self) -> list[Product]:
        return await self._product_repository.list_all_products()

    async def create_product(
        self,
        name: str,
        price: float,
        description: str,
        category: str,
        brand: str,
        stock: int | None,
        in_stock: bool,
        image_url: str,
        images: str,
        specs: str,
        variants: str,
        highlights: str,
        is_featured: bool,
        is_new_arrival: bool,
        is_bestseller: bool,
        image: UploadFile | None,
    ) -> Product:
        clean_name = required_text(name, "Product name is required.")
        handle = await self._unique_handle(clean_name)
        clean_brand = brand.strip() or DEFAULT_BRAND
        stored_image_url = await _store_image(image) if image and image.filename else image_url.strip()
        gallery = _string_list(images)
        if stored_image_url and stored_image_url not in gallery:
            gallery.insert(0, stored_image_url)
        product = Product(
            id=handle,
            handle=handle,
            title=clean_name,
            name=clean_name,
            description=description.strip(),
            category=category.strip() or None,
            brand=clean_brand,
            vendor=clean_brand,
            price=max(float(price), 0.0),
            original_price=None,
            currency=DEFAULT_CURRENCY,
            stock=stock,
            in_stock=bool(in_stock),
            image_url=stored_image_url,
            images=gallery,
            specs=_json_object(specs),
            variants=_json_list(variants),
            highlights=_lines(highlights),
            is_featured=is_featured,
            is_new_arrival=is_new_arrival,
            is_bestseller=is_bestseller,
            url=f"/product/{handle}/",
        )
        return await self._product_repository.create_product(product)

    async def delete_product(self, product_id: str) -> None:
        product = await self._product_repository.get_product(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found.")
        await self._product_repository.delete_product(product)

    async def _unique_handle(self, name: str) -> str:
        base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "product"
        handle = base[:MAX_HANDLE_LENGTH]
        index = 2
        while await self._product_repository.get_product(handle):
            handle = f"{base[:HANDLE_SUFFIX_BASE_LENGTH]}-{index}"
            index += 1
        return handle


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


def _string_list(value: str) -> list[str]:
    return [part.strip() for part in value.replace("\n", ",").split(",") if part.strip()][:6]


def _lines(value: str) -> list[str]:
    return [line.strip() for line in value.splitlines() if line.strip()]


def _json_object(value: str) -> dict | None:
    if not value.strip():
        return None
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail="Specs must be valid JSON.") from exc
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=422, detail="Specs must be a JSON object.")
    return parsed


def _json_list(value: str) -> list[dict] | None:
    if not value.strip():
        return None
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail="Variants must be valid JSON.") from exc
    if not isinstance(parsed, list):
        raise HTTPException(status_code=422, detail="Variants must be a JSON array.")
    return parsed
