from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.account import PincodeResponse

router = APIRouter(prefix="/api/pincode", tags=["pincode"])

PINCODE_DATA: dict[str, dict[str, str | bool]] = {
    "226001": {"city": "Lucknow", "state": "Uttar Pradesh", "estimate": "Tomorrow", "free_delivery": True},
    "110001": {"city": "New Delhi", "state": "Delhi", "estimate": "Tomorrow", "free_delivery": True},
    "400001": {"city": "Mumbai", "state": "Maharashtra", "estimate": "2 days", "free_delivery": True},
    "560001": {"city": "Bengaluru", "state": "Karnataka", "estimate": "2 days", "free_delivery": True},
    "700001": {"city": "Kolkata", "state": "West Bengal", "estimate": "3 days", "free_delivery": True},
    "600001": {"city": "Chennai", "state": "Tamil Nadu", "estimate": "2 days", "free_delivery": True},
    "500001": {"city": "Hyderabad", "state": "Telangana", "estimate": "2 days", "free_delivery": True},
    "380001": {"city": "Ahmedabad", "state": "Gujarat", "estimate": "3 days", "free_delivery": True},
    "302001": {"city": "Jaipur", "state": "Rajasthan", "estimate": "3 days", "free_delivery": True},
    "411001": {"city": "Pune", "state": "Maharashtra", "estimate": "2 days", "free_delivery": True},
}


@router.get("/{pincode}", response_model=PincodeResponse)
async def check_pincode(pincode: str) -> PincodeResponse:
    data = PINCODE_DATA.get(pincode)
    if data is None:
        raise HTTPException(status_code=404, detail="Delivery estimate is not available for this pincode.")
    return PincodeResponse(data=data)
