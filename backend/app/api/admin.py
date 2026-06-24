from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.api.auth import current_admin
from app.db.models import User
from app.dependencies import get_admin_service, get_review_repository
from app.repositories.review_repository import ReviewRepository
from app.schemas.auth import CreateUserRequest, UserSchema
from app.schemas.product import ProductListResponse, ProductSchema
from app.schemas.review import ReviewSchema
from app.serializers.product_serializer import serialize_product
from app.services.admin_service import AdminService

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(current_admin)])


@router.get("/users", response_model=list[UserSchema])
async def list_users(admin_service: AdminService = Depends(get_admin_service)) -> list[User]:
    return await admin_service.list_users()


@router.post("/users", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    req: CreateUserRequest,
    admin_service: AdminService = Depends(get_admin_service),
) -> User:
    return await admin_service.create_user(req)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin_service: AdminService = Depends(get_admin_service),
) -> dict[str, str]:
    await admin_service.delete_user(user_id)
    return {"status": "ok"}


@router.get("/products", response_model=ProductListResponse)
async def admin_products(admin_service: AdminService = Depends(get_admin_service)) -> ProductListResponse:
    products = await admin_service.list_products()
    return ProductListResponse(data=[serialize_product(product) for product in products])


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
    images: str = Form(""),
    specs: str = Form(""),
    variants: str = Form(""),
    highlights: str = Form(""),
    is_featured: bool = Form(False),
    is_new_arrival: bool = Form(False),
    is_bestseller: bool = Form(False),
    image: UploadFile | None = File(None),
    admin_service: AdminService = Depends(get_admin_service),
) -> ProductSchema:
    product = await admin_service.create_product(
        name=name,
        price=price,
        description=description,
        category=category,
        brand=brand,
        stock=stock,
        in_stock=in_stock,
        image_url=image_url,
        images=images,
        specs=specs,
        variants=variants,
        highlights=highlights,
        is_featured=is_featured,
        is_new_arrival=is_new_arrival,
        is_bestseller=is_bestseller,
        image=image,
    )
    return serialize_product(product)


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    admin_service: AdminService = Depends(get_admin_service),
) -> dict[str, str]:
    await admin_service.delete_product(product_id)
    return {"status": "ok"}


@router.get("/reviews", response_model=list[ReviewSchema])
async def admin_reviews(review_repository: ReviewRepository = Depends(get_review_repository)) -> list[ReviewSchema]:
    reviews = await review_repository.list_all_reviews()
    return [ReviewSchema.model_validate(review) for review in reviews]


@router.patch("/reviews/{review_id}", response_model=ReviewSchema)
async def update_review_status(
    review_id: str,
    is_published: bool,
    review_repository: ReviewRepository = Depends(get_review_repository),
) -> ReviewSchema:
    review = await review_repository.set_published(review_id, is_published)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found.")
    return ReviewSchema.model_validate(review)


@router.delete("/reviews/{review_id}")
async def delete_review(
    review_id: str,
    review_repository: ReviewRepository = Depends(get_review_repository),
) -> dict[str, str]:
    deleted = await review_repository.delete_review(review_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Review not found.")
    return {"status": "ok"}
